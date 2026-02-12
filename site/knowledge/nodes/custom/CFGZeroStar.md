# CFGZeroStar

**Category**: advanced/guidance

**Display Name**: patched_model

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/CFGZeroStar/en.md)

The CFGZeroStar node applies a specialized guidance scaling technique to diffusion models. It modifies the classifier-free guidance process by calculating an optimized scale factor based on the difference between conditional and unconditional predictions. This approach adjusts the final output to provide enhanced control over the generation process while maintaining model stability.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| model | Model | — |  |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `patched_model` | MODEL | The modified model with CFGZeroStar guidance scaling applied |

**Source**: `comfy_extras/nodes_cfg.py`

**Used in 2 template(s)**
