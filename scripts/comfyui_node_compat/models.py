from __future__ import annotations

import re
from dataclasses import dataclass, field

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
    "missing_input": "Node input was removed or renamed — update widget/link wiring.",
    "invalid_json": "Workflow JSON could not be parsed — fix syntax before publishing.",
    "deprecated_node": "Node is marked deprecated — consider migrating to the recommended replacement.",
}

# Most urgent first when rendering logs and reports.
ISSUE_KIND_PRIORITY: tuple[str, ...] = (
    "invalid_api_model",
    "missing_node",
    "invalid_combo_value",
    "missing_input",
    "invalid_json",
    "deprecated_node",
)

ISSUE_TIER_LABELS: dict[str, str] = {
    "critical": "1) Critical — API model no longer available (fix first)",
    "errors": "2) Errors — removed nodes, invalid inputs, or combo values",
    "warnings": "3) Warnings — deprecated nodes and other review items",
}

ERROR_ISSUE_KINDS = frozenset(
    {"invalid_api_model", "missing_node", "invalid_combo_value", "missing_input", "invalid_json"}
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


def issue_kind_label(kind: str) -> str:
    labels = {
        "missing_node": "Removed node",
        "deprecated_node": "Deprecated node",
        "missing_input": "Removed/renamed input",
        "invalid_combo_value": "Invalid dropdown value",
        "invalid_api_model": "Invalid API model",
        "invalid_json": "Invalid JSON",
    }
    return labels.get(kind, kind)
