"""Manual MCP template metadata overrides (recommend, freshness)."""

from __future__ import annotations

import json
from typing import Any

from json_format import dumps_compact_arrays
from paths import TEMPLATE_OVERRIDES_FILE
from recommend_score import recommend_from_usage

SCHEMA_VERSION = 1

VALID_RECOMMEND_LABELS = frozenset({
    "not_recommended",
    "low",
    "medium",
    "high",
    "top",
    "highly_recommended",
})

RECOMMEND_RANK: dict[str, int] = {
    "not_recommended": 0,
    "low": 1,
    "medium": 2,
    "high": 3,
    "top": 4,
    "highly_recommended": 5,
}

# MCP categories that must not fall below this recommend tier after sync.
CATEGORY_RECOMMEND_FLOOR: dict[str, str] = {
    "Use Cases": "low",
}


def empty_overrides() -> dict[str, Any]:
    return {"schema_version": SCHEMA_VERSION, "templates": {}}


def load_template_overrides(path=TEMPLATE_OVERRIDES_FILE) -> dict[str, Any]:
    if not path.is_file():
        return empty_overrides()
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        return empty_overrides()
    data.setdefault("schema_version", SCHEMA_VERSION)
    data.setdefault("templates", {})
    return data


def save_template_overrides(overrides: dict[str, Any], path=TEMPLATE_OVERRIDES_FILE) -> None:
    payload = {
        "schema_version": SCHEMA_VERSION,
        "templates": overrides.get("templates", {}),
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(dumps_compact_arrays(payload), encoding="utf-8")


def _clamp_recommend(label: str, floor: str | None) -> str:
    if not floor or label not in RECOMMEND_RANK or floor not in RECOMMEND_RANK:
        return label
    if RECOMMEND_RANK[label] < RECOMMEND_RANK[floor]:
        return floor
    return label


def resolve_recommend(
    usage: int | float | None,
    *,
    mcp_category: str | None,
    override: str | None = None,
) -> str:
    """Usage-based recommend, category floor, then optional manual override."""
    label = recommend_from_usage(usage)
    floor = CATEGORY_RECOMMEND_FLOOR.get(mcp_category or "")
    label = _clamp_recommend(label, floor)
    if override:
        if override not in VALID_RECOMMEND_LABELS:
            raise ValueError(
                f"Invalid recommend override {override!r}; "
                f"expected one of {sorted(VALID_RECOMMEND_LABELS)}"
            )
        label = _clamp_recommend(override, floor)
    return label
