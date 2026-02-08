# ResizeImageMaskNode

**Category**: transform

**Display Name**: Resize Image/Mask

**Also known as**: resize, resize image, resize mask, scale, scale image, scale mask, image resize, change size, dimensions, shrink, enlarge

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/ResizeImageMaskNode/en.md)

The Resize Image/Mask node provides multiple methods to change the dimensions of an input image or mask. It can scale by a multiplier, set specific dimensions, match the size of another input, or adjust based on pixel count, using various interpolation methods for quality.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| crop | Combo | center | How to handle aspect ratio mismatch: 'disabled' stretches to fit, 'center' crops to maintain aspect ratio. |
| input | MatchType | — |  |
| resize_type | DynamicCombo | 512 | Select how to resize: by exact dimensions, scale factor, matching another image, etc. |
| height | Int | 512 | Target height in pixels. Set to 0 to auto-calculate from width while preserving aspect ratio. |
| multiplier | Float | 1.00 |  |
| longer_size | Int | 512 | The longer edge will be resized to this value. Aspect ratio is preserved. |
| shorter_size | Int | 512 | The shorter edge will be resized to this value. Aspect ratio is preserved. |
| width | Int | 512 | Target width in pixels. Height auto-adjusts to preserve aspect ratio. |
| height | Int | 512 | Target height in pixels. Width auto-adjusts to preserve aspect ratio. |
| megapixels | Float | 1.0 |  |
| match | MultiType | — | Resize input to match the dimensions of this reference image or mask. |
| multiple | Int | 8 |  |
| scale_method | Combo | area | Interpolation algorithm. 'area' is best for downscaling, 'lanczos' for upscaling, 'nearest-exact' for pixel art. |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `resized` | IMAGE or MASK | The resized image or mask, matching the data type of the input. |

**Source**: `comfy_extras/nodes_post_processing.py`

**Used in 5 template(s)**
