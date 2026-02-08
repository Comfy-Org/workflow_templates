# VAEDecode

**Category**: latent

## Description

The VAEDecode node is designed for decoding latent representations into images using a specified Variational Autoencoder (VAE). It serves the purpose of generating images from compressed data representations, facilitating the reconstruction of images from their latent space encodings.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| samples | LATENT | — | The latent to be decoded. |
| vae | VAE | — | The VAE model used for decoding the latent. |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| IMAGE | IMAGE | The decoded image. |

**Source**: `nodes.py`

**Used in 62 template(s)**
