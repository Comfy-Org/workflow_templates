#!/usr/bin/env python3
"""
Seed template_cache.json from index.mcp.json + workflow JSON source hashes.

Usage:
  python3 scripts/mcp/import_template_cache.py
  python3 scripts/mcp/import_template_cache.py --check
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

_MCP_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(_MCP_DIR))

from bootstrap import install_paths  # noqa: E402

install_paths()

from paths import TEMPLATE_CACHE_FILE  # noqa: E402
from template_cache import (  # noqa: E402
    import_templates_from_mcp,
    load_template_cache,
    migrate_legacy_cache,
    save_template_cache,
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Import template copy into template_cache.json")
    parser.add_argument("--check", action="store_true", help="Show what would be imported")
    args = parser.parse_args()

    before = migrate_legacy_cache(load_template_cache())
    before_keys = set(before.get("templates", {}))

    cache = migrate_legacy_cache(import_templates_from_mcp(dict(before)))
    new_keys = sorted(set(cache.get("templates", {})) - before_keys)

    print(f"Cache file: {TEMPLATE_CACHE_FILE}")
    print(f"Before: {len(before_keys)} entries")
    print(f"Would add/update: {len(new_keys)} entries")

    if args.check:
        for name in new_keys[:8]:
            print(f"  + {name}")
        return 0

    save_template_cache(cache)
    print(f"Written: {TEMPLATE_CACHE_FILE}")
    print(f"Total: {len(cache.get('templates', {}))} entries")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
