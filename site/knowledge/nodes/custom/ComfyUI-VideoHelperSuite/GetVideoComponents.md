# GetVideoComponents

**Category**: image/video

**Display Name**: Get Video Components

**Also known as**: extract frames, split video, video to images, demux

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/GetVideoComponents/en.md)

The Get Video Components node extracts all the main elements from a video file. It separates the video into individual frames, extracts the audio track, and provides the video's framerate information. This allows you to work with each component independently for further processing or analysis.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| video | Video | — | The video to extract components from. |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `images` | IMAGE | The individual frames extracted from the video as separate images. |
| `audio` | AUDIO | The audio track extracted from the video. |
| `fps` | FLOAT | The framerate of the video in frames per second. |

**Source**: `comfy_extras/nodes_video.py`

**Used in 16 template(s)**
