# StabilityAudioToAudio

**Category**: api node/audio/Stability AI

**Display Name**: Stability AI Audio To Audio

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/StabilityAudioToAudio/en.md)

Transforms existing audio samples into new high-quality compositions using text instructions. This node takes an input audio file and modifies it based on your text prompt to create new audio content.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model` | COMBO | Yes | "stable-audio-2.5"<br> | The AI model to use for audio transformation |
| `prompt` | STRING | Yes |  | Text instructions describing how to transform the audio (default: empty) |
| `audio` | AUDIO | Yes |  | Audio must be between 6 and 190 seconds long |
| `duration` | INT | No | 1-190 | Controls the duration in seconds of the generated audio (default: 190) |
| `seed` | INT | No | 0-4294967294 | The random seed used for generation (default: 0) |
| `steps` | INT | No | 4-8 | Controls the number of sampling steps (default: 8) |
| `strength` | FLOAT | No | 0.01-1.0 | Parameter controls how much influence the audio parameter has on the generated audio (default: 1.0) |

**Note:** The input audio must be between 6 and 190 seconds in duration.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `audio` | AUDIO | The transformed audio generated based on the input audio and text prompt |

**Source**: `comfy_api_nodes/nodes_stability.py`

**Used in 1 template(s)**
