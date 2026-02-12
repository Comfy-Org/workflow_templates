# MinimaxImageToVideoNode

**Category**: api node/video/MiniMax

**Display Name**: MiniMax Image to Video

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/MinimaxImageToVideoNode/en.md)

Generates videos synchronously based on an image and prompt, and optional parameters using MiniMax's API. This node takes an input image and text description to create a video sequence, with various model options and configuration settings available.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `image` | IMAGE | Yes | - | Image to use as first frame of video generation |
| `prompt_text` | STRING | Yes | - | Text prompt to guide the video generation (default: empty string) |
| `model` | COMBO | Yes | "I2V-01-Director"<br>"I2V-01"<br>"I2V-01-live" | Model to use for video generation (default: "I2V-01") |
| `seed` | INT | No | 0 to 18446744073709551615 | The random seed used for creating the noise (default: 0) |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video output |

**Source**: `comfy_api_nodes/nodes_minimax.py`

**Used in 1 template(s)**
