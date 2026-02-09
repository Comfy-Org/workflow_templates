# RecraftTextToVectorNode

**Category**: api node/image/Recraft

**Display Name**: Recraft Text to Vector

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/RecraftTextToVectorNode/en.md)

Generates SVG synchronously based on prompt and resolution. This node creates vector illustrations by sending text prompts to the Recraft API and returns the generated SVG content.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `prompt` | STRING | Yes | - | Prompt for the image generation. (default: "") |
| `substyle` | COMBO | Yes | Multiple options available | The specific illustration style to use for generation. Options are determined by the vector illustration substyles available in RecraftStyleV3. |
| `size` | COMBO | Yes | Multiple options available | The size of the generated image. (default: 1024x1024) |
| `n` | INT | Yes | 1-6 | The number of images to generate. (default: 1, min: 1, max: 6) |
| `seed` | INT | Yes | 0-18446744073709551615 | Seed to determine if node should re-run; actual results are nondeterministic regardless of seed. (default: 0, min: 0, max: 18446744073709551615) |
| `negative_prompt` | STRING | No | - | An optional text description of undesired elements on an image. (default: "") |
| `recraft_controls` | CONTROLS | No | - | Optional additional controls over the generation via the Recraft Controls node. |

**Note:** The `seed` parameter only controls when the node re-runs but does not make the generation results deterministic.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `SVG` | SVG | The generated vector illustration in SVG format |

**Source**: `comfy_api_nodes/nodes_recraft.py`

**Used in 1 template(s)**
