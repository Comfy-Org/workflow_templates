"""Run-click coverage check for the Algolia usage bake.

Usage data (from ``temp/usage.csv``) is keyed by the Algolia ``slug``; it lands on
a template only when that slug equals the template ``name``. A low match rate means
the slug↔name convention drifted and usage would be silently zeroed — so the bake
reports coverage and warns loudly when it collapses.

Kept as a standalone leaf module (stdlib only, no side-effecting imports) so it's
safe to import from tests without dragging in the full sync pipeline.
"""

from typing import Dict, Tuple

# ~77% coverage is healthy (some templates aren't in Algolia yet); below 50% signals
# a real slug↔name join break, where coverage craters toward 0.
RUN_CLICK_COVERAGE_WARN_THRESHOLD = 0.5


def compute_run_click_coverage(master_data: list, usage_data: Dict[str, int]) -> Tuple[int, int]:
    """Return (covered, total): templates whose ``name`` has a run-click CSV entry."""
    total = 0
    covered = 0
    for category in master_data:
        for template in category.get("templates", []):
            total += 1
            if template.get("name", "") in usage_data:
                covered += 1
    return covered, total


def log_run_click_coverage(master_data: list, usage_data: Dict[str, int]) -> None:
    """Print run-click coverage; warn when it drops below threshold (join likely drifted).

    Uses print() so the signal is always visible — the syncer's logger has no
    handlers configured, so logger.info here would be swallowed in CLI/CI runs.
    """
    if not usage_data:
        return
    covered, total = compute_run_click_coverage(master_data, usage_data)
    rate = covered / total if total else 0
    print(f"  📊 Run-click coverage: {covered}/{total} ({rate:.0%})")
    if rate < RUN_CLICK_COVERAGE_WARN_THRESHOLD:
        threshold = f"{RUN_CLICK_COVERAGE_WARN_THRESHOLD:.0%}"
        print(
            f"  ⚠️  Only {covered}/{total} templates got run-click data (< {threshold}) "
            f"— Algolia slug↔name join may have drifted."
        )
