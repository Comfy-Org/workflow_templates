#!/usr/bin/env python3
"""
Merge scripts/data/mcp/template_cache.json into index.mcp.json.

Only entries whose source_hash matches the current workflow JSON are applied.

Usage:
  python3 scripts/mcp/apply_template_cache.py
  python3 scripts/mcp/apply_template_cache.py --check
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

_MCP_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(_MCP_DIR))

from bootstrap import install_paths  # noqa: E402

install_paths()

from ai_context import MCP_FILE, load_mcp_data  # noqa: E402
from json_format import dumps_compact_arrays  # noqa: E402
from paths import TEMPLATE_CACHE_FILE  # noqa: E402
from template_cache import (  # noqa: E402
    apply_template_cache_to_mcp,
    cache_matches_workflow,
    load_template_cache,
    templates_needing_enhance,
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Apply template_cache.json to index.mcp.json")
    parser.add_argument("--check", action="store_true", help="Show cache stats only")
    args = parser.parse_args()

    cache = load_template_cache()
    templates = cache.get("templates", {})
    valid = sum(1 for name, entry in templates.items() if cache_matches_workflow(name, entry))
    print(f"Cache: {TEMPLATE_CACHE_FILE}")
    print(f"  entries: {len(templates)}")
    print(f"  hash-valid: {valid}")
    print(f"  stale: {len(templates) - valid}")

    if args.check:
        return 0

    if not MCP_FILE.is_file():
        print(f"Missing {MCP_FILE}. Run scripts/mcp/sync_index.py first.", file=sys.stderr)
        return 1

    mcp_data = load_mcp_data()
    names = [tpl["name"] for group in mcp_data for tpl in group.get("templates", [])]
    stale = templates_needing_enhance(cache, names)
    if stale:
        print(f"Note: {len(stale)} templates need re-enhance (workflow hash changed)")

    tpl_applied = apply_template_cache_to_mcp(mcp_data, cache)
    MCP_FILE.write_text(dumps_compact_arrays(mcp_data), encoding="utf-8")

    print(f"Applied template overlays: {tpl_applied}")
    print(f"Written: {MCP_FILE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
