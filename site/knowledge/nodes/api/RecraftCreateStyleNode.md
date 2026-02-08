# RecraftCreateStyleNode

**Category**: api node/image/Recraft

**Display Name**: Recraft Create Style

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/RecraftCreateStyleNode/en.md)

This node creates a custom style for image generation by uploading reference images. You can upload between 1 and 5 images to define the new style, and the node will return a unique style ID that can be used with other Recraft nodes. The total combined file size of all uploaded images must not exceed 5 MB.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `style` | STRING | Yes | `"realistic_image"`<br>`"digital_illustration"` | The base style of the generated images. |
| `images` | IMAGE | Yes | 1 to 5 images | A set of 1 to 5 reference images used to create the custom style. |

**Note:** The total file size of all images in the `images` input must be less than 5 MB. The node will fail if this limit is exceeded.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `style_id` | STRING | The unique identifier for the newly created custom style. |

**Source**: `comfy_api_nodes/nodes_recraft.py`

**Used in 1 template(s)**
