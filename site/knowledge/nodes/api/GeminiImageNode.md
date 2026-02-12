# GeminiImageNode

**Category**: api node/image/Gemini

**Display Name**: Nano Banana (Google Gemini Image)

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/GeminiImage/en.md)

The GeminiImage node generates text and image responses from Google's Gemini AI models. It allows you to provide multimodal inputs including text prompts, images, and files to create coherent text and image outputs. The node handles all API communication and response parsing with the latest Gemini models.

## Inputs

| Parameter | Data Type | Input Type | Default | Range | Description |
|-----------|-----------|------------|---------|-------|-------------|
| `prompt` | STRING | required | "" | - | Text prompt for generation |
| `model` | COMBO | required | gemini_2_5_flash_image_preview | Available Gemini models<br>Options extracted from GeminiImageModel enum | The Gemini model to use for generating responses |
| `seed` | INT | required | 42 | 0 to 18446744073709551615 | When seed is fixed to a specific value, the model makes a best effort to provide the same response for repeated requests. Deterministic output isn't guaranteed. Also, changing the model or parameter settings, such as the temperature, can cause variations in the response even when you use the same seed value. By default, a random seed value is used |
| `images` | IMAGE | optional | None | - | Optional image(s) to use as context for the model. To include multiple images, you can use the Batch Images node |
| `files` | GEMINI_INPUT_FILES | optional | None | - | Optional file(s) to use as context for the model. Accepts inputs from the Gemini Generate Content Input Files node |

*Note: The node includes hidden parameters (`auth_token`, `comfy_api_key`, `unique_id`) that are automatically handled by the system and do not require user input.*

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `IMAGE` | IMAGE | The generated image response from the Gemini model |
| `STRING` | STRING | The generated text response from the Gemini model |

**Source**: `comfy_api_nodes/nodes_gemini.py`

**Used in 2 template(s)**
