#!/usr/bin/env python3
"""Structural link checker for ComfyUI UI-format workflows.

Catches the damage left behind by programmatic graph surgery (removing switch
nodes, rewiring, renumbering links): dangling links, slot mismatches, and the
`outputs[].links` registry going stale.

Usage:  python3 check_wf_links.py a.json b.json ...
Exit code 1 when any file has issues.
"""
from __future__ import annotations

import json
import sys


def check(path: str) -> list[str]:
    data = json.load(open(path))
    nodes = {n["id"]: n for n in data.get("nodes", [])}
    links = {l[0]: l for l in data.get("links", [])}
    issues: list[str] = []

    if len(nodes) != len(data.get("nodes", [])):
        issues.append("duplicate node ids")

    for lid, src, sslot, dst, dslot, _type in data.get("links", []):
        if src not in nodes:
            issues.append(f"link {lid}: source node {src} missing")
        if dst not in nodes:
            issues.append(f"link {lid}: target node {dst} missing")
            continue
        ins = nodes[dst].get("inputs") or []
        if dslot >= len(ins) or ins[dslot].get("link") != lid:
            issues.append(f"link {lid}: target slot {dslot} does not point back at it")
        if src in nodes:
            outs = nodes[src].get("outputs") or []
            if sslot >= len(outs) or lid not in (outs[sslot].get("links") or []):
                issues.append(f"link {lid}: source slot {sslot} registry does not list it")

    for n in data.get("nodes", []):
        for i in n.get("inputs") or []:
            if i.get("link") is not None and i["link"] not in links:
                issues.append(f"node {n['id']} input {i.get('name')!r} -> dead link {i['link']}")
        for o in n.get("outputs") or []:
            for x in o.get("links") or []:
                if x not in links:
                    issues.append(f"node {n['id']} output {o.get('name')!r} -> dead link {x}")
    return issues


def main(argv: list[str]) -> int:
    if not argv:
        print(__doc__)
        return 2
    bad = 0
    for path in argv:
        issues = check(path)
        bad += len(issues)
        print(f"{path}: {'OK' if not issues else 'ISSUES'}")
        for i in issues[:10]:
            print(f"  - {i}")
    print(f"\ntotal issues: {bad}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
