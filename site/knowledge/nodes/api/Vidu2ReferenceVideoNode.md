# Vidu2ReferenceVideoNode

**Category**: api node/video/Vidu

**Display Name**: Vidu2 Reference-to-Video Generation

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/Vidu2ReferenceVideoNode/en.md)

The Vidu2 Reference-to-Video Generation node creates a video from a text prompt and multiple reference images. You can define up to seven subjects, each with its own set of reference images, and reference them in the prompt using `@subject{subject_id}`. The node generates a video with configurable duration, aspect ratio, and movement.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model` | COMBO | Yes | `"viduq2"` | The AI model to use for video generation. |
| `subjects` | AUTOGROW | Yes | N/A | For each subject, provide up to 3 reference images (7 images total across all subjects). Reference them in prompts via `@subject{subject_id}`. |
| `prompt` | STRING | Yes | N/A | The text description used to guide the video generation. When the `audio` parameter is enabled, the video will include generated speech and background music based on this prompt. |
| `audio` | BOOLEAN | No | N/A | When enabled, the video will contain generated speech and background music based on the prompt (default: `False`). |
| `duration` | INT | No | 1 to 10 | The length of the generated video in seconds (default: `5`). |
| `seed` | INT | No | 0 to 2147483647 | A number used to control the randomness of the generation for reproducible results (default: `1`). |
| `aspect_ratio` | COMBO | No | `"16:9"`<br>`"9:16"`<br>`"4:3"`<br>`"3:4"`<br>`"1:1"` | The shape of the video frame. |
| `resolution` | COMBO | No | `"720p"`<br>`"1080p"` | The pixel resolution of the output video. |
| `movement_amplitude` | COMBO | No | `"auto"`<br>`"small"`<br>`"medium"`<br>`"large"` | Controls the movement amplitude of objects in the frame. |

**Constraints:**

* The `prompt` must be between 1 and 2000 characters long.
* You can define multiple subjects, but the total number of reference images across all subjects must not exceed 7.
* Each individual subject can have a maximum of 3 reference images.
* Each reference image must have a width-to-height ratio between 1:4 and 4:1.
* Each reference image must be at least 128 pixels in both width and height.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video file. |

**Source**: `comfy_api_nodes/nodes_vidu.py`

**Used in 1 template(s)**
