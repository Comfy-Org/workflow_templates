# RecraftColorRGB

**Category**: api node/image/Recraft

**Display Name**: Recraft Color RGB

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/RecraftColorRGB/en.md)

Create Recraft Color by choosing specific RGB values. This node allows you to define a color by specifying individual red, green, and blue values, which are then converted into a Recraft color format that can be used in other Recraft operations.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `r` | INT | Yes | 0-255 | Red value of color (default: 0) |
| `g` | INT | Yes | 0-255 | Green value of color (default: 0) |
| `b` | INT | Yes | 0-255 | Blue value of color (default: 0) |
| `recraft_color` | COLOR | No | - | Optional existing Recraft color to extend |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `recraft_color` | COLOR | The created Recraft color object containing the specified RGB values |

**Source**: `comfy_api_nodes/nodes_recraft.py`

**Used in 3 template(s)**
