#!/usr/bin/env python3
"""Sync the `isApp` flag from each workflow file into templates/index.json.

A workflow can be viewed as a node graph or as an App, and the author picks
which one it opens in. That choice is stored in the workflow itself, as
`extra.linearMode`. Nothing in `index.json` carried it, so consumers had to
guess from the filename: anything ending in `.app` was treated as an App.

The guess is wrong in both directions. It misses App Mode workflows whose name
does not end in `.app` (`template_qwen_image_illustration_lora` is one), and it
cannot be fixed by renaming, because the same guess is what made the hub site
show 14 apps instead of 55.

Reading `extra.linearMode` needs no network: the workflow files sit next to the
index. This writes the answer into the index so the app, the site and anything
else can filter on a real field.

`linearMode` is only meaningful as "the author chose App Mode". Its absence is a
normal node-graph workflow, so absent and `false` both write `isApp: false`.

Usage:
    python scripts/sync/sync_is_app.py
    python scripts/sync/sync_is_app.py --dry-run
    python scripts/sync/sync_is_app.py --check    # non-zero exit if stale (CI)
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

_lib_dir = Path(__file__).resolve().parent.parent / "lib"
if str(_lib_dir) not in sys.path:
    sys.path.insert(0, str(_lib_dir))

from paths import TEMPLATES_DIR  # noqa: E402

INDEX_FILENAME = "index.json"


def workflow_is_app(templates_dir: Path, name: str) -> bool:
    """Whether the workflow file for `name` opens in App Mode.

    A missing or unreadable workflow answers False. The index is the thing being
    corrected here, so a template with no file on disk is a separate problem and
    `validate_templates.py` is what reports it.
    """
    path = templates_dir / f"{name}.json"
    if not path.is_file():
        return False

    try:
        with path.open(encoding="utf-8") as handle:
            data = json.load(handle)
    except (OSError, json.JSONDecodeError):
        return False

    extra = data.get("extra")
    if not isinstance(extra, dict):
        return False

    return extra.get("linearMode") is True


def collect_changes(
    templates_dir: Path, categories: List[Dict[str, Any]]
) -> List[Tuple[str, bool, bool]]:
    """Return (name, current, desired) for every entry whose isApp is wrong."""
    changes: List[Tuple[str, bool, bool]] = []
    for category in categories:
        for template in category.get("templates", []):
            name = template.get("name")
            if not name:
                continue
            desired = workflow_is_app(templates_dir, name)
            current = bool(template.get("isApp", False))
            if current != desired:
                changes.append((name, current, desired))
    return changes


def apply_changes(categories: List[Dict[str, Any]], templates_dir: Path) -> int:
    """Write isApp onto every entry. Returns the number of entries changed."""
    changed = 0
    for category in categories:
        for template in category.get("templates", []):
            name = template.get("name")
            if not name:
                continue
            desired = workflow_is_app(templates_dir, name)
            current = bool(template.get("isApp", False))
            if desired:
                # Only written when true, to keep the index diff small and match
                # how the other optional booleans here behave.
                if not current:
                    changed += 1
                template["isApp"] = True
            else:
                if "isApp" in template:
                    changed += 1
                    del template["isApp"]
    return changed


def format_index(categories: List[Dict[str, Any]]) -> str:
    """Serialise index.json the way the other sync scripts do.

    Plain `json.dump(indent=2)` puts every array element on its own line, which
    rewrites the whole file and buries a small change in thousands of diff lines.
    This mirrors `sync_custom_nodes.save_index_file` so a one-field edit shows up
    as a one-field diff. Arrays are joined without a space after the comma, which
    is how the committed index.json is written; the older script adds one and
    would rewrite every tag line.
    """
    json_str = json.dumps(categories, ensure_ascii=False, indent=2)

    def compact_array(match: "re.Match[str]") -> str:
        content = match.group(1)
        try:
            array_content = json.loads(f"[{content}]")
        except json.JSONDecodeError:
            return match.group(0)
        if all(isinstance(item, str) for item in array_content) and len(content) < 200:
            return f"[{','.join(json.dumps(item, ensure_ascii=False) for item in array_content)}]"
        return match.group(0)

    return re.sub(r"\[\s*\n\s*([^[\]]*?)\s*\n\s*\]", compact_array, json_str, flags=re.DOTALL)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Sync isApp from each workflow's extra.linearMode into index.json",
    )
    parser.add_argument(
        "--templates-dir",
        default=str(TEMPLATES_DIR),
        help="Directory holding the workflow files and index.json",
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Report what would change, write nothing"
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Exit non-zero if index.json is out of date; implies --dry-run",
    )
    args = parser.parse_args()

    templates_dir = Path(args.templates_dir)
    index_path = templates_dir / INDEX_FILENAME
    if not index_path.is_file():
        print(f"error: {index_path} not found", file=sys.stderr)
        return 1

    with index_path.open(encoding="utf-8") as handle:
        categories = json.load(handle)

    changes = collect_changes(templates_dir, categories)

    if args.check or args.dry_run:
        for name, current, desired in changes:
            print(f"  {name}: isApp {current} -> {desired}")
        if not changes:
            print("index.json is up to date")
            return 0
        print(f"{len(changes)} entr{'y' if len(changes) == 1 else 'ies'} out of date")
        return 1 if args.check else 0

    changed = apply_changes(categories, templates_dir)
    if changed == 0:
        print("index.json is up to date")
        return 0

    index_path.write_text(format_index(categories), encoding="utf-8")

    print(f"Updated {changed} entr{'y' if changed == 1 else 'ies'} in {index_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
