# LumaImageToVideoNode

**Category**: api node/video/Luma

**Display Name**: Luma Image to Video

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/LumaImageToVideoNode/en.md)

Generates videos synchronously based on prompt, input images, and output_size. This node creates videos using the Luma API by providing text prompts and optional starting/ending images to define the video content and structure.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `prompt` | STRING | Yes | - | Prompt for the video generation (default: "") |
| `model` | COMBO | Yes | Multiple options available | Selects the video generation model from available Luma models |
| `resolution` | COMBO | Yes | Multiple options available | Output resolution for the generated video (default: 540p) |
| `duration` | COMBO | Yes | Multiple options available | Duration of the generated video |
| `loop` | BOOLEAN | Yes | - | Whether the generated video should loop (default: False) |
| `seed` | INT | Yes | 0 to 18446744073709551615 | Seed to determine if node should re-run; actual results are nondeterministic regardless of seed. (default: 0) |
| `first_image` | IMAGE | No | - | First frame of generated video. (optional) |
| `last_image` | IMAGE | No | - | Last frame of generated video. (optional) |
| `luma_concepts` | CUSTOM | No | - | Optional Camera Concepts to dictate camera motion via the Luma Concepts node. (optional) |

**Note:** At least one of `first_image` or `last_image` must be provided. The node will raise an exception if both are missing.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video file |

**Source**: `comfy_api_nodes/nodes_luma.py`

**Used in 1 template(s)**
