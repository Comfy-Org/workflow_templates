from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

CORE_CNR_ID = "comfy-core"
UUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-"
    r"[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)

DEFAULT_OBJECT_INFO_URL = "http://127.0.0.1:8188/object_info"
COMFYUI_OBJECT_INFO_URL_ENV = "COMFYUI_OBJECT_INFO_URL"

ISSUE_KIND_HELP: dict[str, str] = {
    "invalid_api_model": "API model slug is no longer available — update the model selection.",
    "missing_node": "Core node type no longer exists in ComfyUI — replace or remove the node.",
    "invalid_combo_value": "Dropdown value is no longer valid — pick a current option in ComfyUI.",
    "invalid_widget_value": (
        "Widget value type or slot does not match the node schema — likely widget drift "
        "after a node update."
    ),
    "widget_slot_mismatch": (
        "Saved widget slots no longer match the node schema — this can send values to the "
        "wrong inputs and break execution. Re-open and re-save the node in ComfyUI."
    ),
    "missing_input": "Node input was removed or renamed — update widget/link wiring.",
    "invalid_json": "Workflow JSON could not be parsed — fix syntax before publishing.",
    "deprecated_node": (
        "Node is marked deprecated — consider migrating to the recommended replacement."
    ),
}

# Most urgent first when rendering logs and reports.
ISSUE_KIND_PRIORITY: tuple[str, ...] = (
    "invalid_api_model",
    "widget_slot_mismatch",
    "missing_node",
    "invalid_widget_value",
    "invalid_combo_value",
    "missing_input",
    "invalid_json",
    "deprecated_node",
)

ISSUE_TIER_LABELS: dict[str, str] = {
    "critical": "1) Critical — will likely fail or run with wrong inputs (fix first)",
    "errors": "2) Errors — removed nodes, invalid inputs, or combo values",
    "warnings": "3) Warnings — deprecated nodes and other review items",
}

ERROR_ISSUE_KINDS = frozenset(
    {
        "invalid_api_model",
        "missing_node",
        "widget_slot_mismatch",
        "invalid_widget_value",
        "invalid_combo_value",
        "missing_input",
        "invalid_json",
    }
)

CRITICAL_ISSUE_KINDS = frozenset({"invalid_api_model", "widget_slot_mismatch"})

# ComfyUI v3 widget types that expand into dotted sub-inputs in saved workflows
# (e.g. values.a, resize_type.width, images.image0).
DYNAMIC_INPUT_TYPE_PREFIXES: tuple[str, ...] = (
    "COMFY_AUTOGROW",
    "COMFY_DYNAMICCOMBO",
    "COMFY_MATCHTYPE",
)

# Combo inputs whose options come from the local models/input folders at runtime,
# not from a fixed node schema (templates ship filenames users download separately).
FILESYSTEM_COMBO_INPUT_NAMES: frozenset[str] = frozenset(
    {
        "vae_name",
        "ckpt_name",
        "unet_name",
        "clip_name",
        "clip_name1",
        "clip_name2",
        "lora_name",
        "lora_1",
        "lora_2",
        "image",
        "file",
        "audio",
        "video",
        "model_name",
        "model_file",
        "weight_name",
    }
)


# Trailing widgets_values tokens ComfyUI adds for upload UI (not separate INPUT_TYPES keys).
UPLOAD_GHOST_SUFFIX_VALUES: frozenset[str] = frozenset({"image", "video"})

# Seed control widget values ComfyUI may append or omit independently of the seed INT.
CONTROL_AFTER_GENERATE_VALUES: frozenset[str] = frozenset(
    {"randomize", "fixed", "increment", "decrement"}
)

# Frontend-only input row types that never appear in /object_info INPUT_TYPES.
FRONTEND_ONLY_INPUT_TYPES: frozenset[str] = frozenset({"IMAGEUPLOAD"})


@dataclass
class DynamicComboBranch:
    """Nested widget schema for one COMFY_DYNAMICCOMBO_V3 option key."""

    input_order: list[str] = field(default_factory=list)
    input_types: dict[str, str] = field(default_factory=dict)
    required_inputs: set[str] = field(default_factory=set)
    control_after_generate: set[str] = field(default_factory=set)
    combo_options: dict[str, list[str]] = field(default_factory=dict)
    autogrow_inputs: set[str] = field(default_factory=set)
    input_defaults: dict[str, Any] = field(default_factory=dict)


@dataclass
class NodeSpec:
    node_type: str
    inputs: set[str] = field(default_factory=set)
    required_inputs: set[str] = field(default_factory=set)
    dynamic_inputs: set[str] = field(default_factory=set)
    input_order: list[str] = field(default_factory=list)
    hidden_inputs: set[str] = field(default_factory=set)
    input_types: dict[str, str] = field(default_factory=dict)
    control_after_generate: set[str] = field(default_factory=set)
    combo_options: dict[str, list[str]] = field(default_factory=dict)
    filesystem_combo_inputs: set[str] = field(default_factory=set)
    upload_ghost_inputs: set[str] = field(default_factory=set)
    input_defaults: dict[str, Any] = field(default_factory=dict)
    dynamic_combo_options: dict[str, dict[str, DynamicComboBranch]] = field(default_factory=dict)
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


def issue_kind_label(kind: str) -> str:
    labels = {
        "missing_node": "Removed node",
        "deprecated_node": "Deprecated node",
        "missing_input": "Removed/renamed input",
        "invalid_combo_value": "Invalid dropdown value",
        "invalid_widget_value": "Invalid widget value",
        "widget_slot_mismatch": "Widget slot mismatch",
        "invalid_api_model": "Invalid API model",
        "invalid_json": "Invalid JSON",
    }
    return labels.get(kind, kind)
