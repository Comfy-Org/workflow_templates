# Hunyuan3Dv2Conditioning

**Category**: conditioning/video_models

**Display Name**: positive

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/Hunyuan3Dv2Conditioning/en.md)

The Hunyuan3Dv2Conditioning node processes CLIP vision output to generate conditioning data for video models. It extracts the last hidden state embeddings from the vision output and creates both positive and negative conditioning pairs. The positive conditioning uses the actual embeddings while the negative conditioning uses zero-valued embeddings of the same shape.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `clip_vision_output` | CLIP_VISION_OUTPUT | Yes | - | The output from a CLIP vision model containing visual embeddings |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `positive` | CONDITIONING | Positive conditioning data containing the CLIP vision embeddings |
| `negative` | CONDITIONING | Negative conditioning data containing zero-valued embeddings matching the positive embeddings shape |

**Source**: `comfy_extras/nodes_hunyuan3d.py`

**Used in 2 template(s)**
