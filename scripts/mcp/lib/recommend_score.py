"""Map template usage counts to MCP recommend labels."""

from __future__ import annotations

from datetime import date

from freshness_score import FRESHNESS_TIERS, _parse_index_date

# Align with freshness "new" band (templates still gathering usage data).
NEW_TEMPLATE_GRACE_DAYS = FRESHNESS_TIERS[0][0]

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


def template_age_days(raw_date: str | None, *, as_of: date | None = None) -> int | None:
    """Return age in days from index.json `date`, or None when missing/invalid."""
    template_date = _parse_index_date(raw_date)
    if template_date is None:
        return None
    today = as_of or date.today()
    return max(0, (today - template_date).days)


def is_new_template(raw_date: str | None, *, as_of: date | None = None) -> bool:
    """True when the template was published within the freshness ``new`` window."""
    age = template_age_days(raw_date, as_of=as_of)
    if age is None:
        return False
    return age <= NEW_TEMPLATE_GRACE_DAYS
