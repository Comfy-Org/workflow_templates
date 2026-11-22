#!/usr/bin/env python3
"""Snapshot the live catalog content of every mapped record into `scripts/ccc/records.json`.

Why this exists: the long-form half of a catalog record (`long_description`, `faq`,
`use_cases`, `runnable`, `compatibility`) has no home in this repo, and the old sync
overwrote `long_description` with the 160-character index blurb on every run. This script
makes the repo the authoring surface for that copy: it pulls the live values into a
committed snapshot, and `sync_to_ccc.py --records` writes the snapshot back verbatim.

Only GETs are issued. The output is idempotent: when no record's content changed, the file
is left byte-identical (and `_source.pulled_at` is not touched), so a scheduled pull does not
churn the PR.

    python scripts/ccc/pull_records.py --dry-run          # report, write nothing
    python scripts/ccc/pull_records.py                    # refresh the snapshot
    python scripts/ccc/pull_records.py --stems api_foo image_bar
"""

from __future__ import annotations

import argparse
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

import ccc_common as common


def pick(data: dict) -> dict:
    """Only the fields the repo owns; everything else on the record stays server-side."""
    return {k: data[k] for k in common.RECORD_FIELDS if data.get(k) is not None}


def load_map(path: Path) -> dict:
    if not path.exists():
        raise SystemExit(f"no ledger at {path} — run scripts/ccc/audit_map.py first")
    raw = json.loads(path.read_text())
    return {k: v for k, v in raw.items() if not k.startswith("_")}


def diff(old: dict, new: dict):
    """(added, removed, changed) stems, ignoring `_source` (its `pulled_at` always moves)."""
    old = {k: v for k, v in (old or {}).items() if not k.startswith("_")}
    added = sorted(set(new) - set(old))
    removed = sorted(set(old) - set(new))
    changed = sorted(k for k in set(old) & set(new) if old[k] != new[k])
    return added, removed, changed


def field_diff(old: dict, new: dict):
    """{stem: [field, ...]} for records whose content moved."""
    out = {}
    for stem, rec in new.items():
        before = old.get(stem)
        if before == rec:
            continue
        if not isinstance(before, dict):
            out[stem] = ["<new record>"]
            continue
        fields = sorted(set(before) | set(rec))
        out[stem] = [f for f in fields if before.get(f) != rec.get(f)]
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=(__doc__ or "").splitlines()[0])
    ap.add_argument("--repo", default=".", type=Path)
    ap.add_argument("--map", default="scripts/ccc/template-map.json", type=Path)
    ap.add_argument("--out", default="scripts/ccc/records.json", type=Path)
    ap.add_argument("--stems", nargs="*", default=[])
    ap.add_argument("--jobs", type=int, default=4, help="parallel GETs (reads only)")
    ap.add_argument("--dry-run", action="store_true", help="report changes, write nothing")
    args = ap.parse_args()

    repo = args.repo
    map_path = args.map if args.map.is_absolute() else repo / args.map
    out_path = args.out if args.out.is_absolute() else repo / args.out
    ledger = load_map(map_path)

    stems = list(dict.fromkeys(args.stems)) or sorted(ledger)
    if not stems:
        print("nothing to pull: the ledger is empty")
        return 0

    client = common.Client()
    errors = {}

    def one(stem: str):
        mapped = ledger.get(stem) or {}
        uid = mapped.get("uid") if isinstance(mapped, dict) else str(mapped)
        if not uid:
            return stem, None, "not in the ledger"
        try:
            return stem, pick(client.record(uid)), None
        except Exception as exc:  # noqa: BLE001 - collected, reported, non-zero exit
            return stem, None, str(exc)[:300]

    records = {}
    done = 0
    with ThreadPoolExecutor(max_workers=max(1, args.jobs)) as pool:
        for stem, rec, err in pool.map(one, stems):
            done += 1
            if err:
                errors[stem] = err
            elif rec is not None:
                records[stem] = rec
            if done % 50 == 0:
                print(f"  {done}/{len(stems)} pulled", flush=True)

    if errors:
        print(f"\n{len(errors)} record(s) could not be pulled — nothing written:", file=sys.stderr)
        for stem, err in sorted(errors.items()):
            print(f"  ! {stem}: {err}", file=sys.stderr)
        return 1

    old = {}
    if out_path.exists():
        try:
            old = json.loads(out_path.read_text())
        except json.JSONDecodeError:
            old = {}

    added, removed, changed = diff(old, records)
    doc = {
        "_source": {
            "pulled_from": client.base,
            "records": len(records),
            "pulled_at": (old.get("_source") or {}).get("pulled_at") or "",
        },
        **records,
    }

    if not (added or removed or changed):
        print(f"unchanged: {len(records)} record(s) identical to {out_path} — file left as is")
        return 0

    per_field = field_diff({k: v for k, v in old.items() if not k.startswith("_")}, records)
    print(f"changed: +{len(added)} added, -{len(removed)} removed, {len(changed)} changed")
    for stem in (added + removed + changed):
        print(f"  ~ {stem}: {', '.join(per_field.get(stem) or ['<removed>'])[:160]}")
    if args.dry_run:
        print("dry run: nothing written")
        return 0

    doc["_source"]["pulled_at"] = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(doc, indent=1, sort_keys=True) + "\n")
    print(f"wrote {out_path} ({out_path.stat().st_size} bytes, {len(records)} records)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
