# OpenAIVideoSora2

**Category**: api node/video/Sora

**Display Name**: OpenAI Sora - Video

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/OpenAIVideoSora2/en.md)

The OpenAIVideoSora2 node generates videos using OpenAI's Sora models. It creates video content based on text prompts and optional input images, then returns the generated video output. The node supports different video durations and resolutions depending on the selected model.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model` | COMBO | Yes | "sora-2"<br>"sora-2-pro" | The OpenAI Sora model to use for video generation (default: "sora-2") |
| `prompt` | STRING | Yes | - | Guiding text; may be empty if an input image is present (default: empty) |
| `size` | COMBO | Yes | "720x1280"<br>"1280x720"<br>"1024x1792"<br>"1792x1024" | The resolution for the generated video (default: "1280x720") |
| `duration` | COMBO | Yes | 4<br>8<br>12 | The duration of the generated video in seconds (default: 8) |
| `image` | IMAGE | No | - | Optional input image for video generation |
| `seed` | INT | No | 0 to 2147483647 | Seed to determine if node should re-run; actual results are nondeterministic regardless of seed (default: 0) |

**Constraints and Limitations:**

- The "sora-2" model only supports "720x1280" and "1280x720" resolutions
- Only one input image is supported when using the image parameter
- Results are nondeterministic regardless of the seed value

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video output |

**Source**: `comfy_api_nodes/nodes_sora.py`

**Used in 1 template(s)**
