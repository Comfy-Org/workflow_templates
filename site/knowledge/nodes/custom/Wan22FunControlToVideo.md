# Wan22FunControlToVideo

**Category**: conditioning/video_models

**Display Name**: positive

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/Wan22FunControlToVideo/en.md)

The Wan22FunControlToVideo node prepares conditioning and latent representations for video generation using the Wan video model architecture. It processes positive and negative conditioning inputs along with optional reference images and control videos to create the necessary latent space representations for video synthesis. The node handles spatial scaling and temporal dimensions to generate appropriate conditioning data for video models.

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
| ref_image | Image | — |  |
| control_video | Image | — |  |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `positive` | CONDITIONING | Modified positive conditioning with video-specific latent data |
| `negative` | CONDITIONING | Modified negative conditioning with video-specific latent data |
| `latent` | LATENT | Empty latent tensor with appropriate dimensions for video generation |

**Source**: `comfy_extras/nodes_wan.py`

**Used in 2 template(s)**
