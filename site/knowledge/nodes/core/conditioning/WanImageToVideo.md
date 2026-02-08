# WanImageToVideo

**Category**: conditioning/video_models

**Display Name**: positive

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/WanImageToVideo/en.md)

The WanImageToVideo node prepares conditioning and latent representations for video generation tasks. It creates an empty latent space for video generation and can optionally incorporate starting images and CLIP vision outputs to guide the video generation process. The node modifies both positive and negative conditioning inputs based on the provided image and vision data.

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
| clip_vision_output | ClipVisionOutput | — |  |
| start_image | Image | — |  |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `positive` | CONDITIONING | Modified positive conditioning with image and vision data incorporated |
| `negative` | CONDITIONING | Modified negative conditioning with image and vision data incorporated |
| `latent` | LATENT | Empty latent space tensor ready for video generation |

**Source**: `comfy_extras/nodes_wan.py`

**Used in 2 template(s)**
