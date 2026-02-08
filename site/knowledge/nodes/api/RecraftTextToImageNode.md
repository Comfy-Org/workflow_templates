# RecraftTextToImageNode

**Category**: api node/image/Recraft

**Display Name**: Recraft Text to Image

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/RecraftTextToImageNode/en.md)

Generates images synchronously based on prompt and resolution. This node connects to the Recraft API to create images from text descriptions with specified dimensions and style options.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `prompt` | STRING | Yes | - | Prompt for the image generation. (default: "") |
| `size` | COMBO | Yes | "1024x1024"<br>"1152x896"<br>"896x1152"<br>"1216x832"<br>"832x1216"<br>"1344x768"<br>"768x1344"<br>"1536x640"<br>"640x1536" | The size of the generated image. (default: "1024x1024") |
| `n` | INT | Yes | 1-6 | The number of images to generate. (default: 1) |
| `seed` | INT | Yes | 0-18446744073709551615 | Seed to determine if node should re-run; actual results are nondeterministic regardless of seed. (default: 0) |
| `recraft_style` | COMBO | No | Multiple options available | Optional style selection for image generation. |
| `negative_prompt` | STRING | No | - | An optional text description of undesired elements on an image. (default: "") |
| `recraft_controls` | COMBO | No | Multiple options available | Optional additional controls over the generation via the Recraft Controls node. |

**Note:** The `seed` parameter only controls when the node re-runs but does not make the image generation deterministic. The actual output images will vary even with the same seed value.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `IMAGE` | IMAGE | The generated image(s) as tensor output. |

**Source**: `comfy_api_nodes/nodes_recraft.py`

**Used in 3 template(s)**
