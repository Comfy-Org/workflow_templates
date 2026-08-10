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

# Node classes inherit IO.ComfyNode (class name need not end in 'Node', e.g. IdeogramV3 / TopazImageEnhance)
CLASS_RE = re.compile(r"^[A-Za-z0-9_]+$")

# Category extraction (supports category="..." or CATEGORY = "...")
CATEGORY_RE = re.compile(r'category\s*=\s*["\']([^"\']+)["\']')
CATEGORY_ASSIGN_RE = re.compile(r'^\s*category\s*=\s*["\']([^"\']+)["\']')

# Model options extraction: IO.DynamicCombo.Input("model", options=[IO.DynamicCombo.Option("X", ...)])
MODEL_OPTION_RE = re.compile(r'Option\(\s*["\']([^"\']+)["\']')
MODEL_INPUT_RE = re.compile(r'IO\.DynamicCombo\.Input\(\s*["\']model["\']')


def extract_model_options(source: str) -> list[str]:
    """Extract model options from node source (paren/bracket-balanced, handles nested Option calls)."""
    models = []
    for m in MODEL_INPUT_RE.finditer(source):
        # Start at "model" input; balance parens+brackets to find the full input block
        depth = 0
        start = m.end()
        for i in range(start, len(source)):
            ch = source[i]
            if ch in "([":
                depth += 1
            elif ch in ")]":
                depth -= 1
                if depth == 0:
                    block = source[start:i + 1]
                    break
        else:
            continue
        # Find the first string arg of every Option("...", ...) inside the block
        for om in MODEL_OPTION_RE.finditer(block):
            name = om.group(1)
            if name and name not in models:
                models.append(name)
    return models


def extract_display_name(node_source: str) -> str:
    """display_name field (IO.Schema(display_name=...) inside define_schema)."""
    m = re.search(r'display_name\s*=\s*["\']([^"\']+)["\']', node_source)
    return m.group(1) if m else ""


def extract_description(node_source: str) -> str:
    """description field."""
    m = re.search(r'description\s*=\s*["\']([^"\']+)["\']', node_source)
    return m.group(1) if m else ""


def extract_category(node_source: str) -> str:
    """category field (inside define_schema) or CATEGORY constant."""
    m = re.search(r'category\s*=\s*["\']([^"\']+)["\']', node_source)
    if m:
        return m.group(1)
    m = CATEGORY_ASSIGN_RE.search(node_source)
    return m.group(1) if m else ""


def scan_file(path: Path) -> list[dict]:
    """Scan a single node file and return the node list."""
    source = path.read_text(encoding="utf-8", errors="replace")
    tree = ast.parse(source)
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
        nodes.append({
            "node_id": node.name,
            "display_name": extract_display_name(node_source),
            "category": extract_category(node_source),
            "description": extract_description(node_source),
            "models": extract_model_options(node_source),
            "file": path.name,
            "line": node.lineno,
        })
    return nodes


def scan_dir(comfyui_dir: Path) -> list[dict]:
    api_nodes_dir = comfyui_dir / "comfy_api_nodes"
    if not api_nodes_dir.exists():
        print(f"ERROR: cannot find {api_nodes_dir}", file=sys.stderr)
        sys.exit(1)
    all_nodes = []
    for f in sorted(api_nodes_dir.glob("nodes_*.py")):
        all_nodes.extend(scan_file(f))
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
