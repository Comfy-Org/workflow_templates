# WanVaceToVideo

**Category**: conditioning/video_models

**Display Name**: positive

**Also known as**: video conditioning, video control

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/WanVaceToVideo/en.md)

The WanVaceToVideo node processes video conditioning data for video generation models. It takes positive and negative conditioning inputs along with video control data and prepares latent representations for video generation. The node handles video upscaling, masking, and VAE encoding to create the appropriate conditioning structure for video models.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| positive | Conditioning | — |  |
| negative | Conditioning | — |  |
| vae | Vae | — |  |
| width | Int | 832 |  |
| height | Int | 480 |  |
| length | Int | 81 |  |
| batch_size | Int | 1 |  |
| strength | Float | 1.0 |  |
| control_video | Image | — |  |
| control_masks | Mask | — |  |
| reference_image | Image | — |  |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `positive` | CONDITIONING | Positive conditioning with video control data applied |
| `negative` | CONDITIONING | Negative conditioning with video control data applied |
| `latent` | LATENT | Empty latent tensor ready for video generation |
| `trim_latent` | INT | Number of latent frames to trim when reference image is used |

**Source**: `comfy_extras/nodes_wan.py`

**Used in 6 template(s)**
