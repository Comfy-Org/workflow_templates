#!/usr/bin/env python3
"""Check workflow templates against a local ComfyUI node registry.

This script loads NODE_CLASS_MAPPINGS from a local ComfyUI checkout and scans
template workflow JSON files for core nodes, inputs, and combo values that no
longer exist in that ComfyUI checkout.

It intentionally treats non-core custom/API/subgraph nodes as informational by
default because this repository contains workflows that depend on optional
extensions. Use --strict-unknown to report every unknown non-core node.
"""

from __future__ import annotations

import argparse
import asyncio
import importlib
import json
import re
import sys
import urllib.request
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

_lib_dir = Path(__file__).resolve().parent.parent / "lib"
if str(_lib_dir) not in sys.path:
    sys.path.insert(0, str(_lib_dir))

from locale_index_files import TEMPLATES_NON_WORKFLOW_FILES  # noqa: E402
from paths import TEMPLATES_DIR  # noqa: E402

DEFAULT_COMFYUI_DIR = Path("/Users/linmoumou/Documents/Github/ComfyUI")
CORE_CNR_ID = "comfy-core"
UUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-"
    r"[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)


@dataclass
class NodeSpec:
    node_type: str
    inputs: set[str] = field(default_factory=set)
    combo_options: dict[str, list[str]] = field(default_factory=dict)
    api_node: bool = False
    deprecated: bool = False
    display_name: str | None = None


@dataclass
class Issue:
    severity: str
    kind: str
    workflow: str
    node_id: str
    node_type: str
    message: str


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def normalize_options(value: Any) -> list[str]:
    """Return string combo options from an INPUT_TYPES field spec."""
    if not isinstance(value, (list, tuple)) or not value:
        return []

    first = value[0]
    if isinstance(first, (list, tuple)):
        return [str(item) for item in first]
    return []


def add_input_spec(spec: NodeSpec, input_name: str, input_spec: Any) -> None:
    """Record an input and any combo options, recursively handling nested API specs."""
    spec.inputs.add(input_name)
    options = normalize_options(input_spec)
    if options:
        spec.combo_options[input_name] = options

    if isinstance(input_spec, dict):
        for child_name, child_spec in input_spec.items():
            if child_name in {"tooltip", "default", "display", "forceInput", "lazy"}:
                continue
            add_input_spec(spec, f"{input_name}.{child_name}", child_spec)


def add_input_group(spec: NodeSpec, group: Any) -> None:
    if not isinstance(group, dict):
        return
    for input_name, input_spec in group.items():
        add_input_spec(spec, input_name, input_spec)


def get_input_spec(node_cls: type) -> dict[str, Any]:
    if not hasattr(node_cls, "INPUT_TYPES"):
        return {}

    try:
        input_types = node_cls.INPUT_TYPES()
    except Exception as exc:
        raise RuntimeError(f"INPUT_TYPES failed: {exc}") from exc

    if not isinstance(input_types, dict):
        return {}
    return input_types


def build_specs(comfyui_dir: Path, include_api_nodes: bool) -> tuple[dict[str, NodeSpec], list[str]]:
    """Load ComfyUI nodes.py and return specs for registered nodes."""
    warnings: list[str] = []
    comfyui_dir = comfyui_dir.resolve()
    if not (comfyui_dir / "nodes.py").exists():
        raise FileNotFoundError(f"Could not find nodes.py under {comfyui_dir}")

    if str(comfyui_dir) not in sys.path:
        sys.path.insert(0, str(comfyui_dir))

    cwd = Path.cwd()
    try:
        # Some ComfyUI modules resolve relative resources from the repo root.
        import os

        os.chdir(comfyui_dir)
        try:
            nodes = importlib.import_module("nodes")
        except ModuleNotFoundError as exc:
            raise RuntimeError(
                "Could not import the local ComfyUI checkout. Run this script with the "
                "same Python environment used by ComfyUI, or pass --object-info-url "
                "http://127.0.0.1:8188/object_info while ComfyUI is running."
            ) from exc

        if hasattr(nodes, "init_extra_nodes"):
            try:
                asyncio.run(
                    nodes.init_extra_nodes(
                        init_custom_nodes=False,
                        init_api_nodes=include_api_nodes,
                    )
                )
            except Exception as exc:
                warnings.append(f"Could not initialize ComfyUI extra nodes: {exc}")

        mappings = getattr(nodes, "NODE_CLASS_MAPPINGS", {})
        display_mappings = getattr(nodes, "NODE_DISPLAY_NAME_MAPPINGS", {})
    finally:
        import os

        os.chdir(cwd)

    specs: dict[str, NodeSpec] = {}
    for node_type, node_cls in mappings.items():
        display_name = display_mappings.get(node_type)
        deprecated = bool(display_name and "DEPRECATED" in display_name.upper())
        spec = NodeSpec(
            node_type=node_type,
            api_node=bool(getattr(node_cls, "API_NODE", False)),
            deprecated=deprecated,
            display_name=display_name,
        )

        try:
            input_types = get_input_spec(node_cls)
        except Exception as exc:
            warnings.append(f"{node_type}: {exc}")
            specs[node_type] = spec
            continue

        for group_name in ("required", "optional"):
            add_input_group(spec, input_types.get(group_name, {}))

        specs[node_type] = spec

    return specs, warnings


def build_specs_from_object_info(object_info: dict[str, Any]) -> dict[str, NodeSpec]:
    """Build node specs from ComfyUI /object_info JSON."""
    specs: dict[str, NodeSpec] = {}
    for node_type, info in object_info.items():
        if not isinstance(info, dict):
            continue

        display_name = info.get("display_name")
        spec = NodeSpec(
            node_type=node_type,
            api_node=bool(info.get("api_node")),
            deprecated=bool(info.get("deprecated"))
            or bool(display_name and "DEPRECATED" in str(display_name).upper()),
            display_name=str(display_name) if display_name else None,
        )

        input_types = info.get("input", {})
        if not isinstance(input_types, dict):
            specs[node_type] = spec
            continue

        for group_name in ("required", "optional"):
            add_input_group(spec, input_types.get(group_name, {}))

        specs[node_type] = spec

    return specs


def load_object_info_from_url(url: str) -> dict[str, Any]:
    with urllib.request.urlopen(url, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def iter_workflow_files(templates_dir: Path) -> list[Path]:
    ignored = set(TEMPLATES_NON_WORKFLOW_FILES)
    return sorted(
        path
        for path in templates_dir.glob("*.json")
        if path.name not in ignored and not path.name.startswith("index.")
    )


def workflow_nodes(data: Any) -> list[dict[str, Any]]:
    """Support ComfyUI graph/save format and API format."""
    if isinstance(data, dict) and isinstance(data.get("nodes"), list):
        return [node for node in data["nodes"] if isinstance(node, dict)]

    if isinstance(data, dict):
        nodes: list[dict[str, Any]] = []
        for node_id, node in data.items():
            if not isinstance(node, dict):
                continue
            node_type = node.get("class_type")
            if not node_type:
                continue
            nodes.append(
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
                }
            )
        return nodes

    return []


def node_is_core(node: dict[str, Any], specs: dict[str, NodeSpec]) -> bool:
    properties = node.get("properties") if isinstance(node.get("properties"), dict) else {}
    return properties.get("cnr_id") == CORE_CNR_ID or node.get("type") in specs


def is_subgraph_node_type(node_type: str) -> bool:
    """ComfyUI save-format workflows use UUID node types for embedded subgraphs."""
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


def check_node(
    workflow_name: str,
    node: dict[str, Any],
    specs: dict[str, NodeSpec],
    strict_unknown: bool,
) -> list[Issue]:
    issues: list[Issue] = []
    node_type = str(node.get("type", ""))
    node_id = str(node.get("id", ""))
    is_core = node_is_core(node, specs)

    spec = specs.get(node_type)
    if spec is None:
        if is_subgraph_node_type(node_type) and not strict_unknown:
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
                    message="Node type is not registered in the local ComfyUI checkout.",
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

    for input_item in node.get("inputs", []):
        if not isinstance(input_item, dict):
            continue
        input_name = input_item.get("name")
        if not input_name:
            continue
        if input_name not in spec.inputs:
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


def print_report(issues: list[Issue], warnings: list[str], total_workflows: int) -> None:
    print("ComfyUI node compatibility check")
    print(f"Checked workflows: {total_workflows}")
    print(f"Import warnings: {len(warnings)}")
    print(f"Issues found: {len(issues)}")
    print("Report persistence: stdout only (no log file is written unless --json-output is used).")

    if warnings:
        print("\nImport warnings:")
        for warning in warnings[:50]:
            print(f"  - {warning}")
        if len(warnings) > 50:
            print(f"  ... {len(warnings) - 50} more")

    if not issues:
        print("\nNo compatibility issues found.")
        return

    by_workflow: dict[str, list[Issue]] = {}
    for issue in issues:
        by_workflow.setdefault(issue.workflow, []).append(issue)

    print("\nTemplates that need review/update:")
    for workflow in sorted(by_workflow):
        workflow_issues = by_workflow[workflow]
        error_count = sum(1 for issue in workflow_issues if issue.severity == "error")
        warning_count = sum(1 for issue in workflow_issues if issue.severity == "warning")
        print(f"  - {workflow} ({error_count} error(s), {warning_count} warning(s))")

    print("\nCompatibility issues:")
    for workflow in sorted(by_workflow):
        print(f"\n{workflow}")
        for issue in by_workflow[workflow]:
            print(
                f"  [{issue.severity}] {issue.kind}: node {issue.node_id} "
                f"`{issue.node_type}` - {issue.message}"
            )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Scan workflow templates for ComfyUI node compatibility issues."
    )
    parser.add_argument(
        "--comfyui-dir",
        type=Path,
        default=DEFAULT_COMFYUI_DIR,
        help=f"Local ComfyUI checkout path (default: {DEFAULT_COMFYUI_DIR})",
    )
    parser.add_argument(
        "--object-info-url",
        help=(
            "Use a running ComfyUI /object_info endpoint instead of importing nodes.py "
            "(example: http://127.0.0.1:8188/object_info)."
        ),
    )
    parser.add_argument(
        "--object-info-json",
        type=Path,
        help="Use a saved /object_info JSON file instead of importing nodes.py.",
    )
    parser.add_argument(
        "--templates-dir",
        type=Path,
        default=TEMPLATES_DIR,
        help=f"Workflow templates directory (default: {TEMPLATES_DIR})",
    )
    parser.add_argument(
        "--no-api-nodes",
        action="store_true",
        help="Do not load ComfyUI built-in API nodes.",
    )
    parser.add_argument(
        "--strict-unknown",
        action="store_true",
        help="Report unknown non-core/custom nodes as warnings.",
    )
    parser.add_argument(
        "--json-output",
        type=Path,
        help="Optional path to write a machine-readable JSON report.",
    )
    args = parser.parse_args()

    warnings: list[str] = []
    if args.object_info_url:
        specs = build_specs_from_object_info(load_object_info_from_url(args.object_info_url))
    elif args.object_info_json:
        specs = build_specs_from_object_info(load_json(args.object_info_json))
    else:
        specs, warnings = build_specs(args.comfyui_dir, include_api_nodes=not args.no_api_nodes)

    issues: list[Issue] = []
    workflow_files = iter_workflow_files(args.templates_dir)
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

        for node in workflow_nodes(data):
            issues.extend(
                check_node(
                    workflow_name=workflow_file.name,
                    node=node,
                    specs=specs,
                    strict_unknown=args.strict_unknown,
                )
            )

    print_report(issues, warnings, total_workflows=len(workflow_files))

    if args.json_output:
        report = {
            "comfyui_dir": str(args.comfyui_dir),
            "object_info_url": args.object_info_url,
            "object_info_json": str(args.object_info_json) if args.object_info_json else None,
            "templates_dir": str(args.templates_dir),
            "checked_workflows": len(workflow_files),
            "warnings": warnings,
            "issues": [asdict(issue) for issue in issues],
        }
        args.json_output.parent.mkdir(parents=True, exist_ok=True)
        args.json_output.write_text(json.dumps(report, indent=2), encoding="utf-8")

    return 1 if any(issue.severity == "error" for issue in issues) else 0


if __name__ == "__main__":
    raise SystemExit(main())
