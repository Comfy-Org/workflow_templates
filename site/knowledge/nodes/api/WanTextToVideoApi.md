# WanTextToVideoApi

**Category**: api node/video/Wan

**Display Name**: Wan Text to Video

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/WanTextToVideoApi/en.md)

The Wan Text to Video node generates video content based on text descriptions. It uses AI models to create videos from prompts and supports various video sizes, durations, and optional audio inputs. The node can automatically generate audio when needed and provides options for prompt enhancement and watermarking.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model` | COMBO | Yes | "wan2.5-t2v-preview" | Model to use (default: "wan2.5-t2v-preview") |
| `prompt` | STRING | Yes | - | Prompt used to describe the elements and visual features, supports English/Chinese (default: "") |
| `negative_prompt` | STRING | No | - | Negative text prompt to guide what to avoid (default: "") |
| `size` | COMBO | No | "480p: 1:1 (624x624)"<br>"480p: 16:9 (832x480)"<br>"480p: 9:16 (480x832)"<br>"720p: 1:1 (960x960)"<br>"720p: 16:9 (1280x720)"<br>"720p: 9:16 (720x1280)"<br>"720p: 4:3 (1088x832)"<br>"720p: 3:4 (832x1088)"<br>"1080p: 1:1 (1440x1440)"<br>"1080p: 16:9 (1920x1080)"<br>"1080p: 9:16 (1080x1920)"<br>"1080p: 4:3 (1632x1248)"<br>"1080p: 3:4 (1248x1632)" | Video resolution and aspect ratio (default: "480p: 1:1 (624x624)") |
| `duration` | INT | No | 5-10 | Available durations: 5 and 10 seconds (default: 5) |
| `audio` | AUDIO | No | - | Audio must contain a clear, loud voice, without extraneous noise, background music |
| `seed` | INT | No | 0-2147483647 | Seed to use for generation (default: 0) |
| `generate_audio` | BOOLEAN | No | - | If there is no audio input, generate audio automatically (default: False) |
| `prompt_extend` | BOOLEAN | No | - | Whether to enhance the prompt with AI assistance (default: True) |
| `watermark` | BOOLEAN | No | - | Whether to add an "AI generated" watermark to the result (default: True) |

**Note:** The `duration` parameter only accepts values of 5 or 10 seconds, as these are the available durations. When providing audio input, it must be between 3.0 and 29.0 seconds in duration and contain clear voice without background noise or music.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video based on the input parameters |

**Source**: `comfy_api_nodes/nodes_wan.py`

**Used in 2 template(s)**
