# RecraftStyleV3DigitalIllustration

**Category**: api node/image/Recraft

**Display Name**: Recraft Style - Digital Illustration

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/RecraftStyleV3DigitalIllustration/en.md)

This node configures a style for use with the Recraft API, specifically selecting the "digital_illustration" style. It allows you to choose an optional substyle to further refine the artistic direction of the generated image.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `substyle` | STRING | No | `"digital_illustration"`<br>`"digital_illustration_anime"`<br>`"digital_illustration_cartoon"`<br>`"digital_illustration_comic"`<br>`"digital_illustration_concept_art"`<br>`"digital_illustration_fantasy"`<br>`"digital_illustration_futuristic"`<br>`"digital_illustration_graffiti"`<br>`"digital_illustration_graphic_novel"`<br>`"digital_illustration_hyperrealistic"`<br>`"digital_illustration_ink"`<br>`"digital_illustration_manga"`<br>`"digital_illustration_minimalist"`<br>`"digital_illustration_pixel_art"`<br>`"digital_illustration_pop_art"`<br>`"digital_illustration_retro"`<br>`"digital_illustration_sci_fi"`<br>`"digital_illustration_sticker"`<br>`"digital_illustration_street_art"`<br>`"digital_illustration_surreal"`<br>`"digital_illustration_vector"` | An optional substyle to specify a particular type of digital illustration. If not selected, the base "digital_illustration" style is used. |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `recraft_style` | STYLEV3 | A configured style object containing the selected "digital_illustration" style and optional substyle, ready to be passed to other Recraft API nodes. |

**Source**: `comfy_api_nodes/nodes_recraft.py`

**Used in 2 template(s)**
