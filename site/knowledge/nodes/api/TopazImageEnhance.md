# TopazImageEnhance

**Category**: api node/image/Topaz

**Display Name**: Topaz Image Enhance

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/TopazImageEnhance/en.md)

The Topaz Image Enhance node provides industry-standard upscaling and image enhancement. It processes a single input image using a cloud-based AI model to improve quality, detail, and resolution. The node offers fine-grained control over the enhancement process, including options for creative guidance, subject focus, and facial preservation.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model` | COMBO | Yes | `"Reimagine"` | The AI model to use for image enhancement. |
| `image` | IMAGE | Yes | - | The input image to be enhanced. Only one image is supported. |
| `prompt` | STRING | No | - | An optional text prompt for creative upscaling guidance (default: empty). |
| `subject_detection` | COMBO | No | `"All"`<br>`"Foreground"`<br>`"Background"` | Controls which part of the image the enhancement focuses on (default: "All"). |
| `face_enhancement` | BOOLEAN | No | - | Enable to enhance faces if they are present in the image (default: True). |
| `face_enhancement_creativity` | FLOAT | No | 0.0 - 1.0 | Sets the creativity level for face enhancement (default: 0.0). |
| `face_enhancement_strength` | FLOAT | No | 0.0 - 1.0 | Controls how sharp enhanced faces are relative to the background (default: 1.0). |
| `crop_to_fill` | BOOLEAN | No | - | By default, the image is letterboxed when the output aspect ratio differs. Enable to crop the image to fill the output dimensions instead (default: False). |
| `output_width` | INT | No | 0 - 32000 | The desired width of the output image. A value of 0 means it will be calculated automatically, usually based on the original size or the `output_height` if specified (default: 0). |
| `output_height` | INT | No | 0 - 32000 | The desired height of the output image. A value of 0 means it will be calculated automatically, usually based on the original size or the `output_width` if specified (default: 0). |
| `creativity` | INT | No | 1 - 9 | Controls the overall creativity level of the enhancement (default: 3). |
| `face_preservation` | BOOLEAN | No | - | Preserve the facial identity of subjects in the image (default: True). |
| `color_preservation` | BOOLEAN | No | - | Preserve the original colors of the input image (default: True). |

**Note:** This node can only process a single input image. Providing a batch of multiple images will result in an error.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `image` | IMAGE | The enhanced output image. |

**Source**: `comfy_api_nodes/nodes_topaz.py`

**Used in 3 template(s)**
