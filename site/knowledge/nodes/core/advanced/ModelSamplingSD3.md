# ModelSamplingSD3

**Category**: advanced/model

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/ModelSamplingSD3/en.md)

The ModelSamplingSD3 node applies Stable Diffusion 3 sampling parameters to a model. It modifies the model's sampling behavior by adjusting the shift parameter, which controls the sampling distribution characteristics. The node creates a modified copy of the input model with the specified sampling configuration applied.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| shift | FLOAT | 3.0 |  |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| MODEL | MODEL |  |

**Source**: `comfy_extras/nodes_model_advanced.py`

**Used in 36 template(s)**
