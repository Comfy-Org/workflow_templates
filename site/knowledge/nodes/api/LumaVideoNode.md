# LumaVideoNode

**Category**: api node/video/Luma

**Display Name**: Luma Text to Video

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/LumaVideoNode/en.md)

Generates videos synchronously based on prompt and output settings. This node creates video content using text descriptions and various generation parameters, producing the final video output once the generation process is complete.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `prompt` | STRING | Yes | - | Prompt for the video generation (default: empty string) |
| `model` | COMBO | Yes | Multiple options available | The video generation model to use |
| `aspect_ratio` | COMBO | Yes | Multiple options available | The aspect ratio for the generated video (default: 16:9) |
| `resolution` | COMBO | Yes | Multiple options available | The output resolution for the video (default: 540p) |
| `duration` | COMBO | Yes | Multiple options available | The duration of the generated video |
| `loop` | BOOLEAN | Yes | - | Whether the video should loop (default: False) |
| `seed` | INT | Yes | 0 to 18446744073709551615 | Seed to determine if node should re-run; actual results are nondeterministic regardless of seed (default: 0) |
| `luma_concepts` | CUSTOM | No | - | Optional Camera Concepts to dictate camera motion via the Luma Concepts node |

**Note:** When using the `ray_1_6` model, the `duration` and `resolution` parameters are automatically set to None and do not affect the generation.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video file |

**Source**: `comfy_api_nodes/nodes_luma.py`

**Used in 1 template(s)**
