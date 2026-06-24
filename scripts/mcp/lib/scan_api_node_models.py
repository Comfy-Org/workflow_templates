"""Parse model dropdown options from comfy_api_nodes Python source."""

from __future__ import annotations

import ast
import re
from pathlib import Path
from typing import Any

NODE_CLASS_RE = re.compile(r"class\s+(\w+)\(IO\.ComfyNode\)")
NODE_ID_RE = re.compile(r"""node_id\s*=\s*["']([^"']+)["']""")
DISPLAY_NAME_RE = re.compile(r"""display_name\s*=\s*["']([^"']+)["']""")
COMBO_MODEL_RE = re.compile(
    r"""IO\.Combo\.Input\(\s*["']model["']\s*,\s*options\s*=\s*(\[[\s\S]*?\]|list\(\s*(\w+)\.keys\(\)\s*\)|(\w+))""",
)
DYNAMIC_COMBO_MODEL_RE = re.compile(
    r"""IO\.DynamicCombo\.Input\(\s*["']model["']\s*,\s*options\s*=\s*(\w+)""",
)
FOR_DICT_LOOP_RE = re.compile(r"""for\s+\w+\s+in\s+(\w+)\s*:""")
DYNAMIC_OPTION_RE = re.compile(r"""IO\.DynamicCombo\.Option\(\s*["']([^"']+)["']""")


def _string_dict_keys(source: str) -> dict[str, list[str]]:
    """Collect top-level str->* dict keys (e.g. MODELS_MAP, VIDEO_MODELS_MODELS_MAP)."""
    keys_by_name: dict[str, list[str]] = {}
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return keys_by_name

    for node in tree.body:
        if not isinstance(node, ast.Assign):
            continue
        for target in node.targets:
            if not isinstance(target, ast.Name) or not isinstance(node.value, ast.Dict):
                continue
            keys: list[str] = []
            for key_node in node.value.keys:
                if isinstance(key_node, ast.Constant) and isinstance(key_node.value, str):
                    keys.append(key_node.value)
            if keys:
                keys_by_name[target.id] = keys
    return keys_by_name


def _balanced_bracket_slice(text: str, open_index: int) -> str | None:
    """Return substring covering balanced `[` … `]` starting at open_index."""
    if open_index >= len(text) or text[open_index] != "[":
        return None
    depth = 0
    in_str: str | None = None
    escape = False
    for i in range(open_index, len(text)):
        ch = text[i]
        if in_str:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == in_str:
                in_str = None
            continue
        if ch in ("'", '"'):
            in_str = ch
            continue
        if ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                return text[open_index : i + 1]
    return None


def _literal_string_list(text: str) -> list[str] | None:
    try:
        value = ast.literal_eval(text)
    except (SyntaxError, ValueError):
        return None
    if not isinstance(value, list):
        return None
    out: list[str] = []
    for item in value:
        if isinstance(item, str):
            out.append(item)
        elif isinstance(item, (int, float)):
            out.append(str(item))
    return out


def _extract_combo_options(fragment: str, dict_keys: dict[str, list[str]]) -> list[str] | None:
    match = COMBO_MODEL_RE.search(fragment)
    if not match:
        return None

    if match.group(2):
        return dict_keys.get(match.group(2))
    if match.group(3):
        var_name = match.group(3)
        if var_name in dict_keys:
            return dict_keys[var_name]
        return None

    list_text = match.group(1)
    if list_text.startswith("["):
        return _literal_string_list(list_text)
    return None


def _extract_dynamic_combo_options(fragment: str, dict_keys: dict[str, list[str]]) -> list[str] | None:
    match = DYNAMIC_COMBO_MODEL_RE.search(fragment)
    if match:
        var_name = match.group(1)
        if var_name in dict_keys:
            return dict_keys[var_name]
        # options built in a for-loop over a module-level dict (e.g. HitPaw)
        define_body = fragment[: match.start()]
        for loop_match in FOR_DICT_LOOP_RE.finditer(define_body):
            dict_name = loop_match.group(1)
            if dict_name in dict_keys:
                return dict_keys[dict_name]
        # Built inline in define_schema (e.g. options=[IO.DynamicCombo.Option(...)])
        options_block = fragment[match.start() :]
        labels = DYNAMIC_OPTION_RE.findall(options_block)
        return labels or None

    # Inline options=[IO.DynamicCombo.Option(...), ...] without variable
    inline = re.search(
        r"""IO\.DynamicCombo\.Input\(\s*["']model["']\s*,\s*options\s*=\s*\[""",
        fragment,
    )
    if inline:
        bracket = _balanced_bracket_slice(fragment, inline.end() - 1)
        if bracket:
            labels = DYNAMIC_OPTION_RE.findall(bracket)
            return labels or None
    return None


def _split_comfy_node_classes(source: str) -> list[tuple[str, str]]:
    """Return (class_name, class_body) for each IO.ComfyNode subclass."""
    parts = NODE_CLASS_RE.split(source)
    # parts: [preamble, class1, body1, class2, body2, ...]
    chunks: list[tuple[str, str]] = []
    i = 1
    while i + 1 < len(parts):
        chunks.append((parts[i], parts[i + 1]))
        i += 2
    return chunks


def parse_api_node_file(path: Path) -> dict[str, dict[str, Any]]:
    source = path.read_text(encoding="utf-8")
    dict_keys = _string_dict_keys(source)
    nodes: dict[str, dict[str, Any]] = {}

    for class_name, body in _split_comfy_node_classes(source):
        if "def define_schema" not in body:
            continue
        schema_start = body.find("def define_schema")
        if schema_start < 0:
            continue
        define_fragment = body[schema_start:]
        schema_return = define_fragment.find("return IO.Schema(")
        if schema_return < 0:
            continue
        schema_fragment = define_fragment[schema_return:]

        node_id_match = NODE_ID_RE.search(schema_fragment)
        if not node_id_match:
            continue
        node_id = node_id_match.group(1)

        display_match = DISPLAY_NAME_RE.search(schema_fragment)
        model_options = _extract_combo_options(schema_fragment, dict_keys)
        if model_options is None:
            model_options = _extract_dynamic_combo_options(define_fragment, dict_keys)

        if not model_options:
            continue

        nodes[node_id] = {
            "node_id": node_id,
            "class_name": class_name,
            "display_name": display_match.group(1) if display_match else "",
            "model_options": model_options,
            "source_file": path.name,
        }

    return nodes


def scan_api_nodes_dir(api_nodes_dir: Path) -> dict[str, dict[str, Any]]:
    """Scan all nodes_*.py files; keyed by node_id (matches workflow JSON `type`)."""
    index: dict[str, dict[str, Any]] = {}
    for path in sorted(api_nodes_dir.glob("nodes_*.py")):
        for node_id, meta in parse_api_node_file(path).items():
            index[node_id] = meta
    return index


def model_options_for_workflow(
    workflow_path: Path,
    node_index: dict[str, dict[str, Any]],
) -> dict[str, list[str]]:
    """Map API node types in a workflow to their selectable model options."""
    import json

    try:
        wf = json.loads(workflow_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}

    result: dict[str, list[str]] = {}
    for node in wf.get("nodes") or []:
        node_type = node.get("type", "")
        if node_type not in node_index:
            continue
        opts = node_index[node_type].get("model_options") or []
        if opts:
            result[node_type] = opts
    return result
