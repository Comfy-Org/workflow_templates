# RecraftStyleV3InfiniteStyleLibrary

**Category**: api node/image/Recraft

**Display Name**: Recraft Style - Infinite Style Library

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/RecraftStyleV3InfiniteStyleLibrary/en.md)

This node allows you to select a style from Recraft's Infinite Style Library using a preexisting UUID. It retrieves the style information based on the provided style identifier and returns it for use in other Recraft nodes.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `style_id` | STRING | Yes | Any valid UUID | UUID of style from Infinite Style Library. |

**Note:** The `style_id` input cannot be empty. If an empty string is provided, the node will raise an exception.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `recraft_style` | STYLEV3 | The selected style object from Recraft's Infinite Style Library |

**Source**: `comfy_api_nodes/nodes_recraft.py`

**Used in 1 template(s)**
