# Vidu3TextToVideoNode

**Category**: api node/video/Vidu

**Display Name**: Vidu Q3 Text-to-Video Generation

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/Vidu3TextToVideoNode/en.md)

The Vidu Q3 Text-to-Video Generation node creates a video from a text description. It uses the Vidu Q3 Pro model to generate video content based on your prompt, allowing you to control the video's length, resolution, and aspect ratio.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model` | COMBO | Yes | `"viduq3-pro"` | Model to use for video generation. Selecting this option reveals additional configuration parameters for aspect ratio, resolution, duration, and audio. |
| `model.aspect_ratio` | COMBO | Yes* | `"16:9"`<br>`"9:16"`<br>`"3:4"`<br>`"4:3"`<br>`"1:1"` | The aspect ratio of the output video. This parameter is revealed when the `model` is selected. |
| `model.resolution` | COMBO | Yes* | `"720p"`<br>`"1080p"` | Resolution of the output video. This parameter is revealed when the `model` is selected. |
| `model.duration` | INT | Yes* | 1 to 16 | Duration of the output video in seconds (default: 5). This parameter is revealed when the `model` is selected. |
| `model.audio` | BOOLEAN | Yes* | True/False | When enabled, outputs video with sound (including dialogue and sound effects) (default: False). This parameter is revealed when the `model` is selected. |
| `prompt` | STRING | Yes | N/A | A textual description for video generation, with a maximum length of 2000 characters. |
| `seed` | INT | No | 0 to 2147483647 | A seed value for controlling the randomness of the generation (default: 1). |

*Note: The parameters `aspect_ratio`, `resolution`, `duration`, and `audio` are required once the `model` is selected, as they are part of its configuration.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `video` | VIDEO | The generated video file. |

**Source**: `comfy_api_nodes/nodes_vidu.py`

**Used in 1 template(s)**
