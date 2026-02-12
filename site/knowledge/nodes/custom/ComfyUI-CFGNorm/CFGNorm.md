# CFGNorm

**Category**: advanced/guidance

**Display Name**: patched_model

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/CFGNorm/en.md)

The CFGNorm node applies a normalization technique to the classifier-free guidance (CFG) process in diffusion models. It adjusts the scale of the denoised prediction by comparing the norms of the conditional and unconditional outputs, then applies a strength multiplier to control the effect. This helps stabilize the generation process by preventing extreme values in the guidance scaling.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| model | Model | — |  |
| strength | Float | 1.0 |  |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `patched_model` | MODEL | Returns the modified model with CFG normalization applied to its sampling process |

**Source**: `comfy_extras/nodes_cfg.py`

**Used in 1 template(s)**
