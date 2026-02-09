# MagnificImageRelightNode

**Category**: api node/image/Magnific

**Display Name**: Magnific Image Relight

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/MagnificImageRelightNode/en.md)

The Magnific Image Relight node adjusts the lighting of an input image. It can apply stylistic lighting based on a text prompt or transfer the lighting characteristics from an optional reference image. The node offers various controls for fine-tuning the brightness, contrast, and overall mood of the final output.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `image` | IMAGE | Yes | N/A | The image to relight. Exactly one image is required. Minimum dimensions are 160x160 pixels. Aspect ratio must be between 1:3 and 3:1. |
| `prompt` | STRING | No | N/A | Descriptive guidance for lighting. Supports emphasis notation (1-1.4). Default is an empty string. |
| `light_transfer_strength` | INT | Yes | 0 to 100 | Intensity of light transfer application. Default: 100. |
| `style` | COMBO | Yes | `"standard"`<br>`"darker_but_realistic"`<br>`"clean"`<br>`"smooth"`<br>`"brighter"`<br>`"contrasted_n_hdr"`<br>`"just_composition"` | Stylistic output preference. |
| `interpolate_from_original` | BOOLEAN | Yes | N/A | Restricts generation freedom to match original more closely. Default: False. |
| `change_background` | BOOLEAN | Yes | N/A | Modifies background based on prompt/reference. Default: True. |
| `preserve_details` | BOOLEAN | Yes | N/A | Maintains texture and fine details from original. Default: True. |
| `advanced_settings` | DYNAMICCOMBO | Yes | `"disabled"`<br>`"enabled"` | Fine-tuning options for advanced lighting control. When set to `"enabled"`, additional parameters become available. |
| `reference_image` | IMAGE | No | N/A | Optional reference image to transfer lighting from. If provided, exactly one image is required. Minimum dimensions are 160x160 pixels. Aspect ratio must be between 1:3 and 3:1. |

**Note on Advanced Settings:** When `advanced_settings` is set to `"enabled"`, the following nested parameters become active:

* `whites`: Adjusts the brightest tones in the image. Range: 0 to 100. Default: 50.
* `blacks`: Adjusts the darkest tones in the image. Range: 0 to 100. Default: 50.
* `brightness`: Overall brightness adjustment. Range: 0 to 100. Default: 50.
* `contrast`: Contrast adjustment. Range: 0 to 100. Default: 50.
* `saturation`: Color saturation adjustment. Range: 0 to 100. Default: 50.
* `engine`: Processing engine selection. Options: `"automatic"`, `"balanced"`, `"cool"`, `"real"`, `"illusio"`, `"fairy"`, `"colorful_anime"`, `"hard_transform"`, `"softy"`.
* `transfer_light_a`: The intensity of light transfer. Options: `"automatic"`, `"low"`, `"medium"`, `"normal"`, `"high"`, `"high_on_faces"`.
* `transfer_light_b`: Also modifies light transfer intensity. Can be combined with the previous control for varied effects. Options: `"automatic"`, `"composition"`, `"straight"`, `"smooth_in"`, `"smooth_out"`, `"smooth_both"`, `"reverse_both"`, `"soft_in"`, `"soft_out"`, `"soft_mid"`, `"style_shift"`, `"strong_shift"`.
* `fixed_generation`: Ensures consistent output with the same settings. Default: True.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `image` | IMAGE | The relit image. |

**Source**: `comfy_api_nodes/nodes_magnific.py`

**Used in 1 template(s)**
