# BriaImageEditNode

**Category**: api node/image/Bria

**Display Name**: Bria FIBO Image Edit

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/BriaImageEditNode/en.md)

The Bria FIBO Image Edit node allows you to modify an existing image using a text instruction. It sends the image and your prompt to the Bria API, which uses the FIBO model to generate a new, edited version of the image based on your request. You can also provide a mask to limit the edits to a specific area.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model` | COMBO | Yes | `"FIBO"` | The model version to use for image editing. |
| `image` | IMAGE | Yes | - | The input image you want to edit. |
| `prompt` | STRING | No | - | The text instruction describing how to edit the image (default: empty). |
| `negative_prompt` | STRING | No | - | Text describing what you do not want to appear in the edited image (default: empty). |
| `structured_prompt` | STRING | No | - | A string containing the structured edit prompt in JSON format. Use this instead of the usual prompt for precise, programmatic control (default: empty). |
| `seed` | INT | Yes | 1 to 2147483647 | A number used to initialize the random generation, ensuring reproducible results (default: 1). |
| `guidance_scale` | FLOAT | Yes | 3.0 to 5.0 | Controls how closely the generated image follows the prompt. A higher value results in stronger adherence (default: 3.0). |
| `steps` | INT | Yes | 20 to 50 | The number of denoising steps the model will perform (default: 50). |
| `moderation` | DYNAMICCOMBO | Yes | `"true"`<br>`"false"` | Enables or disables content moderation. Selecting `"true"` reveals additional moderation options. |
| `mask` | MASK | No | - | An optional mask image. If provided, edits will only be applied to the masked areas of the image. |

**Important Constraints:**

* You must provide at least one of the `prompt` or `structured_prompt` inputs. They cannot both be empty.
* Exactly one input `image` is required.
* When the `moderation` parameter is set to `"true"`, three additional boolean inputs become available: `prompt_content_moderation`, `visual_input_moderation`, and `visual_output_moderation`.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `IMAGE` | IMAGE | The edited image returned by the Bria API. |
| `structured_prompt` | STRING | The structured prompt that was used or generated during the editing process. |

**Source**: `comfy_api_nodes/nodes_bria.py`

**Used in 2 template(s)**
