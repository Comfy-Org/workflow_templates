# VAELoader

**Category**: loaders

## Description

This node will detect models located in the `ComfyUI/models/vae` folder, and it will also read models from additional paths configured in the extra_model_paths.yaml file. Sometimes, you may need to **refresh the ComfyUI interface** to allow it to read the model files from the corresponding folder.

The VAELoader node is designed for loading Variational Autoencoder (VAE) models, specifically tailored to handle both standard and approximate VAEs. It supports loading VAEs by name, including specialized handling for 'taesd' and 'taesdxl' models, and dynamically adjusts based on the VAE's specific configuration.

## Inputs

| Field   | Comfy dtype       | Description                                                                                   |
|---------|-------------------|-----------------------------------------------------------------------------------------------|
| `vae_name` | `COMBO[STRING]`    | Specifies the name of the VAE to be loaded, determining which VAE model is fetched and loaded, with support for a range of predefined VAE names including 'taesd' and 'taesdxl'. |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| VAE | VAE |  |

**Source**: `nodes.py`

**Used in 51 template(s)**
