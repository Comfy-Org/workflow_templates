# RunwayImageToVideoNodeGen3a

**Category**: api node/video/Runway

**Display Name**: Runway Image to Video (Gen3a Turbo)

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/RunwayImageToVideoNodeGen3a/en.md)

The Runway Image to Video (Gen3a Turbo) node generates a video from a single starting frame using Runway's Gen3a Turbo model. It takes a text prompt and an initial image frame, then creates a video sequence based on the specified duration and aspect ratio. This node connects to Runway's API to process the generation remotely.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `prompt` | STRING | Yes | N/A | Text prompt for the generation (default: "") |
| `start_frame` | IMAGE | Yes | N/A | Start frame to be used for the video |
| `duration` | COMBO | Yes | Multiple options available | Video duration selection from available options |
| `ratio` | COMBO | Yes | Multiple options available | Aspect ratio selection from available options |
| `seed` | INT | No | 0-4294967295 | Random seed for generation (default: 0) |

**Parameter Constraints:**

- The `start_frame` must have dimensions not exceeding 7999x7999 pixels
- The `start_frame` must have an aspect ratio between 0.5 and 2.0
- The `prompt` must contain at least one character (cannot be empty)

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video sequence |

**Source**: `comfy_api_nodes/nodes_runway.py`

**Used in 1 template(s)**
