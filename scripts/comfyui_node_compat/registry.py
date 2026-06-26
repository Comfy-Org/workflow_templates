"""Build node specs from /object_info JSON."""

from __future__ import annotations

import json
import urllib.request
from typing import Any

from models import NodeSpec


def normalize_options(value: Any) -> list[str]:
    if not isinstance(value, (list, tuple)) or not value:
        return []
    first = value[0]
    if isinstance(first, (list, tuple)):
        return [str(item) for item in first]
    return []


def add_input_spec(spec: NodeSpec, input_name: str, input_spec: Any) -> None:
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


def build_specs_from_object_info(object_info: dict[str, Any]) -> dict[str, NodeSpec]:
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
        if isinstance(input_types, dict):
            for group_name in ("required", "optional"):
                add_input_group(spec, input_types.get(group_name, {}))

        specs[node_type] = spec
    return specs


def load_object_info_from_url(url: str) -> dict[str, Any]:
    with urllib.request.urlopen(url, timeout=30) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("object_info response must be a JSON object")
    return payload


def probe_object_info_url(url: str) -> bool:
    try:
        load_object_info_from_url(url)
        return True
    except Exception:
        return False
