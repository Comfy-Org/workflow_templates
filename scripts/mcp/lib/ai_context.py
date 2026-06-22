"""Shared loaders and helpers for MCP AI enhancement scripts."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from paths import MODELS_REGISTRY_FILE, TEMPLATES_DIR

INDEX_FILE = TEMPLATES_DIR / "index.json"
MCP_FILE = TEMPLATES_DIR / "index.mcp.json"
REGISTRY_FILE = MODELS_REGISTRY_FILE

# Provider / utility keys — skip unless --include-skipped
REGISTRY_SKIP_MODELS = frozenset({"None", "Google", "Nvidia", "Lightricks"})

PENDING_SUMMARY_MARKERS = (
    "pending update",
    "pending model-specific profile",
    "provider placeholder",
    "placeholder for utility",
)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_index_templates() -> dict[str, dict[str, Any]]:
    """Map template name → index.json entry plus source group title."""
    by_name: dict[str, dict[str, Any]] = {}
    for group in load_json(INDEX_FILE):
        group_title = group.get("title", "")
        for tpl in group.get("templates", []):
            entry = dict(tpl)
            entry["_index_group"] = group_title
            by_name[tpl["name"]] = entry
    return by_name


def load_mcp_data() -> list[dict[str, Any]]:
    return load_json(MCP_FILE)


def iter_mcp_templates(
    mcp_data: list[dict[str, Any]],
) -> list[tuple[str, str, dict[str, Any]]]:
    """Yield (category, category_description, template) for each MCP template."""
    rows: list[tuple[str, str, dict[str, Any]]] = []
    for group in mcp_data:
        category = group.get("category", "")
        category_desc = group.get("description", "")
        for tpl in group.get("templates", []):
            rows.append((category, category_desc, tpl))
    return rows


def model_template_usage(
    mcp_data: list[dict[str, Any]],
    *,
    limit_per_model: int = 8,
) -> dict[str, list[dict[str, Any]]]:
    """Map model name → brief template context (sorted by usage desc)."""
    usage: dict[str, list[dict[str, Any]]] = {}
    for category, _category_desc, tpl in iter_mcp_templates(mcp_data):
        model = tpl.get("model", "")
        if not model:
            continue
        usage.setdefault(model, []).append(
            {
                "name": tpl.get("name"),
                "title": tpl.get("title"),
                "category": category,
                "task": tpl.get("task"),
                "usage": tpl.get("usage", 0),
                "io": tpl.get("io"),
                "capabilities": tpl.get("capabilities"),
            }
        )
    for model, templates in usage.items():
        templates.sort(key=lambda row: row.get("usage", 0), reverse=True)
        usage[model] = templates[:limit_per_model]
    return usage


def registry_needs_update(name: str, profile: dict[str, Any]) -> bool:
    summary = (profile.get("summary") or "").lower()
    if any(marker in summary for marker in PENDING_SUMMARY_MARKERS):
        return True
    if not profile.get("capabilities"):
        return True
    return False


def is_auto_description(description: str) -> bool:
    """Heuristic: description looks like sync_index auto_description output."""
    text = description.strip()
    return text.endswith(
        (
            "This workflow runs on Comfy Cloud and executes quickly.",
            "This workflow calls a third-party API. Execution time depends on server-side response.",
        )
    )
