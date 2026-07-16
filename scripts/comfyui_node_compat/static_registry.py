"""Statically scan a ComfyUI checkout for node definitions (no torch import)."""

from __future__ import annotations

import ast
from pathlib import Path

from models import NodeSpec

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


def _const_bool(node: ast.AST | None) -> bool | None:
    if isinstance(node, ast.Constant) and isinstance(node.value, bool):
        return node.value
    return None


def _display_name_is_deprecated(display_name: str | None) -> bool:
    return bool(display_name and "DEPRECATED" in display_name.upper())


def _is_schema_call(node: ast.Call) -> bool:
    return _class_name(node.func) == "Schema"


def _class_attr_value(class_def: ast.ClassDef, attr: str) -> ast.AST | None:
    for node in class_def.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == attr:
                    return node.value
        elif isinstance(node, ast.AnnAssign):
            if isinstance(node.target, ast.Name) and node.target.id == attr:
                return node.value
    return None


def _class_is_api_node(class_def: ast.ClassDef, *, file_path: Path) -> bool:
    if "comfy_api_nodes" in file_path.parts:
        return True
    if _const_bool(_class_attr_value(class_def, "API_NODE")) is True:
        return True
    if _const_bool(_class_attr_value(class_def, "is_api_node")) is True:
        return True
    for node in class_def.body:
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        if node.name != "define_schema":
            continue
        for child in ast.walk(node):
            if not isinstance(child, ast.Call) or not _is_schema_call(child):
                continue
            for kw in child.keywords:
                if kw.arg == "is_api_node" and _const_bool(kw.value) is True:
                    return True
    return False


def _class_marks_deprecated(class_def: ast.ClassDef) -> bool:
    """True if the class marks itself deprecated via V3 Schema or class attrs."""
    if _const_bool(_class_attr_value(class_def, "is_deprecated")) is True:
        return True
    if _const_bool(_class_attr_value(class_def, "DEPRECATED")) is True:
        return True
    display_name = _string_value(_class_attr_value(class_def, "display_name"))
    if _display_name_is_deprecated(display_name):
        return True

    for node in class_def.body:
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        if node.name != "define_schema":
            continue
        for child in ast.walk(node):
            if not isinstance(child, ast.Call) or not _is_schema_call(child):
                continue
            meta = _schema_call_meta(child)
            if meta is not None and meta[2]:
                return True
    return False


def _schema_call_meta(call: ast.Call) -> tuple[str, str | None, bool, bool] | None:
    """Extract (node_id, display_name, deprecated, is_api_node) from IO.Schema(...)."""
    kwargs = {kw.arg: kw.value for kw in call.keywords if kw.arg}
    node_id = _string_value(kwargs.get("node_id"))
    if not node_id:
        return None
    display_name = _string_value(kwargs.get("display_name"))
    deprecated = _const_bool(kwargs.get("is_deprecated")) is True
    deprecated = deprecated or _display_name_is_deprecated(display_name)
    is_api_node = _const_bool(kwargs.get("is_api_node")) is True
    return node_id, display_name, deprecated, is_api_node


def _upsert_node_spec(
    specs: dict[str, NodeSpec],
    node_id: str,
    *,
    display_name: str | None,
    deprecated: bool,
    api_node: bool | None = None,
) -> None:
    existing = specs.get(node_id)
    if existing is None:
        specs[node_id] = NodeSpec(
            node_type=node_id,
            api_node=bool(api_node),
            deprecated=deprecated,
            display_name=display_name,
        )
        return
    if display_name:
        existing.display_name = display_name
    if deprecated:
        existing.deprecated = True
    if api_node is True:
        existing.api_node = True


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


def _register_v3_nodes(path: Path, specs: dict[str, NodeSpec], warnings: list[str]) -> None:
    """Register ComfyUI V3 nodes from Schema(...) and class-level node_id attrs.

    Deprecation is detected from:
    - Schema(..., is_deprecated=True)  — preferred modern flag
    - class attribute is_deprecated / DEPRECATED = True
    - display_name containing "DEPRECATED" (legacy)
    """
    try:
        source = path.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(path))
    except OSError as exc:
        warnings.append(f"{path}: {exc}")
        return
    except SyntaxError as exc:
        warnings.append(f"{path}: syntax error: {exc}")
        return

    api_default = "comfy_api_nodes" in path.parts

    for node in ast.walk(tree):
        if not isinstance(node, ast.Call) or not _is_schema_call(node):
            continue
        meta = _schema_call_meta(node)
        if meta is None:
            continue
        node_id, display_name, deprecated, schema_api_node = meta
        _upsert_node_spec(
            specs,
            node_id,
            display_name=display_name,
            deprecated=deprecated,
            api_node=True if api_default or schema_api_node else None,
        )

    for class_def in (n for n in tree.body if isinstance(n, ast.ClassDef)):
        node_id = _string_value(_class_attr_value(class_def, "node_id"))
        if not node_id:
            continue
        display_name = _string_value(_class_attr_value(class_def, "display_name"))
        deprecated = _class_marks_deprecated(class_def)
        _upsert_node_spec(
            specs,
            node_id,
            display_name=display_name,
            deprecated=deprecated,
            api_node=True if api_default or _class_is_api_node(class_def, file_path=path) else None,
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
            _upsert_node_spec(
                specs,
                node_type,
                display_name=display_name,
                deprecated=_display_name_is_deprecated(display_name),
            )

        # V3 Schema / class-level node_id (comfy_api_nodes + comfy_extras, etc.)
        _register_v3_nodes(path, specs, warnings)

    for node_type, _class_name, class_def, path in pending:
        existing = specs.get(node_type)
        if existing is not None and existing.inputs:
            if class_def is not None and _class_marks_deprecated(class_def):
                existing.deprecated = True
            continue

        display_name = existing.display_name if existing is not None else None
        if class_def is not None:
            class_display = _string_value(_class_attr_value(class_def, "display_name"))
            if class_display:
                display_name = class_display

        deprecated = bool(existing.deprecated) if existing is not None else False
        deprecated = deprecated or _display_name_is_deprecated(display_name)
        if class_def is not None:
            deprecated = deprecated or _class_marks_deprecated(class_def)

        api_node = (
            _class_is_api_node(class_def, file_path=path)
            if class_def
            else "comfy_api_nodes" in path.parts
        )
        if existing is not None and existing.api_node:
            api_node = True

        spec = NodeSpec(
            node_type=node_type,
            api_node=api_node,
            deprecated=deprecated,
            display_name=display_name,
        )

        if class_def is not None:
            input_types = _input_types_return_dict(class_def)
            if input_types is None:
                # V3 nodes use define_schema instead of INPUT_TYPES — already registered.
                if not any(
                    isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) and n.name == "define_schema"
                    for n in class_def.body
                ):
                    warnings.append(f"{node_type}: static scan could not parse INPUT_TYPES in {path.name}")
            else:
                groups = _dict_string_keys(input_types)
                if groups:
                    _apply_input_group(spec, groups.get("required"))
                    _apply_input_group(spec, groups.get("optional"))
        else:
            warnings.append(f"{node_type}: class not found while scanning {path}")

        # Preserve any earlier schema-driven deprecation/api flags if we replace the spec.
        if existing is not None:
            if existing.deprecated:
                spec.deprecated = True
            if existing.api_node:
                spec.api_node = True
            if existing.display_name and not spec.display_name:
                spec.display_name = existing.display_name
            if existing.inputs and not spec.inputs:
                spec.inputs = existing.inputs
                spec.combo_options = existing.combo_options

        specs[node_type] = spec

    return specs, warnings
