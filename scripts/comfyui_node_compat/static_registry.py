"""Statically scan a ComfyUI checkout for node definitions (no torch import)."""

from __future__ import annotations

import ast
import re
from pathlib import Path

from models import NodeSpec

NODE_ID_RE = re.compile(r'node_id\s*=\s*["\']([^"\']+)["\']')
DISPLAY_NAME_RE = re.compile(r'display_name\s*=\s*["\']([^"\']+)["\']')
SCAN_RELATIVE_PATHS = (
    Path("nodes.py"),
    Path("comfy_extras"),
    Path("comfy_api_nodes"),
)


def _string_value(node: ast.AST | None) -> str | None:
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    return None


def _dict_string_keys(node: ast.AST | None) -> dict[str, ast.AST] | None:
    if not isinstance(node, ast.Dict):
        return None
    parsed: dict[str, ast.AST] = {}
    for key, value in zip(node.keys, node.values):
        key_str = _string_value(key)
        if key_str is not None:
            parsed[key_str] = value
    return parsed


def _class_name(node: ast.AST | None) -> str | None:
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return node.attr
    return None


def _extract_combo_options(field_node: ast.AST) -> list[str] | None:
    if isinstance(field_node, ast.Tuple) and field_node.elts:
        first = field_node.elts[0]
    elif isinstance(field_node, ast.List) and field_node.elts:
        first = field_node
    else:
        return None

    if isinstance(first, ast.List):
        options: list[str] = []
        for item in first.elts:
            value = _string_value(item)
            if value is not None:
                options.append(value)
        return options or None
    return None


def _apply_input_field(spec: NodeSpec, input_name: str, field_node: ast.AST) -> None:
    spec.inputs.add(input_name)
    options = _extract_combo_options(field_node)
    if options:
        spec.combo_options[input_name] = options


def _apply_input_group(spec: NodeSpec, group_node: ast.AST | None) -> None:
    group = _dict_string_keys(group_node)
    if not group:
        return
    for input_name, field_node in group.items():
        _apply_input_field(spec, input_name, field_node)


def _input_types_return_dict(class_def: ast.ClassDef) -> ast.Dict | None:
    for node in class_def.body:
        if not isinstance(node, ast.FunctionDef) or node.name != "INPUT_TYPES":
            continue
        for stmt in node.body:
            if isinstance(stmt, ast.Return) and isinstance(stmt.value, ast.Dict):
                return stmt.value
    return None


def _class_is_api_node(class_def: ast.ClassDef, *, file_path: Path) -> bool:
    if "comfy_api_nodes" in file_path.parts:
        return True
    for node in class_def.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "API_NODE":
                    if isinstance(node.value, ast.Constant) and node.value.value is True:
                        return True
    return False


def _parse_python_file(path: Path) -> tuple[dict[str, str], dict[str, str], dict[str, ast.ClassDef]]:
    source = path.read_text(encoding="utf-8")
    tree = ast.parse(source, filename=str(path))

    mappings: dict[str, str] = {}
    display_mappings: dict[str, str] = {}
    classes: dict[str, ast.ClassDef] = {}

    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            classes[node.name] = node

    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if not isinstance(target, ast.Name):
                    continue
                if target.id == "NODE_CLASS_MAPPINGS":
                    parsed = _dict_string_keys(node.value)
                    if parsed:
                        for node_type, class_node in parsed.items():
                            class_name = _class_name(class_node)
                            if class_name:
                                mappings[node_type] = class_name
                elif target.id == "NODE_DISPLAY_NAME_MAPPINGS":
                    parsed = _dict_string_keys(node.value)
                    if parsed:
                        for node_type, display_node in parsed.items():
                            display_name = _string_value(display_node)
                            if display_name:
                                display_mappings[node_type] = display_name

    return mappings, display_mappings, classes


def _iter_scan_files(comfyui_dir: Path) -> list[Path]:
    files: list[Path] = []
    nodes_py = comfyui_dir / "nodes.py"
    if nodes_py.is_file():
        files.append(nodes_py)

    for relative in SCAN_RELATIVE_PATHS[1:]:
        root = comfyui_dir / relative
        if root.is_dir():
            files.extend(sorted(root.rglob("*.py")))
    return files


def _register_schema_nodes(path: Path, specs: dict[str, NodeSpec], warnings: list[str]) -> None:
    try:
        source = path.read_text(encoding="utf-8")
    except OSError as exc:
        warnings.append(f"{path}: {exc}")
        return

    for node_id in NODE_ID_RE.findall(source):
        if node_id in specs:
            continue
        display_name = None
        display_match = DISPLAY_NAME_RE.search(source)
        if display_match:
            display_name = display_match.group(1)
        specs[node_id] = NodeSpec(
            node_type=node_id,
            api_node=True,
            deprecated=bool(display_name and "DEPRECATED" in display_name.upper()),
            display_name=display_name,
        )


def build_specs_static(comfyui_dir: Path) -> tuple[dict[str, NodeSpec], list[str]]:
    """Parse ComfyUI Python sources without importing them."""
    warnings: list[str] = []
    comfyui_dir = comfyui_dir.resolve()
    if not (comfyui_dir / "nodes.py").is_file():
        raise FileNotFoundError(f"Could not find nodes.py under {comfyui_dir}")

    specs: dict[str, NodeSpec] = {}
    pending: list[tuple[str, str, ast.ClassDef | None, Path]] = []

    for path in _iter_scan_files(comfyui_dir):
        try:
            mappings, display_mappings, classes = _parse_python_file(path)
        except SyntaxError as exc:
            warnings.append(f"{path}: syntax error: {exc}")
            continue

        for node_type, class_name in mappings.items():
            pending.append((node_type, class_name, classes.get(class_name), path))

        for node_type, display_name in display_mappings.items():
            spec = specs.get(node_type)
            if spec is None:
                spec = NodeSpec(node_type=node_type)
                specs[node_type] = spec
            spec.display_name = display_name
            if "DEPRECATED" in display_name.upper():
                spec.deprecated = True

        if "comfy_api_nodes" in path.parts and path.name.startswith("nodes_"):
            _register_schema_nodes(path, specs, warnings)

    for node_type, _class_name, class_def, path in pending:
        if node_type in specs and specs[node_type].inputs:
            continue

        display_name = specs.get(node_type).display_name if node_type in specs else None
        deprecated = bool(display_name and "DEPRECATED" in display_name.upper())
        spec = NodeSpec(
            node_type=node_type,
            api_node=_class_is_api_node(class_def, file_path=path) if class_def else "comfy_api_nodes" in path.parts,
            deprecated=deprecated,
            display_name=display_name,
        )

        if class_def is not None:
            input_types = _input_types_return_dict(class_def)
            if input_types is None:
                warnings.append(f"{node_type}: static scan could not parse INPUT_TYPES in {path.name}")
            else:
                groups = _dict_string_keys(input_types)
                if groups:
                    _apply_input_group(spec, groups.get("required"))
                    _apply_input_group(spec, groups.get("optional"))
        else:
            warnings.append(f"{node_type}: class not found while scanning {path}")

        specs[node_type] = spec

    return specs, warnings
