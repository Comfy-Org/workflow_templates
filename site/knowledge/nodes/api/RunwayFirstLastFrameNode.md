# RunwayFirstLastFrameNode

**Category**: api node/video/Runway

**Display Name**: Runway First-Last-Frame to Video

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/RunwayFirstLastFrameNode/en.md)

The Runway First-Last-Frame to Video node generates videos by uploading first and last keyframes along with a text prompt. It creates smooth transitions between the provided start and end frames using Runway's Gen-3 model. This is particularly useful for complex transitions where the end frame differs significantly from the start frame.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `prompt` | STRING | Yes | N/A | Text prompt for the generation (default: empty string) |
| `start_frame` | IMAGE | Yes | N/A | Start frame to be used for the video |
| `end_frame` | IMAGE | Yes | N/A | End frame to be used for the video. Supported for gen3a_turbo only. |
| `duration` | COMBO | Yes | Multiple options available | Video duration selection from available Duration options |
| `ratio` | COMBO | Yes | Multiple options available | Aspect ratio selection from available RunwayGen3aAspectRatio options |
| `seed` | INT | No | 0-4294967295 | Random seed for generation (default: 0) |

**Parameter Constraints:**

- The `prompt` must contain at least 1 character
- Both `start_frame` and `end_frame` must have maximum dimensions of 7999x7999 pixels
- Both `start_frame` and `end_frame` must have aspect ratios between 0.5 and 2.0
- The `end_frame` parameter is only supported when using the gen3a_turbo model

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video transitioning between the start and end frames |

**Source**: `comfy_api_nodes/nodes_runway.py`

**Used in 1 template(s)**
