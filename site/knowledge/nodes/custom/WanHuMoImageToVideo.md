# WanHuMoImageToVideo

**Category**: conditioning/video_models

**Display Name**: positive

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/WanHuMoImageToVideo/en.md)

The WanHuMoImageToVideo node converts images to video sequences by generating latent representations for video frames. It processes conditioning inputs and can incorporate reference images and audio embeddings to influence the video generation. The node outputs modified conditioning data and latent representations suitable for video synthesis.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| positive | Conditioning | — |  |
| negative | Conditioning | — |  |
| vae | Vae | — |  |
| width | Int | 832 |  |
| height | Int | 480 |  |
| length | Int | 97 |  |
| batch_size | Int | 1 |  |
| audio_encoder_output | AudioEncoderOutput | — |  |
| ref_image | Image | — |  |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `positive` | CONDITIONING | Modified positive conditioning with reference image and/or audio embeddings incorporated |
| `negative` | CONDITIONING | Modified negative conditioning with reference image and/or audio embeddings incorporated |
| `latent` | LATENT | Generated latent representation containing the video sequence data |

**Source**: `comfy_extras/nodes_wan.py`

**Used in 1 template(s)**
