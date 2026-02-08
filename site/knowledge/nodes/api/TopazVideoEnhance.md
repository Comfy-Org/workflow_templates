# TopazVideoEnhance

**Category**: api node/video/Topaz

**Display Name**: Topaz Video Enhance

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/TopazVideoEnhance/en.md)

The Topaz Video Enhance node uses an external API to improve video quality. It can upscale video resolution, increase frame rate through interpolation, and apply compression. The node processes an input MP4 video and returns an enhanced version based on the selected settings.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `video` | VIDEO | Yes | - | The input video file to be enhanced. |
| `upscaler_enabled` | BOOLEAN | Yes | - | Enables or disables the video upscaling feature (default: True). |
| `upscaler_model` | COMBO | Yes | `"Proteus v3"`<br>`"Artemis v13"`<br>`"Artemis v14"`<br>`"Artemis v15"`<br>`"Gaia v6"`<br>`"Theia v3"`<br>`"Starlight (Astra) Creative"`<br>`"Starlight (Astra) Optimized"`<br>`"Starlight (Astra) Balanced"`<br>`"Starlight (Astra) Quality"`<br>`"Starlight (Astra) Speed"` | The AI model used for upscaling the video. |
| `upscaler_resolution` | COMBO | Yes | `"FullHD (1080p)"`<br>`"4K (2160p)"` | The target resolution for the upscaled video. |
| `upscaler_creativity` | COMBO | No | `"low"`<br>`"middle"`<br>`"high"` | Creativity level (applies only to Starlight (Astra) Creative). (default: "low") |
| `interpolation_enabled` | BOOLEAN | No | - | Enables or disables the frame interpolation feature (default: False). |
| `interpolation_model` | COMBO | No | `"apo-8"` | The model used for frame interpolation (default: "apo-8"). |
| `interpolation_slowmo` | INT | No | 1 to 16 | Slow-motion factor applied to the input video. For example, 2 makes the output twice as slow and doubles the duration. (default: 1) |
| `interpolation_frame_rate` | INT | No | 15 to 240 | Output frame rate. (default: 60) |
| `interpolation_duplicate` | BOOLEAN | No | - | Analyze the input for duplicate frames and remove them. (default: False) |
| `interpolation_duplicate_threshold` | FLOAT | No | 0.001 to 0.1 | Detection sensitivity for duplicate frames. (default: 0.01) |
| `dynamic_compression_level` | COMBO | No | `"Low"`<br>`"Mid"`<br>`"High"` | CQP level. (default: "Low") |

**Note:** At least one enhancement feature must be enabled. The node will raise an error if both `upscaler_enabled` and `interpolation_enabled` are set to `False`. The input video must be in MP4 format.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `video` | VIDEO | The enhanced output video file. |

**Source**: `comfy_api_nodes/nodes_topaz.py`

**Used in 1 template(s)**
