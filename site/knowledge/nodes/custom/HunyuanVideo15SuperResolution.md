# HunyuanVideo15SuperResolution

**Display Name**: positive

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/HunyuanVideo15SuperResolution/en.md)

The HunyuanVideo15SuperResolution node prepares conditioning data for a video super-resolution process. It takes a latent representation of a video and, optionally, a starting image, and packages them along with noise augmentation and CLIP vision data into a format that can be used by a model to generate a higher-resolution output.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| positive | Conditioning | — |  |
| negative | Conditioning | — |  |
| vae | Vae | — |  |
| start_image | Image | — |  |
| clip_vision_output | ClipVisionOutput | — |  |
| latent | Latent | — |  |
| noise_augmentation | Float | 0.70 |  |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `positive` | CONDITIONING | The modified positive conditioning, now containing the concatenated latent, noise augmentation, and optional CLIP vision data. |
| `negative` | CONDITIONING | The modified negative conditioning, now containing the concatenated latent, noise augmentation, and optional CLIP vision data. |
| `latent` | LATENT | The input latent is passed through unchanged. |

**Source**: `comfy_extras/nodes_hunyuan.py`

**Used in 2 template(s)**
