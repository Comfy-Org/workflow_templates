# WanSoundImageToVideo

**Category**: conditioning/video_models

**Display Name**: positive

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/WanSoundImageToVideo/en.md)

The WanSoundImageToVideo node generates video content from images with optional audio conditioning. It takes positive and negative conditioning prompts along with a VAE model to create video latents, and can incorporate reference images, audio encoding, control videos, and motion references to guide the video generation process.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| positive | Conditioning | — |  |
| negative | Conditioning | — |  |
| vae | Vae | — |  |
| width | Int | 832 |  |
| height | Int | 480 |  |
| length | Int | 77 |  |
| batch_size | Int | 1 |  |
| audio_encoder_output | AudioEncoderOutput | — |  |
| ref_image | Image | — |  |
| control_video | Image | — |  |
| ref_motion | Image | — |  |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `positive` | CONDITIONING | Processed positive conditioning that has been modified for video generation |
| `negative` | CONDITIONING | Processed negative conditioning that has been modified for video generation |
| `latent` | LATENT | Generated video representation in latent space that can be decoded into final video frames |

**Source**: `comfy_extras/nodes_wan.py`

**Used in 1 template(s)**
