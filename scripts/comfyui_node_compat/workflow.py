"""Scan workflow template JSON files."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import sys

_lib_dir = Path(__file__).resolve().parent.parent / "lib"
if str(_lib_dir) not in sys.path:
    sys.path.insert(0, str(_lib_dir))

from locale_index_files import TEMPLATES_NON_WORKFLOW_FILES  # noqa: E402

from models import (
    CORE_CNR_ID,
    UUID_RE,
    CONTROL_AFTER_GENERATE_VALUES,
    DynamicComboBranch,
    FRONTEND_ONLY_INPUT_TYPES,
    Issue,
    NodeSpec,
    UPLOAD_GHOST_SUFFIX_VALUES,
    DYNAMIC_INPUT_TYPE_PREFIXES,
)


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def iter_workflow_files(templates_dir: Path) -> list[Path]:
    ignored = set(TEMPLATES_NON_WORKFLOW_FILES)
    return sorted(
        path
        for path in templates_dir.glob("*.json")
        if path.name not in ignored and not path.name.startswith("index.")
    )


def _append_save_format_nodes(
    nodes: list[tuple[dict[str, Any], str]],
    node_list: Any,
    scope: str,
) -> None:
    if not isinstance(node_list, list):
        return
    for node in node_list:
        if isinstance(node, dict):
            nodes.append((node, scope))


def iter_workflow_nodes(data: Any) -> list[tuple[dict[str, Any], str]]:
    if isinstance(data, dict) and isinstance(data.get("nodes"), list):
        nodes: list[tuple[dict[str, Any], str]] = []
        _append_save_format_nodes(nodes, data["nodes"], "")

        definitions = data.get("definitions") or {}
        for subgraph in definitions.get("subgraphs") or []:
            if not isinstance(subgraph, dict):
                continue
            sg_id = subgraph.get("id", "unknown")
            _append_save_format_nodes(nodes, subgraph.get("nodes"), f"subgraph {sg_id}")
        return nodes

    if isinstance(data, dict):
        nodes: list[tuple[dict[str, Any], str]] = []
        for node_id, node in data.items():
            if not isinstance(node, dict):
                continue
            node_type = node.get("class_type")
            if not node_type:
                continue
            nodes.append(
                (
                    {
                        "id": node_id,
                        "type": node_type,
                        "inputs": [
                            {"name": name, "link": value if isinstance(value, list) else None}
                            for name, value in node.get("inputs", {}).items()
                        ],
                        "widgets_values": {
                            name: value
                            for name, value in node.get("inputs", {}).items()
                            if not isinstance(value, list)
                        },
                    },
                    "",
                )
            )
        return nodes

    return []


def node_is_core(node: dict[str, Any], specs: dict[str, NodeSpec]) -> bool:
    properties = node.get("properties") if isinstance(node.get("properties"), dict) else {}
    return properties.get("cnr_id") == CORE_CNR_ID or node.get("type") in specs


def is_subgraph_node_type(node_type: str) -> bool:
    return bool(UUID_RE.match(node_type))


def linked_input_names(node: dict[str, Any]) -> set[str]:
    """Socket inputs connected by graph links — not widget slots.

    Save-format nodes sometimes set ``link`` on widget rows too; those still
    store values in ``widgets_values`` and must not be treated as linked.
    """
    linked: set[str] = set()
    for input_item in node.get("inputs", []):
        if not isinstance(input_item, dict):
            continue
        if input_item.get("link") is None:
            continue
        widget = input_item.get("widget")
        if isinstance(widget, dict) and widget.get("name"):
            continue
        name = input_item.get("name")
        if name:
            linked.add(str(name))
    return linked


def split_input_type_names(type_name: str) -> list[str]:
    return [part.strip() for part in type_name.split(",") if part.strip()]


WIDGET_INPUT_TYPES = frozenset({"STRING", "INT", "FLOAT", "BOOLEAN", "COMBO"})


def is_widget_backed_input(type_name: str | None) -> bool:
    if not type_name:
        return False
    if any(type_name.startswith(prefix) for prefix in DYNAMIC_INPUT_TYPE_PREFIXES):
        return True
    return bool(WIDGET_INPUT_TYPES.intersection(split_input_type_names(type_name)))


def is_dynamic_combo_type(type_name: str | None) -> bool:
    return bool(type_name and type_name.startswith("COMFY_DYNAMICCOMBO"))


def is_autogrow_type(type_name: str | None) -> bool:
    return bool(type_name and type_name.startswith("COMFY_AUTOGROW"))


def is_skipped_hidden_input(name: str, spec: NodeSpec) -> bool:
    if name not in spec.hidden_inputs:
        return False
    return not is_widget_backed_input(spec.input_types.get(name))


def input_is_linked(name: str, linked_inputs: set[str], spec: NodeSpec) -> bool:
    if name in linked_inputs:
        return True
    type_name = spec.input_types.get(name)
    if is_autogrow_type(type_name) or (
        type_name and type_name.startswith("COMFY_MATCHTYPE")
    ):
        prefix = f"{name}."
        return any(linked_name.startswith(prefix) for linked_name in linked_inputs)
    return False


def widget_slot_names(spec: NodeSpec, linked_inputs: set[str]) -> list[str]:
    return [
        name
        for name in spec.input_order
        if not is_skipped_hidden_input(name, spec)
        and not input_is_linked(name, linked_inputs, spec)
        and is_widget_backed_input(spec.input_types.get(name))
    ]


def _consume_dynamic_combo_branch(
    values: list[Any],
    index: int,
    branch: DynamicComboBranch,
    mapped: dict[str, Any],
    *,
    parent_name: str,
    linked: set[str],
) -> int:
    for nested_name in branch.input_order:
        if nested_name in branch.autogrow_inputs:
            continue
        if f"{parent_name}.{nested_name}" in linked:
            continue
        if index >= len(values):
            break
        mapped[nested_name] = values[index]
        index += 1
        if should_consume_control_after_generate(
            nested_name,
            values,
            index,
            branch.control_after_generate,
        ):
            index += 1
    return index


def should_consume_control_after_generate(
    name: str,
    values: list[Any],
    index: int,
    control_after_generate: set[str],
) -> bool:
    if index >= len(values):
        return False
    if name in control_after_generate:
        return True
    return name == "seed" and values[index] in CONTROL_AFTER_GENERATE_VALUES


def map_widgets_by_input_order(node: dict[str, Any], spec: NodeSpec) -> dict[str, Any]:
    values = node.get("widgets_values")
    if not isinstance(values, list) or not spec.input_order:
        return {}

    linked = linked_input_names(node)
    mapped, _index = _map_widgets_from_list(values, spec, linked)
    return mapped


def _map_widgets_from_list(
    values: list[Any],
    spec: NodeSpec,
    linked: set[str],
) -> tuple[dict[str, Any], int]:
    mapped: dict[str, Any] = {}
    index = 0
    for name in widget_slot_names(spec, linked):
        if index >= len(values):
            break
        type_name = spec.input_types.get(name)
        if is_dynamic_combo_type(type_name):
            selected_key = values[index]
            index += 1
            mapped[name] = selected_key
            branch = spec.dynamic_combo_options.get(name, {}).get(str(selected_key))
            if branch:
                index = _consume_dynamic_combo_branch(
                    values,
                    index,
                    branch,
                    mapped,
                    parent_name=name,
                    linked=linked,
                )
            continue

        mapped[name] = values[index]
        index += 1
        if should_consume_control_after_generate(name, values, index, spec.control_after_generate):
            index += 1
    return mapped, index


def _default_for_input(spec: NodeSpec, input_name: str) -> Any | None:
    if input_name in spec.input_defaults:
        return spec.input_defaults[input_name]
    for branches in spec.dynamic_combo_options.values():
        for branch in branches.values():
            if input_name in branch.input_defaults:
                return branch.input_defaults[input_name]
    return None


def _is_omittable_default(input_name: str, spec: NodeSpec) -> bool:
    if input_name in spec.required_inputs:
        return False
    default = _default_for_input(spec, input_name)
    if default is None:
        return True
    return default in ("", False, 0, 0.0)


def _iter_unmapped_widget_slots(
    spec: NodeSpec,
    linked: set[str],
    mapped: dict[str, Any],
) -> list[str]:
    unmapped: list[str] = []
    for name in widget_slot_names(spec, linked):
        if name in mapped:
            continue
        type_name = spec.input_types.get(name)
        if is_dynamic_combo_type(type_name):
            unmapped.append(name)
            continue
        unmapped.append(name)
    return unmapped


def _is_ignorable_tail_value(value: Any) -> bool:
    if isinstance(value, str) and value in CONTROL_AFTER_GENERATE_VALUES:
        return True
    if isinstance(value, str) and value in UPLOAD_GHOST_SUFFIX_VALUES:
        return True
    return False


def check_widget_slot_alignment(
    node: dict[str, Any],
    spec: NodeSpec,
) -> tuple[bool, str | None]:
    """Return (ok, message) using the same walker as widget value mapping."""
    values = node.get("widgets_values")
    if not isinstance(values, list) or not spec.input_order:
        return True, None

    linked = linked_input_names(node)
    mapped, consumed = _map_widgets_from_list(values, spec, linked)
    actual = len(values)

    if consumed == actual:
        missing_required = [
            name
            for name in _iter_unmapped_widget_slots(spec, linked, mapped)
            if name in spec.required_inputs
        ]
        if missing_required:
            return False, (
                f"required widget(s) {missing_required!r} missing from widgets_values "
                f"({actual} slot(s) present)."
            )
        return True, None

    if consumed < actual:
        tail = values[consumed:]
        if tail and all(_is_ignorable_tail_value(item) for item in tail):
            return True, None
        return False, (
            f"widgets_values has {actual} slot(s) but schema walk consumed {consumed} "
            f"(extra tail: {tail!r}). Re-open and re-save the node in ComfyUI."
        )

    # consumed > actual: ComfyUI omitted trailing optional defaults or seed-control slots.
    missing_slots = _iter_unmapped_widget_slots(spec, linked, mapped)
    shortfall = consumed - actual
    omittable = [name for name in missing_slots if _is_omittable_default(name, spec)]
    control_only = shortfall <= sum(
        1 for name in widget_slot_names(spec, linked) if name in spec.control_after_generate
    )
    if len(omittable) >= shortfall or control_only:
        still_required = [name for name in missing_slots if name in spec.required_inputs]
        if still_required:
            return False, (
                f"required widget(s) {still_required!r} missing from widgets_values "
                f"({actual} slot(s) present)."
            )
        return True, None

    return False, (
        f"widgets_values has {actual} slot(s) but schema walk expects {consumed} "
        f"(missing {shortfall} slot(s)). Re-open and re-save the node in ComfyUI."
    )


def expected_widget_slot_count(node: dict[str, Any], spec: NodeSpec) -> int:
    values = node.get("widgets_values")
    if not isinstance(values, list):
        return 0
    linked = linked_input_names(node)
    expected = 0
    value_index = 0

    for name in widget_slot_names(spec, linked):
        type_name = spec.input_types.get(name)
        if is_dynamic_combo_type(type_name):
            expected += 1
            if value_index < len(values):
                branch = spec.dynamic_combo_options.get(name, {}).get(str(values[value_index]))
                value_index += 1
                if branch:
                    for nested_name in branch.input_order:
                        if nested_name in branch.autogrow_inputs:
                            continue
                        expected += 1
                        if nested_name in branch.control_after_generate:
                            expected += 1
            continue
        expected += 1
        if name in spec.control_after_generate:
            expected += 1
    return expected


def widget_values_by_input(node: dict[str, Any], spec: NodeSpec | None = None) -> dict[str, Any]:
    def flatten(value: Any, prefix: str) -> dict[str, Any]:
        if not isinstance(value, dict):
            return {prefix: value}
        flattened: dict[str, Any] = {}
        for key, child_value in value.items():
            child_prefix = f"{prefix}.{key}" if prefix else str(key)
            flattened.update(flatten(child_value, child_prefix))
        return flattened

    values = node.get("widgets_values")
    if isinstance(values, dict):
        flattened_values: dict[str, Any] = {}
        for input_name, value in values.items():
            flattened_values.update(flatten(value, str(input_name)))
        return flattened_values

    if not isinstance(values, list):
        return {}

    if spec and spec.input_order:
        mapped = map_widgets_by_input_order(node, spec)
        if mapped:
            return mapped

    widget_inputs: list[str] = []
    for input_item in node.get("inputs", []):
        if not isinstance(input_item, dict):
            continue
        widget = input_item.get("widget")
        if isinstance(widget, dict) and widget.get("name"):
            widget_inputs.append(str(widget["name"]))

    mapped_values: dict[str, Any] = {}
    for index, input_name in enumerate(widget_inputs):
        if index >= len(values):
            continue
        mapped_values.update(flatten(values[index], input_name))
    return mapped_values


def is_model_input(input_name: str) -> bool:
    return input_name == "model" or input_name.endswith(".model") or input_name.endswith("_model")


def value_matches_input_type(value: Any, type_name: str, *, required: bool) -> bool:
    if is_dynamic_combo_type(type_name):
        return isinstance(value, str)
    if value == "" and not required:
        return True
    if value is None and not required:
        return True

    type_names = split_input_type_names(type_name)
    if "STRING" in type_names and isinstance(value, str):
        return True
    if "COMBO" in type_names and isinstance(value, str):
        return True
    if "INT" in type_names and type(value) is int:
        return True
    if "FLOAT" in type_names and isinstance(value, (int, float)) and not isinstance(value, bool):
        return True
    if "BOOLEAN" in type_names and isinstance(value, bool):
        return True
    return False


def validation_maps_for_values(
    spec: NodeSpec,
    values: dict[str, Any],
) -> tuple[dict[str, str], set[str], dict[str, list[str]]]:
    type_map = dict(spec.input_types)
    required_inputs = set(spec.required_inputs)
    combo_options = dict(spec.combo_options)

    for combo_name, branches in spec.dynamic_combo_options.items():
        selected_key = values.get(combo_name)
        if selected_key is None:
            continue
        branch = branches.get(str(selected_key))
        if branch is None:
            continue
        type_map.update(branch.input_types)
        required_inputs.update(branch.required_inputs)
        combo_options.update(branch.combo_options)

    return type_map, required_inputs, combo_options


def misplaced_combo_message(
    node: dict[str, Any],
    spec: NodeSpec,
    values: dict[str, Any],
    combo_options: dict[str, list[str]],
) -> str | None:
    widgets_values = node.get("widgets_values")
    if not isinstance(widgets_values, list):
        return None

    for input_name, options in combo_options.items():
        if not is_model_input(input_name):
            continue
        mapped_value = values.get(input_name)
        if mapped_value is not None and str(mapped_value) in options:
            continue
        for raw_index, raw_value in enumerate(widgets_values):
            if str(raw_value) not in options:
                continue
            expected_index = None
            if input_name in spec.input_order:
                expected_index = spec.input_order.index(input_name)
            return (
                f"model value `{raw_value}` appears at widgets_values[{raw_index}] but "
                f"`{input_name}` mapped to `{mapped_value}`"
                + (
                    f" (schema position {expected_index})."
                    if expected_index is not None
                    else "."
                )
            )
    return None


def check_widget_values(
    workflow_name: str,
    node: dict[str, Any],
    spec: NodeSpec,
    node_id: str,
    node_type: str,
    values: dict[str, Any],
) -> list[Issue]:
    issues: list[Issue] = []
    widgets_values = node.get("widgets_values")
    if spec.api_node and isinstance(widgets_values, list) and spec.input_order:
        ok, message = check_widget_slot_alignment(node, spec)
        if not ok and message:
            return [
                Issue(
                    severity="error",
                    kind="widget_slot_mismatch",
                    workflow=workflow_name,
                    node_id=node_id,
                    node_type=node_type,
                    message=message,
                )
            ]

    type_map, required_inputs, combo_options = validation_maps_for_values(spec, values)
    if spec.api_node:
        message = misplaced_combo_message(node, spec, values, combo_options)
        if message:
            return [
                Issue(
                    severity="error",
                    kind="widget_slot_mismatch",
                    workflow=workflow_name,
                    node_id=node_id,
                    node_type=node_type,
                    message=(
                        f"{message} widgets_values are likely shifted after an API node "
                        "schema update; re-open and re-save the node in ComfyUI."
                    ),
                )
            ]

    for input_name, value in values.items():
        type_name = type_map.get(input_name)
        if not type_name:
            continue
        if is_dynamic_combo_type(type_name):
            branches = spec.dynamic_combo_options.get(input_name, {})
            if str(value) not in branches:
                kind = (
                    "invalid_api_model"
                    if spec.api_node and is_model_input(input_name)
                    else "invalid_combo_value"
                )
                issues.append(
                    Issue(
                        severity="error",
                        kind=kind,
                        workflow=workflow_name,
                        node_id=node_id,
                        node_type=node_type,
                        message=(
                            f"Value `{value}` for dynamic combo `{input_name}` is not available "
                            "in current INPUT_TYPES."
                        ),
                    )
                )
            continue
        if any(str(type_name).startswith(prefix) for prefix in DYNAMIC_INPUT_TYPE_PREFIXES):
            continue
        required = input_name in required_inputs
        if not value_matches_input_type(value, type_name, required=required):
            if not spec.api_node:
                continue
            issues.append(
                Issue(
                    severity="error",
                    kind="invalid_widget_value",
                    workflow=workflow_name,
                    node_id=node_id,
                    node_type=node_type,
                    message=(
                        f"Widget `{input_name}` has value `{value!r}` but the node expects "
                        f"type `{type_name}` — values may be misaligned after a node update."
                    ),
                )
            )

    for input_name, options in combo_options.items():
        if input_name in spec.filesystem_combo_inputs:
            continue
        if input_name not in values:
            continue
        value = values[input_name]
        if value is None or value == "":
            continue
        if isinstance(value, (int, float, bool)):
            continue
        if str(value) not in options:
            kind = (
                "invalid_api_model"
                if spec.api_node and is_model_input(input_name)
                else "invalid_combo_value"
            )
            issues.append(
                Issue(
                    severity="error",
                    kind=kind,
                    workflow=workflow_name,
                    node_id=node_id,
                    node_type=node_type,
                    message=(
                        f"Value `{value}` for combo input `{input_name}` is not available "
                        "in current INPUT_TYPES."
                    ),
                )
            )

    return issues


def format_node_location(node_id: str, scope: str) -> str:
    return f"{node_id} ({scope})" if scope else node_id


def input_matches_spec(input_name: str, spec: NodeSpec) -> bool:
    """Return True when a workflow input slot matches the node baseline.

    Saved workflows expand dynamic widgets (AUTOGROW, DYNAMICCOMBO, MATCHTYPE)
    into dotted names such as ``values.a`` or ``resize_type.match``, while
    /object_info only lists the parent key (``values``, ``resize_type``).
    """
    if input_name in spec.inputs:
        return True
    if "." not in input_name:
        return False
    prefix = input_name.split(".", 1)[0]
    return prefix in spec.dynamic_inputs


def is_frontend_only_input(input_item: dict[str, Any]) -> bool:
    input_type = str(input_item.get("type", ""))
    if input_type in FRONTEND_ONLY_INPUT_TYPES:
        return True
    name = str(input_item.get("name", ""))
    if name == "upload" and isinstance(input_item.get("widget"), dict):
        return True
    return False


def is_ghost_rename_input(
    input_item: dict[str, Any],
    node: dict[str, Any],
    spec: NodeSpec,
) -> bool:
    """Stale input row kept after a socket rename (e.g. geometry → da3_geometry)."""
    if input_item.get("link") is not None:
        return False
    input_type = input_item.get("type")
    if not input_type:
        return False
    input_name = str(input_item.get("name", ""))
    if input_name in spec.inputs:
        return False
    for other in node.get("inputs", []):
        if not isinstance(other, dict):
            continue
        other_name = str(other.get("name", ""))
        if other_name not in spec.inputs:
            continue
        if other.get("type") != input_type:
            continue
        if other.get("link") is not None:
            return True
    return False


def check_node(
    workflow_name: str,
    node: dict[str, Any],
    specs: dict[str, NodeSpec],
    strict_unknown: bool,
    scope: str = "",
    *,
    static_baseline: bool = False,
) -> list[Issue]:
    issues: list[Issue] = []
    node_type = str(node.get("type", ""))
    node_id = format_node_location(str(node.get("id", "")), scope)
    is_core = node_is_core(node, specs)

    spec = specs.get(node_type)
    if spec is None:
        if is_subgraph_node_type(node_type) and not strict_unknown:
            return issues
        if static_baseline:
            return issues
        if is_core or strict_unknown:
            severity = "error" if is_core else "warning"
            issues.append(
                Issue(
                    severity=severity,
                    kind="missing_node",
                    workflow=workflow_name,
                    node_id=node_id,
                    node_type=node_type,
                    message="Node type is not registered in the ComfyUI baseline.",
                )
            )
        return issues

    if spec.deprecated:
        issues.append(
            Issue(
                severity="warning",
                kind="deprecated_node",
                workflow=workflow_name,
                node_id=node_id,
                node_type=node_type,
                message=f"Node display name is marked deprecated: {spec.display_name}",
            )
        )

    if static_baseline:
        return issues

    if spec.inputs:
        for input_item in node.get("inputs", []):
            if not isinstance(input_item, dict):
                continue
            input_name = input_item.get("name")
            if not input_name or input_matches_spec(str(input_name), spec):
                continue
            if is_frontend_only_input(input_item):
                continue
            if is_ghost_rename_input(input_item, node, spec):
                continue
            issues.append(
                Issue(
                    severity="error",
                    kind="missing_input",
                    workflow=workflow_name,
                    node_id=node_id,
                    node_type=node_type,
                    message=f"Input `{input_name}` is not in current INPUT_TYPES.",
                )
            )

    values = widget_values_by_input(node, spec)
    issues.extend(
        check_widget_values(
            workflow_name,
            node,
            spec,
            node_id,
            node_type,
            values,
        )
    )

    return issues


def scan_templates(
    templates_dir: Path,
    specs: dict[str, NodeSpec],
    *,
    strict_unknown: bool,
    static_baseline: bool = False,
) -> tuple[list[Issue], list[Path]]:
    issues: list[Issue] = []
    workflow_files = iter_workflow_files(templates_dir)
    for workflow_file in workflow_files:
        try:
            data = load_json(workflow_file)
        except Exception as exc:
            issues.append(
                Issue(
                    severity="error",
                    kind="invalid_json",
                    workflow=workflow_file.name,
                    node_id="-",
                    node_type="-",
                    message=str(exc),
                )
            )
            continue

        for node, scope in iter_workflow_nodes(data):
            issues.extend(
                check_node(
                    workflow_name=workflow_file.name,
                    node=node,
                    specs=specs,
                    strict_unknown=strict_unknown,
                    scope=scope,
                    static_baseline=static_baseline,
                )
            )
    return issues, workflow_files
