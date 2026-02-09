# LumaConceptsNode

**Category**: api node/video/Luma

**Display Name**: Luma Concepts

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/LumaConceptsNode/en.md)

Holds one or more Camera Concepts for use with Luma Text to Video and Luma Image to Video nodes. This node allows you to select up to four camera concepts and optionally combine them with existing concept chains.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `concept1` | STRING | Yes | Multiple options available<br>Includes "None" option | First camera concept selection from available Luma concepts |
| `concept2` | STRING | Yes | Multiple options available<br>Includes "None" option | Second camera concept selection from available Luma concepts |
| `concept3` | STRING | Yes | Multiple options available<br>Includes "None" option | Third camera concept selection from available Luma concepts |
| `concept4` | STRING | Yes | Multiple options available<br>Includes "None" option | Fourth camera concept selection from available Luma concepts |
| `luma_concepts` | LUMA_CONCEPTS | No | N/A | Optional Camera Concepts to add to the ones chosen here |

**Note:** All concept parameters (`concept1` through `concept4`) can be set to "None" if you don't want to use all four concept slots. The node will merge any provided `luma_concepts` with the selected concepts to create a combined concept chain.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `luma_concepts` | LUMA_CONCEPTS | Combined camera concept chain containing all selected concepts |

**Source**: `comfy_api_nodes/nodes_luma.py`

**Used in 2 template(s)**
