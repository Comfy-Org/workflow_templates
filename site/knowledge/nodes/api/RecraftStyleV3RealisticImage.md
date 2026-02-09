# RecraftStyleV3RealisticImage

**Category**: api node/image/Recraft

**Display Name**: Recraft Style - Realistic Image

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/RecraftStyleV3RealisticImage/en.md)

This node creates a realistic image style configuration for use with Recraft's API. It allows you to select the realistic_image style and choose from various substyle options to customize the output appearance.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `substyle` | STRING | Yes | Multiple options available | The specific substyle to apply to the realistic_image style. If set to "None", no substyle will be applied. |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `recraft_style` | STYLEV3 | Returns a Recraft style configuration object containing the realistic_image style and selected substyle settings. |

**Source**: `comfy_api_nodes/nodes_recraft.py`

**Used in 2 template(s)**
