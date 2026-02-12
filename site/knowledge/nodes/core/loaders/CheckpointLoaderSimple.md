# CheckpointLoaderSimple

**Category**: loaders

## Description

This is a model loader node that loads model files from specified locations and decomposes them into three core components: the main model, text encoder, and image encoder/decoder.

This node automatically detects all model files in the `ComfyUI/models/checkpoints` folder, as well as additional paths configured in your `extra_model_paths.yaml` file.

1. **Model Compatibility**: Ensure the selected model is compatible with your workflow. Different model types (such as SD1.5, SDXL, Flux, etc.) need to be paired with corresponding samplers and other nodes
2. **File Management**: Place model files in the `ComfyUI/models/checkpoints` folder, or configure other paths through extra_model_paths.yaml
3. **Interface Refresh**: If new model files are added while ComfyUI is running, you need to refresh the browser (Ctrl+R) to see the new files in the dropdown list

## Inputs

| Parameter      | Data Type | Input Type | Default | Range | Description |
|----------------|-----------|------------|---------|-------|-------------|
| `ckpt_name`    | STRING    | Widget     | null    | All model files in checkpoints folder | Select the checkpoint model file name to load, which determines the AI model used for subsequent image generation |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| MODEL | MODEL | The model used for denoising latents. |
| CLIP | CLIP | The CLIP model used for encoding text prompts. |
| VAE | VAE | The VAE model used for encoding and decoding images to and from latent space. |

**Source**: `nodes.py`

**Used in 19 template(s)**
