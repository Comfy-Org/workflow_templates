"""Map template usage counts to MCP recommend labels."""

from __future__ import annotations

# Discrete tiers below the top band (usage < TOP_USAGE_THRESHOLD).
BASE_TIERS: tuple[tuple[int, str], ...] = (
    (500, "high"),
    (200, "medium"),
    (50, "low"),
    (0, "not_recommended"),
)

TOP_USAGE_THRESHOLD = 1000
HIGHLY_RECOMMENDED_THRESHOLD = 2500


def recommend_from_usage(usage: int | float | None) -> str:
    """Return semantic recommend label for a template usage count."""
    count = max(0, int(usage or 0))
    if count >= HIGHLY_RECOMMENDED_THRESHOLD:
        return "highly_recommended"
    if count >= TOP_USAGE_THRESHOLD:
        return "top"
    for threshold, label in BASE_TIERS:
        if count >= threshold:
            return label
    return "not_recommended"
