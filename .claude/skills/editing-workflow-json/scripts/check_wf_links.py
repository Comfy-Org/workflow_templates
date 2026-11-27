#!/usr/bin/env python3
"""Structural link checker for ComfyUI UI-format workflows.

Catches the damage left behind by programmatic graph surgery (removing switch
nodes, rewiring, renumbering links): dangling links, slot mismatches, and the
`outputs[].links` registry going stale.

Scope: top-level `nodes` / `links` only — does not walk `definitions.subgraphs[]`.

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
        if (not isinstance(dslot, int) or dslot < 0 or dslot >= len(ins)
                or ins[dslot].get("link") != lid):
            issues.append(f"link {lid}: target slot {dslot} does not point back at it")
        if src in nodes:
            outs = nodes[src].get("outputs") or []
            if (not isinstance(sslot, int) or sslot < 0 or sslot >= len(outs)
                    or lid not in (outs[sslot].get("links") or [])):
                issues.append(f"link {lid}: source slot {sslot} registry does not list it")

    for n in data.get("nodes", []):
        for i, inp in enumerate(n.get("inputs") or []):
            lid = inp.get("link")
            if lid is None:
                continue
            if lid not in links:
                issues.append(
                    f"node {n['id']} input {inp.get('name')!r} -> dead link {lid}")
            else:
                L = links[lid]
                if L[3] != n["id"] or L[4] != i:
                    issues.append(
                        f"node {n['id']} input {inp.get('name')!r} claims link {lid} "
                        f"owned by target {L[3]} slot {L[4]}")
        for s, o in enumerate(n.get("outputs") or []):
            for x in o.get("links") or []:
                if x not in links:
                    issues.append(
                        f"node {n['id']} output {o.get('name')!r} -> dead link {x}")
                else:
                    L = links[x]
                    if L[1] != n["id"] or L[2] != s:
                        issues.append(
                            f"node {n['id']} output {o.get('name')!r} claims link {x} "
                            f"owned by origin {L[1]} slot {L[2]}")
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
