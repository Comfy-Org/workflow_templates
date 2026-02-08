# KlingTextToVideoWithAudio

**Category**: api node/video/Kling

**Display Name**: Kling Text to Video with Audio

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/KlingTextToVideoWithAudio/en.md)

The Kling Text to Video with Audio node generates a short video from a text description. It sends a request to the Kling AI service, which processes the prompt and returns a video file. The node can also generate accompanying audio for the video based on the text.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model_name` | COMBO | Yes | `"kling-v2-6"` | The specific AI model to use for video generation. |
| `prompt` | STRING | Yes | - | Positive text prompt. The description used to generate the video. Must be between 1 and 2500 characters. |
| `mode` | COMBO | Yes | `"pro"` | The operational mode for the video generation. |
| `aspect_ratio` | COMBO | Yes | `"16:9"`<br>`"9:16"`<br>`"1:1"` | The desired width-to-height ratio for the generated video. |
| `duration` | COMBO | Yes | `5`<br>`10` | The length of the video in seconds. |
| `generate_audio` | BOOLEAN | No | - | Controls whether audio is generated for the video. When enabled, the AI will create sound based on the prompt. (default: `True`) |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video file. |

**Source**: `comfy_api_nodes/nodes_kling.py`

**Used in 1 template(s)**
