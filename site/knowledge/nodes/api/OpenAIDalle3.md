# OpenAIDalle3

**Category**: api node/image/OpenAI

**Display Name**: OpenAI DALL·E 3

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/OpenAIDalle3/en.md)

Generates images synchronously via OpenAI's DALL·E 3 endpoint. This node takes a text prompt and creates corresponding images using OpenAI's DALL·E 3 model, allowing you to specify image quality, style, and dimensions.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `prompt` | STRING | Yes | - | Text prompt for DALL·E (default: "") |
| `seed` | INT | No | 0 to 2147483647 | not implemented yet in backend (default: 0) |
| `quality` | COMBO | No | "standard"<br>"hd" | Image quality (default: "standard") |
| `style` | COMBO | No | "natural"<br>"vivid" | Vivid causes the model to lean towards generating hyper-real and dramatic images. Natural causes the model to produce more natural, less hyper-real looking images. (default: "natural") |
| `size` | COMBO | No | "1024x1024"<br>"1024x1792"<br>"1792x1024" | Image size (default: "1024x1024") |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `IMAGE` | IMAGE | The generated image from DALL·E 3 |

**Source**: `comfy_api_nodes/nodes_openai.py`

**Used in 1 template(s)**
