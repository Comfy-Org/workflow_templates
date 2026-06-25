#!/usr/bin/env python3
"""
One-off maintenance: apply Krea snapshot descriptions to models_registry.json.

Temporary tool — planned for removal together with scripts/data/krea_*_models.json
and krea_registry_aliases.json once registry seeding is complete.

Usage:
  python3 scripts/maintenance/sync_registry_from_krea.py --check
  python3 scripts/maintenance/sync_registry_from_krea.py
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_SCRIPTS_LIB = Path(__file__).resolve().parents[1] / "lib"
_MAINTENANCE_DIR = Path(__file__).resolve().parent
for entry in (_SCRIPTS_LIB, _MAINTENANCE_DIR):
    path = str(entry)
    if path not in sys.path:
        sys.path.insert(0, path)

from krea_registry_sync import load_krea_entries, merge_krea_into_registry  # noqa: E402
from paths import DATA_DIR, MODELS_REGISTRY_FILE  # noqa: E402

KREA_IMAGE = DATA_DIR / "krea_image_models.json"
KREA_VIDEO = DATA_DIR / "krea_video_models.json"
ALIASES_FILE = DATA_DIR / "krea_registry_aliases.json"
REGISTRY_FILE = MODELS_REGISTRY_FILE


def main() -> int:
    parser = argparse.ArgumentParser(description="One-off: sync models_registry from Krea snapshots")
    parser.add_argument("--check", action="store_true", help="Print diff summary without writing")
    args = parser.parse_args()

    registry = json.loads(REGISTRY_FILE.read_text(encoding="utf-8"))
    aliases: dict[str, str | None] = json.loads(ALIASES_FILE.read_text(encoding="utf-8"))
    krea_entries = load_krea_entries(KREA_IMAGE, KREA_VIDEO)

    updated, changes, skipped = merge_krea_into_registry(registry, krea_entries, aliases)

    print(f"Krea models: {len(krea_entries)}")
    print(f"Registry entries updated: {len(changes)}")
    print(f"Krea models skipped (no registry match): {len(skipped)}")

    if changes:
        print("\nUpdated:")
        for key in sorted(changes):
            fields = ", ".join(changes[key])
            print(f"  {key} ({fields})")
            old_s = registry[key].get("summary", "")
            new_s = updated[key].get("summary", "")
            if old_s != new_s:
                print(f"    - {old_s[:80]}{'...' if len(old_s) > 80 else ''}")
                print(f"    + {new_s[:80]}{'...' if len(new_s) > 80 else ''}")

    if skipped:
        print("\nSkipped Krea names:")
        for name in sorted(skipped):
            print(f"  - {name}")

    if args.check:
        return 0

    REGISTRY_FILE.write_text(
        json.dumps(updated, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"\nWritten: {REGISTRY_FILE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
