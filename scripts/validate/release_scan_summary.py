#!/usr/bin/env python3
"""Render the markdown summary of a release full scan.

The release-full-scan workflow runs every library-wide check, records one line
per check in a TSV file (name, exit code, last log line) and calls this script
to turn that plus the node-compatibility JSON into one report for the PR
comment and the job summary.

Usage:
  python3 scripts/validate/release_scan_summary.py \
      --status scan_status.tsv --compat-json compat_report.json \
      --out release_scan.md [--total 786]

Exit code: 0 always; the workflow decides whether the scan blocks.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

# Checks whose failure blocks a release PR. Deprecated nodes are reported but
# never block: the repo ships one on purpose (a bypassed demo group).
BLOCKING = {
    "frontend-zod-schema",
    "validate-templates",
    "validate-manifests",
    "check-input-assets",
    "validate-thumbnails",
    "node-compat-errors",
}


def read_status(path: Path) -> list[tuple[str, int, str]]:
    rows: list[tuple[str, int, str]] = []
    if not path.exists():
        return rows
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        parts = line.split("\t")
        name = parts[0]
        code = int(parts[1]) if len(parts) > 1 and parts[1].lstrip("-").isdigit() else 1
        note = parts[2] if len(parts) > 2 else ""
        rows.append((name, code, note))
    return rows


def compat_counts(path: Path) -> tuple[int, int, dict[str, int]]:
    """Return (errors, deprecated, per-template deprecated counts)."""
    if not path.exists():
        return -1, -1, {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return -1, -1, {}
    issues = data.get("issues") or []
    errors = sum(1 for i in issues if i.get("severity") == "error")
    deprecated = sum(1 for i in issues if i.get("kind") == "deprecated_node")
    per_template: dict[str, int] = {}
    for issue in issues:
        if issue.get("kind") == "deprecated_node":
            workflow = issue.get("workflow") or "?"
            per_template[workflow] = per_template.get(workflow, 0) + 1
    return errors, deprecated, per_template


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--status", required=True, help="TSV of name, exit, note")
    parser.add_argument("--compat-json", default="", help="node-compat JSON report")
    parser.add_argument("--out", required=True, help="markdown file to write")
    parser.add_argument("--total", type=int, default=0, help="templates scanned")
    args = parser.parse_args()

    rows = read_status(Path(args.status))
    errors, deprecated, per_template = (
        compat_counts(Path(args.compat_json)) if args.compat_json else (-1, -1, {})
    )

    total = args.total or 0
    failed = [name for name, code, _ in rows if code != 0 and name in BLOCKING]
    if not args.compat_json or errors < 0:
        failed.append("node-compat (no report produced)")
    elif errors > 0:
        failed.append(f"node-compat ({errors} error(s))")
    title = "## Release full scan"
    lines = [title, ""]
    if total:
        lines.append(f"Library-wide sweep over **{total} templates**.")
        lines.append("")

    lines.append("| Check | Result | Detail |")
    lines.append("| --- | --- | --- |")
    for name, code, note in rows:
        mark = "✅ pass" if code == 0 else ("🟡 warn" if name not in BLOCKING else "❌ fail")
        note = (note or "").replace("|", "\\|")
        if len(note) > 160:
            note = note[:157] + "..."
        lines.append(f"| `{name}` | {mark} | {note} |")

    if not args.compat_json or errors < 0:
        lines.append("| `node-compat` | ❌ fail | compatibility report missing or unreadable |")
    else:
        compat_mark = "✅ pass" if errors == 0 else "❌ fail"
        detail = f"{errors} error(s), {deprecated} deprecated node warning(s)"
        lines.append(f"| `node-compat` | {compat_mark} | {detail} |")

    if per_template:
        lines.append("")
        lines.append("### Deprecated nodes still shipped (non-blocking)")
        lines.append("")
        lines.append("| Template | Findings |")
        lines.append("| --- | ---: |")
        for template, count in sorted(per_template.items()):
            lines.append(f"| `{template}` | {count} |")

    lines.append("")
    if failed:
        lines.append(
            "**Result: blocking** — " + ", ".join(f"`{name}`" for name in failed) + " failed."
        )
    else:
        lines.append("**Result: pass** — every blocking check is green.")

    Path(args.out).write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
