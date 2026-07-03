#!/usr/bin/env python3
"""
Regenerate scripts/data/frozen_bundle_inventory.json from bundles.json + version policy.

See scripts/docs/frozen_bundles.md
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

_LIB_DIR = Path(__file__).resolve().parent.parent / "lib"
if str(_LIB_DIR) not in sys.path:
    sys.path.insert(0, str(_LIB_DIR))

from paths import FROZEN_BUNDLE_INVENTORY_FILE, REPO_ROOT, VERSION_POLICY_FILE  # noqa: E402
from version_policy import (  # noqa: E402
    build_frozen_bundle_inventory,
    load_bundles,
    load_version_policy,
)


def main() -> int:
    policy = load_version_policy(VERSION_POLICY_FILE)
    bundles = load_bundles(REPO_ROOT / "bundles.json")
    inventory = build_frozen_bundle_inventory(
        bundles,
        policy,
        REPO_ROOT / "pyproject.toml",
    )
    FROZEN_BUNDLE_INVENTORY_FILE.write_text(
        json.dumps(inventory, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    total = sum(len(entry["templates"]) for entry in inventory["bundles"].values())
    print(f"Wrote {FROZEN_BUNDLE_INVENTORY_FILE} ({total} templates across frozen bundles)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
