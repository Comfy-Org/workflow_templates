# RunwayImageToVideoNodeGen4

**Category**: api node/video/Runway

**Display Name**: Runway Image to Video (Gen4 Turbo)

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/RunwayImageToVideoNodeGen4/en.md)

The Runway Image to Video (Gen4 Turbo) node generates a video from a single starting frame using Runway's Gen4 Turbo model. It takes a text prompt and an initial image frame, then creates a video sequence based on the provided duration and aspect ratio settings. The node handles uploading the starting frame to Runway's API and returns the generated video.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `prompt` | STRING | Yes | - | Text prompt for the generation (default: empty string) |
| `start_frame` | IMAGE | Yes | - | Start frame to be used for the video |
| `duration` | COMBO | Yes | Multiple options available | Video duration selection from available duration options |
| `ratio` | COMBO | Yes | Multiple options available | Aspect ratio selection from available Gen4 Turbo aspect ratio options |
| `seed` | INT | No | 0 to 4294967295 | Random seed for generation (default: 0) |

**Parameter Constraints:**

- The `start_frame` image must have dimensions not exceeding 7999x7999 pixels
- The `start_frame` image must have an aspect ratio between 0.5 and 2.0
- The `prompt` must contain at least one character

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video based on the input frame and prompt |

**Source**: `comfy_api_nodes/nodes_runway.py`

**Used in 1 template(s)**
