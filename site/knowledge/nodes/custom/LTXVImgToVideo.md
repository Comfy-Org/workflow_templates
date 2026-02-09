# LTXVImgToVideo

**Category**: conditioning/video_models

**Display Name**: positive

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/LTXVImgToVideo/en.md)

The LTXVImgToVideo node converts an input image into a video latent representation for video generation models. It takes a single image and extends it into a sequence of frames using the VAE encoder, then applies conditioning with strength control to determine how much of the original image content is preserved versus modified during video generation.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| positive | Conditioning | — |  |
| negative | Conditioning | — |  |
| vae | Vae | — |  |
| image | Image | — |  |
| width | Int | 768 |  |
| height | Int | 512 |  |
| length | Int | 97 |  |
| batch_size | Int | 1 |  |
| strength | Float | 1.0 |  |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `positive` | CONDITIONING | Processed positive conditioning with video frame masking applied |
| `negative` | CONDITIONING | Processed negative conditioning with video frame masking applied |
| `latent` | LATENT | Video latent representation containing the encoded frames and noise mask for video generation |

**Source**: `comfy_extras/nodes_lt.py`

**Used in 1 template(s)**
