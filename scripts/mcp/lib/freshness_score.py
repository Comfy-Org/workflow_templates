"""Map template index dates to MCP freshness labels."""

from __future__ import annotations

from datetime import date, datetime

# (maximum age in days inclusive, label) — checked from youngest band down.
FRESHNESS_TIERS: tuple[tuple[int, str], ...] = (
    (30, "new"),
    (90, "recent"),
    (180, "current"),
)

DEFAULT_FRESHNESS = "established"


def _parse_index_date(raw: str | None) -> date | None:
    if not raw or not isinstance(raw, str):
        return None
    text = raw.strip()
    if not text:
        return None
    try:
        return datetime.strptime(text, "%Y-%m-%d").date()
    except ValueError:
        return None


def freshness_from_date(
    raw_date: str | None,
    *,
    as_of: date | None = None,
) -> str:
    """Return freshness label from an index.json `date` (YYYY-MM-DD)."""
    template_date = _parse_index_date(raw_date)
    if template_date is None:
        return ""
    today = as_of or date.today()
    age_days = max(0, (today - template_date).days)
    for max_age, label in FRESHNESS_TIERS:
        if age_days <= max_age:
            return label
    return DEFAULT_FRESHNESS
