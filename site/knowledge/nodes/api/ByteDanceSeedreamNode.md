# ByteDanceSeedreamNode

**Category**: api node/image/ByteDance

**Display Name**: ByteDance Seedream 4.5

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/ByteDanceSeedreamNode/en.md)

The ByteDance Seedream 4 node provides unified text-to-image generation and precise single-sentence editing capabilities at up to 4K resolution. It can create new images from text prompts or edit existing images using text instructions. The node supports both single image generation and sequential generation of multiple related images.

## Inputs

| Parameter | Data Type | Input Type | Default | Range | Description |
|-----------|-----------|------------|---------|-------|-------------|
| `model` | MODEL | COMBO | "seedream-4-0-250828" | ["seedream-4-0-250828"] | Model name |
| `prompt` | STRING | STRING | "" | - | Text prompt for creating or editing an image. |
| `image` | IMAGE | IMAGE | - | - | Input image(s) for image-to-image generation. List of 1-10 images for single or multi-reference generation. |
| `size_preset` | STRING | COMBO | First preset from RECOMMENDED_PRESETS_SEEDREAM_4 | All labels from RECOMMENDED_PRESETS_SEEDREAM_4 | Pick a recommended size. Select Custom to use the width and height below. |
| `width` | INT | INT | 2048 | 1024-4096 (step 64) | Custom width for image. Value is working only if `size_preset` is set to `Custom` |
| `height` | INT | INT | 2048 | 1024-4096 (step 64) | Custom height for image. Value is working only if `size_preset` is set to `Custom` |
| `sequential_image_generation` | STRING | COMBO | "disabled" | ["disabled", "auto"] | Group image generation mode. 'disabled' generates a single image. 'auto' lets the model decide whether to generate multiple related images (e.g., story scenes, character variations). |
| `max_images` | INT | INT | 1 | 1-15 | Maximum number of images to generate when sequential_image_generation='auto'. Total images (input + generated) cannot exceed 15. |
| `seed` | INT | INT | 0 | 0-2147483647 | Seed to use for generation. |
| `watermark` | BOOLEAN | BOOLEAN | True | - | Whether to add an "AI generated" watermark to the image. |
| `fail_on_partial` | BOOLEAN | BOOLEAN | True | - | If enabled, abort execution if any requested images are missing or return an error. |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `IMAGE` | IMAGE | Generated image(s) based on the input parameters and prompt |

**Source**: `comfy_api_nodes/nodes_bytedance.py`

**Used in 5 template(s)**
