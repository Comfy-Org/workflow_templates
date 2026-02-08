# Hunyuan3Dv2ConditioningMultiView

**Category**: conditioning/video_models

**Display Name**: positive

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/Hunyuan3Dv2ConditioningMultiView/en.md)

The Hunyuan3Dv2ConditioningMultiView node processes multi-view CLIP vision embeddings for 3D video generation. It takes optional front, left, back, and right view embeddings and combines them with positional encoding to create conditioning data for video models. The node outputs both positive conditioning from the combined embeddings and negative conditioning with zero values.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `front` | CLIP_VISION_OUTPUT | No | - | CLIP vision output for the front view |
| `left` | CLIP_VISION_OUTPUT | No | - | CLIP vision output for the left view |
| `back` | CLIP_VISION_OUTPUT | No | - | CLIP vision output for the back view |
| `right` | CLIP_VISION_OUTPUT | No | - | CLIP vision output for the right view |

**Note:** At least one view input must be provided for the node to function. The node will only process views that contain valid CLIP vision output data.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `positive` | CONDITIONING | Positive conditioning containing the combined multi-view embeddings with positional encoding |
| `negative` | CONDITIONING | Negative conditioning with zero values for contrastive learning |

**Source**: `comfy_extras/nodes_hunyuan3d.py`

**Used in 2 template(s)**
