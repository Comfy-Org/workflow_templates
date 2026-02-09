# HunyuanVideo15ImageToVideo

**Category**: conditioning/video_models

**Display Name**: positive

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/HunyuanVideo15ImageToVideo/en.md)

The HunyuanVideo15ImageToVideo node prepares conditioning and latent space data for video generation based on the HunyuanVideo 1.5 model. It creates an initial latent representation for a video sequence and can optionally integrate a starting image or a CLIP vision output to guide the generation process.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| positive | Conditioning | — |  |
| negative | Conditioning | — |  |
| vae | Vae | — |  |
| width | Int | 848 |  |
| height | Int | 480 |  |
| length | Int | 33 |  |
| batch_size | Int | 1 |  |
| start_image | Image | — |  |
| clip_vision_output | ClipVisionOutput | — |  |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `positive` | CONDITIONING | The modified positive conditioning, which may now include the encoded starting image or CLIP vision output. |
| `negative` | CONDITIONING | The modified negative conditioning, which may now include the encoded starting image or CLIP vision output. |
| `latent` | LATENT | An empty latent tensor with dimensions configured for the specified batch size, video length, width, and height. |

**Source**: `comfy_extras/nodes_hunyuan.py`

**Used in 1 template(s)**
