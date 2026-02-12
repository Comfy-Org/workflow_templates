# Preview3D

**Category**: 3d

**Display Name**: Preview 3D & Animation

**Also known as**: view mesh, 3d viewer

## Description

Preview3D node is mainly used to preview 3D model outputs. This node takes two inputs: one is the `camera_info` from the Load3D node, and the other is the path to the 3D model file. The model file path must be located in the `ComfyUI/output` folder.

**Supported Formats**
Currently, this node supports multiple 3D file formats, including `.gltf`, `.glb`, `.obj`, `.fbx`, and `.stl`.

**3D Node Preferences**
Some related preferences for 3D nodes can be configured in ComfyUI's settings menu. Please refer to the following documentation for corresponding settings:
[Settings Menu](https://docs.comfy.org/interface/settings/3d)

## Inputs

| Parameter Name | Type           | Description                                  |
| -------------- | -------------- | -------------------------------------------- |
| camera_info    | LOAD3D_CAMERA  | Camera information                           |
| model_file     | LOAD3D_CAMERA  | Model file path under `ComfyUI/output/`      |

**Source**: `comfy_extras/nodes_load_3d.py`

**Used in 13 template(s)**
