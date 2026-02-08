# MagnificImageSkinEnhancerNode

**Category**: api node/image/Magnific

**Display Name**: Magnific Image Skin Enhancer

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/MagnificImageSkinEnhancerNode/en.md)

The Magnific Image Skin Enhancer node applies specialized AI processing to portrait images to improve skin appearance. It offers three distinct modes for different enhancement goals: creative for artistic effects, faithful for preserving the original look, and flexible for targeted improvements like lighting or realism. The node uploads the image to an external API for processing and returns the enhanced result.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `image` | IMAGE | Yes | - | The portrait image to enhance. |
| `sharpen` | INT | No | 0 to 100 | Sharpening intensity level (default: 0). |
| `smart_grain` | INT | No | 0 to 100 | Smart grain intensity level (default: 2). |
| `mode` | COMBO | Yes | `"creative"`<br>`"faithful"`<br>`"flexible"` | The processing mode to use. `"creative"` is for artistic enhancement, `"faithful"` for preserving the original appearance, and `"flexible"` for targeted optimization. |
| `skin_detail` | INT | No | 0 to 100 | Skin detail enhancement level. This input is only available and required when the `mode` is set to `"faithful"` (default: 80). |
| `optimized_for` | COMBO | No | `"enhance_skin"`<br>`"improve_lighting"`<br>`"enhance_everything"`<br>`"transform_to_real"`<br>`"no_make_up"` | Enhancement optimization target. This input is only available and required when the `mode` is set to `"flexible"`. |

**Constraints:**

* The node accepts exactly one input image.
* The input image must have a minimum height and width of 160 pixels.
* The `skin_detail` parameter is only active when `mode` is set to `"faithful"`.
* The `optimized_for` parameter is only active when `mode` is set to `"flexible"`.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `image` | IMAGE | The enhanced portrait image. |

**Source**: `comfy_api_nodes/nodes_magnific.py`

**Used in 1 template(s)**
