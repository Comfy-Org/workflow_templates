#!/usr/bin/env python3
"""
sync-mcp-index.py — Synchronize template list from index.json to index.mcp.json

Features:
  - New templates → copy description from index.json, auto-infer task/model/io
  - Deleted templates → remove
  - Existing templates → fully preserved (does not overwrite description/io)
  - Preserves index.json group structure (minus excluded categories)
  - Maps index.json group `title` → index.mcp.json `category` via INDEX_GROUP_TO_MCP_CATEGORY
  - Ignores index.json group `category` (e.g. "GENERATION TYPE")
  - Skips instructional categories: Node Basics, LLM, Getting Started

Usage:
  python3 scripts/sync-mcp-index.py              # sync and write
  python3 scripts/sync-mcp-index.py --check      # dry-run, only print diff

Dependencies:
  - templates/index.json (source data)
  - templates/index.mcp.json (target file, created from scratch if absent)
  - templates/*.json (workflow JSONs, scanned for node types)
"""

import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Optional

WORKFLOW_DIR = Path(__file__).parent.parent.resolve()
TEMPLATES_DIR = WORKFLOW_DIR / "templates"
INDEX_FILE = TEMPLATES_DIR / "index.json"
OUTPUT_FILE = TEMPLATES_DIR / "index.mcp.json"

# index.json group `title` → index.mcp.json `category` (1:1).
# index.json's group-level `category` field (e.g. "GENERATION TYPE") is UI metadata and ignored.
INDEX_GROUP_TO_MCP_CATEGORY: dict[str, str] = {
    "Use Cases": "Use Cases",
    "Image": "Image",
    "Video": "Video",
    "Audio": "Audio",
    "3D Model": "3D Model",
    "Utility": "Utility",
}

# Categories excluded from MCP index export (instructional / demo-only groups).
EXCLUDED_MCP_CATEGORIES = frozenset({
    "Node Basics",
    "LLM",
    "Getting Started",
})

# Default English descriptions for included MCP categories.
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

# ── Models capabilities file ───────────────────────────────────────────────
MODELS_CAP_FILE = WORKFLOW_DIR / "scripts" / "models_capabilities.json"

try:
    with open(MODELS_CAP_FILE, encoding="utf-8") as f:
        MODELS_CAP = json.load(f)
except FileNotFoundError:
    MODELS_CAP = {}
except json.JSONDecodeError as exc:
    raise RuntimeError(f"Invalid JSON in {MODELS_CAP_FILE}: {exc}") from exc

# ── Model name → description mapping ──────────────────────────────────────
MODEL_DESC_MAP: dict[str, str] = {
    "flux": "high-quality text-to-image generation model",
    "flux1": "high-quality text-to-image generation model",
    "flux.1": "high-quality text-to-image generation model",
    "flux2": "next-generation text-to-image generation model",
    "flux.2": "next-generation text-to-image generation model",
    "sd3": "versatile text-to-image generation model",
    "sdxl": "high-quality image generation model",
    "sd1.5": "stable diffusion image generation model",
    "pixeldit": "efficient diffusion transformer model for text-to-image",
    "kolors": "vibrant text-to-image generation model",
    "kandinsky": "versatile text-to-image generation model",
    "playground": "design-focused image generation model",
    "auraflow": "efficient flow-based image generation model",
    "hidream": "text-to-image diffusion model",
    "omnigen": "multi-modal generation model",
    "ideogram": "text-to-image generation model",
    "recraft": "image generation and editing model",
    "grok": "multi-modal generation model",
    "wan": "video generation model",
    "wan2.1": "video generation model",
    "wan2.2": "high-fidelity video generation model",
    "cogvideox": "text-to-video generation model",
    "animatediff": "text-to-animation generation model",
    "mochi": "video generation model",
    "hunyuan": "video generation model",
    "ltxv": "efficient video generation model",
    "ltx": "video generation model",
    "kling": "video generation model",
    "luma": "video generation model",
    "seedance": "video generation model",
    "veo": "video generation model",
    "pika": "video generation model",
    "capybara": "video generation model",
    "film": "frame interpolation model",
    "rife": "real-time frame interpolation model",
    "gimm": "frame interpolation model",
    "gaussian": "3D scene reconstruction model",
    "moge": "3D mesh estimation model",
    "tripo": "3D generation model",
    "meshy": "3D generation model",
    "chatterbox": "voice conversion model",
    "ace": "audio editing model",
    "melbandroformer": "audio separation model",
    "real-esrgan": "AI image upscaling model",
    "magnific": "image enhancement model",
    "seedvr": "AI image upscaling model",
    "topaz": "image enhancement model",
    "rembg": "background removal model",
    "bi-refnet": "precise image matting model",
    "birefnet": "precise image matting model",
    "sam": "image segmentation model",
    "sam3": "image segmentation model",
    "ip-adapter": "image-prompted generation adapter",
    "controlnet": "conditioned image generation model",
    "llama": "language model",
    "qwen": "language model",
    "gemma": "language model",
    "lotus": "depth estimation model",
    "clip": "image-text matching model",
    "wavespeed": "image enhancement model",
    "pose": "pose estimation model",
    "sdpose": "pose estimation model",
    "face_detection": "face detection model",
    "void": "video inpainting model",
    "nano": "text-to-image generation model",
}


def resolve_model(name: str, index_models: list[str]) -> str:
    """Resolve the canonical model name for a template, checking models_capabilities.json first."""
    if index_models:
        for m in index_models:
            if m in MODELS_CAP:
                return m
        return index_models[0]
    # Fallback: match by template name substring
    name_l = name.lower()
    candidates = [(len(k), k) for k in sorted(MODELS_CAP, reverse=True) if k.lower() in name_l]
    if candidates:
        return max(candidates, key=lambda x: x[0])[1]
    return ""


def extract_model_name(name: str, index_models: list[str]) -> str:
    if index_models:
        return index_models[0]
    name_l = name.lower()
    candidates = [(len(k), k) for k in MODEL_DESC_MAP if k in name_l]
    if candidates:
        return max(candidates, key=lambda x: x[0])[1]
    for key in ["flux", "wan", "sdxl", "sd3", "sd1", "llama", "qwen", "gemma"]:
        if key in name_l:
            return key
    return ""


def get_model_desc(model: str) -> str:
    if not model:
        return ""
    m_l = model.lower()
    if m_l in MODEL_DESC_MAP:
        return MODEL_DESC_MAP[m_l]
    candidates = [(len(k), k, d) for k, d in MODEL_DESC_MAP.items() if k in m_l]
    if candidates:
        return max(candidates, key=lambda x: x[0])[2]
    return "generation model"


# ── Task / IO inference (for new templates only) ──────────────────────────


def scan_workflow_nodes(name: str) -> list[str]:
    wf_path = TEMPLATES_DIR / f"{name}.json"
    if not wf_path.exists():
        return []
    try:
        with open(wf_path) as f:
            wf = json.load(f)
        return [n.get("type", "") for n in wf.get("nodes", []) if n.get("type")]
    except Exception:
        return []


_HAS_VIDEO = ["VideoCombineNode", "VHS_VideoCombine", "VHS_VideoComb",
              "VHS_VideoCombineNode", "FFMPEGVideoCombine"]


def infer_task(name: str, group_type: str) -> str:
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
    type_map = {"image": "Image Generation", "video": "Video Generation",
                "audio": "Audio Generation", "3d": "3D Generation", "llm": "Text Generation"}
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


def infer_io(task_type: str, node_types: list[str]) -> dict:
    has_mask = any("mask" in n.lower() for n in node_types)
    has_vid = any(n in node_types for n in _HAS_VIDEO)
    if task_type == "t2i":
        return {"inputs": [{"type": "text", "count": 1, "purpose": "Text prompt describing the desired output"}],
                "outputs": [{"type": "image", "count": 1, "purpose": "Generated image"}]}
    if task_type == "i2i":
        io = {"inputs": [{"type": "image", "count": 1, "purpose": "Reference image for editing"},
                         {"type": "text", "count": 1, "purpose": "Text prompt describing the edit"}],
              "outputs": [{"type": "image", "count": 1, "purpose": "Edited image"}]}
        if has_mask:
            io["inputs"].append({"type": "image", "count": 1, "purpose": "Mask for edit region"})
        return io
    if task_type == "t2v":
        return {"inputs": [{"type": "text", "count": 1, "purpose": "Text prompt describing the video"}],
                "outputs": [{"type": "video", "count": 1, "purpose": "Generated video"}]}
    if task_type == "i2v":
        return {"inputs": [{"type": "image", "count": 1, "purpose": "Reference image to animate"},
                           {"type": "text", "count": 1, "purpose": "Text prompt describing motion or style"}],
                "outputs": [{"type": "video", "count": 1, "purpose": "Animated video from the reference image"}]}
    if task_type == "seg":
        return {"inputs": [{"type": "image", "count": 1, "purpose": "Input image for segmentation"}],
                "outputs": [{"type": "image", "count": 1, "purpose": "Segmentation masks"}]}
    if task_type == "upscale":
        return {"inputs": [{"type": "image", "count": 1, "purpose": "Image to upscale"}],
                "outputs": [{"type": "image", "count": 1, "purpose": "Upscaled high-resolution image"}]}
    if task_type == "depth":
        return {"inputs": [{"type": "image", "count": 1, "purpose": "Input image for depth estimation"}],
                "outputs": [{"type": "image", "count": 1, "purpose": "Depth map"}]}
    if task_type == "remove":
        return {"inputs": [{"type": "image", "count": 1, "purpose": "Input image with background"}],
                "outputs": [{"type": "image", "count": 1, "purpose": "Image with background removed"}]}
    if task_type in ("frame", "temporal"):
        return {"inputs": [{"type": "video", "count": 1, "purpose": "Input video for frame interpolation"}],
                "outputs": [{"type": "video", "count": 1, "purpose": "Interpolated video with smoother motion"}]}
    if task_type in ("t2-3d",):
        return {"inputs": [{"type": "text", "count": 1, "purpose": "Text prompt describing the 3D model"}],
                "outputs": [{"type": "model", "count": 1, "purpose": "Generated 3D model"}]}
    if task_type in ("i2-3d",):
        return {"inputs": [{"type": "image", "count": 1, "purpose": "Reference image for 3D generation"}],
                "outputs": [{"type": "model", "count": 1, "purpose": "Generated 3D model"}]}
    if task_type == "3d":
        return {"inputs": [{"type": "image", "count": 4, "purpose": "Multi-view images for 3D reconstruction"}],
                "outputs": [{"type": "model", "count": 1, "purpose": "Gaussian splat 3D scene"}]}
    if task_type == "perspective":
        return {"inputs": [{"type": "image", "count": 1, "purpose": "Perspective image for 3D mesh estimation"}],
                "outputs": [{"type": "model", "count": 1, "purpose": "Estimated 3D mesh"}]}
    if task_type == "llm":
        return {"inputs": [{"type": "text", "count": 1, "purpose": "Text prompt for the language model"}],
                "outputs": [{"type": "text", "count": 1, "purpose": "Generated text response"}]}
    if task_type == "t2a":
        return {"inputs": [{"type": "text", "count": 1, "purpose": "Text prompt describing the desired audio"}],
                "outputs": [{"type": "audio", "count": 1, "purpose": "Generated audio"}]}
    # fallback
    out_type = "video" if has_vid else "image"
    return {"inputs": [{"type": "text", "count": 1, "purpose": "Input prompt"}],
            "outputs": [{"type": out_type, "count": 1, "purpose": "Generated output"}]}


def auto_description(name: str, task: str, model: str, is_api: bool) -> str:
    """Generate a simple placeholder description for new templates"""
    model_desc = get_model_desc(model)
    model_phrase = f" using {model}" if model else ""
    if model and model_desc:
        model_phrase = f" using {model}, a {model_desc}"

    desc = f"A {task.lower()} workflow{model_phrase}."
    if not desc[0].isupper():
        desc = desc[0].upper() + desc[1:]
    if is_api:
        desc += " This workflow calls a third-party API. Execution time depends on server-side response."
    else:
        desc += " This workflow runs on Comfy Cloud and executes quickly."
    return desc


# ── Main sync logic ────────────────────────────────────────────────


def resolve_mcp_category(entry: dict) -> Optional[str]:
    """
    Resolve index.mcp.json category from an index.json group entry.

    index.json uses `title` for the semantic category name (e.g. "Image").
    index.json's `category` field (e.g. "GENERATION TYPE") is UI metadata and ignored.
    """
    group_title = entry.get("title", "")
    if not group_title:
        return None
    if group_title in EXCLUDED_MCP_CATEGORIES:
        return None
    return INDEX_GROUP_TO_MCP_CATEGORY.get(group_title)


def sync() -> tuple[list[dict], list[str], list[str], list[str]]:
    """
    Sync index.json to index.mcp.json
    Returns: (new_data, added, removed, warnings)
    """
    with open(INDEX_FILE) as f:
        index_data = json.load(f)

    # Read current mcp.json
    current_data: list[dict] = []
    if OUTPUT_FILE.exists():
        with open(OUTPUT_FILE) as f:
            current_data = json.load(f)

    # Build existing template lookup: name → template_data
    existing: dict[str, dict] = {}
    existing_group_meta: dict[str, dict] = {}
    for g in current_data:
        category = g.get("category") or g.get("title", "")
        if category:
            existing_group_meta[category] = g
        for t in g.get("templates", []):
            existing[t["name"]] = t

    new_data: list[dict] = []
    added: list[str] = []
    removed: list[str] = []
    warnings: list[str] = []

    # Build the set of template names from included index.json groups only.
    index_names: set[str] = set()
    for entry in index_data:
        category = resolve_mcp_category(entry)
        if category is None:
            continue
        for t in entry.get("templates", []):
            index_names.add(t["name"])

    # Find removed templates (including those from excluded categories dropped from MCP).
    for g in current_data:
        for t in g.get("templates", []):
            if t["name"] not in index_names:
                removed.append(t["name"])

    # Walk index.json groups to build output (skip unmapped / excluded categories).
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
            name = tpl["name"]
            # Resolve model for both existing and new templates
            tags = tpl.get("tags", [])
            models = tpl.get("models", [])
            is_api = "API" in tags or (not tpl.get("openSource", True) and "API" in str(tpl.get("tags", "")))
            model = resolve_model(name, models) or extract_model_name(name, models)

            # Get model capabilities from models_capabilities.json
            model_info = MODELS_CAP.get(model) or (MODELS_CAP.get(models[0]) if models else None)
            cap_tags = model_info.get("capabilities", []) if model_info else []

            if name in existing:
                existing_entry = existing[name]
                # Update metadata
                existing_entry["usage"] = tpl.get("usage", 0)
                existing_entry["recommend"] = tpl.get("recommend", 0)
                existing_entry["freshness"] = tpl.get("freshness", "")
                existing_entry["model"] = model
                if cap_tags:
                    existing_entry["capabilities"] = cap_tags
                new_entry["templates"].append(existing_entry)
            else:
                # New template: copy from index.json + auto-infer
                desc = tpl.get("description", "") or auto_description(name, infer_task(name, group_type), model, is_api)

                node_types = scan_workflow_nodes(name)
                task = infer_task(name, group_type)
                task_type = infer_task_type(name)
                io_info = infer_io(task_type, node_types)

                new_tpl = {
                    "name": name,
                    "title": tpl.get("title", name),
                    "task": task,
                    "model": model,
                    "tags": tags,
                    "freshness": tpl.get("freshness", ""),
                    "usage": tpl.get("usage", 0),
                    "recommend": tpl.get("recommend", 0),
                    "description": desc,
                    "io": io_info,
                }
                if cap_tags:
                    new_tpl["capabilities"] = cap_tags
                new_entry["templates"].append(new_tpl)
                added.append(name)

        new_data.append(new_entry)

    return new_data, added, removed, warnings


def main() -> None:
    check_only = "--check" in sys.argv

    new_data, added, removed, warnings = sync()
    total = sum(len(g.get("templates", [])) for g in new_data)

    if check_only:
        print(f"[check] Current: {OUTPUT_FILE}")
        print(f"  Total: {total} templates in {len(new_data)} groups")
        print(f"  Added:   {len(added)}")
        print(f"  Removed: {len(removed)}")
        if added:
            for n in added:
                print(f"    + {n}")
        if removed:
            for n in removed:
                print(f"    - {n}")
        if warnings:
            for w in warnings:
                print(f"    ! {w}")
        return

    with open(OUTPUT_FILE, "w") as f:
        json.dump(new_data, f, indent=2)

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
    if warnings:
        print(f"   Warnings: {len(warnings)}")
        for w in warnings:
            print(f"     ! {w}")
    if not added and not removed:
        print("   No changes.")


if __name__ == "__main__":
    main()
