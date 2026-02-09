# QwenImageDiffsynthControlnet

**Category**: advanced/loaders/qwen

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/QwenImageDiffsynthControlnet/en.md)

The QwenImageDiffsynthControlnet node applies a diffusion synthesis control network patch to modify a base model's behavior. It uses an image input and optional mask to guide the model's generation process with adjustable strength, creating a patched model that incorporates the control network's influence for more controlled image synthesis.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| strength | FLOAT | 1.0 |  |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| MODEL | MODEL |  |

**Source**: `comfy_extras/nodes_model_patch.py`

**Used in 1 template(s)**
