# UNETLoader

**Category**: advanced/loaders

## Description

The UNETLoader node is designed for loading U-Net models by name, facilitating the use of pre-trained U-Net architectures within the system.

This node will detect models located in the `ComfyUI/models/diffusion_models` folder.

## Inputs

| Parameter   | Data Type | Description |
|-------------|--------------|-------------|
| `unet_name` | COMBO[STRING] | Specifies the name of the U-Net model to be loaded. This name is used to locate the model within a predefined directory structure, enabling the dynamic loading of different U-Net models. |
| `weight_dtype` | ... | 🚧  fp8_e4m3fn fp9_e5m2  |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| MODEL | MODEL |  |

**Source**: `nodes.py`

**Used in 51 template(s)**
