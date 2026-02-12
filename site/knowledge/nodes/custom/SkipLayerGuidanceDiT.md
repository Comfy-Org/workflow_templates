# SkipLayerGuidanceDiT

**Category**: advanced/guidance

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/SkipLayerGuidanceDiT/en.md)

Enhances guidance towards detailed structure by using another set of CFG negative with skipped layers. This generic version of SkipLayerGuidance can be used on every DiT model and is inspired by Perturbed Attention Guidance. The original experimental implementation was created for SD3.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| model | Model | — |  |
| double_layers | String | 7 |  |
| single_layers | String | 7 |  |
| scale | Float | 3.0 |  |
| start_percent | Float | 0.01 |  |
| end_percent | Float | 0.15 |  |
| rescaling_scale | Float | 0.0 |  |

## Outputs

| Output | Type |
|--------|------|
| ),
            ], | Model |

**Source**: `comfy_extras/nodes_slg.py`

**Used in 2 template(s)**
