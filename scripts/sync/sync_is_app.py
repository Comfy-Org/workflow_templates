#!/usr/bin/env python3
"""Sync the `isApp` flag from each workflow file into templates/index.json.

A workflow opens either as a node graph or as an App, and the author picks which.
That choice lives in the workflow as `extra.linearMode`. Nothing in `index.json`
carried it, so consumers guessed from the filename: anything ending `.app` was an
App. The guess is wrong both ways, which is what showed 14 apps instead of 55.

Only `true` is stored. Absent means "not an App", matching the other optional
booleans in the index, so the write pass removes the key rather than writing
`false`.

A workflow that cannot be read or parsed is reported and skipped, never treated
as "not an App": that would delete a correct `isApp: true` on a transient failure.

Usage:
    python scripts/sync/sync_is_app.py
    python scripts/sync/sync_is_app.py --dry-run
    python scripts/sync/sync_is_app.py --check    # non-zero exit if stale (CI)

Writes `index.json` only. The locale index files carry `isApp` through
`npm run sync:templates`, which copies template entries wholesale.

`index.mcp.json` does NOT carry it: that index is a curated shape (`capabilities`,
`task`, `recommend`) rather than a copy of these fields, so exposing App Mode to
MCP consumers means extending that pipeline. Until then MCP answers App Mode
wrongly for every App.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

_lib_dir = Path(__file__).resolve().parent.parent / "lib"
if str(_lib_dir) not in sys.path:
    sys.path.insert(0, str(_lib_dir))

from index_format import dumps_index  # noqa: E402
from paths import TEMPLATES_DIR  # noqa: E402

INDEX_FILENAME = "index.json"

# Distinguishes "no isApp key" from "isApp: null" when reporting, since
# `.get("isApp")` returns None for both.
ABSENT = object()


class WorkflowUnreadable(Exception):
    """The workflow could not be classified, so its isApp must not be changed."""


def workflow_is_app(templates_dir: Path, name: str) -> bool:
    """Whether the workflow for `name` opens in App Mode.

    Raises WorkflowUnreadable when the file is missing, unreadable, or malformed.
    Only a workflow that parsed can answer False; anything else is unknown, and
    treating unknown as False would delete a correct flag.
    """
    path = templates_dir / f"{name}.json"
    try:
        with path.open(encoding="utf-8") as handle:
            data = json.load(handle)
    except FileNotFoundError as exc:
        raise WorkflowUnreadable(f"{path} does not exist") from exc
    except OSError as exc:
        raise WorkflowUnreadable(f"could not read {path}: {exc}") from exc
    except json.JSONDecodeError as exc:
        raise WorkflowUnreadable(f"could not parse {path}: {exc}") from exc

    if not isinstance(data, dict):
        raise WorkflowUnreadable(f"{path}: top level is {type(data).__name__}, expected object")

    extra = data.get("extra")
    if extra is None:
        # No extra block at all is a normal node graph, not a malformed file.
        return False
    if not isinstance(extra, dict):
        raise WorkflowUnreadable(f"{path}: extra is {type(extra).__name__}, expected object")

    return extra.get("linearMode") is True


def entry_is_canonical(template: dict[str, Any], desired: bool) -> bool:
    """Whether the entry already stores `desired` in its canonical form.

    Canonical is `isApp: true` present for an App and the key absent otherwise.
    An explicit `false` and any non-boolean are both out of date. The plan and the
    write pass both decide through this so they cannot disagree.
    """
    if desired:
        return template.get("isApp") is True
    return "isApp" not in template


@dataclass
class Plan:
    """What a run would change, and what it could not look at."""

    # (name, stored value or ABSENT, desired) for reporting.
    changes: list[tuple[str, Any, bool]] = field(default_factory=list)
    # (entry, desired) for the write pass. Holds the dicts themselves rather than
    # keying on id(), so the two passes cannot drift apart.
    updates: list[tuple[dict[str, Any], bool]] = field(default_factory=list)
    # Messages for entries that could not be classified.
    unreadable: list[str] = field(default_factory=list)


def plan_changes(templates_dir: Path, categories: list[dict[str, Any]]) -> Plan:
    """Read every workflow once and return what would change.

    Each change carries the raw stored value, so a stale `false` or an invalid
    `"yes"` is visible in the report rather than flattened into the same output as
    an absent key.
    """
    plan = Plan()
    for category in categories:
        for template in category.get("templates", []):
            name = template.get("name")
            if not name:
                continue
            try:
                desired = workflow_is_app(templates_dir, name)
            except WorkflowUnreadable as exc:
                plan.unreadable.append(f"{name}: {exc}")
                continue
            if entry_is_canonical(template, desired):
                continue
            plan.changes.append((name, template.get("isApp", ABSENT), desired))
            plan.updates.append((template, desired))
    return plan


def apply_changes(plan: Plan) -> int:
    """Write isApp onto every entry the plan selected."""
    for template, desired in plan.updates:
        if desired:
            template["isApp"] = True
        else:
            template.pop("isApp", None)
    return len(plan.updates)


def _report(plan: Plan) -> None:
    for name, current, desired in plan.changes:
        stored = "absent" if current is ABSENT else json.dumps(current)
        print(f"  {name}: isApp {stored} -> {desired}")
    for message in plan.unreadable:
        print(f"warning: skipped {message}", file=sys.stderr)


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

    try:
        with index_path.open(encoding="utf-8") as handle:
            categories = json.load(handle)
    except (OSError, json.JSONDecodeError) as exc:
        print(f"error: could not read {index_path}: {exc}", file=sys.stderr)
        return 1

    plan = plan_changes(templates_dir, categories)
    _report(plan)

    if args.check or args.dry_run:
        if not plan.changes:
            print("index.json is up to date")
        else:
            count = len(plan.changes)
            print(f"{count} entr{'y' if count == 1 else 'ies'} out of date")
        if not args.check:
            return 0
        # Unreadable entries fail --check too: the index cannot be called correct
        # while some of it was never looked at.
        return 1 if plan.changes or plan.unreadable else 0

    changed = apply_changes(plan)
    if changed:
        index_path.write_text(dumps_index(categories), encoding="utf-8")
        print(f"Updated {changed} entr{'y' if changed == 1 else 'ies'} in {index_path}")
        print("Locale index files and index.mcp.json are separate: run `npm run sync:templates`")
        print("and `npm run mcp`, or let CI auto-sync them.")
    else:
        print("index.json is up to date")

    # Something went unread, so the run cannot claim the index is now correct.
    return 1 if plan.unreadable else 0


if __name__ == "__main__":
    sys.exit(main())
