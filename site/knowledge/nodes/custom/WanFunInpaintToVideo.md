# WanFunInpaintToVideo

**Category**: conditioning/video_models

**Display Name**: positive

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/WanFunInpaintToVideo/en.md)

The WanFunInpaintToVideo node creates video sequences by inpainting between start and end images. It takes positive and negative conditioning along with optional frame images to generate video latents. The node handles video generation with configurable dimensions and length parameters.

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
| end_image | Image | — |  |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `positive` | CONDITIONING | Processed positive conditioning output |
| `negative` | CONDITIONING | Processed negative conditioning output |
| `latent` | LATENT | Generated video latent representation |

**Source**: `comfy_extras/nodes_wan.py`

**Used in 3 template(s)**
