# LumaReferenceNode

**Category**: api node/image/Luma

**Display Name**: Luma Reference

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/LumaReferenceNode/en.md)

This node holds an image and weight value for use with the Luma Generate Image node. It creates a reference chain that can be passed to other Luma nodes to influence image generation. The node can either start a new reference chain or add to an existing one.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `image` | IMAGE | Yes | - | Image to use as reference. |
| `weight` | FLOAT | Yes | 0.0 - 1.0 | Weight of image reference (default: 1.0). |
| `luma_ref` | LUMA_REF | No | - | Optional existing Luma reference chain to add to. |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `luma_ref` | LUMA_REF | The Luma reference chain containing the image and weight. |

**Source**: `comfy_api_nodes/nodes_luma.py`

**Used in 1 template(s)**
