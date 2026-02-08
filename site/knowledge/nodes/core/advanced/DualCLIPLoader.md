# DualCLIPLoader

**Category**: advanced/loaders

## Description

The DualCLIPLoader node is designed for loading two CLIP models simultaneously, facilitating operations that require the integration or comparison of features from both models.

This node will detect models located in the `ComfyUI/models/text_encoders` folder.

## Inputs

| Parameter    | Comfy dtype     | Description                                                                                                                                                                                     |
| ------------ | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clip_name1` | COMBO[STRING] | Specifies the name of the first CLIP model to be loaded. This parameter is crucial for identifying and retrieving the correct model from a predefined list of available CLIP models.            |
| `clip_name2` | COMBO[STRING] | Specifies the name of the second CLIP model to be loaded. This parameter enables the loading of a second distinct CLIP model for comparative or integrative analysis alongside the first model. |
| `type`       | `option`        | Choose from "sdxl", "sd3", "flux" to adapt to different models.                                                                                                                                 |

* The order of loading does not affect the output effect

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| CLIP | CLIP |  |

**Source**: `nodes.py`

**Used in 11 template(s)**
