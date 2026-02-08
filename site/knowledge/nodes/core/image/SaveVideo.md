# SaveVideo

**Category**: image/video

**Display Name**: Save Video

**Also known as**: export video

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/SaveVideo/en.md)

The SaveVideo node saves input video content to your ComfyUI output directory. It allows you to specify the filename prefix, video format, and codec for the saved file. The node automatically handles file naming with counter increments and can include workflow metadata in the saved video.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| video | Video | — | The video to save. |
| filename_prefix | String | video/ComfyUI | The prefix for the file to save. This may include formatting information such as %date:yyyy-MM-dd% or %Empty Latent Image.width% to include values from nodes. |
| format | Combo | — |  |
| codec | Combo | — |  |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| *No outputs* | - | This node does not return any output data. |

**Source**: `comfy_extras/nodes_video.py`

**Used in 115 template(s)**
