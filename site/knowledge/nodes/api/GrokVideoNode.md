# GrokVideoNode

**Category**: api node/video/Grok

**Display Name**: Grok Video

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/GrokVideoNode/en.md)

The Grok Video node generates a short video from a text description. It can create a video from scratch using a prompt or animate a single input image based on a prompt. The node sends a request to an external API and returns the generated video.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model` | COMBO | Yes | `"grok-imagine-video-beta"` | The model to use for video generation. |
| `prompt` | STRING | Yes | - | Text description of the desired video. |
| `resolution` | COMBO | Yes | `"480p"`<br>`"720p"` | The resolution of the output video. |
| `aspect_ratio` | COMBO | Yes | `"auto"`<br>`"16:9"`<br>`"4:3"`<br>`"3:2"`<br>`"1:1"`<br>`"2:3"`<br>`"3:4"`<br>`"9:16"` | The aspect ratio of the output video. |
| `duration` | INT | Yes | 1 to 15 | The duration of the output video in seconds (default: 6). |
| `seed` | INT | Yes | 0 to 2147483647 | Seed to determine if node should re-run; actual results are nondeterministic regardless of seed (default: 0). |
| `image` | IMAGE | No | - | An optional input image to animate. |

**Note:** If an `image` is provided, only one image is supported. Providing multiple images will cause an error.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video. |

**Source**: `comfy_api_nodes/nodes_grok.py`

**Used in 1 template(s)**
