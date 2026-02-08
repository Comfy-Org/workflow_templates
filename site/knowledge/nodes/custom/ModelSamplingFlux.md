# ModelSamplingFlux

**Category**: advanced/model

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/ModelSamplingFlux/en.md)

The ModelSamplingFlux node applies Flux model sampling to a given model by calculating a shift parameter based on image dimensions. It creates a specialized sampling configuration that adjusts the model's behavior according to the specified width, height, and shift parameters, then returns the modified model with the new sampling settings applied.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| max_shift | FLOAT | 1.15 |  |
| base_shift | FLOAT | 0.5 |  |
| width | INT | 1024 |  |
| height | INT | 1024 |  |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| MODEL | MODEL |  |

**Source**: `comfy_extras/nodes_model_advanced.py`

**Used in 1 template(s)**
