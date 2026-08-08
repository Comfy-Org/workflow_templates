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

# Distinguishes "no isApp key" from "isApp: null" when reporting. `.get("isApp")`
# returns None for both, which would print an explicit null as "absent".
ABSENT = object()


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


def entry_is_canonical(template: Dict[str, Any], desired: bool) -> bool:
    """Whether the entry already stores `desired` in its canonical form.

    Canonical is `isApp: true` present for an App and the key absent otherwise,
    so the index diff stays small and matches how the other optional booleans
    here behave. An explicit `isApp: false` and any non-boolean value are both
    non-canonical and count as out of date.

    `plan_changes` and `apply_changes` both decide through this. When they read
    the stored field independently they can disagree: `bool(...)` accepted an
    explicit `isApp: false`, so `--check` reported the index clean while the
    write pass would still have deleted the field, and a truthy non-boolean such
    as `"yes"` was left in place because the write pass counted no change and
    returned before writing.
    """
    if desired:
        return template.get("isApp") is True
    return "isApp" not in template


def plan_changes(
    templates_dir: Path, categories: List[Dict[str, Any]]
) -> Tuple[List[Tuple[str, Any, bool]], Dict[int, bool]]:
    """Read every workflow once and return the diff plus the desired values.

    The desired value is keyed by `id()` of the template dict so the write pass
    can reuse it. Reading the files twice (once to report, once to write) parsed
    all 574 workflows twice on every run.

    Each change carries the raw stored value rather than a coerced boolean, so a
    stale `false` or an invalid `"yes"` is visible in the report instead of being
    flattened into the same output as an absent field. A missing key reports as
    `ABSENT` rather than None, so an explicit `isApp: null` is not disguised as
    an absent one.
    """
    changes: List[Tuple[str, Any, bool]] = []
    desired_by_entry: Dict[int, bool] = {}
    for category in categories:
        for template in category.get("templates", []):
            name = template.get("name")
            if not name:
                continue
            desired = workflow_is_app(templates_dir, name)
            desired_by_entry[id(template)] = desired
            if not entry_is_canonical(template, desired):
                changes.append((name, template.get("isApp", ABSENT), desired))
    return changes, desired_by_entry


def apply_changes(categories: List[Dict[str, Any]], desired_by_entry: Dict[int, bool]) -> int:
    """Write isApp onto every entry from the already-computed plan."""
    changed = 0
    for category in categories:
        for template in category.get("templates", []):
            desired = desired_by_entry.get(id(template))
            if desired is None:
                continue
            if entry_is_canonical(template, desired):
                continue
            changed += 1
            if desired:
                template["isApp"] = True
            else:
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

    changes, desired_by_entry = plan_changes(templates_dir, categories)

    if args.check or args.dry_run:
        for name, current, desired in changes:
            stored = "absent" if current is ABSENT else json.dumps(current)
            print(f"  {name}: isApp {stored} -> {desired}")
        if not changes:
            print("index.json is up to date")
            return 0
        print(f"{len(changes)} entr{'y' if len(changes) == 1 else 'ies'} out of date")
        return 1 if args.check else 0

    changed = apply_changes(categories, desired_by_entry)
    if changed == 0:
        print("index.json is up to date")
        return 0

    index_path.write_text(format_index(categories), encoding="utf-8")

    print(f"Updated {changed} entr{'y' if changed == 1 else 'ies'} in {index_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
