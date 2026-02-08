# StyleModelLoader

**Category**: loaders

## Description

This node will detect models located in the `ComfyUI/models/style_models` folder, and it will also read models from additional paths configured in the extra_model_paths.yaml file. Sometimes, you may need to **refresh the ComfyUI interface** to allow it to read the model files from the corresponding folder.

The StyleModelLoader node is designed to load a style model from a specified path. It focuses on retrieving and initializing style models that can be used to apply specific artistic styles to images, thereby enabling the customization of visual outputs based on the loaded style model.

## Inputs

| Parameter Name      | Comfy dtype     | Python dtype | Description                                                                                       |
|---------------------|-----------------|--------------|---------------------------------------------------------------------------------------------------|
| `style_model_name`  | COMBO[STRING] | `str`        | Specifies the name of the style model to be loaded. This name is used to locate the model file within a predefined directory structure, allowing for the dynamic loading of different style models based on user input or application needs. |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| STYLE_MODEL | STYLE_MODEL |  |

**Source**: `nodes.py`

**Used in 1 template(s)**
