# GrokImageNode

**Category**: api node/image/Grok

**Display Name**: Grok Image

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/GrokImageNode/en.md)

The Grok Image node generates one or more images based on a text description using the Grok AI model. It sends your prompt to an external service and returns the generated images as tensors that can be used in your workflow.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model` | COMBO | Yes | `"grok-imagine-image-beta"` | The specific Grok model to use for image generation. |
| `prompt` | STRING | Yes | N/A | The text prompt used to generate the image. This description guides the AI on what to create. |
| `aspect_ratio` | COMBO | Yes | `"1:1"`<br>`"2:3"`<br>`"3:2"`<br>`"3:4"`<br>`"4:3"`<br>`"9:16"`<br>`"16:9"`<br>`"9:19.5"`<br>`"19.5:9"`<br>`"9:20"`<br>`"20:9"`<br>`"1:2"`<br>`"2:1"` | The desired width-to-height ratio for the generated image. |
| `number_of_images` | INT | No | 1 to 10 | Number of images to generate (default: 1). |
| `seed` | INT | No | 0 to 2147483647 | A seed value to determine if the node should re-run. The actual image results are nondeterministic and will vary even with the same seed (default: 0). |

**Note:** The `seed` parameter is primarily used to control when the node re-executes within a workflow. Due to the nature of the external AI service, the generated images will not be reproducible or identical across runs, even with an identical seed.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | IMAGE | The generated image or a batch of images. If `number_of_images` is 1, a single image tensor is returned. If greater than 1, a batch of image tensors is returned. |

**Source**: `comfy_api_nodes/nodes_grok.py`

**Used in 1 template(s)**
