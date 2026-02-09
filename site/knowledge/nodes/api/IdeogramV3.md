# IdeogramV3

**Category**: api node/image/Ideogram

**Display Name**: Ideogram V3

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/IdeogramV3/en.md)

The Ideogram V3 node generates images using the Ideogram V3 model. It supports both regular image generation from text prompts and image editing when both an image and mask are provided. The node offers various controls for aspect ratio, resolution, generation speed, and optional character reference images.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `prompt` | STRING | Yes | - | Prompt for the image generation or editing (default: empty) |
| `image` | IMAGE | No | - | Optional reference image for image editing |
| `mask` | MASK | No | - | Optional mask for inpainting (white areas will be replaced) |
| `aspect_ratio` | COMBO | No | "1:1"<br>"16:9"<br>"9:16"<br>"4:3"<br>"3:4"<br>"3:2"<br>"2:3" | The aspect ratio for image generation. Ignored if resolution is not set to Auto (default: "1:1") |
| `resolution` | COMBO | No | "Auto"<br>"1024x1024"<br>"1152x896"<br>"896x1152"<br>"1216x832"<br>"832x1216"<br>"1344x768"<br>"768x1344"<br>"1536x640"<br>"640x1536" | The resolution for image generation. If not set to Auto, this overrides the aspect_ratio setting (default: "Auto") |
| `magic_prompt_option` | COMBO | No | "AUTO"<br>"ON"<br>"OFF" | Determine if MagicPrompt should be used in generation (default: "AUTO") |
| `seed` | INT | No | 0-2147483647 | Random seed for generation (default: 0) |
| `num_images` | INT | No | 1-8 | Number of images to generate (default: 1) |
| `rendering_speed` | COMBO | No | "DEFAULT"<br>"TURBO"<br>"QUALITY" | Controls the trade-off between generation speed and quality (default: "DEFAULT") |
| `character_image` | IMAGE | No | - | Image to use as character reference |
| `character_mask` | MASK | No | - | Optional mask for character reference image |

**Parameter Constraints:**

- When both `image` and `mask` are provided, the node switches to editing mode
- If only one of `image` or `mask` is provided, an error will occur
- `character_mask` requires `character_image` to be present
- The `aspect_ratio` parameter is ignored when `resolution` is not set to "Auto"
- White areas in the mask will be replaced during inpainting
- Character mask and character image must be the same size

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | IMAGE | The generated or edited image(s) |

**Source**: `comfy_api_nodes/nodes_ideogram.py`

**Used in 1 template(s)**
