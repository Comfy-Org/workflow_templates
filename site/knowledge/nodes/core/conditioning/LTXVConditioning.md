# LTXVConditioning

**Category**: conditioning/video_models

**Display Name**: positive

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/LTXVConditioning/en.md)

The LTXVConditioning node adds frame rate information to both positive and negative conditioning inputs for video generation models. It takes existing conditioning data and applies the specified frame rate value to both conditioning sets, making them suitable for video model processing.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| positive | Conditioning | — |  |
| negative | Conditioning | — |  |
| frame_rate | Float | 25.0 |  |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `positive` | CONDITIONING | The positive conditioning with frame rate information applied |
| `negative` | CONDITIONING | The negative conditioning with frame rate information applied |

**Source**: `comfy_extras/nodes_lt.py`

**Used in 2 template(s)**
