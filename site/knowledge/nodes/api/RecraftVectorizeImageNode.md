# RecraftVectorizeImageNode

**Category**: api node/image/Recraft

**Display Name**: Recraft Vectorize Image

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/RecraftVectorizeImageNode/en.md)

Generates SVG synchronously from an input image. This node converts raster images into vector graphics format by processing each image in the input batch and combining the results into a single SVG output.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `image` | IMAGE | Yes | - | The input image to convert to SVG format |
| `auth_token` | AUTH_TOKEN_COMFY_ORG | No | - | Authentication token for API access |
| `comfy_api_key` | API_KEY_COMFY_ORG | No | - | API key for Comfy.org services |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `SVG` | SVG | The generated vector graphics output combining all processed images |

**Source**: `comfy_api_nodes/nodes_recraft.py`

**Used in 2 template(s)**
