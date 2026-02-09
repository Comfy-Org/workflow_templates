# KSampler

**Category**: sampling

## Description

The KSampler works like this: it modifies the provided original latent image information based on a specific model and both positive and negative conditions.
First, it adds noise to the original image data according to the set **seed** and **denoise strength**, then inputs the preset **Model** combined with **positive** and **negative** guidance conditions to generate the image.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| model | MODEL | — | The model used for denoising the input latent. |
| seed | INT | 0 | The random seed used for creating the noise. |
| steps | INT | 20 | The number of steps used in the denoising process. |
| cfg | FLOAT | 8.0 | The Classifier-Free Guidance scale balances creativity and adherence to the prompt. Higher values result in images more closely matching the prompt however too high values will negatively impact quality. |
| positive | CONDITIONING | — | The conditioning describing the attributes you want to include in the image. |
| negative | CONDITIONING | — | The conditioning describing the attributes you want to exclude from the image. |
| latent_image | LATENT | — | The latent image to denoise. |
| denoise | FLOAT | 1.0 | The amount of denoising applied, lower values will maintain the structure of the initial image allowing for image to image sampling. |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| LATENT | LATENT | The denoised latent. |

**Source**: `nodes.py`

**Used in 53 template(s)**
