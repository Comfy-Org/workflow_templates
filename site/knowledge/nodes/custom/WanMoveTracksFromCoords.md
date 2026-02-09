# WanMoveTracksFromCoords

**Category**: conditioning/video_models

**Display Name**: track_length

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/WanMoveTracksFromCoords/en.md)

The WanMoveTracksFromCoords node creates a set of motion tracks from a list of coordinate points. It converts a JSON-formatted string of coordinates into a tensor format that can be used by other video processing nodes, and can optionally apply a mask to control the visibility of tracks over time.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| track_coords | String | [] |  |
| track_mask | Mask | — |  |

## Outputs

| Output | Type |
|--------|------|
| Tracks | Tracks |

**Source**: `comfy_extras/nodes_wanmove.py`

**Used in 2 template(s)**
