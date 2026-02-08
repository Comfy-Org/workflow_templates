# Vidu2TextToVideoNode

**Category**: api node/video/Vidu

**Display Name**: Vidu2 Text-to-Video Generation

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/Vidu2TextToVideoNode/en.md)

The Vidu2 Text-to-Video Generation node creates a video from a text description. It connects to an external API to generate video content based on your prompt, allowing you to control the video's length, visual style, and format.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model` | COMBO | Yes | `"viduq2"` | The AI model to use for video generation. Currently, only one model is available. |
| `prompt` | STRING | Yes | - | A textual description for video generation, with a maximum length of 2000 characters. |
| `duration` | INT | No | 1 to 10 | The length of the generated video in seconds. The value can be adjusted using a slider (default: 5). |
| `seed` | INT | No | 0 to 2147483647 | A number used to control the randomness of the generation, allowing for reproducible results. It can be controlled after generation (default: 1). |
| `aspect_ratio` | COMBO | No | `"16:9"`<br>`"9:16"`<br>`"3:4"`<br>`"4:3"`<br>`"1:1"` | The proportional relationship between the video's width and height. |
| `resolution` | COMBO | No | `"720p"`<br>`"1080p"` | The pixel dimensions of the generated video. |
| `background_music` | BOOLEAN | No | - | Whether to add background music to the generated video (default: False). |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video file. |

**Source**: `comfy_api_nodes/nodes_vidu.py`

**Used in 1 template(s)**
