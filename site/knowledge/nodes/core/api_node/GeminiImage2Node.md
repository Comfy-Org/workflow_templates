# GeminiImage2Node

**Category**: api node/image/Gemini

**Display Name**: Nano Banana Pro (Google Gemini Image)

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/GeminiImage2Node/en.md)

The GeminiImage2Node generates or edits images using Google's Vertex AI Gemini model. It sends a text prompt and optional reference images or files to the API and returns the generated image and/or a text description.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `prompt` | STRING | Yes | N/A | Text prompt describing the image to generate or the edits to apply. Include any constraints, styles, or details the model should follow. |
| `model` | COMBO | Yes | `"gemini-3-pro-image-preview"` | The specific Gemini model to use for generation. |
| `seed` | INT | Yes | 0 to 18446744073709551615 | When fixed to a specific value, the model makes a best effort to provide the same response for repeated requests. Deterministic output isn't guaranteed. Changing the model or other settings can cause variations even with the same seed. Default: 42. |
| `aspect_ratio` | COMBO | Yes | `"auto"`<br>`"1:1"`<br>`"2:3"`<br>`"3:2"`<br>`"3:4"`<br>`"4:3"`<br>`"4:5"`<br>`"5:4"`<br>`"9:16"`<br>`"16:9"`<br>`"21:9"` | The desired aspect ratio for the output image. If set to 'auto', it matches your input image's aspect ratio; if no image is provided, a 16:9 square is usually generated. Default: "auto". |
| `resolution` | COMBO | Yes | `"1K"`<br>`"2K"`<br>`"4K"` | Target output resolution. For 2K/4K the native Gemini upscaler is used. |
| `response_modalities` | COMBO | Yes | `"IMAGE+TEXT"`<br>`"IMAGE"` | Choose 'IMAGE' for image-only output, or 'IMAGE+TEXT' to return both the generated image and a text response. |
| `images` | IMAGE | No | N/A | Optional reference image(s). To include multiple images, use the Batch Images node (up to 14). |
| `files` | CUSTOM | No | N/A | Optional file(s) to use as context for the model. Accepts inputs from the Gemini Generate Content Input Files node. |
| `system_prompt` | STRING | No | N/A | Foundational instructions that dictate an AI's behavior. Default: A pre-defined system prompt for image generation. |

**Constraints:**
*   The `images` input supports a maximum of 14 images. If more are provided, an error will be raised.
*   The `files` input must be connected to a node that outputs the `GEMINI_INPUT_FILES` data type.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `image` | IMAGE | The image generated or edited by the Gemini model. |
| `string` | STRING | The text response from the model. This output will be empty if `response_modalities` is set to "IMAGE". |

**Source**: `comfy_api_nodes/nodes_gemini.py`

**Used in 27 template(s)**
