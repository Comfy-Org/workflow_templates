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

from models import CORE_CNR_ID, UUID_RE, Issue, NodeSpec


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


def widget_values_by_input(node: dict[str, Any]) -> dict[str, Any]:
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


def format_node_location(node_id: str, scope: str) -> str:
    return f"{node_id} ({scope})" if scope else node_id


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
            if not input_name or input_name in spec.inputs:
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

    values = widget_values_by_input(node)
    for input_name, options in spec.combo_options.items():
        if input_name not in values:
            continue
        value = values[input_name]
        if value is None or isinstance(value, (int, float, bool)):
            continue
        if str(value) not in options:
            kind = "invalid_api_model" if spec.api_node and is_model_input(input_name) else "invalid_combo_value"
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
