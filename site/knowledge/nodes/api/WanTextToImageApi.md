# WanTextToImageApi

**Category**: api node/image/Wan

**Display Name**: Wan Text to Image

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/WanTextToImageApi/en.md)

The Wan Text to Image node generates images based on text descriptions. It uses AI models to create visual content from written prompts, supporting both English and Chinese text input. The node provides various controls to adjust the output image size, quality, and style preferences.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model` | COMBO | Yes | "wan2.5-t2i-preview" | Model to use (default: "wan2.5-t2i-preview") |
| `prompt` | STRING | Yes | - | Prompt used to describe the elements and visual features, supports English/Chinese (default: empty) |
| `negative_prompt` | STRING | No | - | Negative text prompt to guide what to avoid (default: empty) |
| `width` | INT | No | 768-1440 | Image width in pixels (default: 1024, step: 32) |
| `height` | INT | No | 768-1440 | Image height in pixels (default: 1024, step: 32) |
| `seed` | INT | No | 0-2147483647 | Seed to use for generation (default: 0) |
| `prompt_extend` | BOOLEAN | No | - | Whether to enhance the prompt with AI assistance (default: True) |
| `watermark` | BOOLEAN | No | - | Whether to add an "AI generated" watermark to the result (default: True) |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | IMAGE | The generated image based on the text prompt |

**Source**: `comfy_api_nodes/nodes_wan.py`

**Used in 1 template(s)**
