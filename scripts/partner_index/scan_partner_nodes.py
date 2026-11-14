#!/usr/bin/env python3
"""
scan_partner_nodes.py - Scan all partner API nodes under ComfyUI's comfy_api_nodes/.

Features:
- Pure AST parsing (no imports of node modules, no runtime dependencies)
- Idempotent: full scan every run; diff against --prev to detect new nodes
- Output: {nodes: [...], scanned_at, count, new_since}

Usage:
  python3 scan_partner_nodes.py --comfyui <path> [--out <path>] [--prev <snapshot>] [--since <git-ref>]

Default output: scripts/partner_index/data/partner_nodes_scan.json (does not overwrite existing snapshot).
"""
import argparse
import ast
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# Node classes inherit IO.ComfyNode (class name need not end in 'Node', e.g. IdeogramV3 / TopazImageEnhance)
CLASS_RE = re.compile(r"^[A-Za-z0-9_]+$")

# Category extraction (supports category="..." or CATEGORY = "...")
CATEGORY_RE = re.compile(r'category\s*=\s*["\']([^"\']+)["\']')
CATEGORY_ASSIGN_RE = re.compile(r'^\s*category\s*=\s*["\']([^"\']+)["\']')

# Model options extraction: Combo/DynamicCombo inputs whose name is a primary
# model selector — "model", "model_name", "model_version" (NOT sub-feature
# selectors like upscaler_model / grain_model / interpolation_model). Options
# may be a literal list, dict .keys() call, an Enum class reference, or a
# constant. Handles nested DynamicCombo.Option calls.
MODEL_INPUT_RE = re.compile(r'IO\.(DynamicCombo|Combo)\.Input\(\s*["\'](model(?:_name|_version)?)["\']')


def _module_scope_defs(source: str) -> dict:
    """Pre-scan the module for named dict constants, list constants, Enum
    classes and simple string constants so model options that reference
    variables can be resolved statically."""
    defs = {}
    # dict constants: NAME = { or NAME: dict[...] = { "k": ... }
    for m in re.finditer(r'^([A-Za-z_][A-Za-z0-9_]*)\s*(?::\s*[A-Za-z_][A-Za-z0-9_\[\], ]*)?=\s*\{', source, re.M):
        name = m.group(1)
        # collect string keys until the matching close brace
        depth = 0
        start = m.end() - 1
        for i in range(start, len(source)):
            ch = source[i]
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    block = source[start:i + 1]
                    break
        else:
            continue
        keys = re.findall(r"['\"]([^'\"]+)['\"]\s*:", block)
        if keys:
            defs[name] = keys
    # list constants: NAME = ["a", "b"] or NAME = [_ModelSpec("slug", ...)]
    for m in re.finditer(r'^([A-Za-z_][A-Za-z0-9_]*)\s*(?::\s*[A-Za-z_][A-Za-z0-9_\[\], ]*)?=\s*\[', source, re.M):
        name = m.group(1)
        depth = 0
        start = m.end() - 1
        for i in range(start, len(source)):
            ch = source[i]
            if ch == "[":
                depth += 1
            elif ch == "]":
                depth -= 1
                if depth == 0:
                    block = source[start:i + 1]
                    break
        else:
            continue
        # plain string items, or _ModelSpec("slug", ...) constructor first args
        items = re.findall(r'["\']([^"\']+)["\']', block)
        spec_slugs = re.findall(r'\b\w+\(\s*["\']([^"\']+)["\']', block)
        picked = spec_slugs if spec_slugs and not re.match(r'^\[["\']', block.strip()) else items
        if picked:
            defs[name] = picked
    # simple string constants: NAME = "value" (Krea _MODEL_MEDIUM etc.)
    for m in re.finditer(r'^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*["\']([^"\']+)["\']', source, re.M):
        defs.setdefault(m.group(1), [m.group(2)])
    # Enum classes: class NAME(str, Enum): A = 'value' — collect members until
    # the first non-whitespace, non-comment line that is not an assignment
    for m in re.finditer(r'^class\s+([A-Za-z_][A-Za-z0-9_]*)\s*\([^)]*Enum[^)]*\):', source, re.M):
        name = m.group(1)
        body_lines = []
        for line in source[m.end():].splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith(("#", '"""', "'''", "docstring")):
                continue
            if "=" not in stripped or stripped.startswith(("def ", "class ", "@")):
                break
            body_lines.append(line)
        vals = re.findall(r'=\s*["\']([^"\']+)["\']', "\n".join(body_lines))
        if vals:
            defs[name] = vals
    return defs


def _load_apis_defs(comfyui_dir: Path) -> dict:
    """Scan comfy_api_nodes/apis/*.py for Enum classes and dict constants, so
    model options defined in a shared apis module (e.g. LumaImageModel in
    apis/__init__.py) resolve even though the node file references them."""
    defs = {}
    apis_dir = comfyui_dir / "comfy_api_nodes" / "apis"
    if not apis_dir.exists():
        return defs
    for f in sorted(apis_dir.glob("*.py")):
        try:
            source = f.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        defs.update(_module_scope_defs(source))
    return defs


def _resolve_options(opt_expr: str, defs: dict) -> list:
    """Resolve an options= expression to a list of model names."""
    expr = opt_expr.strip()
    # list comprehension over a dict/Enum: [f(x) for x in CONST] or
    # [IO.DynamicCombo.Option(label, ...) for label in CONST]
    cm = re.search(r"for\s+\w+\s+in\s+([A-Za-z_][A-Za-z0-9_]*)", expr)
    if cm and cm.group(1) in defs:
        return list(defs[cm.group(1)])
    # literal list: extract ONLY top-level Option("name", ...) first args,
    # skipping nested sub-parameter Options inside the second argument
    if expr.startswith("["):
        names = []
        i = 0
        n = len(expr)
        while i < n:
            m = re.search(r"Option\(\s*[\"']([^\"']+)[\"']", expr[i:])
            if not m:
                break
            # found an Option("name", ...) at position i+m.start()
            abs_start = i + m.start()
            names.append(m.group(1))
            # skip past the whole Option(...) call to avoid nested sub-params
            j = abs_start + 7  # len("Option(") == 7
            depth = 0
            while j < n:
                ch = expr[j]
                if ch == "(":
                    depth += 1
                elif ch == ")":
                    depth -= 1
                    if depth == 0:
                        break
                j += 1
            i = j + 1 if j < n else n
        # Option(_MODEL_MEDIUM, ...) with constant refs
        if not names:
            for m in re.finditer(r"Option\(\s*([A-Za-z_][A-Za-z0-9_]*)", expr):
                if m.group(1) in defs:
                    names.extend(defs[m.group(1)])
        # plain string list without Option() wrappers
        if not names:
            names = re.findall(r"['\"]([^'\"]+)['\"]", expr)
        return names
    # dict .keys() call: list(MODELS_MAP.keys()) or MODELS_MAP.keys()
    km = re.search(r"([A-Za-z_][A-Za-z0-9_]*)\.keys\(\)", expr)
    if km and km.group(1) in defs:
        return list(defs[km.group(1)])
    # bare dict constant, list constant, Enum class or string constant
    if expr in defs:
        return list(defs[expr])
    # local variable built by a loop: for m in CONST: ... append(Option(m, ...))
    # -> resolve CONST from module defs
    if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", expr):
        loop = re.search(
            rf"for\s+\w+\s+in\s+([A-Za-z_][A-Za-z0-9_]*)[\s\S]*?{re.escape(expr)}\s*\.append\(",
            _CURRENT_SOURCE,
        )
        if loop and loop.group(1) in defs:
            return list(defs[loop.group(1)])
    # function call with literal string args (e.g. _model_inputs(["reve-...", ...]))
    fm = re.search(r'^\s*[A-Za-z_][A-Za-z0-9_]*\(', expr)
    if fm:
        # only take the first positional argument list — later keyword args
        # like aspect_ratios=[...] are sub-parameters, not model names
        arg0 = expr[fm.end():].lstrip()
        # find the matching close bracket/paren of the first arg
        if arg0.startswith("["):
            depth = 0
            for i, ch in enumerate(arg0):
                if ch == "[":
                    depth += 1
                elif ch == "]":
                    depth -= 1
                    if depth == 0:
                        first_arg = arg0[:i + 1]
                        break
            else:
                first_arg = arg0
            names = re.findall(r"['\"]([^'\"]+)['\"]", first_arg)
            if names:
                return names
        else:
            names = re.findall(r'["\']([^"\']+)["\']', expr)
            if names:
                return names
        # function returning Option(spec.slug, ...) for spec in CONST ->
        # resolve the underlying constant the function iterates over
        fn_name = fm.group(0).rstrip("(")
        fm2 = re.search(
            rf"def {re.escape(fn_name)}\(.*?\)\s*(?:->.*?)?:.*?return\s+\[.*?for\s+\w+\s+in\s+([A-Za-z_][A-Za-z0-9_]*)",
            _CURRENT_SOURCE, re.S,
        )
        if fm2 and fm2.group(1) in defs:
            return list(defs[fm2.group(1)])
    return []


# Module-level source cache for function-body resolution in _resolve_options
_CURRENT_SOURCE = ""


def extract_model_options(node_source: str, extra_defs: Optional[dict] = None, full_source: str = "") -> list[str]:
    """Extract model options from a node class snippet.

    node_source: the node's class source (scanned for model inputs).
    extra_defs: module-level constants + apis defs for resolving option refs.
    full_source: the whole file source, used to resolve function bodies that
    build options dynamically (e.g. OpenRouter's _build_model_options()).
    """
    global _CURRENT_SOURCE
    _CURRENT_SOURCE = full_source or node_source
    defs = _module_scope_defs(node_source)
    if extra_defs:
        defs.update(extra_defs)
    models = []
    for m in MODEL_INPUT_RE.finditer(node_source):
        # The Input( open paren was consumed by the regex; start inside it so
        # depth counting sees the full options=[...] block before the close paren.
        depth = 1
        start = m.end()
        for i in range(start, len(node_source)):
            ch = node_source[i]
            if ch in "([":
                depth += 1
            elif ch in ")]":
                depth -= 1
                if depth == 0:
                    block = node_source[start:i + 1]
                    break
        else:
            continue
        # Find the options= expression inside the block: bracket-balance from
        # the start of the value so nested sub-parameter defaults don't cut it;
        # bare identifiers (e.g. options=LumaImageModel) end at the comma.
        optm = re.search(r"options\s*=\s*", block)
        if not optm:
            continue
        val_start = optm.end()
        expr = ""
        if val_start < len(block) and block[val_start] in "([":
            depth = 0
            for i in range(val_start, len(block)):
                ch = block[i]
                if ch in "([":
                    depth += 1
                elif ch in ")]":
                    depth -= 1
                    if depth == 0:
                        expr = block[val_start:i + 1]
                        break
            if not expr:
                expr = block[val_start:]
        else:
            # bare identifier / function call: take up to comma or close paren
            mm = re.match(r"\s*([A-Za-z_][A-Za-z0-9_.]*(?:\([^)]*\))?)", block[val_start:])
            if mm:
                expr = mm.group(1)
        if not expr:
            continue
        for name in _resolve_options(expr, defs):
            if name and name not in models:
                models.append(name)
    return models


def extract_display_name(node_source: str) -> str:
    """display_name field (IO.Schema(display_name=...) inside define_schema)."""
    m = re.search(r'display_name\s*=\s*["\']([^"\']+)["\']', node_source)
    return m.group(1) if m else ""


def _schema_kwargs(tree: ast.Module, class_name: str) -> dict:
    """Extract the keyword args of the IO.Schema(...) call inside the named
    class's define_schema, as literal strings. Handles multi-line implicit
    string concatenation (e.g. description="part one " "part two") and
    apostrophes that plain regexes would choke on."""
    out = {}
    for node in ast.walk(tree):
        if not isinstance(node, ast.ClassDef) or node.name != class_name:
            continue
        for item in node.body:
            if not isinstance(item, ast.FunctionDef) or item.name != "define_schema":
                continue
            for sub in ast.walk(item):
                if isinstance(sub, ast.Call) and isinstance(sub.func, ast.Attribute) \
                        and sub.func.attr == "Schema":
                    for kw in sub.keywords:
                        if kw.arg is None:
                            continue
                        val = kw.value
                        if isinstance(val, ast.Constant) and isinstance(val.value, str):
                            out[kw.arg] = val.value
                        elif isinstance(val, ast.JoinedStr):
                            parts = []
                            for v in val.values:
                                if isinstance(v, ast.Constant) and isinstance(v.value, str):
                                    parts.append(v.value)
                            if parts:
                                out[kw.arg] = "".join(parts)
                    return out
    return {}


def extract_description_ast(node_source: str) -> str:
    """description field via AST (handles concatenated strings / apostrophes)."""
    try:
        tree = ast.parse(node_source)
    except SyntaxError:
        return ""
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            kwargs = _schema_kwargs(tree, node.name)
            return kwargs.get("description", "")
    return ""


def extract_category(node_source: str) -> str:
    """category field (inside define_schema) or CATEGORY constant."""
    m = re.search(r'category\s*=\s*["\']([^"\']+)["\']', node_source)
    if m:
        return m.group(1)
    m = CATEGORY_ASSIGN_RE.search(node_source)
    return m.group(1) if m else ""


# Price badge extraction: IO.PriceBadge(expr="<jsonata>") — the node's USD
# pricing shown in the UI. The expr is a jsonata string that may be a fixed
# amount ({"type":"usd","usd":0.8}), a tiered conditional ($contains($m,...)
# ? {...usd:0.0027} : ...), a multi-dimensional table ($p := {model: {res:
# {dur: price}}}) or a dynamic formula (0.5 * widgets.duration_seconds).
# Strategy: strip string literals (so keys like "4k" / "5s" / "1080p" do not
# pollute the number set), then collect the remaining numeric literals —
# those are the actual price points. Kind: fixed (single point) / tiered
# (conditional or table) / dynamic (contains a multiplication).
PRICE_BADGE_RE = re.compile(r"price_badge\s*=\s*IO\.PriceBadge\(")
_STRING_LIT_RE = re.compile(r'"(?:[^"\\]|\\.)*"|\'(?:[^\'\\]|\\.)*\'')
_NUM_LIT_RE = re.compile(r"\d+(?:\.\d+)?")


def _price_badge_block(node_source: str) -> str:
    """Return the balanced IO.PriceBadge(...) argument block, or '' if absent."""
    m = PRICE_BADGE_RE.search(node_source)
    if not m:
        return ""
    start = m.end() - 1  # at '(' — count it so nested PriceBadgeDepends(...) does not close early
    depth = 0
    for i in range(start, len(node_source)):
        ch = node_source[i]
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
            if depth == 0:
                return node_source[start + 1:i]
    return ""


def _badge_expr(block: str) -> str:
    """Extract the expr= jsonata string from a PriceBadge block (any quote style).

    Uses a backreference so the closing delimiter must match the opening one
    (triple-double vs double vs single quotes) — a plain alternation lets a
    single quote inside a triple-quoted expr terminate it early.
    """
    m = re.search(r'expr\s*=\s*(?P<q>"{3}|\'{3}|"|\')(?P<body>.*?)(?P=q)', block, re.S)
    return m.group("body") if m else ""


def extract_price_badge(node_source: str) -> Optional[dict]:
    """Extract USD pricing from a node's price_badge as {kind, usd_range, note}.

    Returns None when the node has no price_badge. kind is one of:
    - fixed: single price point
    - range: explicit min/max interval ({"type":"range_usd", min_usd, max_usd})
    - tiered: price varies by model / resolution / duration (conditional or table)
    - dynamic: per-unit formula (e.g. 0.5 USD per second of video)
    - credits: point-based pricing scaled by a credit multiplier (e.g. 25 * 0.02)

    Strategy, verified against real nodes_*.py expressions:
    1. Prefer EXPLICIT price literals: "usd": <num> and range_usd min_usd/max_usd
       (covers fixed, Luma-style conditionals, OpenAI/ByteDance range tables).
    2. Only when those are absent (price expressed via variables, e.g.
       "$base + $perSec * ..."), fall back to collecting numbers from the
       jsonata body with noise stripping:
       - jsonata variable names ($is1080, $texSize) stripped BEFORE collection
       - string literals ("4k", "5s", "1080p", model slugs) stripped
       - comparison sentinels (!= 500000, : 4096 texture defaults) removed
       - a trailing "- 1" offset (duration - 1) dropped
       - numbers > 100 excluded (resolutions, vertex counts, sentinels)
       - 0 excluded (option-off sentinels like "$nRaw != 0", "$face : 0")
       - a `* <small float>` term signals point-based credits
    """
    block = _price_badge_block(node_source)
    if not block:
        return None
    expr = _badge_expr(block)
    if not expr:
        return None

    # --- 1. Explicit price literals ---
    explicit = []
    explicit += [float(x) for x in re.findall(r'"usd"\s*:\s*([0-9.]+)', expr)]
    explicit += [float(x) for x in re.findall(r'"min_usd"\s*:\s*([0-9.]+)', expr)]
    explicit += [float(x) for x in re.findall(r'"max_usd"\s*:\s*([0-9.]+)', expr)]
    has_range_type = '"type":"range_usd"' in expr.replace(" ", "") or \
                     '"type": "range_usd"' in expr

    if explicit:
        lo, hi = min(explicit), max(explicit)
        deps = re.findall(r"widgets\.([A-Za-z_]+)", expr)
        if has_range_type and len(set(explicit)) > 1:
            dims = ", ".join(dict.fromkeys(deps)) or "model/quality/resolution"
            note = f"published range ${lo:g}-${hi:g}; varies by {dims}"
            return {"kind": "range", "usd_range": [lo, hi], "note": note}
        if len(set(explicit)) == 1:
            return {"kind": "fixed", "usd_range": [lo, lo], "note": ""}
        dims = ", ".join(dict.fromkeys(deps)) or "model/resolution/duration"
        note = f"varies by {dims}"
        return {"kind": "tiered", "usd_range": [lo, hi], "note": note}

    # --- 2. Fallback: collect numbers from the jsonata body ---
    # Dynamic formula: multiplication by a widget/seconds variable (e.g.
    # "$pps * $seconds", "0.5 * widgets.duration_seconds"). Detect on the raw
    # expr BEFORE variable names are stripped.
    dynamic = re.search(r"\*\s*(?:widgets\.|\$)", expr) is not None

    # Credits multiplier: a `* 0.0x` term (e.g. "($base + $pbr + $face) * 0.02").
    cred_m = re.search(r"\*\s*(0\.\d+)", expr)
    credits_rate = float(cred_m.group(1)) if cred_m else None

    # Strip jsonata variable names first (digits inside $is1080 / $texSize /
    # $pps are identifiers, not prices).
    stripped = re.sub(r"\$[A-Za-z_][A-Za-z0-9_]*", " ", expr)
    # Strip string literals ("4k", "5s", "1080p", model slugs).
    stripped = _STRING_LIT_RE.sub(" ", stripped)
    # Drop comparison sentinels: != 500000, = 4096, <= 128, etc.
    stripped = re.sub(r"[!<>=]+\s*-?\d+(?:\.\d+)?", " ", stripped)
    # Drop lone 0/1 after ':' — default-value sentinels ($n := ... ? $nRaw : 1,
    # $face := ... ? 10 : 0). Real prices after ':' (ternary branches, object
    # values like "off": 0.42) keep their decimals and survive this.
    stripped = re.sub(r":\s*[01](?!\.)\b", " ", stripped)
    # Drop the "- 1" offset in duration - 1.
    stripped = re.sub(r"-\s*1\b", " ", stripped)
    # Drop array indices ($range[1], $baseRange[0]) — positions, not prices.
    stripped = re.sub(r"\[\s*-?\d+(?:\.\d+)?\s*\]", " ", stripped)
    # Drop division divisors (widgets.duration / 10).
    stripped = re.sub(r"/\s*-?\d+(?:\.\d+)?", " ", stripped)
    # Drop trailing numeric args in function calls ($substring($ms, 0, 1)).
    stripped = re.sub(r",\s*-?\d+(?:\.\d+)?\s*\)", ")", stripped)

    nums = sorted({float(x) for x in _NUM_LIT_RE.findall(stripped)})
    if not nums:
        return None
    # Exclude sentinel-scale numbers (> 100): resolutions, vertex counts,
    # face limits — no per-run price reaches three figures.
    nums = [n for n in nums if n <= 100]
    # Exclude 0: option-off sentinels ("$nRaw != 0", "$face : 0") — a price of
    # exactly $0 is not useful as a range bound.
    nums = [n for n in nums if n > 0]
    if not nums:
        return None

    if credits_rate is not None:
        # Point-based pricing: integer points scaled by a small USD multiplier.
        points = [n for n in nums if n >= 1]
        if points:
            lo, hi = min(points) * credits_rate, max(points) * credits_rate
            note = (f"{credits_rate:g} USD per point; base points "
                    f"{min(points):g}-{max(points):g}")
            return {"kind": "credits", "usd_range": [round(lo, 4), round(hi, 4)], "note": note}

    lo, hi = nums[0], nums[-1]
    if dynamic:
        # Per-unit rate: the numeric literals are the rates per second/etc.
        note = "per second/unit rate; total = rate x duration (scales linearly)"
        return {"kind": "dynamic", "usd_range": [lo, hi], "note": note}
    kind = "fixed" if len(nums) == 1 else "tiered"
    note = ""
    if kind == "tiered":
        deps = re.findall(r"widgets\.([A-Za-z_]+)", expr)
        dims = ", ".join(dict.fromkeys(deps)) or "model/resolution/duration"
        note = f"varies by {dims}"
    return {"kind": kind, "usd_range": [lo, hi], "note": note}


def _is_deprecated(tree: ast.Module, class_name: str) -> bool:
    """True if the named class's IO.Schema(...) call carries is_deprecated=True.

    Deprecated nodes are dropped from the index at build time (they may still
    exist in the product UI for a grace period, but the capability index must
    not advertise them).
    """
    for node in ast.walk(tree):
        if not isinstance(node, ast.ClassDef) or node.name != class_name:
            continue
        for item in node.body:
            if not isinstance(item, ast.FunctionDef) or item.name != "define_schema":
                continue
            for sub in ast.walk(item):
                if isinstance(sub, ast.Call) and isinstance(sub.func, ast.Attribute) \
                        and sub.func.attr == "Schema":
                    for kw in sub.keywords:
                        if kw.arg == "is_deprecated" and isinstance(kw.value, ast.Constant) \
                                and kw.value.value is True:
                            return True
    return False


def scan_file(path: Path, extra_defs: Optional[dict] = None) -> list[dict]:
    """Scan a single node file and return the node list."""
    source = path.read_text(encoding="utf-8", errors="replace")
    tree = ast.parse(source)
    # Module-level constants must be scanned over the WHOLE file, not the node
    # class snippet (SEEDREAM_MODELS etc. live at module scope).
    file_defs = _module_scope_defs(source)
    if extra_defs:
        file_defs.update(extra_defs)
    nodes = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.ClassDef):
            continue
        if not CLASS_RE.match(node.name):
            continue
        # Confirm inheritance from IO.ComfyNode or ComfyNode
        bases = [ast.unparse(b) for b in node.bases]
        if not any("ComfyNode" in b for b in bases):
            continue
        # Node class source range
        start = node.lineno
        end = getattr(node, "end_lineno", start)
        lines = source.splitlines()
        node_source = "\n".join(lines[start - 1:end])
        entry = {
            "node_id": node.name,
            "display_name": extract_display_name(node_source),
            "category": extract_category(node_source),
            "description": extract_description_ast(node_source),
            "models": extract_model_options(node_source, file_defs, full_source=source),
            "pricing": extract_price_badge(node_source),
            "deprecated": _is_deprecated(tree, node.name),
            "file": path.name,
            "line": node.lineno,
        }
        # Skip abstract base classes (no display_name and no category)
        if not entry["display_name"] and not entry["category"]:
            continue
        nodes.append(entry)
    return nodes


def scan_dir(comfyui_dir: Path) -> list[dict]:
    api_nodes_dir = comfyui_dir / "comfy_api_nodes"
    if not api_nodes_dir.exists():
        print(f"ERROR: cannot find {api_nodes_dir}", file=sys.stderr)
        sys.exit(1)
    all_nodes = []
    apis_defs = _load_apis_defs(comfyui_dir)
    for f in sorted(api_nodes_dir.glob("nodes_*.py")):
        all_nodes.extend(scan_file(f, apis_defs))
    return all_nodes


def git_first_commit(comfyui_dir: Path, path: str) -> str:
    """Use git log to get the first commit date of a node file (approx model release hint)."""
    try:
        r = subprocess.run(
            ["git", "-C", str(comfyui_dir), "log", "--follow", "--format=%ad", "--date=short", "--reverse", path],
            capture_output=True, text=True, timeout=15,
        )
        dates = [l for l in r.stdout.splitlines() if re.match(r"\d{4}-\d{2}-\d{2}", l)]
        return dates[0] if dates else ""
    except Exception:
        return ""


def main():
    ap = argparse.ArgumentParser(description="Scan ComfyUI partner API nodes")
    ap.add_argument("--comfyui", default=str(Path.home() / "Documents/Github/ComfyUI"))
    ap.add_argument("--out", default="scripts/partner_index/data/partner_nodes_scan.json")
    ap.add_argument("--prev", help="previous scan snapshot, for diffing new nodes")
    ap.add_argument("--since", help="git ref; only count nodes added after this ref")
    args = ap.parse_args()

    comfyui_dir = Path(args.comfyui).expanduser()
    nodes = scan_dir(comfyui_dir)
    nodes.sort(key=lambda x: (x["category"], x["node_id"]))

    # Deduplicate (same node_id may appear in multiple files; keep first)
    seen = set()
    unique = []
    for n in nodes:
        if n["node_id"] not in seen:
            seen.add(n["node_id"])
            unique.append(n)
    nodes = unique

    # Add added_date from each file's first git commit (model release hint)
    for n in nodes:
        n["added_date"] = git_first_commit(comfyui_dir, f"comfy_api_nodes/{n['file']}")

    result = {
        "scanned_at": datetime.now(timezone.utc).isoformat(),
        "count": len(nodes),
        "nodes": nodes,
    }

    # Diff against previous snapshot
    if args.prev:
        prev = json.loads(Path(args.prev).read_text(encoding="utf-8"))
        prev_ids = {n["node_id"] for n in prev.get("nodes", [])}
        cur_ids = {n["node_id"] for n in nodes}
        new_ids = cur_ids - prev_ids
        result["new_since_last_scan"] = sorted(new_ids)

    # Diff against git ref
    if args.since:
        try:
            r = subprocess.run(
                ["git", "-C", str(comfyui_dir), "diff", "--name-only", args.since, "HEAD", "--", "comfy_api_nodes/"],
                capture_output=True, text=True, timeout=15,
            )
            changed = [l for l in r.stdout.splitlines() if l.endswith(".py")]
            result["changed_files_since"] = args.since
            result["changed_files"] = changed
        except Exception as e:
            print(f"WARNING: git diff failed: {e}", file=sys.stderr)

    out = Path(args.out).expanduser()
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Scan complete: {len(nodes)} nodes -> {out}")
    print(f"   categories: {len({n['category'] for n in nodes})}")
    for tag in sorted({n['category'] for n in nodes}):
        cnt = sum(1 for n in nodes if n['category'] == tag)
        print(f"     {tag}: {cnt}")
    if "new_since_last_scan" in result and result["new_since_last_scan"]:
        print(f"   new nodes: {result['new_since_last_scan']}")


if __name__ == "__main__":
    main()
