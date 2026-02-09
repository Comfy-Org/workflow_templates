# ImageOnlyCheckpointLoader

**Category**: loaders/video_models

## Description

This node will detect models located in the `ComfyUI/models/checkpoints` folder, and it will also read models from additional paths configured in the extra_model_paths.yaml file. Sometimes, you may need to **refresh the ComfyUI interface** to allow it to read the model files from the corresponding folder.

This node specializes in loading checkpoints specifically for image-based models within video generation workflows. It efficiently retrieves and configures the necessary components from a given checkpoint, focusing on image-related aspects of the model.

## Inputs

| Field      | Data Type | Description                                                                       |
|------------|-------------|-----------------------------------------------------------------------------------|
| `ckpt_name`| COMBO[STRING] | Specifies the name of the checkpoint to load, crucial for identifying and retrieving the correct checkpoint file from a predefined list. |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| MODEL | MODEL |  |
| CLIP_VISION | CLIP_VISION |  |
| VAE | VAE |  |

**Source**: `comfy_extras/nodes_video_model.py`

**Used in 5 template(s)**
