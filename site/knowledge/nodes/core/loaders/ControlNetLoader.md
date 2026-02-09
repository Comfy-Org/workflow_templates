# ControlNetLoader

**Category**: loaders

## Description

This node will detect models located in the `ComfyUI/models/controlnet` folder, and it will also read models from additional paths configured in the extra_model_paths.yaml file. Sometimes, you may need to **refresh the ComfyUI interface** to allow it to read the model files from the corresponding folder.

The ControlNetLoader node is designed to load a ControlNet model from a specified path. It plays a crucial role in initializing ControlNet models, which are essential for applying control mechanisms over generated content or modifying existing content based on control signals.

## Inputs

| Field             | Comfy dtype       | Description                                                                       |
|-------------------|-------------------|-----------------------------------------------------------------------------------|
| `control_net_name`| `COMBO[STRING]`    | Specifies the name of the ControlNet model to be loaded, used to locate the model file within a predefined directory structure. |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| CONTROL_NET | CONTROL_NET |  |

**Source**: `nodes.py`

**Used in 4 template(s)**
