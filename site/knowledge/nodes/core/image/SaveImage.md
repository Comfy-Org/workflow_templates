# SaveImage

**Category**: image

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/SaveImage/en.md)

The SaveImage node saves the images it receives to your `ComfyUI/output` directory. It saves each image as a PNG file and can embed workflow metadata, such as the prompt, into the saved file for future reference.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| images | IMAGE | — | The images to save. |
| filename_prefix | STRING | ComfyUI | The prefix for the file to save. This may include formatting information such as %date:yyyy-MM-dd% or %Empty Latent Image.width% to include values from nodes. |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `ui` | UI_RESULT | This node outputs a UI result containing a list of the saved images with their filenames and subfolders. It does not output data for connecting to other nodes. |

**Source**: `nodes.py`

**Used in 152 template(s)**
