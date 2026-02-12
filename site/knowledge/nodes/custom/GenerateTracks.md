# GenerateTracks

**Category**: conditioning/video_models

**Display Name**: track_length

**Also known as**: motion paths, camera movement, trajectory

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/GenerateTracks/en.md)

The `GenerateTracks` node creates multiple parallel motion paths for video generation. It defines a primary path from a start point to an end point, then generates a set of tracks that run parallel to this path, spaced evenly apart. You can control the shape of the path (straight line or Bezier curve), the speed of movement along it, and which frames the tracks are visible in.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| width | Int | 832 |  |
| height | Int | 480 |  |
| start_x | Float | 0.0 |  |
| start_y | Float | 0.0 |  |
| end_x | Float | 1.0 |  |
| end_y | Float | 1.0 |  |
| num_frames | Int | 81 |  |
| num_tracks | Int | 5 |  |
| track_spread | Float | 0.025 | Normalized distance between tracks. Tracks are spread perpendicular to the motion direction. |
| bezier | Boolean | False | Enable Bezier curve path using the mid point as control point. |
| mid_x | Float | 0.5 | Normalized X control point for Bezier curve. Only used when 'bezier' is enabled. |
| mid_y | Float | 0.5 | Normalized Y control point for Bezier curve. Only used when 'bezier' is enabled. |
| interpolation | Combo | — | Controls the timing/speed of movement along the path. |
| track_mask | Mask | — | Optional mask to indicate visible frames. |

## Outputs

| Output | Type |
|--------|------|
| Tracks | Tracks |

**Source**: `comfy_extras/nodes_wanmove.py`

**Used in 1 template(s)**
