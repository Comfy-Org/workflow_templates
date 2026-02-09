# LoraLoaderModelOnly

## Description

This node will detect models located in the `ComfyUI/models/loras` folder, and it will also read models from additional paths configured in the extra_model_paths.yaml file. Sometimes, you may need to **refresh the ComfyUI interface** to allow it to read the model files from the corresponding folder.

This node specializes in loading a LoRA model without requiring a CLIP model, focusing on enhancing or modifying a given model based on LoRA parameters. It allows for the dynamic adjustment of the model's strength through LoRA parameters, facilitating fine-tuned control over the model's behavior.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| strength_model | FLOAT | 1.0 |  |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| MODEL | MODEL |  |

**Source**: `nodes.py`

**Used in 16 template(s)**
