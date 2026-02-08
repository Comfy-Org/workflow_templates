# LoraLoader

**Category**: loaders

## Description

This node automatically detects models located in the LoRA folder (including subfolders) with the corresponding model path being `ComfyUI\models\loras`. For more information, please refer to Installing LoRA Models

The LoRA Loader node is primarily used to load LoRA models. You can think of LoRA models as filters that can give your images specific styles, content, and details:

- Apply specific artistic styles (like ink painting)
- Add characteristics of certain characters (like game characters)
- Add specific details to the image
All of these can be achieved through LoRA.

If you need to load multiple LoRA models, you can directly chain multiple nodes together, as shown below:

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| model | MODEL | — | The diffusion model the LoRA will be applied to. |
| clip | CLIP | — | The CLIP model the LoRA will be applied to. |
| strength_model | FLOAT | 1.0 | How strongly to modify the diffusion model. This value can be negative. |
| strength_clip | FLOAT | 1.0 | How strongly to modify the CLIP model. This value can be negative. |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| MODEL | MODEL | The modified diffusion model. |
| CLIP | CLIP | The modified CLIP model. |

**Source**: `nodes.py`

**Used in 6 template(s)**
