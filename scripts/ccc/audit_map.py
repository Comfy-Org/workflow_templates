#!/usr/bin/env python3
"""Build `scripts/ccc/template-map.json`: template stem -> existing CCC record, by evidence.

The ~700 records already in the catalog were imported before `template_name` existed, so most
carry `template_name: null` and their slugs/titles have drifted from the template files
(renames, vendor renames, `-<12 hex>` suffixes, "(API)" variants). Pairing them on one signal
is a coin flip, so four independent rules are applied and every claim is scored:

  1. `template_name`      — the record was written by this tool for this stem. Exact.
  2. `slug`               — kebab(title) == the public slug with its legacy share id stripped.
  3. `title`              — exact normalized title equality, and only one live record has it.
  4. `graph`              — node class-type multiset + model weight filenames fingerprint.
  5. `version_successor`  — same title family once version tokens are removed (`1.1` vs `1.2`,
                            `2.5` vs `2.6`, `3.5` vs `4`) and the same output modality. These
                            are the records a new template version must UPDATE, never duplicate.

An entry already in the ledger is kept (rule `ledger`) as long as its record still exists: a
committed identity beats a fresh heuristic. Anything the rules cannot settle goes to
`.ccc-work/pending.json` for a human; it is not committed and it gates nothing — a stem with no
ledger entry is created by the sync as a new record.

    python3 scripts/ccc/audit_map.py --all
    python3 scripts/ccc/audit_map.py --all --out /tmp/proposed.json
    python3 scripts/ccc/audit_map.py --stems api_quiver_text_to_svg
"""

from __future__ import annotations

import argparse
import collections
import json
import os
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import ccc_common as common

CONFIDENT = 0.85
MARGIN = 0.10
LEDGER_GRAPH_FLOOR = 0.60   # a carried-over pairing must still look like the same workflow
LEDGER_WORD_FLOOR = 0.50    # …or share this much of its title vocabulary
# Name evidence decides identity; the graph only finds candidates, because a live record's
# stored graph is usually stale (it is converted from an older template revision) and a
# structure-only fingerprint ties across every 2-node API template. A carried-over ledger
# pairing is a tiebreak, never a veto: it loses to any name claim, including one from another
# stem, because a wrong pairing overwrites a published page.
RULE_PRIORITY = {"template_name": 0, "slug": 1, "title": 2, "word_set": 3, "graph": 4,
                 "version_successor": 5, "ledger": 6}


def word_key(title: str) -> frozenset:
    """Same words in any order / casing / punctuation: 'Video Edit: X' == 'X: Video Edit'."""
    return frozenset(re.findall(r"[a-z0-9]+", (title or "").lower()))


def load_index(repo: Path) -> dict:
    """{stem: entry} for every template in templates/index.json (the sheet the site renders)."""
    index = json.loads((repo / "templates" / "index.json").read_text())
    found: dict[str, dict] = {}

    def walk(node, section=None):
        if isinstance(node, dict):
            if isinstance(node.get("name"), str) and "title" in node:
                found[node["name"]] = {
                    "title": node.get("title") or "",
                    "mediaType": node.get("mediaType"),
                    "io": node.get("io"),
                    "section": section,
                }
            for key, value in node.items():
                walk(value, {k: v for k, v in node.items() if k != "templates"}
                     if key == "templates" else section)
        elif isinstance(node, list):
            for item in node:
                walk(item, section)

    walk(index)
    return found


def graph_score(sig, rec):
    """(score, structure_only) or (None, False) when either side has no graph."""
    if not sig or not rec.get("sig"):
        return None, False
    structure = common.jaccard(sig[0], rec["sig"][0])
    if not sig[1] and not rec["sig"][1]:
        # neither graph loads external weights: structure is the only evidence, and an
        # empty-vs-empty weight match must NOT hand out free points
        return structure, True
    weights = common.set_jaccard(sig[1], rec["sig"][1])
    return 0.6 * structure + 0.4 * weights, False


def live_records(client, work: Path, max_live: int = 0):
    """Every live record that has an API graph, with its fingerprint (graphs cached on disk)."""
    rows = client.live()
    if max_live:
        rows = rows[:max_live]
    print(f"  {len(rows)} live record(s)", flush=True)
    out = []
    for row in rows:
        data = row.get("data") or {}
        versions = data.get("workflow_versions") or []
        api_ref = (versions[0] or {}).get("api") if versions else None
        slug = (row.get("slug") or "").split("/")[-1]
        rec = {
            "uid": row.get("uid"), "slug": slug, "core": common.slug_core(slug),
            "title": data.get("title") or "", "tkey": common.norm_title(data.get("title") or ""),
            "family": common.title_family(data.get("title") or ""),
            "ver": common.title_version(data.get("title") or ""),
            "tname": data.get("template_name"),
            "mods": common.io_modalities(data), "sig": None,
        }
        if api_ref:
            cache_file = work / "live" / f"{slug}.json"
            graph = None
            if cache_file.exists():
                try:
                    graph = json.loads(cache_file.read_text())
                except json.JSONDecodeError:
                    graph = None
            if graph is None:
                graph = client.media(api_ref)
                if graph:
                    cache_file.parent.mkdir(parents=True, exist_ok=True)
                    cache_file.write_text(json.dumps(graph))
            if graph:
                rec["sig"] = common.signature(graph)
                rec["mods"] = rec["mods"] | common.graph_modalities(rec["sig"][0])
        out.append(rec)
    return out


def propose(stem: str, entry: dict, sig, live, by_tkey, by_family, by_wkey):
    """Every claim this stem has on a live record, best first. Nothing is assigned here."""
    claims = []

    def add(rec, rule, score, note=""):
        claims.append({"uid": rec["uid"], "slug": rec["slug"], "rule": rule,
                       "score": None if score is None else round(score, 3), "note": note})

    title = entry.get("title") or ""
    tkey = common.norm_title(title)
    want_core = common.kebab(title)
    wkey = word_key(title)
    family = common.title_family(title)
    has_version = family != tkey  # a version token was stripped

    for rec in live:
        if rec["tname"] == stem:
            add(rec, "template_name", 1.0)

    # A live record's slug is its identity: the slug equals this template's title slug after the
    # legacy share id is stripped. The stored graph disagreeing is expected (it was converted
    # from an older revision), so the score is recorded but never vetoes the pairing.
    if want_core:
        slug_hits = [rec for rec in live if rec["core"] == want_core]
        if len(slug_hits) == 1:
            score, _ = graph_score(sig, slug_hits[0])
            note = "slug equals the title slug" + (
                f"; stored graph scores {score:.2f}" if score is not None else "")
            add(slug_hits[0], "slug", score or 1.0, note)
        elif slug_hits:
            claims.append({"uid": slug_hits[0]["uid"], "slug": slug_hits[0]["slug"],
                           "rule": "slug", "score": None, "weak": True,
                           "note": f"{len(slug_hits)} live records share this slug"})

    if tkey:
        title_hits = by_tkey.get(tkey) or []
        if len(title_hits) == 1:
            score, _ = graph_score(sig, title_hits[0])
            note = "title matches exactly" + (
                f"; stored graph scores {score:.2f}" if score is not None else "")
            add(title_hits[0], "title", score or 1.0, note)
        elif title_hits:
            claims.append({"uid": title_hits[0]["uid"], "slug": title_hits[0]["slug"],
                           "rule": "title", "score": None, "weak": True,
                           "note": f"{len(title_hits)} live records share this title"})

    # Word-set: the same words in a different order, e.g. 'Video Edit: Beeble SwitchX' versus
    # 'Beeble SwitchX: Video Edit'. Only when exactly one live record has that word set.
    if wkey:
        wkey_hits = by_wkey.get(wkey) or []
        if len(wkey_hits) == 1:
            score, _ = graph_score(sig, wkey_hits[0])
            add(wkey_hits[0], "word_set", score or 1.0,
                f"same words, reordered ({wkey_hits[0]['title']!r})")
        elif wkey_hits:
            claims.append({"uid": wkey_hits[0]["uid"], "slug": wkey_hits[0]["slug"],
                           "rule": "word_set", "score": None, "weak": True,
                           "note": f"{len(wkey_hits)} live records share this word set"})

    # Graph fingerprint: only usable when both sides actually load model weights. A
    # structure-only match (two 2-node API templates) is a coin flip and produced real
    # mis-pairings, so it is not evidence at all.
    scored = []
    for rec in live:
        score, structure_only = graph_score(sig, rec)
        if score is None or structure_only:
            continue
        scored.append((score, rec))
    scored.sort(key=lambda item: item[0], reverse=True)
    if scored:
        best, rec = scored[0]
        runner = scored[1][0] if len(scored) > 1 else 0.0
        if best >= CONFIDENT and best - runner >= MARGIN:
            add(rec, "graph", best,
                f"classes+weights {best:.2f}, runner-up {runner:.2f}")

    # version successor: the catalog still holds the newest record of this family and that
    # record is older than this template — i.e. the previous version's template file was
    # renamed away and the record must be updated, not duplicated. If the family already has a
    # record at or above our version, this template is genuinely newer than the catalog, and a
    # new record is the honest outcome.
    ours_version = common.title_version(title)
    if has_version and family and ours_version:
        modalities = common.io_modalities(entry)
        candidates = [rec for rec in (by_family.get(family) or [])
                      if rec["ver"] < ours_version
                      and rec["tkey"] != tkey and rec["core"] != want_core
                      and not (modalities and rec["mods"] and not (modalities & rec["mods"]))]
        # newest first: the record this template replaces is the newest family record that is
        # still free. If another template owns it (the previous version is itself a template
        # file), the next oldest record in the lineage is the one to update.
        for version in sorted({rec["ver"] for rec in candidates}, reverse=True):
            bucket = [rec for rec in candidates if rec["ver"] == version]
            readable = ".".join(map(str, version)) or "no version"
            if len(bucket) == 1:
                claims.append({"uid": bucket[0]["uid"], "slug": bucket[0]["slug"],
                               "rule": "version_successor", "score": None,
                               "version_successor": True,
                               "note": f"replaces {bucket[0]['title']!r} ({readable})"})
            else:
                claims.append({"uid": bucket[0]["uid"], "slug": bucket[0]["slug"],
                               "rule": "version_successor", "score": None, "weak": True,
                               "note": f"{len(bucket)} records share '{family}' at version "
                                       f"{readable}"})

    claims.sort(key=lambda c: (RULE_PRIORITY[c["rule"]], -(c["score"] or 0.0)))
    return claims


def main() -> int:
    ap = argparse.ArgumentParser(description=(__doc__ or "").splitlines()[0])
    ap.add_argument("--repo", default=".", type=Path)
    ap.add_argument("--stems", nargs="*", default=[])
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--out", default="scripts/ccc/template-map.json", type=Path)
    ap.add_argument("--pending", default=".ccc-work/pending.json", type=Path)
    ap.add_argument("--jobs", type=int, default=4, help="parallel UI->API conversions")
    ap.add_argument("--limit", type=int, default=0, help="stop after N templates (smoke test)")
    ap.add_argument("--max-live", type=int, default=0, help="only the first N live records")
    args = ap.parse_args()

    repo = args.repo
    work = repo / ".ccc-work"
    work.mkdir(exist_ok=True)
    client = common.Client()

    entries = load_index(repo)
    stems = list(args.stems)
    if args.all:
        stems = [s for s in entries if (repo / "templates" / f"{s}.json").exists()]
    if args.limit:
        stems = stems[: args.limit]
    if not stems:
        print("nothing to audit")
        return 0

    oi = common.object_info(client, work)
    print(f"object_info: {'loaded' if oi else 'UNAVAILABLE'} "
          f"({len(oi) if oi else 0} classes)", flush=True)

    def convert(stem):
        api = common.ui_to_api(repo, stem, work, oi, cache=True)
        if api is None:
            # the CLI is 2000x slower; only pay it for the few graphs the fast path misses
            try:
                proc = subprocess.run(
                    ["comfy", "--json", "run", "--workflow", str(repo / "templates" / f"{stem}.json"),
                     "--where", "cloud", "--print-prompt"], capture_output=True, text=True, timeout=300)
                env = json.loads(proc.stdout)
                api = (env.get("data") or {}).get("prompt") if env.get("ok") else None
            except Exception:
                api = None
        return stem, api

    print(f"converting {len(stems)} template graph(s) with {args.jobs} worker(s)…", flush=True)
    sigs = {}
    done = 0
    with ThreadPoolExecutor(max_workers=max(1, args.jobs)) as pool:
        for stem, api in pool.map(convert, stems):
            done += 1
            if api:
                sigs[stem] = common.signature(api)
            if done % 100 == 0:
                print(f"  {done}/{len(stems)} converted ({len(sigs)} with a graph)", flush=True)

    print("loading live record graphs…", flush=True)
    live = live_records(client, work, args.max_live)
    by_uid = {rec["uid"]: rec for rec in live}
    by_tkey = collections.defaultdict(list)
    by_family = collections.defaultdict(list)
    by_wkey = collections.defaultdict(list)
    for rec in live:
        if rec["tkey"]:
            by_tkey[rec["tkey"]].append(rec)
        if rec["family"]:
            by_family[rec["family"]].append(rec)
        if rec["title"]:
            by_wkey[word_key(rec["title"])].append(rec)

    # prior ledger: a committed pairing is kept as a tiebreak — it never outranks a name claim,
    # because a slug/title equality proved by the live record itself is the better evidence
    # (and a mis-pairing silently overwrites a published page)
    prior = {}
    ledger_path = args.out if args.out.is_absolute() else repo / args.out
    if ledger_path.exists():
        raw = json.loads(ledger_path.read_text())
        for stem, value in raw.items():
            if stem.startswith("_") or not isinstance(value, dict):
                continue
            if value.get("uid") in by_uid:
                prior[stem] = value

    all_claims = []
    unclaimed = []
    for stem in stems:
        entry = entries.get(stem) or {}
        claims = propose(stem, entry, sigs.get(stem), live, by_tkey, by_family, by_wkey)
        if stem in prior:
            rec = by_uid[prior[stem]["uid"]]
            claims.insert(0, {"uid": rec["uid"], "slug": rec["slug"], "rule": "ledger",
                              "score": None,
                              # a carried-over entry keeps the evidence and the marker that
                              # established it, so a rebuild reproduces the file exactly
                              "evidence": prior[stem].get("rule") or "ledger",
                              "version_successor": bool(prior[stem].get("version_successor")),
                              "note": "already committed in the ledger"})
        for order, claim in enumerate(claims):
            all_claims.append((RULE_PRIORITY[claim["rule"]], -(claim["score"] or 0.0), order,
                               stem, claim))
        if not claims:
            unclaimed.append(stem)

    all_claims.sort()
    assigned = {}        # uid -> stem
    confident = {}       # stem -> claim
    blocked = {}         # stem -> claim it wanted but could not have
    for prio, neg_score, order, stem, claim in all_claims:
        if stem in confident:
            if claim["uid"] in assigned:
                blocked.setdefault(stem, claim)
            continue
        if claim.get("weak"):
            blocked.setdefault(stem, claim)
            continue
        if claim["uid"] in assigned:
            blocked.setdefault(stem, claim)
            continue
        assigned[claim["uid"]] = stem
        confident[stem] = claim

    def evidence(claim):
        return claim.get("evidence") or claim["rule"]

    by_rule = collections.Counter(evidence(claim) for claim in confident.values())
    successors = sorted(stem for stem, claim in confident.items() if claim.get("version_successor"))

    # A carried-over pairing is only as good as its evidence. Flag the ones whose name and
    # graph both disagree with the record they point at, so a mis-pairing (two templates that
    # share a generic API graph) shows up for review instead of silently overwriting a page.
    suspect = {}
    for stem, claim in confident.items():
        if evidence(claim) != "ledger":
            continue
        rec = by_uid[claim["uid"]]
        entry = entries.get(stem) or {}
        title = entry.get("title") or ""
        if (common.kebab(title) == rec["core"] or common.norm_title(title) == rec["tkey"]
                or word_key(title) == word_key(rec["title"])):
            continue
        a, b = word_key(title), word_key(rec["title"])
        overlap = len(a & b) / len(a | b) if a and b else 0.0
        score, structure_only = graph_score(sigs.get(stem), rec)
        if overlap < 0.25 and (score is None or structure_only or score < LEDGER_GRAPH_FLOOR):
            suspect[stem] = {"slug": rec["slug"], "record_title": rec["title"],
                             "template_title": title, "title_overlap": round(overlap, 2),
                             "graph": None if score is None else round(score, 2),
                             "reason": "carried-over pairing: neither the title nor the graph "
                                       "supports it"}

    ledger = {}
    for stem in sorted(confident):
        claim = confident[stem]
        ledger[stem] = {"uid": claim["uid"], "slug": claim["slug"], "rule": evidence(claim)}
        if claim.get("version_successor"):
            ledger[stem]["version_successor"] = True

    pending = {"ambiguous": {}, "none": {}, "blocked": {}, "suspect": suspect}
    for stem in stems:
        if stem in confident:
            continue
        claim = blocked.get(stem)
        if claim:
            pending["ambiguous"][stem] = {k: v for k, v in claim.items() if k != "uid"}
        else:
            pending["none"][stem] = {"title": (entries.get(stem) or {}).get("title"),
                                     "reason": "no live record matched any rule"}

    header = {
        "_comment": (
            "GENERATED by scripts/ccc/audit_map.py — stem -> existing catalog record. The sync "
            "writes to the record named here and stamps template_name on it. Evidence, strongest "
            "first: template_name, slug with the legacy share id stripped, unique normalized "
            "title, graph fingerprint, version successor. Ambiguous candidates live in "
            ".ccc-work/pending.json (not committed) and gate nothing: a stem absent here is "
            "created as a new record."),
        "_generated_from": {
            "live_records": len(live),
            "templates": len(entries),
            "converted": len(sigs),
            "ledger_entries": len(ledger),
            "by_rule": dict(sorted(by_rule.items())),
            "version_successor_stems": successors,
            "pending": {k: len(v) for k, v in pending.items()},
        },
    }
    doc = {**header, **ledger}

    out_path = ledger_path
    # `catalog_owned` is a human decision about who may write a field, not generated evidence:
    # carry it (and its explanation) across a rebuild so re-auditing the catalog cannot silently
    # re-arm the sync on records somebody already protected.
    previous, carried_comment = {}, None
    if out_path.exists():
        try:
            old = json.loads(out_path.read_text())
        except json.JSONDecodeError:
            old = {}
        previous = {k: v for k, v in old.items() if not k.startswith("_") and isinstance(v, dict)}
        carried_comment = old.get("_catalog_owned_comment")
    for stem, entry in ledger.items():
        keep = (previous.get(stem) or {}).get("catalog_owned")
        if keep:
            entry["catalog_owned"] = keep
    if carried_comment:
        doc["_catalog_owned_comment"] = carried_comment
    # insertion order, not sort_keys: `uid` before `slug` is how the committed ledger reads,
    # and keeping it makes a rebuild diff show only the entries that actually changed
    out_path.write_text(json.dumps(doc, indent=1) + "\n")
    pending_path = args.pending if args.pending.is_absolute() else repo / args.pending
    pending_path.parent.mkdir(parents=True, exist_ok=True)
    pending_path.write_text(json.dumps(pending, indent=1, sort_keys=True) + "\n")

    print(f"\nledger {len(ledger)} entries -> {out_path}")
    print("  by rule: " + ", ".join(f"{rule} {count}" for rule, count in sorted(by_rule.items())))
    print(f"  version successors: {len(successors)}")
    for stem in successors:
        print(f"    ~ {stem} -> {ledger[stem]['slug']}")
    print("  pending: " + ", ".join(f"{k} {len(v)}" for k, v in pending.items())
          + f" -> {pending_path}")
    for stem, claim in list(pending["ambiguous"].items())[:10]:
        print(f"    ? {stem} ~ {claim.get('slug')} ({claim.get('score')}) {claim.get('note', '')}")
    for stem, claim in list(pending["blocked"].items())[:10]:
        print(f"    x {stem} ~ {claim.get('slug')} ({claim.get('note', '')})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
