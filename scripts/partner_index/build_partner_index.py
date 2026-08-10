#!/usr/bin/env python3
"""
build_partner_index.py - Build templates/index.partner_node.json (one-shot pipeline).

Pipeline:
  1. scan    - Scan ComfyUI comfy_api_nodes/ API nodes (optional --scan; uses existing snapshot by default)
  2. merge   - Merge node scan + subagent-extracted model data (scripts/partner_index/data/extract_*.en.json)
               into a node-centric index (each node with its model options)
  3. enhance - Add decision fields: is_latest / pricing / best_for

Usage:
  python3 scripts/partner_index/build_partner_index.py            # full build
  python3 scripts/partner_index/build_partner_index.py --scan     # force re-scan nodes first
  python3 scripts/partner_index/build_partner_index.py --verify   # run self-check after build

Output:
  templates/index.partner_node.json
"""
import argparse
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
SCRIPTS = ROOT / "scripts" / "partner_index"
DATA = SCRIPTS / "data"  # data lives with the scripts (self-contained module)
SCAN_SNAPSHOT = SCRIPTS / "data" / "partner_nodes_scan.json"
OUT = ROOT / "templates" / "index.partner_node.json"

CJK = re.compile(r"[\u4e00-\u9fff]")

# capability label -> best_for use case
CAP_TO_USE = {
    "text-to-video": "text-to-video generation",
    "image-to-video": "image-to-video generation",
    "first-last-frame": "first/last-frame (FLF) video",
    "multimodal reference": "multi-modal reference video",
    "video continuation": "video continuation",
    "video editing": "video editing",
    "reference-to-video": "reference-to-video",
    "audio generation": "native audio/video-sync",
    "lip sync": "lip-sync",
    "talking photo": "talking-photo",
    "video upscaling": "video upscaling",
    "text-to-image": "text-to-image",
    "image-to-image / reference-based editing": "reference-based image editing",
    "image-to-image": "image-to-image",
    "background removal": "background removal",
    "upscaling": "image upscaling",
    "inpainting": "inpainting",
    "layer separation": "layer separation",
    "virtual try-on": "virtual try-on",
    "text-to-SVG": "SVG generation",
    "text-to-3D": "text-to-3D",
    "image-to-3D": "image-to-3D",
    "auto-rigging": "auto-rigging",
    "text-to-speech": "text-to-speech",
    "speech-to-text": "speech-to-text",
    "voice cloning": "voice cloning",
    "LLM chat": "LLM chat",
    "multimodal image understanding": "multimodal understanding",
    "video translation": "video translation",
    "avatar video": "avatar video",
}

NEW_OLD_RE = re.compile(
    r"(latest|newest|current flagship|newer version|superseded|replaced|legacy|deprecated|old|previous|retired)",
    re.I,
)
PRICE_RE = re.compile(
    r"(\$[\d.]+(?:/[\w%]+)?|about [\d.]+x|[\d.]+x (?:the )?(?:price|cost)|[~about ]*\d+\s*(?:USD|credits?))",
    re.I,
)


def log(msg):
    print(f"  {msg}")


# ---------- 1. scan ----------
def run_scan(force: bool):
    import importlib.util

    spec = importlib.util.spec_from_file_location("scan_partner_nodes", SCRIPTS / "scan_partner_nodes.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    # Save/restore argv so the submodule argparse does not misread main script args
    import sys as _sys

    saved = _sys.argv
    if force or not (DATA / "partner_nodes_scan.json").exists():
        _sys.argv = ["scan_partner_nodes.py", "--out", str(DATA / "partner_nodes_scan.json")]
        try:
            mod.main()
        finally:
            _sys.argv = saved
        log("scanned nodes")
    else:
        log("using existing scan snapshot (--scan to force re-scan)")


# ---------- 2. merge ----------
def run_merge() -> dict:
    """Build a node-centric index: each ComfyUI node is an entry; models are
    the options of that node's model dropdown (enriched from subagent data)."""
    def load(p: Path):
        if not p.exists():
            log(f"missing {p.name}")
            return []
        return json.loads(p.read_text(encoding="utf-8"))

    scan = load(DATA / "partner_nodes_scan.json")
    extracts = (
        load(DATA / "extract_video.en.json")
        + load(DATA / "extract_image.en.json")
        + load(DATA / "extract_other.en.json")
    )

    # 1. Build a lookup: model name -> enriched info (capabilities/recommended/released/best_for/notes)
    model_info = {}
    for e in extracts:
        for m in e.get("models", []):
            name = m.get("name")
            if not name:
                continue
            # keep first occurrence; prefer entries that already have verified enrichments
            if name not in model_info:
                model_info[name] = m

    # 2. Node-centric entries
    result = {
        "schema_version": "2.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "description": "ComfyUI Partner Node index (node-centric): every node with its model options, capabilities and recommendation flags. Used by the in-app agent for retrieval (capability index -> template library -> node library).",
        "nodes": [],
    }

    for n in sorted(scan.get("nodes", []), key=lambda x: (x.get("category", ""), x.get("node_id", ""))):
        models_out = []
        recommended_models = []
        for opt in n.get("models", []):
            info = model_info.get(opt)
            entry = {"name": opt}
            if info:
                entry["capabilities"] = info.get("capabilities", [])
                if info.get("released"):
                    entry["released"] = info["released"]
                if "recommended" in info:
                    entry["recommended"] = info["recommended"]
                if info.get("best_for"):
                    entry["best_for"] = info["best_for"]
                if info.get("notes"):
                    entry["notes"] = info["notes"]
                if info.get("recommended") is True:
                    recommended_models.append(opt)
            else:
                entry["enriched"] = False
            models_out.append(entry)
        entry = {
            "node_id": n["node_id"],
            "display_name": n.get("display_name", ""),
            "category": n.get("category", ""),
            "description": n.get("description", ""),
            "added_date": n.get("added_date", ""),
            "models": models_out,
        }
        if recommended_models:
            entry["recommended_models"] = recommended_models
        result["nodes"].append(entry)
    return result


# ---------- 3. enhance (decision fields) ----------
def clean_notes(m: dict):
    """Strip leftover URL/source/verified markers from a model's notes text,
    keeping the substantive facts as plain sentences."""
    notes = m.get("notes", "")
    if not notes:
        return
    notes = re.sub(r"\[verified:[^\]]*\]", "", notes)
    notes = re.sub(r",?\s*sources:\s*[^\]]*", "", notes)
    notes = re.sub(r"https?://[^\s,\]]+", "", notes)
    notes = re.sub(r"\s+", " ", notes).strip()
    notes = re.sub(r",\s*\]", "]", notes)
    notes = re.sub(r"\[\s*,", "[", notes)
    notes = re.sub(r"\s+\.$", ".", notes)
    notes = re.sub(r",\s*$", "", notes)
    notes = re.sub(r"\s+\.", ".", notes)
    notes = re.sub(r"\s+", " ", notes).strip()
    notes = notes.rstrip(" ,.")
    m["notes"] = notes


def enhance(d: dict) -> dict:
    """Add is_latest / pricing / best_for to each model option under each node."""
    for n in d.get("nodes", []):
        for m in n.get("models", []):
            clean_notes(m)
            notes = m.get("notes", "")
            hints = NEW_OLD_RE.findall(notes)
            outdated = any(w in hints for w in
                           ("superseded", "replaced", "legacy", "deprecated", "old", "previous", "retired"))
            newest = any(w in hints for w in ("latest", "newest", "current flagship"))
            if outdated and not newest:
                m["is_latest"] = False
            elif newest and not outdated:
                m["is_latest"] = True
            elif m.get("recommended") is False:
                m["is_latest"] = False
            elif m.get("recommended") is True and m.get("released"):
                m["is_latest"] = True
            else:
                m["is_latest"] = None
            if "pricing" not in m:
                pr = PRICE_RE.findall(notes)
                m["pricing"] = pr[0] if pr else "not published"
            if "best_for" not in m:
                caps = m.get("capabilities", [])
                mapped = [CAP_TO_USE[c] for c in caps if c in CAP_TO_USE]
                m["best_for"] = "best for " + ", ".join(mapped[:3]) if mapped else ""
    return d


# ---------- verify ----------
def verify(d: dict) -> bool:
    ok = True
    nodes = d.get("nodes", [])
    if len(nodes) != 227:
        log(f"FAIL: node count {len(nodes)} != 227")
        ok = False
    models = [m for n in nodes for m in n.get("models", [])]
    if any(not m.get("name") for m in models):
        log("FAIL: a model option lacks a name")
        ok = False
    if any(not n.get("node_id") for n in nodes):
        log("FAIL: a node lacks node_id")
        ok = False
    raw = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
    if CJK.search(raw):
        log("FAIL: CJK leftovers in output")
        ok = False
    if "sources" in raw:
        log("FAIL: sources field still present (should be removed)")
        ok = False
    if ok:
        log("self-check passed")
    return ok


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scan", action="store_true", help="force re-scan of nodes")
    ap.add_argument("--verify", action="store_true", help="run self-check after build")
    args = ap.parse_args()

    DATA.mkdir(exist_ok=True)
    log("step 1/3: scan nodes")
    run_scan(args.scan)

    log("step 2/3: merge node-centric index")
    d = run_merge()

    log("step 3/3: enhance decision fields")
    enhance(d)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
    nodes = d["nodes"]
    with_models = sum(1 for n in nodes if n.get("models"))
    log(f"generated {OUT.name}: {len(nodes)} nodes / {with_models} with model options")

    if args.verify:
        return 0 if verify(d) else 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
