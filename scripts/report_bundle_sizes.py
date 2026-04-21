#!/usr/bin/env python3
"""Print the total disk usage per bundle as defined in bundles.json."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEMPLATES_DIR = ROOT / "templates"
BUNDLES_FILE = ROOT / "bundles.json"


def bytes_to_mb(size: int) -> float:
    return size / (1024 * 1024)


def gather_sizes() -> dict[str, int]:
    bundles = json.loads(BUNDLES_FILE.read_text())
    totals: dict[str, int] = {bundle: 0 for bundle in bundles}

    for bundle, template_ids in bundles.items():
        for template_id in template_ids:
            for path in TEMPLATES_DIR.glob(f"{template_id}*"):
                totals[bundle] += path.stat().st_size
    return totals


def main() -> None:
    totals = gather_sizes()
    grand_total = sum(totals.values())

    print("Bundle size report (MB):")
    for bundle, size in sorted(totals.items(), key=lambda item: item[1], reverse=True):
        print(f"  {bundle:12s}: {bytes_to_mb(size):6.2f} MB")
    print(f"  {'total':12s}: {bytes_to_mb(grand_total):6.2f} MB")


if __name__ == "__main__":
    main()
