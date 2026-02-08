# StabilityAudioInpaint

**Category**: api node/audio/Stability AI

**Display Name**: Stability AI Audio Inpaint

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/StabilityAudioInpaint/en.md)

Transforms part of an existing audio sample using text instructions. This node allows you to modify specific sections of audio by providing descriptive prompts, effectively "inpainting" or regenerating selected portions while preserving the rest of the audio.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model` | COMBO | Yes | "stable-audio-2.5"<br> | The AI model to use for audio inpainting. |
| `prompt` | STRING | Yes |  | Text description guiding how the audio should be transformed (default: empty). |
| `audio` | AUDIO | Yes |  | Input audio file to transform. Audio must be between 6 and 190 seconds long. |
| `duration` | INT | No | 1-190 | Controls the duration in seconds of the generated audio (default: 190). |
| `seed` | INT | No | 0-4294967294 | The random seed used for generation (default: 0). |
| `steps` | INT | No | 4-8 | Controls the number of sampling steps (default: 8). |
| `mask_start` | INT | No | 0-190 | Starting position in seconds for the audio section to transform (default: 30). |
| `mask_end` | INT | No | 0-190 | Ending position in seconds for the audio section to transform (default: 190). |

**Note:** The `mask_end` value must be greater than the `mask_start` value. The input audio must be between 6 and 190 seconds in duration.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `audio` | AUDIO | The transformed audio output with the specified section modified according to the prompt. |

**Source**: `comfy_api_nodes/nodes_stability.py`

**Used in 1 template(s)**
