#!/usr/bin/env python3
"""Audit ComfyUI workflow JSON link integrity (no frontend needed).

Per container (top level + every definitions.subgraphs[] entry) it checks:

  A links[] -> origin.outputs[origin_slot].links contains id   (origin_missing)
  B links[] -> target.inputs[target_slot].link == id           (target_null / target_wrong)
  C inputs[].link must exist in links[]                        (input_orphan)
  D outputs[].links must exist in links[]                      (output_phantom)
  E link type vs socket type must intersect                   (type_mismatch)

Negative node ids (-10 input node / -20 output node) are subgraph boundaries,
not errors.

Usage:
  python3 audit_links.py <templates_dir> [--baseline <HEAD_templates_dir>] [--all]

--baseline prints only what got worse/new relative to that copy (make one with
`git archive HEAD templates | tar -x -C /tmp/wt_base`); --all prints every file.
Exit code 1 when anything other than a pre-existing baseline issue is found.
"""
import json
import sys
from collections import Counter
from pathlib import Path

ISSUES = ("origin_missing", "target_null", "target_wrong", "input_orphan",
          "output_phantom", "backref", "type_mismatch")


def containers(g):
    yield "top", g
    for s in (g.get("definitions") or {}).get("subgraphs") or []:
        if isinstance(s, dict):
            yield (s.get("id") or s.get("name") or "subgraph"), s


def lf(l):
    if isinstance(l, dict):
        return (l.get("id"), l.get("origin_id"), l.get("origin_slot"),
                l.get("target_id"), l.get("target_slot"), l.get("type"))
    return tuple(l[:6])


def is_io(nid):
    return isinstance(nid, int) and nid < 0


def scan(g):
    res = {k: [] for k in ISSUES}
    for cname, c in containers(g):
        nodes = {n["id"]: n for n in c.get("nodes") or []}
        links = {}
        for l in c.get("links") or []:
            if not l:
                continue
            lid, oid, oslot, tid, tslot, ltype = lf(l)
            links[lid] = (oid, oslot, tid, tslot, ltype)

        for lid, (oid, oslot, tid, tslot, ltype) in links.items():
            on, tn = nodes.get(oid), nodes.get(tid)
            if on is not None and oslot is not None:
                outs = on.get("outputs") or []
                if 0 <= oslot < len(outs) and lid not in (outs[oslot].get("links") or []):
                    res["origin_missing"].append((cname, lid, oid, oslot, on.get("type")))
            if tn is not None and tslot is not None:
                ins = tn.get("inputs") or []
                if 0 <= tslot < len(ins):
                    cur = ins[tslot].get("link")
                    if cur is None:
                        res["target_null"].append((cname, lid, tid, tslot, tn.get("type")))
                    elif cur != lid:
                        res["target_wrong"].append((cname, lid, tid, tslot, cur, tn.get("type")))
                    stype = ins[tslot].get("type") or ""
                    if (stype and stype != "*" and ltype not in (None, "*")
                            and not stype.startswith("COMFY_AUTOGROW")
                            and not stype.startswith("COMFY_DYNAMICCOMBO")):
                        lt = {x.strip() for x in str(ltype).split(",")}
                        st = {x.strip() for x in stype.split(",")}
                        if not (lt & st):
                            res["type_mismatch"].append(
                                (cname, lid, str(ltype)[:32], stype[:32],
                                 ins[tslot].get("name"), tn.get("type")))

        for n in nodes.values():
            for i, inp in enumerate(n.get("inputs") or []):
                lid = inp.get("link")
                if lid is not None and lid not in links:
                    res["input_orphan"].append((cname, n["id"], i, lid, n.get("type")))
            for s, out in enumerate(n.get("outputs") or []):
                for lid in out.get("links") or []:
                    if lid not in links:
                        res["output_phantom"].append((cname, n["id"], s, lid, n.get("type")))
                    else:
                        oid, oslot, tid, tslot, ltype = links[lid]
                        tn = nodes.get(tid)
                        if tn is not None and tslot is not None:
                            ins = tn.get("inputs") or []
                            if 0 <= tslot < len(ins) and ins[tslot].get("link") != lid:
                                res["backref"].append((cname, n["id"], lid, tid, tslot,
                                                       ins[tslot].get("link")))
    return res


def counts(root):
    out, tot = {}, Counter()
    for p in sorted(Path(root).glob("*.json")):
        if p.name.startswith("index") or p.name.endswith(".mcp.json"):
            continue
        try:
            g = json.loads(p.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"!! parse fail {p.name}: {e}")
            continue
        if not isinstance(g, dict) or "nodes" not in g:
            continue
        r = scan(g)
        n = {k: len(v) for k, v in r.items()}
        if any(n.values()):
            out[p.name] = (n, r)
            tot.update(n)
    return out, tot


def main():
    argv = [a for a in sys.argv[1:] if not a.startswith("--")]
    root = argv[0] if argv else "templates"
    show_all = "--all" in sys.argv
    base = None
    if "--baseline" in sys.argv:
        base = argv[1]
    cur, tot = counts(root)
    basec, _ = counts(base) if base else ({}, Counter())
    print(f"ROOT {root}")
    print("TOTALS", dict(tot), f"files={len(cur)}")
    bad = 0
    for name, (n, r) in cur.items():
        b = basec.get(name, ({}, {}))[0]
        delta = {k: n[k] - b.get(k, 0) for k in ISSUES}
        new = {k: v for k, v in delta.items() if v > 0}
        if new or (show_all and any(n.values())):
            if new:
                bad += 1
            tag = f"NEW {new}" if new else "baseline"
            print(f"\n{name}: {n} ({tag})")
            for k in ISSUES:
                for item in r[k][:4]:
                    print(f"   {k}: {item}")
    print(f"\nfiles with new issues: {bad}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
