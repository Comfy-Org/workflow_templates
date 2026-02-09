# InstructPixToPixConditioning

**Category**: conditioning/instructpix2pix

**Display Name**: positive

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/InstructPixToPixConditioning/en.md)

The InstructPixToPixConditioning node prepares conditioning data for InstructPix2Pix image editing by combining positive and negative text prompts with image data. It processes input images through a VAE encoder to create latent representations and attaches these latents to both positive and negative conditioning data. The node automatically handles image dimensions by cropping to multiples of 8 pixels for compatibility with the VAE encoding process.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| positive | Conditioning | — |  |
| negative | Conditioning | — |  |
| vae | Vae | — |  |
| pixels | Image | — |  |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `positive` | CONDITIONING | Positive conditioning data with attached latent image representation |
| `negative` | CONDITIONING | Negative conditioning data with attached latent image representation |
| `latent` | LATENT | Empty latent tensor with the same dimensions as the encoded image |

**Source**: `comfy_extras/nodes_ip2p.py`

**Used in 4 template(s)**
