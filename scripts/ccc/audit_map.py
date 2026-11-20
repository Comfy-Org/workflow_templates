#!/usr/bin/env python3
"""Propose `template stem -> existing CCC record` mappings by comparing GRAPHS, not names.

Why this exists: the ~700 records already in the catalog were imported before
`template_name` existed, so most carry `template_name: null` and their slugs/titles have
drifted from the template files (renames, vendor renames, `-<12 hex>` suffixes, "(API)"
variants). Matching those on slug or title alone is a coin flip — it either misses the real
record (and the sync then creates a duplicate) or adopts the wrong one.

Here each template file is converted to an API graph and compared against every live record's
stored API graph on two things that survive renames:

  * the multiset of node class_types (structure), and
  * the set of model/filename widget values (ckpt_name, unet_name, vae_name, clip_name,
    lora_name, model, …), i.e. *which* weights the graph loads.

Output is a proposal JSON for `scripts/ccc/template-map.json`; nothing is written to the
catalog. Ambiguous or weak matches are listed separately so a human decides.

    python3 scripts/ccc/audit_map.py --all --out scripts/ccc/template-map.proposed.json
    python3 scripts/ccc/audit_map.py --stems api_quiver_text_to_svg
"""

from __future__ import annotations

import argparse
import collections
import json
import os
import subprocess
import sys
from pathlib import Path

import requests

MODEL_KEYS = ("ckpt_name", "unet_name", "vae_name", "clip_name", "lora_name", "model",
              "model_name", "checkpoint", "weights")
CONFIDENT = 0.85
MARGIN = 0.10


def signature(graph: dict) -> tuple[collections.Counter, frozenset[str]]:
    classes = collections.Counter()
    models: set[str] = set()
    for node in (graph or {}).values():
        if not isinstance(node, dict):
            continue
        classes[node.get("class_type") or "?"] += 1
        inputs = node.get("inputs") or {}
        for key, value in inputs.items():
            if key in MODEL_KEYS or key.endswith(("_name", "_file")):
                if isinstance(value, str) and value.lower().endswith(
                        (".safetensors", ".ckpt", ".pth", ".pt", ".bin", ".gguf", ".onnx")):
                    models.add(value)
    return classes, frozenset(models)


def jaccard(a: collections.Counter, b: collections.Counter) -> float:
    inter = sum((a & b).values())
    union = sum((a | b).values())
    return inter / union if union else 0.0


def set_jaccard(a: frozenset, b: frozenset) -> float:
    if not a and not b:
        return 1.0
    return len(a & b) / len(a | b) if (a | b) else 1.0


class Client:
    def __init__(self, base: str, key: str):
        self.base = base.rstrip("/")
        self.s = requests.Session()
        self.s.headers.update({"X-API-Key": key, "Accept": "application/json"})

    def get(self, path):
        r = self.s.get(self.base + "/api/v1/catalog" + path, timeout=120)
        r.raise_for_status()
        return r.json()

    def live(self):
        out, cursor = [], None
        while True:
            d = self.get("/items?kind=WORKFLOW&limit=100" + (f"&cursor={cursor}" if cursor else ""))
            out += d.get("items", [])
            if not d.get("has_more"):
                return out
            cursor = d.get("next_cursor")
            if not cursor:
                return out

    def media(self, ref):
        url = f"{self.base}/api/v1/catalog/media/{ref['id']}/{ref['file_version_uid']}"
        r = self.s.get(url, timeout=120)
        if r.status_code != 200:
            return None
        try:
            return r.json()
        except json.JSONDecodeError:
            return None


def convert(repo: Path, stem: str, work: Path) -> dict | None:
    ui = repo / "templates" / f"{stem}.json"
    out = work / f"{stem}.api.json"
    if out.exists():
        return json.loads(out.read_text())
    proc = subprocess.run(["comfy", "--json", "run", "--workflow", str(ui), "--where", "cloud",
                           "--print-prompt"], capture_output=True, text=True, timeout=300)
    try:
        env = json.loads(proc.stdout)
    except json.JSONDecodeError:
        return None
    prompt = (env.get("data") or {}).get("prompt") if env.get("ok") else None
    if not prompt:
        return None
    out.write_text(json.dumps(prompt, indent=1))
    return prompt


def load_index(repo: Path) -> dict:
    index = json.loads((repo / "templates" / "index.json").read_text())
    found: dict[str, str] = {}

    def walk(node):
        if isinstance(node, dict):
            if isinstance(node.get("name"), str) and "title" in node:
                found[node["name"]] = node.get("title") or ""
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(index)
    return found


def main() -> int:
    ap = argparse.ArgumentParser(description=(__doc__ or "").splitlines()[0])
    ap.add_argument("--repo", default=".", type=Path)
    ap.add_argument("--stems", nargs="*", default=[])
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--out", default="scripts/ccc/template-map.proposed.json", type=Path)
    ap.add_argument("--limit", type=int, default=0, help="stop after N templates (smoke test)")
    ap.add_argument("--max-live", type=int, default=0, help="only consider the first N live records (smoke test)")
    args = ap.parse_args()

    key = os.environ.get("CCC_API_KEY")
    if not key:
        print("CCC_API_KEY is not set")
        return 2
    client = Client(os.environ.get("CCC_API_BASE_URL", "https://cloud.comfy.org"), key)
    work = args.repo / ".ccc-work"
    work.mkdir(exist_ok=True)

    titles = load_index(args.repo)
    stems = list(args.stems)
    if args.all:
        stems = [s for s in titles if (args.repo / "templates" / f"{s}.json").exists()]
    if args.limit:
        stems = stems[: args.limit]
    if not stems:
        print("nothing to audit")
        return 0

    print(f"loading {len(stems)} template graph(s) and the live catalog…")
    templates = {}
    for stem in stems:
        graph = convert(args.repo, stem, work)
        if graph:
            templates[stem] = signature(graph)

    live = []
    live_rows = client.live()
    if args.max_live:
        live_rows = live_rows[: args.max_live]
    for row in live_rows:
        data = row.get("data") or {}
        versions = data.get("workflow_versions") or []
        api_ref = (versions[0] or {}).get("api") if versions else None
        if not api_ref:
            continue
        cache_file = work / "live" / f"{(row.get('slug') or '').split('/')[-1]}.json"
        cache_file.parent.mkdir(parents=True, exist_ok=True)
        if cache_file.exists():
            graph = json.loads(cache_file.read_text())
        else:
            graph = client.media(api_ref)
            if graph:
                cache_file.write_text(json.dumps(graph))
        if not graph:
            continue
        live.append({"uid": row.get("uid"), "slug": (row.get("slug") or "").split("/")[-1],
                     "title": data.get("title") or "", "tname": data.get("template_name"),
                     "sig": signature(graph)})
    print(f"  {len(templates)} template graph(s), {len(live)} live record graph(s)")

    confident, ambiguous, none = {}, {}, {}
    for stem, sig in templates.items():
        scored = []
        for rec in live:
            if rec["tname"] == stem:
                scored.append((1.0, rec, "template_name"))
                continue
            structure = jaccard(sig[0], rec["sig"][0])
            if not sig[1] and not rec["sig"][1]:
                # neither graph loads external weights: structure is the only evidence, and an
                # empty-vs-empty weight match must NOT hand out free points
                scored.append((structure, rec, f"classes {structure:.2f} / no model files"))
                continue
            weights = set_jaccard(sig[1], rec["sig"][1])
            scored.append((0.6 * structure + 0.4 * weights, rec,
                           f"classes {structure:.2f} / weights {weights:.2f}"))
        scored.sort(key=lambda item: item[0], reverse=True)
        if not scored:
            none[stem] = {"title": titles.get(stem), "reason": "no live API graphs"}
            continue
        best = scored[0]
        runner = scored[1][0] if len(scored) > 1 else 0.0
        entry = {"uid": best[1]["uid"], "slug": best[1]["slug"], "title": best[1]["title"],
                 "score": round(best[0], 3), "reason": best[2]}
        structure_only = "no model files" in best[2]
        floor = max(CONFIDENT, 0.92) if structure_only else CONFIDENT
        if best[0] >= floor and best[0] - runner >= MARGIN:
            confident[stem] = entry
        elif best[0] >= 0.6:
            entry["runner_up"] = round(runner, 3)
            ambiguous[stem] = entry
        else:
            none[stem] = {"title": titles.get(stem), "best_score": round(best[0], 3),
                          "best_slug": best[1]["slug"]}

    out = args.repo / args.out
    out.write_text(json.dumps({"confident": confident, "ambiguous": ambiguous, "none": none},
                              indent=1, sort_keys=True))
    print(f"\nconfident {len(confident)} · ambiguous {len(ambiguous)} · none {len(none)} -> {out}")
    for stem, entry in list(ambiguous.items())[:10]:
        print(f"  ? {stem} ~ {entry['slug']} ({entry['score']}, runner {entry['runner_up']})")
    for stem, entry in list(none.items())[:10]:
        print(f"  - {stem}: {entry}")
    print("\nReview, then copy the entries you trust into scripts/ccc/template-map.json "
          "(stem -> uid). The sync stamps template_name onto the mapped record, so an override "
          "is only needed once.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
