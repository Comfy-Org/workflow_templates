#!/usr/bin/env python3
"""
sync-mcp-index.py — Synchronize template list from index.json to index.mcp.json

Step 1 of the MCP pipeline (deterministic sync):
  - Existing templates → refresh metadata from index.json; AI copy from template_cache when hash matches
  - New templates → index.json description + inferred io until AI cache is populated
  - capabilities → workflow abilities/features from index.json tags (kebab-case); no raw `tags` in MCP output
  - model_options → merged under `capabilities.model_options` (single API model node only)
  - On each run: refresh api_node_model_options.json from local ComfyUI, then sync index.mcp.json
  - Templates with 2+ API model nodes → skip model_options (logged to scripts/.output/sync_index.log)
  - freshness → semantic label derived from index.json `date`; see freshness_score.py
  - recommend → semantic label derived from usage; see recommend_score.py
    Manual overrides in template_overrides.json; Use Cases never below `low`
  - Skips instructional categories: Node Basics, LLM, Getting Started

Step 2 (separate): AI reads models_registry.json to polish descriptions.

Usage:
  python3 scripts/mcp/sync_index.py              # scan API nodes + sync and write
  python3 scripts/mcp/sync_index.py --check      # scan + dry-run index.mcp.json
  python3 scripts/mcp/sync_index.py --no-scan    # sync using cached api_node_model_options.json

Dependencies:
  - templates/index.json (source data)
  - templates/index.mcp.json (target file)
  - scripts/data/mcp/template_cache.json (AI template description/io; merged when source_hash matches)
  - scripts/data/mcp/models_registry.json (model name resolution only)
  - scripts/data/mcp/template_overrides.json (manual recommend/freshness overrides)
"""

from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

_lib_dir = Path(__file__).resolve().parent
if str(_lib_dir) not in sys.path:
    sys.path.insert(0, str(_lib_dir))

from bootstrap import install_paths

install_paths()

from comfyui_paths import resolve_comfy_api_nodes_dir  # noqa: E402
from json_format import dumps_compact_arrays  # noqa: E402
from paths import API_NODE_OPTIONS_FILE, MODELS_REGISTRY_FILE, REPO_ROOT, SCRIPTS_ROOT  # noqa: E402
from freshness_score import freshness_from_date  # noqa: E402
from scan_api_node_models import (  # noqa: E402
    model_options_for_workflow,
    scan_api_nodes_dir,
)
from template_cache import (  # noqa: E402
    apply_template_cache_to_mcp,
    apply_template_overlay,
    cache_matches_workflow,
    load_template_cache,
)
from template_overrides import load_template_overrides, resolve_recommend  # noqa: E402

TEMPLATES_DIR = REPO_ROOT / "templates"
INDEX_FILE = TEMPLATES_DIR / "index.json"
OUTPUT_FILE = TEMPLATES_DIR / "index.mcp.json"
SYNC_LOG_FILE = SCRIPTS_ROOT / ".output" / "sync_index.log"

INDEX_GROUP_TO_MCP_CATEGORY: dict[str, str] = {
    "Use Cases": "Use Cases",
    "Image": "Image",
    "Video": "Video",
    "Audio": "Audio",
    "3D Model": "3D Model",
    "Utility": "Utility",
}

EXCLUDED_MCP_CATEGORIES = frozenset({
    "Node Basics",
    "LLM",
    "Getting Started",
})

CATEGORY_DESCRIPTIONS: dict[str, str] = {
    "Use Cases": (
        "Concrete workflow examples that showcase specific applications, effects, and content. "
        "These are purpose-built workflows for fixed use cases rather than general-purpose generation, "
        "though they can be adapted with basic modifications."
    ),
    "Image": (
        "General-purpose workflow templates for native image generation, including text-to-image, "
        "image editing, inpainting, and other core image workflows supported out of the box."
    ),
    "Video": (
        "General-purpose workflow templates for native video generation, including text-to-video, "
        "image-to-video, and other core video workflows supported out of the box."
    ),
    "Audio": (
        "General-purpose workflow templates for native audio generation, including text-to-audio "
        "and other core audio workflows supported out of the box."
    ),
    "3D Model": (
        "General-purpose workflow templates for native 3D model generation, including image-to-3D "
        "and other core 3D workflows supported out of the box."
    ),
    "Utility": (
        "Tooling and utility workflows for supporting tasks such as upscaling, background removal, "
        "image preprocessing, and other image or video processing helpers."
    ),
}

# index.json tag → template capability slug (kebab-case vocabulary)
TAG_TO_CAPABILITY: dict[str, str] = {
    "Text to Image": "text-to-image",
    "Image to Image": "image-edit",
    "Image Edit": "image-edit",
    "Text to Video": "text-to-video",
    "Image to Video": "image-to-video",
    "Reference to Video": "reference-to-video",
    "Video to Video": "video-to-video",
    "Video Edit": "video-edit",
    "Inpainting": "inpainting",
    "Outpainting": "outpainting",
    "ControlNet": "controlnet",
    "Upscaling": "image-upscale",
    "Image Upscale": "image-upscale",
    "FLF2V": "flf2v",
    "Lip Sync": "lip-sync",
    "Text to 3D": "text-to-3d",
    "Image to 3D": "image-to-3d",
    "Text to Speech": "text-to-speech",
    "Text to Music": "text-to-music",
    "Audio to Audio": "audio-to-audio",
    "Voice Conversion": "voice-conversion",
    "Audio Editing": "audio-edit",
    "Face Swap": "face-swap",
    "Style Transfer": "style-transfer",
    "Style Reference": "style-reference",
    "Character Reference": "character-reference",
    "Brand Design": "brand-design",
    "Product": "product-mockup",
    "Mockup": "product-mockup",
    "Fashion": "virtual-try-on",
    "Relight": "relight",
    "Background Removal": "background-removal",
    "Depth Estimation": "depth-estimation",
    "Frame Interpolation": "frame-interpolation",
    "Video Extension": "video-extension",
    "Video Outpainting": "video-outpainting",
    "Motion Control": "motion-control",
    "Virtual Try-On": "virtual-try-on",
}

# Technique / modality tags → capability slugs (meaningful for MCP, not stripped as meta).
TECHNIQUE_TAG_TO_CAPABILITY: dict[str, str] = {
    "LoRA": "lora",
    "API": "api",
}

# Tags that are bundle/media labels only — not emitted as capabilities.
META_TAGS = frozenset({
    "Video",
    "Image",
    "Audio",
    "3D",
    "LLM",
})

try:
    with open(MODELS_REGISTRY_FILE, encoding="utf-8") as f:
        MODELS_REGISTRY: dict[str, Any] = json.load(f)
except FileNotFoundError:
    MODELS_REGISTRY = {}
except json.JSONDecodeError as exc:
    raise RuntimeError(f"Invalid JSON in {MODELS_REGISTRY_FILE}: {exc}") from exc


def slugify_tag(tag: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", tag.lower()).strip("-")


def capabilities_from_tags(tags: list[str]) -> list[str]:
    caps: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        if tag in TECHNIQUE_TAG_TO_CAPABILITY:
            cap = TECHNIQUE_TAG_TO_CAPABILITY[tag]
        elif tag in META_TAGS:
            continue
        else:
            cap = TAG_TO_CAPABILITY.get(tag) or slugify_tag(tag)
        if cap and cap not in seen:
            seen.add(cap)
            caps.append(cap)
    return caps


def build_capabilities(
    tags: list[str],
    model_options: dict[str, list[str]] | None,
) -> dict[str, Any] | None:
    """Unified capabilities object: workflow features + optional API model dropdowns."""
    workflow = capabilities_from_tags(tags)
    if model_options and "api" not in workflow:
        workflow = ["api", *workflow]
    if not workflow and not model_options:
        return None
    payload: dict[str, Any] = {}
    if workflow:
        payload["workflow"] = workflow
    if model_options:
        payload["model_options"] = model_options
    return payload


def is_local_only_distribution(tpl: dict) -> bool:
    dist = tpl.get("includeOnDistributions")
    return dist == ["local"]


def resolve_model(name: str, index_models: list[str]) -> str:
    if index_models:
        for m in index_models:
            if m in MODELS_REGISTRY:
                return m
        return index_models[0]
    name_l = name.lower()
    candidates = [(len(k), k) for k in sorted(MODELS_REGISTRY, reverse=True) if k.lower() in name_l]
    if candidates:
        return max(candidates, key=lambda x: x[0])[1]
    return ""


def extract_model_name(name: str, index_models: list[str]) -> str:
    if index_models:
        return index_models[0]
    name_l = name.lower()
    for key in ["flux", "wan", "sdxl", "sd3", "sd1", "llama", "qwen", "gemma", "kling", "ltx"]:
        if key in name_l:
            return key
    return ""


def scan_workflow_nodes(name: str) -> list[str]:
    wf_path = TEMPLATES_DIR / f"{name}.json"
    if not wf_path.exists():
        return []
    try:
        with open(wf_path, encoding="utf-8") as f:
            wf = json.load(f)
        return [n.get("type", "") for n in wf.get("nodes", []) if n.get("type")]
    except Exception:
        return []


_HAS_VIDEO = [
    "VideoCombineNode",
    "VHS_VideoCombine",
    "VHS_VideoComb",
    "VHS_VideoCombineNode",
    "FFMPEGVideoCombine",
]


def infer_task(name: str, group_type: str, tags: list[str]) -> str:
    for tag in tags:
        if tag in TAG_TO_CAPABILITY and tag not in META_TAGS:
            if tag not in ("ControlNet", "Upscaling", "Inpainting", "Outpainting"):
                return tag
    name_l = name.lower()
    pairs: list[tuple[list[str], str]] = [
        (["text_to_3d", "text-to-3d"], "Text to 3D"),
        (["img2_3d", "img2-3d", "image_to_3d", "image-to-3d"], "Image to 3D"),
        (["perspective_to_3d"], "Perspective to 3D"),
        (["txt2vid", "text_to_video", "text-to-video", "t2v"], "Text to Video"),
        (["img2vid", "img_to_vid", "image_to_video", "image-to-video", "i2v"], "Image to Video"),
        (["r2v", "reference_to_video"], "Reference to Video"),
        (["img_edit", "img2img"], "Image to Image"),
        (["text_to_image", "text-to-image", "t2i"], "Text to Image"),
        (["upscale"], "Image Upscaling"),
        (["inpaint"], "Image Inpainting"),
        (["segment"], "Image Segmentation"),
        (["remove"], "Background Removal"),
        (["depth"], "Depth Estimation"),
        (["matting"], "Image Matting"),
        (["vid2vid", "video_to_video", "video-to-video"], "Video to Video"),
        (["frame_interpolation", "slowmo"], "Frame Interpolation"),
        (["text_to_music", "text-to-music", "t2m"], "Text to Music"),
        (["text_to_speech", "text-to-speech", "tts"], "Text to Speech"),
        (["audio_to_audio", "audio-to-audio", "a2a"], "Audio to Audio"),
        (["voice_conversion", "voice_convert"], "Voice Conversion"),
        (["audio_edit"], "Audio Editing"),
        (["text_gen", "llm", "chat"], "Text Generation"),
        (["batch"], "Batch Processing"),
        (["stitch", "combine", "merge"], "Image Composition"),
        (["color"], "Color Adjustment"),
        (["mask"], "Mask Operation"),
        (["switch"], "Conditional Routing"),
        (["datatype", "convert"], "Data Conversion"),
        (["select"], "Prompt Selection"),
    ]
    for patterns, task in pairs:
        if any(p in name_l for p in patterns):
            return task
    type_map = {
        "image": "Image Generation",
        "video": "Video Generation",
        "audio": "Audio Generation",
        "3d": "3D Generation",
        "llm": "Text Generation",
    }
    return type_map.get(group_type, "General")


def infer_task_type(name: str) -> str:
    name_l = name.lower()
    if any(x in name_l for x in ["t2v", "txt2vid", "text_to_video", "text-to-video"]):
        return "t2v"
    if any(x in name_l for x in ["i2v", "img2vid", "img_to_vid", "image_to_video", "image-to-video", "r2v", "reference_to_video"]):
        return "i2v"
    if any(x in name_l for x in ["t2i", "text_to_image", "text-to-image"]):
        return "t2i"
    if any(x in name_l for x in ["i2i", "img_edit", "img2img"]):
        return "i2i"
    if any(x in name_l for x in ["segment", "matting"]):
        return "seg"
    if "upscale" in name_l:
        return "upscale"
    if "depth" in name_l:
        return "depth"
    if "remove" in name_l:
        return "remove"
    if any(x in name_l for x in ["frame", "film", "rife", "slowmo", "gimm"]):
        return "frame"
    if "text_to_3d" in name_l or "text-to-3d" in name_l:
        return "t2-3d"
    if any(x in name_l for x in ["img2_3d", "img2-3d", "image_to_3d", "image-to-3d"]):
        return "i2-3d"
    if any(x in name_l for x in ["text_to_audio", "text-to-audio", "text_to_music", "text-to-music"]):
        return "t2a"
    if any(x in name_l for x in ["text_gen", "llm", "chat"]):
        return "llm"
    if any(x in name_l for x in ["rembg", "birefnet", "bi-refnet", "background"]):
        return "remove"
    if "gaussian" in name_l or "splat" in name_l:
        return "3d"
    if "perspective" in name_l:
        return "perspective"
    return ""


def _encode_slot(typ: str, role: str = "", count: int = 1) -> str:
    """One io slot: 'image: subject ref' or 'image×4: multi-view refs'."""
    prefix = f"{typ}×{count}" if count > 1 else typ
    role = role.strip()
    return f"{prefix}: {role}" if role else prefix


def _io(
    inputs: list[str] | None = None,
    outputs: list[str] | None = None,
) -> dict:
    """Structured io: ordered string slots (rendered inline via dumps_compact_arrays)."""
    return {"inputs": list(inputs or []), "outputs": list(outputs or [])}


def _normalize_io_side(slots: list | dict | None) -> list[str]:
    """Normalize legacy object/dict slots to string array."""
    if not slots:
        return []
    if isinstance(slots, dict):
        return [
            _encode_slot(typ, "", int(count))
            for typ, count in slots.items()
            if typ and int(count) > 0
        ]
    result: list[str] = []
    for slot in slots:
        if isinstance(slot, str):
            result.append(slot)
            continue
        typ = slot.get("type", "")
        if not typ:
            continue
        role = (slot.get("role") or slot.get("purpose") or "").strip()
        count = int(slot.get("count", 1))
        result.append(_encode_slot(typ, role, count))
    return result


def _io_is_aggregated(io: dict) -> bool:
    """True when inputs/outputs are lossy type→count maps (no per-slot roles)."""
    for key in ("inputs", "outputs"):
        side = io.get(key)
        if isinstance(side, dict):
            return True
    return False


def normalize_io(io: dict | None, fallback: dict | None = None) -> dict | None:
    """Normalize io to string arrays; recover from fallback when io was over-compacted."""
    source = io
    if source and _io_is_aggregated(source) and fallback and not _io_is_aggregated(fallback):
        source = fallback
    if not source:
        return None
    normalized = {
        "inputs": _normalize_io_side(source.get("inputs")),
        "outputs": _normalize_io_side(source.get("outputs")),
    }
    if not normalized["inputs"] and not normalized["outputs"]:
        return None
    return normalized


def infer_io(task_type: str, node_types: list[str]) -> dict:
    has_mask = any("mask" in n.lower() for n in node_types)
    has_vid = any(n in node_types for n in _HAS_VIDEO)
    if task_type == "t2i":
        return _io(
            inputs=[_encode_slot("text", "Prompt")],
            outputs=[_encode_slot("image", "Generated image")],
        )
    if task_type == "i2i":
        inputs = [
            _encode_slot("image", "Reference image"),
            _encode_slot("text", "Edit prompt"),
        ]
        if has_mask:
            inputs.append(_encode_slot("image", "Edit region mask"))
        return _io(inputs=inputs, outputs=[_encode_slot("image", "Edited image")])
    if task_type == "t2v":
        return _io(
            inputs=[_encode_slot("text", "Video prompt")],
            outputs=[_encode_slot("video", "Generated video")],
        )
    if task_type == "i2v":
        return _io(
            inputs=[
                _encode_slot("image", "Reference image"),
                _encode_slot("text", "Motion or style prompt"),
            ],
            outputs=[_encode_slot("video", "Animated video")],
        )
    if task_type == "seg":
        return _io(
            inputs=[_encode_slot("image", "Input image")],
            outputs=[_encode_slot("image", "Segmentation mask")],
        )
    if task_type == "upscale":
        return _io(
            inputs=[_encode_slot("image", "Input image")],
            outputs=[_encode_slot("image", "Upscaled image")],
        )
    if task_type == "depth":
        return _io(
            inputs=[_encode_slot("image", "Input image")],
            outputs=[_encode_slot("image", "Depth map")],
        )
    if task_type == "remove":
        return _io(
            inputs=[_encode_slot("image", "Input image")],
            outputs=[_encode_slot("image", "Background removed")],
        )
    if task_type in ("frame", "temporal"):
        return _io(
            inputs=[_encode_slot("video", "Input video")],
            outputs=[_encode_slot("video", "Interpolated video")],
        )
    if task_type == "t2-3d":
        return _io(
            inputs=[_encode_slot("text", "3D model prompt")],
            outputs=[_encode_slot("model", "Generated 3D model")],
        )
    if task_type == "i2-3d":
        return _io(
            inputs=[_encode_slot("image", "Reference image")],
            outputs=[_encode_slot("model", "Generated 3D model")],
        )
    if task_type == "3d":
        return _io(
            inputs=[_encode_slot("image", "Multi-view images", 4)],
            outputs=[_encode_slot("model", "3D scene")],
        )
    if task_type == "perspective":
        return _io(
            inputs=[_encode_slot("image", "Perspective image")],
            outputs=[_encode_slot("model", "Estimated mesh")],
        )
    if task_type == "llm":
        return _io(
            inputs=[_encode_slot("text", "User prompt")],
            outputs=[_encode_slot("text", "Model response")],
        )
    if task_type == "t2a":
        return _io(
            inputs=[_encode_slot("text", "Audio prompt")],
            outputs=[_encode_slot("audio", "Generated audio")],
        )
    out_type = "video" if has_vid else "image"
    return _io(
        inputs=[_encode_slot("text", "Prompt")],
        outputs=[_encode_slot(out_type, "Generated output")],
    )


def auto_description(name: str, task: str, model: str, is_api: bool) -> str:
    model_phrase = f" using {model}" if model else ""
    desc = f"A {task.lower()} workflow{model_phrase}."
    if desc and not desc[0].isupper():
        desc = desc[0].upper() + desc[1:]
    if is_api:
        desc += " This workflow calls a third-party API. Execution time depends on server-side response."
    else:
        desc += " This workflow runs on Comfy Cloud and executes quickly."
    return desc


def resolve_mcp_category(entry: dict) -> Optional[str]:
    group_title = entry.get("title", "")
    if not group_title:
        return None
    if group_title in EXCLUDED_MCP_CATEGORIES:
        return None
    return INDEX_GROUP_TO_MCP_CATEGORY.get(group_title)


_api_node_index: dict[str, dict[str, Any]] | None = None


def refresh_api_node_model_options() -> tuple[dict[str, dict[str, Any]], str]:
    """Scan comfy_api_nodes source and write api_node_model_options.json."""
    api_nodes_dir = resolve_comfy_api_nodes_dir()
    index = scan_api_nodes_dir(api_nodes_dir)
    with_model = sum(1 for meta in index.values() if meta.get("model_options"))
    payload = {
        "source": str(api_nodes_dir),
        "node_count": len(index),
        "nodes": index,
    }
    API_NODE_OPTIONS_FILE.write_text(
        dumps_compact_arrays(payload),
        encoding="utf-8",
    )
    global _api_node_index
    _api_node_index = index
    return index, (
        f"API node scan: {with_model} nodes with model dropdown "
        f"(written {API_NODE_OPTIONS_FILE.name})"
    )


def load_api_node_index() -> dict[str, dict[str, Any]]:
    """Load scanned comfy_api_nodes model dropdown cache (verbatim option strings)."""
    global _api_node_index
    if _api_node_index is not None:
        return _api_node_index
    if not API_NODE_OPTIONS_FILE.exists():
        _api_node_index = {}
        return _api_node_index
    payload = json.loads(API_NODE_OPTIONS_FILE.read_text(encoding="utf-8"))
    _api_node_index = payload.get("nodes") or {}
    return _api_node_index


def resolve_model_options_for_template(
    name: str,
    node_index: dict[str, dict[str, Any]],
) -> tuple[dict[str, list[str]] | None, list[str]]:
    """Return model_options for index.mcp.json, or None when 0 or 2+ API model nodes."""
    workflow_path = TEMPLATES_DIR / f"{name}.json"
    if not workflow_path.exists():
        return None, []
    mapping = model_options_for_workflow(workflow_path, node_index)
    node_types = list(mapping.keys())
    if not node_types:
        return None, []
    if len(node_types) > 1:
        return None, node_types
    return {node_types[0]: mapping[node_types[0]]}, node_types


def append_sync_log(lines: list[str]) -> None:
    """Append run notes to gitignored scripts/.output/sync_index.log."""
    SYNC_LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    with SYNC_LOG_FILE.open("a", encoding="utf-8") as f:
        f.write(f"\n--- sync_index {ts} ---\n")
        for line in lines:
            f.write(f"{line}\n")


def build_template_entry(
    tpl: dict,
    group_type: str,
    node_index: dict[str, dict[str, Any]],
    multi_api_skips: list[tuple[str, list[str]]],
    template_cache: dict[str, Any] | None = None,
    *,
    mcp_category: str | None = None,
    metadata_overrides: dict[str, Any] | None = None,
) -> dict:
    name = tpl["name"]
    tags = tpl.get("tags", [])
    models = tpl.get("models", [])
    is_api = "API" in tags
    model = resolve_model(name, models) or extract_model_name(name, models)
    model_options, api_model_nodes = resolve_model_options_for_template(name, node_index)
    if len(api_model_nodes) > 1:
        multi_api_skips.append((name, api_model_nodes))
        model_options = None
    capabilities = build_capabilities(tags, model_options)

    usage = tpl.get("usage", 0)
    node_types = scan_workflow_nodes(name)
    task = infer_task(name, group_type, tags)
    task_type = infer_task_type(name)

    cached = template_cache or {}
    io_info = infer_io(task_type, node_types)
    desc = tpl.get("description") or auto_description(name, task, model, is_api)

    override_row = (metadata_overrides or {}).get("templates", {}).get(name) or {}
    freshness = freshness_from_date(tpl.get("date"))
    if override_row.get("freshness"):
        freshness = override_row["freshness"]

    entry = {
        "name": name,
        "title": tpl.get("title", name),
        "task": task,
        "model": model,
        "freshness": freshness,
        "usage": usage,
        "recommend": resolve_recommend(
            usage,
            mcp_category=mcp_category,
            override=override_row.get("recommend"),
        ),
        "description": desc,
        "io": io_info,
    }
    if capabilities:
        entry["capabilities"] = capabilities
    if cached.get("io") and cache_matches_workflow(name, cached):
        normalized = normalize_io(cached["io"])
        if normalized:
            entry["io"] = normalized
    return apply_template_overlay(entry, cached, name)


def sync(
    node_index: dict[str, dict[str, Any]],
) -> tuple[list[dict], list[str], list[str], list[str], list[str], list[tuple[str, list[str]]]]:
    with open(INDEX_FILE, encoding="utf-8") as f:
        index_data = json.load(f)

    current_data: list[dict] = []
    if OUTPUT_FILE.exists():
        with open(OUTPUT_FILE, encoding="utf-8") as f:
            current_data = json.load(f)

    existing: dict[str, dict] = {}
    existing_group_meta: dict[str, dict] = {}
    for g in current_data:
        category = g.get("category") or g.get("title", "")
        if category:
            existing_group_meta[category] = g
        for t in g.get("templates", []):
            existing[t["name"]] = t

    template_cache = load_template_cache()
    templates_cache = template_cache.get("templates", {})
    metadata_overrides = load_template_overrides()

    new_data: list[dict] = []
    added: list[str] = []
    removed: list[str] = []
    skipped_local: list[str] = []
    warnings: list[str] = []
    multi_api_skips: list[tuple[str, list[str]]] = []

    index_names: set[str] = set()
    for entry in index_data:
        category = resolve_mcp_category(entry)
        if category is None:
            continue
        for t in entry.get("templates", []):
            if is_local_only_distribution(t):
                skipped_local.append(t["name"])
                continue
            index_names.add(t["name"])

    for g in current_data:
        for t in g.get("templates", []):
            if t["name"] not in index_names:
                removed.append(t["name"])

    for entry in index_data:
        category = resolve_mcp_category(entry)
        if category is None:
            group_title = entry.get("title", "")
            if group_title and group_title not in EXCLUDED_MCP_CATEGORIES:
                warnings.append(
                    f"Skipping unmapped index.json group title '{group_title}' "
                    "(not in INDEX_GROUP_TO_MCP_CATEGORY)"
                )
            continue

        group_type = entry.get("type", "")
        preserved_group = existing_group_meta.get(category, {})
        new_entry = {
            "category": category,
            "description": preserved_group.get("description")
            or CATEGORY_DESCRIPTIONS.get(category, ""),
            "templates": [],
        }

        for tpl in entry.get("templates", []):
            if is_local_only_distribution(tpl):
                continue
            name = tpl["name"]
            built = build_template_entry(
                tpl,
                group_type,
                node_index,
                multi_api_skips,
                templates_cache.get(name),
                mcp_category=category,
                metadata_overrides=metadata_overrides,
            )
            new_entry["templates"].append(built)
            if name not in existing:
                added.append(name)

        new_data.append(new_entry)

    apply_template_cache_to_mcp(new_data, template_cache)
    return new_data, added, removed, warnings, skipped_local, multi_api_skips


def _print_multi_api_skips(multi_api_skips: list[tuple[str, list[str]]]) -> None:
    if not multi_api_skips:
        return
    print(f"   Skipped model_options (multiple API model nodes): {len(multi_api_skips)}")
    for name, nodes in sorted(multi_api_skips)[:10]:
        print(f"     ~ {name}: {', '.join(nodes)}")
    if len(multi_api_skips) > 10:
        print(f"     ... and {len(multi_api_skips) - 10} more (see {SYNC_LOG_FILE})")


def main() -> None:
    check_only = "--check" in sys.argv
    no_scan = "--no-scan" in sys.argv
    log_lines: list[str] = []

    if no_scan:
        node_index = load_api_node_index()
        msg = "Skipped API node scan (--no-scan); using cached api_node_model_options.json"
        print(msg)
        log_lines.append(msg)
        if not node_index:
            print(
                f"Missing {API_NODE_OPTIONS_FILE}. Run without --no-scan or run scan_api_nodes.py.",
                file=sys.stderr,
            )
            sys.exit(1)
    else:
        try:
            node_index, scan_msg = refresh_api_node_model_options()
        except FileNotFoundError as exc:
            print(str(exc), file=sys.stderr)
            sys.exit(1)
        print(scan_msg)
        log_lines.append(scan_msg)

    new_data, added, removed, warnings, skipped_local, multi_api_skips = sync(node_index)
    total = sum(len(g.get("templates", [])) for g in new_data)

    if multi_api_skips:
        log_lines.append(
            f"Skipped model_options for {len(multi_api_skips)} templates "
            "(multiple API nodes with model dropdown):"
        )
        for name, nodes in sorted(multi_api_skips):
            log_lines.append(f"  {name}: {', '.join(nodes)}")

    append_sync_log(log_lines)

    if check_only:
        print(f"[check] Current: {OUTPUT_FILE}")
        print(f"  Total: {total} templates in {len(new_data)} groups")
        print(f"  Added:   {len(added)}")
        print(f"  Removed: {len(removed)}")
        print(f"  Skipped (local-only): {len(skipped_local)}")
        if added:
            for n in added:
                print(f"    + {n}")
        if removed:
            for n in removed:
                print(f"    - {n}")
        if skipped_local:
            for n in skipped_local[:10]:
                print(f"    ~ {n}")
            if len(skipped_local) > 10:
                print(f"    ... and {len(skipped_local) - 10} more")
        if warnings:
            for w in warnings:
                print(f"    ! {w}")
        _print_multi_api_skips(multi_api_skips)
        print(f"   Log: {SYNC_LOG_FILE}")
        return

    OUTPUT_FILE.write_text(dumps_compact_arrays(new_data), encoding="utf-8")

    print(f"Written: {OUTPUT_FILE}")
    print(f"   Total: {total} templates in {len(new_data)} groups")
    if added:
        print(f"   Added: {len(added)}")
        for n in added:
            print(f"     + {n}")
    if removed:
        print(f"   Removed: {len(removed)}")
        for n in removed:
            print(f"     - {n}")
    if skipped_local:
        print(f"   Skipped local-only: {len(skipped_local)}")
    if warnings:
        print(f"   Warnings: {len(warnings)}")
        for w in warnings:
            print(f"     ! {w}")
    _print_multi_api_skips(multi_api_skips)
    print(f"   Log: {SYNC_LOG_FILE}")
    if not added and not removed:
        print("   Metadata refreshed.")


if __name__ == "__main__":
    main()
