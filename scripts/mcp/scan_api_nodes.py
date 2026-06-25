#!/usr/bin/env python3
"""
Scan comfy_api_nodes source for API node model dropdown options.

Reads ComfyUI path from repo-root `.env` (COMFYUI_REPO_PATH) and scans
`{COMFYUI_REPO_PATH}/comfy_api_nodes/nodes_*.py`.

Usage:
  python3 scripts/mcp/scan_api_nodes.py
  python3 scripts/mcp/scan_api_nodes.py --check
  python3 scripts/mcp/scan_api_nodes.py --workflow api_hailuo_minimax_t2v
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_MCP_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(_MCP_DIR))

from bootstrap import install_paths  # noqa: E402

install_paths()

from comfyui_paths import resolve_comfy_api_nodes_dir  # noqa: E402
from json_format import dumps_compact_arrays  # noqa: E402
from paths import API_NODE_OPTIONS_FILE, TEMPLATES_DIR  # noqa: E402
from scan_api_node_models import model_options_for_workflow, scan_api_nodes_dir  # noqa: E402

OUTPUT_FILE = API_NODE_OPTIONS_FILE


def main() -> int:
    parser = argparse.ArgumentParser(description="Scan ComfyUI API node model options")
    parser.add_argument("--check", action="store_true", help="Print summary without writing")
    parser.add_argument(
        "--workflow",
        metavar="NAME",
        help="Show model options for API nodes in templates/{NAME}.json",
    )
    args = parser.parse_args()

    api_nodes_dir = resolve_comfy_api_nodes_dir()
    index = scan_api_nodes_dir(api_nodes_dir)

    if args.workflow:
        wf_path = TEMPLATES_DIR / f"{args.workflow}.json"
        if not wf_path.exists():
            print(f"Workflow not found: {wf_path}", file=sys.stderr)
            return 1
        mapping = model_options_for_workflow(wf_path, index)
        print(json.dumps(mapping, indent=2, ensure_ascii=False))
        return 0

    with_model = sum(1 for m in index.values() if m.get("model_options"))
    print(f"Scanned: {api_nodes_dir}")
    print(f"Nodes with model dropdown: {with_model}")

    if args.check:
        for node_id in sorted(index)[:8]:
            opts = index[node_id]["model_options"]
            print(f"  {node_id}: {opts}")
        if with_model > 8:
            print(f"    ... and {with_model - 8} more")
        return 0

    payload = {
        "source": str(api_nodes_dir),
        "node_count": len(index),
        "nodes": index,
    }
    OUTPUT_FILE.write_text(dumps_compact_arrays(payload), encoding="utf-8")
    print(f"Written: {OUTPUT_FILE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
