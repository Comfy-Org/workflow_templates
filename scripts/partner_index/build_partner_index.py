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
  index.partner_node.json (repo root; NOT under templates/ so CI template
  scanners / bundles sync do not treat it as a template)
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
OUT = ROOT / "index.partner_node.json"  # repo root: CI template scanners only scan templates/

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
def load_source_snippets() -> dict:
    """Parse comfy_api_nodes/*.py via AST and return {node_id: source snippet}.

    Used for node-level capability inference and description filling.
    """
    import ast as _ast

    comfyui = Path.home() / "Documents/Github/ComfyUI/comfy_api_nodes"
    if not comfyui.exists():
        return {}
    snippets = {}
    for f in sorted(comfyui.glob("nodes_*.py")):
        source = f.read_text(encoding="utf-8", errors="replace")
        try:
            tree = _ast.parse(source)
        except SyntaxError:
            continue
        lines = source.splitlines()
        for node in _ast.walk(tree):
            if not isinstance(node, _ast.ClassDef):
                continue
            if node.name in snippets:
                continue
            snippets[node.name] = "\n".join(lines[node.lineno - 1:node.end_lineno])
    return snippets


def model_key(name: str) -> str:
    """Normalize a model name for fuzzy matching (lowercase, alnum only)."""
    return re.sub(r"[^a-z0-9]", "", name.lower())


def build_model_info(extracts: list) -> dict:
    """model name -> enriched info, with fuzzy aliases so scan option names that
    differ in case/spacing (e.g. 'seedream 5.0 pro' vs 'Seedream 5.0 Pro') or are
    API ids inside extract display names (e.g. 'kling-v3' in 'Kling 3.0 (kling-v3)')
    still match. Returns a dict keyed by exact name plus '_aliases'."""
    model_info = {}
    for e in extracts:
        for m in e.get("models", []):
            name = m.get("name")
            if not name:
                continue
            if name not in model_info:
                model_info[name] = m
    # alias map: normalized key -> first extract name
    aliases = {}
    for name in model_info:
        k = model_key(name)
        aliases.setdefault(k, name)
        # also index API ids inside parentheses: "Kling 3.0 (kling-v3)" -> kling-v3
        pm = re.findall(r"\(([^)]+)\)", name)
        for grp in pm:
            for token in grp.split("/"):
                tk = model_key(token)
                if len(tk) >= 4:
                    aliases.setdefault(tk, name)
    # manual aliases for option names that do not share a normalized key with
    # the extract display name (aggregate names vs per-task API ids)
    MANUAL_ALIASES = {
        "happyhorse-1.1-i2v": "HappyHorse 1.1 (t2v/i2v/r2v)",
        "happyhorse-1.1-r2v": "HappyHorse 1.1 (t2v/i2v/r2v)",
        "happyhorse-1.1-t2v": "HappyHorse 1.1 (t2v/i2v/r2v)",
        "happyhorse-1.0-i2v": "HappyHorse 1.0 (t2v/i2v/r2v/video-edit)",
        "happyhorse-1.0-r2v": "HappyHorse 1.0 (t2v/i2v/r2v/video-edit)",
        "happyhorse-1.0-t2v": "HappyHorse 1.0 (t2v/i2v/r2v/video-edit)",
        "happyhorse-1.0-video-edit": "HappyHorse 1.0 (t2v/i2v/r2v/video-edit)",
        "wan2.7-i2v": "Wan 2.7 (t2v/i2v/videoedit/r2v)",
        "wan2.7-r2v": "Wan 2.7 (t2v/i2v/videoedit/r2v)",
        "wan2.7-t2v": "Wan 2.7 (t2v/i2v/videoedit/r2v)",
        "wan2.7-videoedit": "Wan 2.7 (t2v/i2v/videoedit/r2v)",
        "viduq3-turbo": "Vidu Q3 (viduq3-pro/turbo)",
        "viduq3-pro": "Vidu Q3 (viduq3-pro/turbo)",
        "viduq2-turbo": "Vidu Q2 (viduq2/pro/turbo/pro-fast)",
        "viduq2-pro": "Vidu Q2 (viduq2/pro/turbo/pro-fast)",
        "kling-3.0-turbo": "Kling 3.0 Turbo (kling-3.0-turbo)",
        # API id date-code variants
        "seedream-4-5-251128": "Seedream 4.5",
        "seedream-4-0-250828": "Seedream 4.0",
        "seedance-1-0-pro-250528": "Seedance 1.0 Pro/Lite",
        "seedance-1-0-lite-i2v-250428": "Seedance 1.0 Pro/Lite",
        "seedance-1-0-lite-t2v-250428": "Seedance 1.0 Pro/Lite",
        "seedance-1-0-pro-fast-251015": "Seedance 1.0 Pro/Lite",
        "seedance-1-5-pro-251215": "Seedance 1.5 Pro",
        # per-task API ids inside aggregate extract names
        "ray-2": "Ray 2 / Ray Flash 2",
        "ray-flash-2": "Ray 2 / Ray Flash 2",
        "ray-1-6": "Ray 1.6 (Dream Machine)",
        "sora-2": "Sora 2 / Sora 2 Pro",
        "sora-2-pro": "Sora 2 / Sora 2 Pro",
        "veo-3.1-generate": "Veo 3.1 (generate/fast/lite)",
        "veo-3.1-fast-generate": "Veo 3.1 (generate/fast/lite)",
        "veo-3.1-lite": "Veo 3.1 (generate/fast/lite)",
        "veo-3.0-generate-001": "Veo 3.0 (generate/fast)",
        "veo-3.0-fast-generate-001": "Veo 3.0 (generate/fast)",
        "veo-2.0-generate-001": "Veo 2.0",
        "T2V-01": "T2V-01 / T2V-01-Director",
        "T2V-01-Director": "T2V-01 / T2V-01-Director",
        "I2V-01": "I2V-01 / I2V-01-Director / I2V-01-live",
        "I2V-01-Director": "I2V-01 / I2V-01-Director / I2V-01-live",
        "I2V-01-live": "I2V-01 / I2V-01-Director / I2V-01-live",
        "S2V-01": "S2V-01",
        "kling-video-o1": "Kling 3.0 (kling-v3)",
        "kling-image-o1": "Kling 3.0 (kling-v3)",
        "kling-v3-omni": "Kling 3.0 (kling-v3)",
        "kling-v2-6": "Kling 2.6 (kling-v2-6)",
        "kling-v2-5-turbo": "Kling 2.5 Turbo (kling-v2-5-turbo)",
        "kling-v2": "Kling 2.5 Turbo (kling-v2-5-turbo)",
        "gpt-image-1": "gpt-image-1",
        "gpt-image-1.5": "gpt-image-1.5",
        "gpt-image-2": "gpt-image-2",
        "qwen-image-3.0": "Qwen Image 3.0",
        "qwen-image-3.0-pro": "Qwen Image 3.0 Pro",
        "generative_portrait": "Generative Model (1x)",
        "seed-audio-1.0": "Seed Audio 1.0",
        "seed-audio-1.0-multilingual": "Seed Audio 1.0 Multilingual",
        "reve-create@20250915": "Reve Image Create",
        "reve-edit@20250915": "Reve Image Edit",
        "reve-edit-fast@20251030": "Reve Image Edit",
        "reve-remix@20250915": "Reve Image Remix",
        "reve-remix-fast@20251030": "Reve Image Remix",
        "gemini-2.5-pro": "Gemini 3.1 Pro",
        "gemini-2.5-flash": "Gemini 3.1 Flash-Lite",
        "gemini-3-pro-preview": "Gemini 3.5 Flash",
        "gemini-3-1-pro": "Gemini 3.1 Pro",
        "gemini-3-1-flash-lite": "Gemini 3.1 Flash-Lite",
        "wan2.5-t2v-preview": "Wan 2.5 preview",
        "wan2.5-i2v-preview": "Wan 2.5 preview",
        "wan2.5-t2i-preview": "Wan 2.5 preview",
        "wan2.5-i2i-preview": "Wan 2.5 preview",
        "wan2.6-t2v": "Wan 2.6 (t2v/i2v/r2v)",
        "wan2.6-i2v": "Wan 2.6 (t2v/i2v/r2v)",
        "wan2.6-r2v": "Wan 2.6 (t2v/i2v/r2v)",
    }
    for opt, name in MANUAL_ALIASES.items():
        if name in model_info:
            aliases.setdefault(model_key(opt), name)
    model_info["_aliases"] = aliases
    return model_info


def lookup_model(model_info: dict, opt: str):
    """Resolve a scan option name to enriched info via exact / fuzzy / alias match."""
    if opt in model_info:
        return model_info[opt], "exact"
    aliases = model_info.get("_aliases", {})
    k = model_key(opt)
    if k in aliases:
        return model_info[aliases[k]], "alias"
    # substring fallback: option name contained in an extract name or vice versa.
    # Both keys must be long enough to avoid nonsense matches (e.g. "3.1" hitting
    # "gemini31pro"); exact-digit keys are never substring-matched.
    if len(k) >= 6:
        for key, name in aliases.items():
            if len(key) >= 6 and (k in key or key in k):
                return model_info[name], "substring"
    return None, None


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

    # 1. Build a lookup: model name -> enriched info with fuzzy aliases
    model_info = build_model_info(extracts)

    # 2. Node-centric entries
    result = {
        "schema_version": "2.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "description": "ComfyUI Partner Node index (node-centric): every node with its model options, capabilities and recommendation flags. Used by the in-app agent for retrieval (capability index -> template library -> node library).",
        "nodes": [],
    }

    sources = load_source_snippets()

    for n in sorted(scan.get("nodes", []), key=lambda x: (x.get("category", ""), x.get("node_id", ""))):
        # Drop deprecated nodes: they may still exist in the product UI for a
        # grace period, but the capability index must not advertise them.
        if n.get("deprecated"):
            log(f"skip deprecated node: {n.get('node_id')}")
            continue
        models_out = []
        recommended_models = []
        model_caps = []
        for opt in n.get("models", []):
            info, how = lookup_model(model_info, opt)
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
                model_caps.extend(info.get("capabilities", []))
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
        if n.get("pricing"):
            entry["pricing"] = n["pricing"]
        if recommended_models:
            entry["recommended_models"] = recommended_models

        # Node-level capabilities (from display_name/IO/model caps)
        if sources:
            from node_capabilities import enrich_nodes

            enrich_nodes([entry], sources, model_caps_by_node={n["node_id"]: model_caps})
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


def clean_text_urls(text: str) -> str:
    """Strip URLs and leftover source/verified markers from free text
    (node descriptions), keeping the surrounding sentences."""
    if not text:
        return text
    text = re.sub(r"\[verified:[^\]]*\]", "", text)
    text = re.sub(r",?\s*sources:\s*[^\]]*", "", text)
    text = re.sub(r"https?://[^\s,\]]+", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"\s+\.", ".", text)
    text = text.rstrip(" ,.")
    return text


def enhance(d: dict) -> dict:
    """Add is_latest / pricing / best_for to each model option under each node.
    Node descriptions prefer official docs (official_descriptions.py), falling
    back to rule-based descriptions already merged in."""
    try:
        import official_descriptions as od
    except ImportError:
        od = None

    for n in d.get("nodes", []):
        if od is not None:
            official = od.get_node_description(n.get("node_id", ""))
            if official:
                n["description"] = official
        n["description"] = clean_text_urls(n.get("description", ""))
        for m in n.get("models", []):
            clean_notes(m)
            if od is not None:
                official_note = od.get_model_note(m.get("name", ""))
                if official_note:
                    m["notes"] = official_note
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
    if len(nodes) != 216:
        log(f"FAIL: node count {len(nodes)} != 216 (232 scanned minus 16 deprecated)")
        ok = False
    if any(n.get("deprecated") for n in nodes):
        log("FAIL: deprecated node slipped into the index")
        ok = False
    models = [m for n in nodes for m in n.get("models", [])]
    if any(not m.get("name") for m in models):
        log("FAIL: a model option lacks a name")
        ok = False
    if any(not n.get("node_id") for n in nodes):
        log("FAIL: a node lacks node_id")
        ok = False
    no_caps = [n["node_id"] for n in nodes if not n.get("capabilities")]
    if no_caps:
        log(f"FAIL: {len(no_caps)} nodes lack capabilities: {no_caps[:10]}")
        ok = False
    # Pricing sanity: usd_range must be [min, max] with min > 0 and max <= 100
    # (no per-run price reaches three figures; 0 means the extractor missed).
    bad_price = []
    for n in nodes:
        p = n.get("pricing")
        if not p:
            continue
        r = p.get("usd_range")
        if not (isinstance(r, list) and len(r) == 2 and r[0] > 0 and r[0] <= r[1] and r[1] <= 100):
            bad_price.append((n["node_id"], p))
        if p.get("kind") not in ("fixed", "tiered", "dynamic", "range", "credits"):
            bad_price.append((n["node_id"], p))
    if bad_price:
        log(f"FAIL: {len(bad_price)} nodes have invalid pricing: {bad_price[:5]}")
        ok = False
    with_price = [n["node_id"] for n in nodes if n.get("pricing")]
    log(f"info: {len(with_price)}/{len(nodes)} nodes have pricing "
        f"({sum(1 for n in nodes if n.get('pricing', {}).get('kind') == 'fixed')} fixed, "
        f"{sum(1 for n in nodes if n.get('pricing', {}).get('kind') == 'tiered')} tiered, "
        f"{sum(1 for n in nodes if n.get('pricing', {}).get('kind') == 'dynamic')} dynamic, "
        f"{sum(1 for n in nodes if n.get('pricing', {}).get('kind') == 'range')} range, "
        f"{sum(1 for n in nodes if n.get('pricing', {}).get('kind') == 'credits')} credits)")
    empty_desc = [n["node_id"] for n in nodes if not n.get("description", "").strip()]
    if empty_desc:
        log(f"FAIL: {len(empty_desc)} nodes lack description: {empty_desc[:10]}")
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
