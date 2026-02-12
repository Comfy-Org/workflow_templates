# WanCameraImageToVideo

**Category**: conditioning/video_models

**Display Name**: positive

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/WanCameraImageToVideo/en.md)

The WanCameraImageToVideo node converts images to video sequences by generating latent representations for video generation. It processes conditioning inputs and optional starting images to create video latents that can be used with video models. The node supports camera conditions and clip vision outputs for enhanced video generation control.

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
| camera_conditions | WanCameraEmbedding | — |  |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `positive` | CONDITIONING | Modified positive conditioning with applied camera conditions and clip vision outputs |
| `negative` | CONDITIONING | Modified negative conditioning with applied camera conditions and clip vision outputs |
| `latent` | LATENT | Generated video latent representation for use with video models |

**Source**: `comfy_extras/nodes_wan.py`

**Used in 3 template(s)**
