# MinimaxTextToVideoNode

**Category**: api node/video/MiniMax

**Display Name**: MiniMax Text to Video

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/MinimaxTextToVideoNode/en.md)

Generates videos synchronously based on a prompt, and optional parameters using MiniMax's API. This node creates video content from text descriptions by connecting to MiniMax's text-to-video service.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `prompt_text` | STRING | Yes | - | Text prompt to guide the video generation |
| `model` | COMBO | No | "T2V-01"<br>"T2V-01-Director" | Model to use for video generation (default: "T2V-01") |
| `seed` | INT | No | 0 to 18446744073709551615 | The random seed used for creating the noise (default: 0) |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video based on the input prompt |

**Source**: `comfy_api_nodes/nodes_minimax.py`

**Used in 1 template(s)**
