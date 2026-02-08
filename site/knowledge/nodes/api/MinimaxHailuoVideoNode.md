# MinimaxHailuoVideoNode

**Category**: api node/video/MiniMax

**Display Name**: MiniMax Hailuo Video

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/MinimaxHailuoVideoNode/en.md)

Generates videos from text prompts using the MiniMax Hailuo-02 model. You can optionally provide a starting image as the first frame to create a video that continues from that image.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `prompt_text` | STRING | Yes | - | Text prompt to guide the video generation. |
| `seed` | INT | No | 0 to 18446744073709551615 | The random seed used for creating the noise (default: 0). |
| `first_frame_image` | IMAGE | No | - | Optional image to use as the first frame to generate a video. |
| `prompt_optimizer` | BOOLEAN | No | - | Optimize prompt to improve generation quality when needed (default: True). |
| `duration` | COMBO | No | `6`<br>`10` | The length of the output video in seconds (default: 6). |
| `resolution` | COMBO | No | `"768P"`<br>`"1080P"` | The dimensions of the video display. 1080p is 1920x1080, 768p is 1366x768 (default: "768P"). |

**Note:** When using the MiniMax-Hailuo-02 model with 1080P resolution, the duration is limited to 6 seconds.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video file. |

**Source**: `comfy_api_nodes/nodes_minimax.py`

**Used in 2 template(s)**
