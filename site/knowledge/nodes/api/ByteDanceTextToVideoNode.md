# ByteDanceTextToVideoNode

**Category**: api node/video/ByteDance

**Display Name**: ByteDance Text to Video

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/ByteDanceTextToVideoNode/en.md)

The ByteDance Text to Video node generates videos using ByteDance models through an API based on text prompts. It takes a text description and various video settings as input, then creates a video that matches the provided specifications. The node handles the API communication and returns the generated video as output.

## Inputs

| Parameter | Data Type | Input Type | Default | Range | Description |
|-----------|-----------|------------|---------|-------|-------------|
| `model` | STRING | Combo | seedance_1_pro | Text2VideoModelName options | Model name |
| `prompt` | STRING | String | - | - | The text prompt used to generate the video. |
| `resolution` | STRING | Combo | - | ["480p", "720p", "1080p"] | The resolution of the output video. |
| `aspect_ratio` | STRING | Combo | - | ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"] | The aspect ratio of the output video. |
| `duration` | INT | Int | 5 | 3-12 | The duration of the output video in seconds. |
| `seed` | INT | Int | 0 | 0-2147483647 | Seed to use for generation. (Optional) |
| `camera_fixed` | BOOLEAN | Boolean | False | - | Specifies whether to fix the camera. The platform appends an instruction to fix the camera to your prompt, but does not guarantee the actual effect. (Optional) |
| `watermark` | BOOLEAN | Boolean | True | - | Whether to add an "AI generated" watermark to the video. (Optional) |

**Parameter Constraints:**

- The `prompt` parameter must contain at least 1 character after whitespace removal
- The `prompt` parameter cannot contain the following text parameters: "resolution", "ratio", "duration", "seed", "camerafixed", "watermark"
- The `duration` parameter is limited to values between 3 and 12 seconds
- The `seed` parameter accepts values from 0 to 2,147,483,647

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video file |

**Source**: `comfy_api_nodes/nodes_bytedance.py`

**Used in 2 template(s)**
