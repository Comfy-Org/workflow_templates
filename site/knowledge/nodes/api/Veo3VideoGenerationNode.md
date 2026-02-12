# Veo3VideoGenerationNode

**Category**: api node/video/Veo

**Display Name**: Google Veo 3 Video Generation

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/Veo3VideoGenerationNode/en.md)

Generates videos from text prompts using Google's Veo 3 API. This node supports two Veo 3 models: veo-3.0-generate-001 and veo-3.0-fast-generate-001. It extends the base Veo node with Veo 3 specific features including audio generation and a fixed 8-second duration.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `prompt` | STRING | Yes | - | Text description of the video (default: "") |
| `aspect_ratio` | COMBO | Yes | "16:9"<br>"9:16" | Aspect ratio of the output video (default: "16:9") |
| `negative_prompt` | STRING | No | - | Negative text prompt to guide what to avoid in the video (default: "") |
| `duration_seconds` | INT | No | 8-8 | Duration of the output video in seconds (Veo 3 only supports 8 seconds) (default: 8) |
| `enhance_prompt` | BOOLEAN | No | - | Whether to enhance the prompt with AI assistance (default: True) |
| `person_generation` | COMBO | No | "ALLOW"<br>"BLOCK" | Whether to allow generating people in the video (default: "ALLOW") |
| `seed` | INT | No | 0-4294967295 | Seed for video generation (0 for random) (default: 0) |
| `image` | IMAGE | No | - | Optional reference image to guide video generation |
| `model` | COMBO | No | "veo-3.0-generate-001"<br>"veo-3.0-fast-generate-001" | Veo 3 model to use for video generation (default: "veo-3.0-generate-001") |
| `generate_audio` | BOOLEAN | No | - | Generate audio for the video. Supported by all Veo 3 models. (default: False) |

**Note:** The `duration_seconds` parameter is fixed at 8 seconds for all Veo 3 models and cannot be changed.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video file |

**Source**: `comfy_api_nodes/nodes_veo2.py`

**Used in 1 template(s)**
