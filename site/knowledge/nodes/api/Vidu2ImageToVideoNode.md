# Vidu2ImageToVideoNode

**Category**: api node/video/Vidu

**Display Name**: Vidu2 Image-to-Video Generation

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/Vidu2ImageToVideoNode/en.md)

The Vidu2 Image-to-Video Generation node creates a video sequence starting from a single input image. It uses a specified Vidu2 model to animate the scene based on an optional text prompt, controlling the video's length, resolution, and the intensity of motion.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model` | COMBO | Yes | `"viduq2-pro-fast"`<br>`"viduq2-pro"`<br>`"viduq2-turbo"` | The Vidu2 model to use for video generation. Different models offer varying speed and quality trade-offs. |
| `image` | IMAGE | Yes | - | An image to be used as the start frame of the generated video. Only one image is allowed. |
| `prompt` | STRING | No | - | An optional text prompt for video generation (max 2000 characters). Default is an empty string. |
| `duration` | INT | Yes | 1 to 10 | The length of the generated video in seconds. Default is 5. |
| `seed` | INT | No | 0 to 2147483647 | A seed value for random number generation to ensure reproducible results. Default is 1. |
| `resolution` | COMBO | Yes | `"720p"`<br>`"1080p"` | The output resolution of the generated video. |
| `movement_amplitude` | COMBO | Yes | `"auto"`<br>`"small"`<br>`"medium"`<br>`"large"` | The movement amplitude of objects in the frame. |

**Constraints:**

* The `image` input must contain exactly one image.
* The input image's aspect ratio must be between 1:4 and 4:1.
* The `prompt` text is limited to a maximum of 2000 characters.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video file. |

**Source**: `comfy_api_nodes/nodes_vidu.py`

**Used in 1 template(s)**
