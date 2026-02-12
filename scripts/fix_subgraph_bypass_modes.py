#!/usr/bin/env python3
"""
Fix bypass/mute state inside subgraphs so workflows work correctly after
ComfyUI_frontend#8494 (bypass/mute no longer toggles nodes inside subgraphs).

For each workflow JSON in templates/, finds subgraphs whose nodes are all
bypassed (mode != 0) and sets those nodes to mode 0. That way unbypassing
the subgraph does not leave inner nodes still bypassed.

Skips index.json and any file whose name starts with "index" (e.g. index.zh.json,
index.schema.json).
"""

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEMPLATES_DIR = ROOT / "templates"


def is_workflow_file(path: Path) -> bool:
    """Exclude index and schema files; only process workflow JSONs."""
    name = path.name
    if not name.endswith(".json"):
        return False
    if name.startswith("index"):
        return False
    return True


def fix_subgraph_modes(workflow: dict) -> bool:
    """
    If any subgraph has all nodes with mode != 0, set those nodes to mode 0.
    Returns True if the workflow was modified.
    """
    if not isinstance(workflow, dict):
        return False
    definitions = workflow.get("definitions") or {}
    subgraphs = definitions.get("subgraphs") or []
    modified = False
    for subgraph in subgraphs:
        nodes = subgraph.get("nodes")
        if not nodes:
            continue
        if all(n.get("mode", 0) != 0 for n in nodes):
            modified = True
            for node in nodes:
                node["mode"] = 0
    return modified


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Reset bypassed subgraph node modes so unbypassing a subgraph works correctly (ComfyUI_frontend#8494)."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only print which files would be updated, do not write.",
    )
    parser.add_argument(
        "--templates-dir",
        type=Path,
        default=TEMPLATES_DIR,
        help=f"Templates directory (default: {TEMPLATES_DIR}).",
    )
    args = parser.parse_args()
    templates_dir = args.templates_dir
    if not templates_dir.is_absolute():
        templates_dir = ROOT / templates_dir
    if not templates_dir.exists():
        raise SystemExit(f"Templates directory not found: {templates_dir}")

    updated = []
    for path in sorted(templates_dir.iterdir()):
        if not path.is_file() or not is_workflow_file(path):
            continue
        try:
            text = path.read_text(encoding="utf-8")
            workflow = json.loads(text)
        except (json.JSONDecodeError, OSError) as e:
            print(f"Warning: skip {path.name}: {e}")
            continue
        if not fix_subgraph_modes(workflow):
            continue
        updated.append(path.name)
        if args.dry_run:
            print(f"Would update: {path.name}")
        else:
            path.write_text(
                json.dumps(workflow, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
            print(f"Updated: {path.name}")

    if not updated:
        print("No templates needed updates.")
    elif args.dry_run:
        print(f"Dry run: {len(updated)} file(s) would be updated.")


if __name__ == "__main__":
    main()
