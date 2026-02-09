# WanFirstLastFrameToVideo

**Category**: conditioning/video_models

**Display Name**: positive

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/WanFirstLastFrameToVideo/en.md)

The WanFirstLastFrameToVideo node creates video conditioning by combining start and end frames with text prompts. It generates a latent representation for video generation by encoding the first and last frames, applying masks to guide the generation process, and incorporating CLIP vision features when available. This node prepares both positive and negative conditioning for video models to generate coherent sequences between specified start and end points.

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
| clip_vision_start_image | ClipVisionOutput | — |  |
| clip_vision_end_image | ClipVisionOutput | — |  |
| start_image | Image | — |  |
| end_image | Image | — |  |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `positive` | CONDITIONING | Positive conditioning with applied video frame encoding and CLIP vision features |
| `negative` | CONDITIONING | Negative conditioning with applied video frame encoding and CLIP vision features |
| `latent` | LATENT | Empty latent tensor with dimensions matching the specified video parameters |

**Source**: `comfy_extras/nodes_wan.py`

**Used in 2 template(s)**
