# WanImageToVideoApi

**Category**: api node/video/Wan

**Display Name**: Wan Image to Video

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/WanImageToVideoApi/en.md)

The Wan Image to Video node generates video content starting from a single input image and a text prompt. It creates video sequences by extending the initial frame according to the provided description, with options to control video quality, duration, and audio integration.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model` | COMBO | Yes | "wan2.5-i2v-preview"<br>"wan2.5-i2v-preview" | Model to use (default: "wan2.5-i2v-preview") |
| `image` | IMAGE | Yes | - | Input image that serves as the first frame for video generation |
| `prompt` | STRING | Yes | - | Prompt used to describe the elements and visual features, supports English/Chinese (default: empty) |
| `negative_prompt` | STRING | No | - | Negative text prompt to guide what to avoid (default: empty) |
| `resolution` | COMBO | No | "480P"<br>"720P"<br>"1080P" | Video resolution quality (default: "480P") |
| `duration` | INT | No | 5-10 | Available durations: 5 and 10 seconds (default: 5) |
| `audio` | AUDIO | No | - | Audio must contain a clear, loud voice, without extraneous noise, background music |
| `seed` | INT | No | 0-2147483647 | Seed to use for generation (default: 0) |
| `generate_audio` | BOOLEAN | No | - | If there is no audio input, generate audio automatically (default: False) |
| `prompt_extend` | BOOLEAN | No | - | Whether to enhance the prompt with AI assistance (default: True) |
| `watermark` | BOOLEAN | No | - | Whether to add an "AI generated" watermark to the result (default: True) |

**Constraints:**

- Exactly one input image is required for video generation
- Duration parameter only accepts values of 5 or 10 seconds
- When audio is provided, it must be between 3.0 and 29.0 seconds in duration

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | Generated video based on the input image and prompt |

**Source**: `comfy_api_nodes/nodes_wan.py`

**Used in 2 template(s)**
