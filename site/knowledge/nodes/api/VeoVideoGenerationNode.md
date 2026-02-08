# VeoVideoGenerationNode

**Category**: api node/video/Veo

**Display Name**: Google Veo 2 Video Generation

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/VeoVideoGenerationNode/en.md)

Generates videos from text prompts using Google's Veo API. This node can create videos from text descriptions and optional image inputs, with control over parameters like aspect ratio, duration, and more.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `prompt` | STRING | Yes | - | Text description of the video (default: empty) |
| `aspect_ratio` | COMBO | Yes | "16:9"<br>"9:16" | Aspect ratio of the output video (default: "16:9") |
| `negative_prompt` | STRING | No | - | Negative text prompt to guide what to avoid in the video (default: empty) |
| `duration_seconds` | INT | No | 5-8 | Duration of the output video in seconds (default: 5) |
| `enhance_prompt` | BOOLEAN | No | - | Whether to enhance the prompt with AI assistance (default: True) |
| `person_generation` | COMBO | No | "ALLOW"<br>"BLOCK" | Whether to allow generating people in the video (default: "ALLOW") |
| `seed` | INT | No | 0-4294967295 | Seed for video generation (0 for random) (default: 0) |
| `image` | IMAGE | No | - | Optional reference image to guide video generation |
| `model` | COMBO | No | "veo-2.0-generate-001" | Veo 2 model to use for video generation (default: "veo-2.0-generate-001") |

**Note:** The `generate_audio` parameter is only available for Veo 3.0 models and is automatically handled by the node based on the selected model.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video file |

**Source**: `comfy_api_nodes/nodes_veo2.py`

**Used in 1 template(s)**
