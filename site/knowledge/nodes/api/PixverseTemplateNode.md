# PixverseTemplateNode

**Category**: api node/video/PixVerse

**Display Name**: PixVerse Template

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/PixverseTemplateNode/en.md)

The PixVerse Template node allows you to select from available templates for PixVerse video generation. It converts your selected template name into the corresponding template ID that the PixVerse API requires for video creation.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `template` | STRING | Yes | Multiple options available | The template to use for PixVerse video generation. The available options correspond to predefined templates in the PixVerse system. |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `pixverse_template` | INT | The template ID corresponding to the selected template name, which can be used by other PixVerse nodes for video generation. |

**Source**: `comfy_api_nodes/nodes_pixverse.py`

**Used in 3 template(s)**
