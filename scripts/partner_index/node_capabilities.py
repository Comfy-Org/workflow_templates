#!/usr/bin/env python3
"""
node_capabilities.py - Infer node-level capabilities and fill missing descriptions.

For each ComfyUI partner node, derive:
  - capabilities: standard capability labels (same vocabulary as model-level
    capabilities, e.g. "text-to-video", "image-to-3D") from display_name rules,
    aggregated model-option capabilities, then IO-type fallback.
  - description: fill empty descriptions using display_name + capabilities.

Pure static rules over scan data; no network.

Usage (imported by build_partner_index.py):
  from node_capabilities import enrich_nodes
"""

import re

# ---------------------------------------------------------------------------
# 1. Precise display_name rules (specific task capabilities; no generic words)
# ---------------------------------------------------------------------------
NAME_RULES = [
    # video tasks
    (r"first[- ]last[- ]frame", "first-last-frame video"),
    (r"start[- ]end[- ]frame", "first-last-frame video"),
    (r"start[- ]end frame", "first-last-frame video"),
    (r"keyframes? to video", "keyframe-based video"),
    (r"keyframe", "keyframe-based video"),
    (r"reference[- ]to[- ]video", "reference-to-video"),
    (r"reference video", "reference-to-video"),
    (r"reference images to video", "reference-to-video"),
    (r"image to video", "image-to-video"),
    (r"image\(s\) to video", "image-to-video"),
    (r"image\([^)]*\) to video", "image-to-video"),
    (r"image\([^)]*\) to video with audio", "image-to-video"),
    (r"text to video", "text-to-video"),
    (r"text\([^)]*\) to video", "text-to-video"),
    (r"video continuation", "video continuation"),
    (r"video extend", "video continuation"),
    (r"extend video", "video continuation"),
    (r"video edit", "video editing"),
    (r"video reframe", "video reframing"),
    (r"video translate", "video translation"),
    (r"video to video", "video-to-video"),
    (r"lip sync", "lip sync"),
    (r"talking photo", "talking photo"),
    (r"talking image", "talking photo"),
    (r"avatar video", "avatar video"),
    (r"create avatar", "avatar creation"),
    (r"multi[- ]frame", "multi-frame video"),
    (r"transition video", "video transition"),
    (r"video template", "video template"),
    (r"template", "video template"),
    (r"motion control", "motion control"),
    (r"audio to video", "audio-to-video"),
    (r"video enhance", "video enhancement"),
    (r"video upscale", "video upscaling"),
    (r"flashvsr", "video upscaling"),
    # image tasks
    (r"text to image", "text-to-image"),
    (r"image to image", "image-to-image"),
    (r"image edit", "image editing"),
    (r"erase image", "object removal"),
    (r"fill image", "image inpainting"),
    (r"expand image", "image outpainting"),
    (r"virtual try[- ]on", "virtual try-on"),
    (r"remove background", "background removal"),
    (r"green screen", "green screen"),
    (r"replace background", "background replacement"),
    (r"layer separation", "layer separation"),
    (r"image enhance", "image enhancement"),
    (r"skin enhancer", "skin enhancement"),
    (r"relight", "relighting"),
    (r"style transfer", "style transfer"),
    (r"inpaint", "inpainting"),
    (r"upscale", "image upscaling"),
    # vector / svg
    (r"image to svg", "image-to-SVG"),
    (r"text to svg", "text-to-SVG"),
    (r"vectorize", "image-to-SVG"),
    (r"text to vector", "text-to-SVG"),
    # 3d
    (r"text to model", "text-to-3D"),
    (r"image to model", "image-to-3D"),
    (r"image\(s\) to model", "image-to-3D"),
    (r"multi[- ]image to model", "multi-image-to-3D"),
    (r"multiview to model", "multi-view-to-3D"),
    (r"rig model", "auto-rigging"),
    (r"rig ", "auto-rigging"),
    (r"animate model", "3D animation"),
    (r"texture model", "3D texturing"),
    (r"3d texture edit", "3D texturing"),
    (r"texture edit", "3D texturing"),
    (r"refine draft", "3D refinement"),
    (r"refine model", "3D refinement"),
    (r"retarget", "3D retargeting"),
    (r"smart topology", "3D retopology"),
    (r"topology", "3D retopology"),
    (r"3d part", "3D part generation"),
    (r"model to uv", "3D UV mapping"),
    (r"convert model", "3D format conversion"),
    (r"import model", "3D model import"),
    (r"detail generate", "3D detail generation"),
    (r"smooth generate", "3D smoothing"),
    (r"sketch generate", "3D sketch-to-model"),
    (r"gen-2\.5", "image-to-3D"),
    (r"gen-2 ", "image-to-3D"),
    # audio tasks
    (r"text to speech", "text-to-speech"),
    (r"speech to text", "speech-to-text"),
    (r"speech to speech", "speech-to-speech"),
    (r"voice clone", "voice cloning"),
    (r"instant voice clone", "voice cloning"),
    (r"voice isolation", "audio isolation"),
    (r"text to sound effects", "sound effects generation"),
    (r"text to dialogue", "dialogue generation"),
    (r"text to music", "music generation"),
    (r"video to music", "music generation"),
    (r"seed audio", "audio generation"),
    # llm
    (r"llm", "LLM chat"),
    (r"openrouter", "LLM chat"),
    (r"chatgpt", "LLM chat"),
    (r"byte[dD]ance seed", "LLM chat"),
    # avatar
    (r"kling avatar", "avatar video"),
    # asset / style helpers
    (r"create (image|video) asset", "asset registration"),
    (r"create style", "style creation"),
]

# LLM display_names that contain "Gemini"/"Claude" but are actually multimodal
# chat nodes: the rule is applied only when no image/video capability matched.
LLM_NAME_RULES = [
    (r"claude", "LLM chat"),
    (r"gemini", "LLM chat"),
]

# node_id-based rules for nodes whose display_name is a bare class name
ID_RULES = [
    (r"Flux2MaxImageNode", ["text-to-image"]),
    (r"Flux2ProImageNode", ["text-to-image"]),
    (r"FluxKontextMaxImageNode", ["text-to-image"]),
    (r"FluxKontextProImageNode", ["text-to-image"]),
    (r"Flux3VideoNodeBase", ["text-to-video"]),
    (r"OpenAIGPTImage1", ["text-to-image"]),
    (r"OpenAIGPTImageNodeV2", ["text-to-image"]),
    (r"OpenAIDalle2", ["text-to-image"]),
    (r"OpenAIDalle3", ["text-to-image"]),
    (r"KreaIO", []),
    (r"ObjZipResult", []),
    (r"_ModelSpec", []),
    (r"ExecuteTaskRequest", []),
    (r"handle_recraft_image_output", []),
    (r"Extension$", []),
]

# Auxiliary nodes that don't generate content -> helper capability labels
HELPER_RULES = [
    (r"VoiceSelector", "voice selection"),
    (r"StyleReference", "style reference"),
    (r"StyleV3RealisticImage", "style reference"),
    (r"StyleInfiniteStyleLibrary", "style reference"),
    (r"ConceptsNode", "style reference"),
    (r"ReferenceNode", "style reference"),
    (r"PromptImageNode", "style reference"),
    (r"ColorRGB", "color utility"),
    (r"Controls", "control utility"),
    (r"InputFiles", "file input helper"),
    (r"Ltx25JobResult", []),
    (r"Ltx25JobStatusResponse", []),
    (r"Ltx25SubmitResponse", []),
    (r"Sora2GenerationRequest", []),
    (r"Sora2GenerationResponse", []),
    (r"SupportedOpenAIModel", []),
    (r"RunwayGen3aAspectRatio", []),
    (r"RunwayGen4TurboAspectRatio", []),
]

# ---------------------------------------------------------------------------
# 2. IO-type fallback: only when display_name rules gave nothing
# ---------------------------------------------------------------------------
IO_OUT_RULES = [
    ("File3D", "3D generation"),
    ("Video", "video generation"),
    ("SVG", "SVG generation"),
    ("Audio", "audio generation"),
    ("Image", "image generation"),
    ("String", "text generation"),
]


def _io_types_of(node_source: str):
    in_types = re.findall(r"IO\.(\w+)\.Input", node_source)
    out_types = re.findall(r"IO\.(\w+)\.Output", node_source)
    return list(dict.fromkeys(in_types)), list(dict.fromkeys(out_types))


def _out_matches(out_types, prefix):
    """True if any output type starts with the prefix (File3D matches File3DGLB)."""
    return any(t.startswith(prefix) for t in out_types)


def _match_rules(name: str, rules):
    hits = []
    for pattern, cap in rules:
        if re.search(pattern, name, re.IGNORECASE):
            hits.append(cap)
    return hits


def _norm_name(name: str) -> str:
    """Normalize display name for rule matching: hyphens/underscores to spaces
    ('Text-to-Video' -> 'Text to Video'), so space-based rules still hit."""
    return re.sub(r"[-_]", " ", name)


def _dedupe(caps):
    seen, out = set(), []
    for c in caps:
        if c and c not in seen:
            seen.add(c)
            out.append(c)
    return out


# Model-spec capability labels: resolution / format / size tiers that belong
# to ONE model option, not the node as a whole. When a node's dropdown holds
# several models (e.g. Nano Banana 2 + Lite), unioning these into node-level
# capabilities would claim every model supports the max tier — Lite only does
# 1K yet the node would advertise 1K/2K/4K. They stay on the model entries;
# node-level aggregation keeps only task capabilities.
SPEC_CAPS = (
    "1K output", "1K/2K/4K output", "2K/4K output", "4K generation",
    "up to 4K (3840x2160)", "high quality 2048px", "custom sizes",
    "PNG output", "transparent background",
)


def _strip_spec_caps(caps):
    """Drop model-spec (resolution/format/size) labels from a capability list."""
    return [c for c in caps if c not in SPEC_CAPS]


def infer_capabilities(display_name, node_id, node_source="", description="", model_caps=None):
    """Node-level capability labels.

    Priority: precise display_name rules -> aggregated model-option capabilities
    -> LLM name rules -> node_id rules -> IO-type fallback -> helper rules.
    """
    name = _norm_name(display_name or node_id)
    caps = _match_rules(name, NAME_RULES)

    if not caps:
        # aggregate capabilities of the node's model options (if any);
        # model-spec tiers (resolution/format/size) are stripped — they belong
        # to individual models, not the node (Lite does 1K, not 1K/2K/4K).
        model_caps = model_caps or []
        if model_caps:
            caps = _strip_spec_caps(list(model_caps))

    if not caps:
        # LLM name rules only apply when the node is not an image/video/audio
        # generator (e.g. "Nano Banana (Google Gemini Image)" is image generation)
        if not re.search(r"\b(image|video|audio)\b", name, re.IGNORECASE):
            llm = _match_rules(name, LLM_NAME_RULES)
            if llm:
                caps = llm

    if not caps:
        for pattern, id_caps in ID_RULES:
            if re.search(pattern, node_id):
                return list(id_caps)

    if not caps:
        _, out_types = _io_types_of(node_source)
        for prefix, cap in IO_OUT_RULES:
            if _out_matches(out_types, prefix):
                caps = [cap]
                break

    if not caps:
        for pattern, hcap in HELPER_RULES:
            if re.search(pattern, node_id):
                return list(hcap) if isinstance(hcap, list) else [hcap]

    return _dedupe(caps)


DESC_TEMPLATES = {
    "text-to-video": "Generate video from a text prompt.",
    "image-to-video": "Generate video from an input image.",
    "first-last-frame video": "Generate video from first and last frame images.",
    "reference-to-video": "Generate video using reference images or videos.",
    "video continuation": "Extend or continue an existing video.",
    "video editing": "Edit an existing video.",
    "video translation": "Translate speech in a video to another language.",
    "lip sync": "Synchronize a video's lip movement with an audio clip.",
    "talking photo": "Animate a still image into a talking video using an audio clip.",
    "avatar video": "Generate an avatar-driven video from a script and audio.",
    "text-to-image": "Generate images from a text prompt.",
    "image-to-image": "Transform an input image using a prompt or reference.",
    "image editing": "Edit images based on natural-language instructions.",
    "background removal": "Remove the background from an image.",
    "image upscaling": "Upscale and enhance image resolution.",
    "image-to-SVG": "Convert an image into a vector (SVG) graphic.",
    "text-to-SVG": "Generate vector (SVG) graphics from a text prompt.",
    "text-to-3D": "Generate a 3D model from a text prompt.",
    "image-to-3D": "Generate a 3D model from one or more images.",
    "auto-rigging": "Rig a 3D character with a standard skeleton.",
    "3D animation": "Apply an animation action to a 3D character.",
    "3D texturing": "Generate or edit textures on a 3D model.",
    "3D refinement": "Refine and improve an existing 3D draft model.",
    "text-to-speech": "Synthesize speech from text.",
    "speech-to-text": "Transcribe audio into text.",
    "speech-to-speech": "Convert speech from one voice to another.",
    "voice cloning": "Clone a voice from a short audio sample.",
    "music generation": "Generate music from a text description or video.",
    "sound effects generation": "Generate sound effects from a text description.",
    "LLM chat": "Generate text responses with a large language model.",
    "image generation": "Generate images.",
    "video generation": "Generate video.",
    "audio generation": "Generate audio.",
    "3D generation": "Generate 3D content.",
    "SVG generation": "Generate vector (SVG) graphics.",
    "3D format conversion": "Convert a 3D model between file formats.",
    "3D retargeting": "Retarget a rigged 3D model to a new skeleton or character.",
    "multi-view-to-3D": "Generate a 3D model from multiple view images.",
    "keyframe-based video": "Generate video from keyframe images.",
    "image outpainting": "Expand an image beyond its original boundaries.",
    "image inpainting": "Fill or restore regions of an image.",
    "object removal": "Remove unwanted objects from an image.",
    "virtual try-on": "Try on clothing virtually on a person image.",
    "style transfer": "Apply a style to an image.",
    "inpainting": "Fill or restore regions of an image.",
    "video upscaling": "Upscale and enhance video resolution.",
    "video enhancement": "Enhance video quality with upscaling and recovery.",
    "image enhancement": "Enhance image quality.",
    "audio-to-video": "Generate a video driven by an audio track.",
    "voice selection": "Select a voice for speech synthesis.",
    "style reference": "Provide reference images for style guidance.",
    "style creation": "Create a custom style from reference images.",
    "asset registration": "Register an image or video as a reusable asset.",
    "avatar creation": "Create a custom avatar for avatar video generation.",
    "color utility": "Helper node for color values.",
    "control utility": "Helper node for workflow control.",
    "file input helper": "Provide files as context input.",
    "video template": "Generate video using a preset template.",
    "video transition": "Generate a transition video between clips.",
    "multi-frame video": "Generate video from multiple frame images.",
    "motion control": "Drive video generation with a motion reference video.",
    "video reframing": "Reframe an existing video to a new aspect ratio.",
    "3D retopology": "Re-topologize a 3D model for cleaner geometry.",
    "3D UV mapping": "Generate UV maps for a 3D model.",
    "3D part generation": "Generate a 3D part for an existing model.",
    "3D model import": "Import a 3D model for processing.",
    "3D detail generation": "Generate high-detail geometry from a base 3D model.",
    "3D smoothing": "Smooth and refine 3D geometry.",
    "3D sketch-to-model": "Generate a 3D model from a sketch.",
    "dialogue generation": "Generate multi-speaker dialogue audio from text.",
    "audio isolation": "Isolate a voice track from background audio.",
    "green screen": "Replace the background of a video with a green screen.",
    "background replacement": "Replace the background of an image or video.",
    "layer separation": "Separate an image into layers.",
    "relighting": "Relight an image with new lighting.",
    "skin enhancement": "Enhance skin in portraits.",
    "video-to-video": "Transform a video using a prompt or reference.",
    "multi-image-to-3D": "Generate a 3D model from multiple input images.",
    "text generation": "Generate text output.",
    "single-sentence instruction editing": "Edit images with a single-sentence instruction.",
    "4K generation": "Generate images at up to 4K resolution.",
    "PNG output": "Generate images with PNG output.",
    "high speed": "Generate fast, low-latency output.",
    "editing": "Edit images or video.",
    "multi-image reference": "Use multiple reference images as input.",
    "1K/2K/4K output": "Generate images at 1K, 2K or 4K resolution.",
    "1K output": "Generate images at 1K resolution.",
    "high quality": "Generate high-quality output.",
    "image-to-image editing": "Edit an image based on another image.",
    "transparent background": "Generate output with a transparent background.",
    "up to 4K (3840x2160)": "Generate images at up to 4K (3840x2160) resolution.",
    "custom sizes": "Generate output with custom dimensions.",
    "multimodal understanding": "Understand text, images, audio and video inputs.",
    "agentic tasks": "Complete multi-step agentic tasks.",
    "coding": "Write and reason about code.",
    "complex problem-solving": "Solve complex reasoning problems.",
    "high-throughput": "Handle high-volume requests at low latency.",
    "multi-frame generation": "Generate video from multiple frame images.",
    "text-to-SVG generation": "Generate vector (SVG) graphics from a text prompt.",
    "image-to-image / reference-based editing": "Edit images using a reference image.",
    "image-to-image / multi-image reference editing": "Edit images using multiple reference images.",
}


def fill_description(node_id, display_name, description, caps, node_source=""):
    """Fill empty/very short descriptions from capabilities; keep good ones."""
    if description and len(description) >= 40:
        return description
    if caps:
        base = DESC_TEMPLATES.get(caps[0], "")
        if base:
            return base
    name = display_name or node_id
    return f"{name}."


def enrich_nodes(nodes, sources, model_caps_by_node=None):
    """In-place: add 'capabilities' and fill 'description' for every node.

    sources: node_id -> source snippet (IO types/tooltips).
    model_caps_by_node: node_id -> aggregated model-option capabilities.
    """
    for n in nodes:
        node_id = n.get("node_id", "")
        src = sources.get(node_id, "")
        mcap = (model_caps_by_node or {}).get(node_id)
        caps = infer_capabilities(
            n.get("display_name", ""), node_id, src,
            n.get("description", ""), mcap,
        )
        if caps:
            n["capabilities"] = caps
        n["description"] = fill_description(
            node_id, n.get("display_name", ""), n.get("description", ""), caps, src
        )
