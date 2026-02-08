# StabilityTextToAudio

**Category**: api node/audio/Stability AI

**Display Name**: Stability AI Text To Audio

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/StabilityTextToAudio/en.md)

Generates high-quality music and sound effects from text descriptions. This node uses Stability AI's audio generation technology to create audio content based on your text prompts.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model` | COMBO | Yes | `"stable-audio-2.5"` | The audio generation model to use (default: "stable-audio-2.5") |
| `prompt` | STRING | Yes | - | The text description used to generate audio content (default: empty string) |
| `duration` | INT | No | 1-190 | Controls the duration in seconds of the generated audio (default: 190) |
| `seed` | INT | No | 0-4294967294 | The random seed used for generation (default: 0) |
| `steps` | INT | No | 4-8 | Controls the number of sampling steps (default: 8) |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `audio` | AUDIO | The generated audio file based on the text prompt |

**Source**: `comfy_api_nodes/nodes_stability.py`

**Used in 1 template(s)**
