"""Build node specs from /object_info JSON."""

from __future__ import annotations

import json
import urllib.request
from typing import Any

from models import (
    DYNAMIC_INPUT_TYPE_PREFIXES,
    FILESYSTEM_COMBO_INPUT_NAMES,
    DynamicComboBranch,
    NodeSpec,
)


def input_type_name(input_spec: Any) -> str | None:
    if isinstance(input_spec, str):
        return input_spec
    if isinstance(input_spec, (list, tuple)) and input_spec:
        first = input_spec[0]
        if isinstance(first, str):
            return first
        # Filesystem COMBO: [filename, filename, …] with optional {image_upload: true} meta.
        if isinstance(first, (list, tuple)):
            return "COMBO"
    return None


def is_dynamic_input_type(type_name: str | None) -> bool:
    if not type_name:
        return False
    return any(type_name.startswith(prefix) for prefix in DYNAMIC_INPUT_TYPE_PREFIXES)


def input_spec_meta(input_spec: Any) -> dict[str, Any]:
    if (
        isinstance(input_spec, (list, tuple))
        and len(input_spec) > 1
        and isinstance(input_spec[1], dict)
    ):
        return input_spec[1]
    return {}


def normalize_options(value: Any) -> list[str]:
    if not isinstance(value, (list, tuple)) or not value:
        return []
    first = value[0]
    if isinstance(first, (list, tuple)):
        return [str(item) for item in first]
    if first == "COMBO" and len(value) > 1 and isinstance(value[1], dict):
        options = value[1].get("options", [])
        if isinstance(options, list):
            return [str(item) for item in options]
    return []


def parse_dynamic_combo_branches(input_spec: Any) -> dict[str, DynamicComboBranch]:
    meta = input_spec_meta(input_spec)
    branches: dict[str, DynamicComboBranch] = {}
    for opt in meta.get("options", []):
        if not isinstance(opt, dict):
            continue
        key = str(opt.get("key", ""))
        if not key:
            continue
        branch = DynamicComboBranch()
        inputs_def = opt.get("inputs", {})
        if not isinstance(inputs_def, dict):
            continue
        for is_required, group_name in ((True, "required"), (False, "optional")):
            group = inputs_def.get(group_name, {}) or {}
            if not isinstance(group, dict):
                continue
            for nested_name, nested_spec in group.items():
                nested_name = str(nested_name)
                branch.input_order.append(nested_name)
                if is_required:
                    branch.required_inputs.add(nested_name)
                nested_type = input_type_name(nested_spec)
                if nested_type:
                    branch.input_types[nested_name] = nested_type
                    if nested_type.startswith("COMFY_AUTOGROW"):
                        branch.autogrow_inputs.add(nested_name)
                if input_spec_meta(nested_spec).get("control_after_generate"):
                    branch.control_after_generate.add(nested_name)
                nested_options = normalize_options(nested_spec)
                if nested_options:
                    branch.combo_options[nested_name] = nested_options
                nested_meta = input_spec_meta(nested_spec)
                if "default" in nested_meta:
                    branch.input_defaults[nested_name] = nested_meta["default"]
        branches[key] = branch
    return branches


def is_filesystem_combo(input_name: str, input_spec: Any, meta: dict[str, Any]) -> bool:
    if input_name in FILESYSTEM_COMBO_INPUT_NAMES:
        return True
    if meta.get("image_upload") or meta.get("video_upload") or meta.get("audio_upload"):
        return True
    if not isinstance(input_spec, (list, tuple)) or not input_spec:
        return False
    first = input_spec[0]
    if isinstance(first, (list, tuple)) and first and isinstance(first[0], str):
        media_ext = (
            ".safetensors",
            ".ckpt",
            ".pt",
            ".pth",
            ".sft",
            ".mp4",
            ".webm",
            ".png",
            ".jpg",
            ".jpeg",
            ".webp",
            ".glb",
            ".gltf",
            ".fbx",
            ".obj",
            ".stl",
            ".ply",
            ".usdz",
        )
        if any(str(item).endswith(media_ext) for item in first):
            return True
    return False


def add_input_spec(spec: NodeSpec, input_name: str, input_spec: Any, *, required: bool) -> None:
    spec.inputs.add(input_name)
    if required:
        spec.required_inputs.add(input_name)

    type_name = input_type_name(input_spec)
    if type_name:
        spec.input_types[input_name] = type_name
    if is_dynamic_input_type(type_name):
        spec.dynamic_inputs.add(input_name)

    meta = input_spec_meta(input_spec)
    if meta.get("control_after_generate"):
        spec.control_after_generate.add(input_name)
    if "default" in meta:
        spec.input_defaults[input_name] = meta["default"]
    if is_filesystem_combo(input_name, input_spec, meta):
        spec.filesystem_combo_inputs.add(input_name)
    if meta.get("image_upload") or meta.get("video_upload") or meta.get("audio_upload"):
        spec.upload_ghost_inputs.add(input_name)

    if type_name and type_name.startswith("COMFY_DYNAMICCOMBO"):
        branches = parse_dynamic_combo_branches(input_spec)
        if branches:
            spec.dynamic_combo_options[input_name] = branches

    options = normalize_options(input_spec)
    if options:
        spec.combo_options[input_name] = options

    if isinstance(input_spec, dict):
        for child_name, child_spec in input_spec.items():
            if child_name in {"tooltip", "default", "display", "forceInput", "lazy"}:
                continue
            add_input_spec(spec, f"{input_name}.{child_name}", child_spec, required=required)


def add_input_group(spec: NodeSpec, group: Any, *, required: bool) -> None:
    if not isinstance(group, dict):
        return
    for input_name, input_spec in group.items():
        add_input_spec(spec, input_name, input_spec, required=required)


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
        input_order = info.get("input_order", {})
        if isinstance(input_order, dict):
            spec.hidden_inputs = {str(name) for name in input_order.get("hidden", [])}
            spec.input_order = [
                *[str(name) for name in input_order.get("required", [])],
                *[str(name) for name in input_order.get("optional", [])],
            ]

        if isinstance(input_types, dict):
            add_input_group(spec, input_types.get("required", {}), required=True)
            add_input_group(spec, input_types.get("optional", {}), required=False)

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
