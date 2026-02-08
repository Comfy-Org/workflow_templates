# WanTrackToVideo

**Category**: conditioning/video_models

**Display Name**: positive

**Also known as**: motion tracking, trajectory video, point tracking, keypoint animation

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/WanTrackToVideo/en.md)

The WanTrackToVideo node converts motion tracking data into video sequences by processing track points and generating corresponding video frames. It takes tracking coordinates as input and produces video conditioning and latent representations that can be used for video generation. When no tracks are provided, it falls back to standard image-to-video conversion.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| positive | Conditioning | — |  |
| negative | Conditioning | — |  |
| vae | Vae | — |  |
| tracks | String | [] |  |
| width | Int | 832 |  |
| height | Int | 480 |  |
| length | Int | 81 |  |
| batch_size | Int | 1 |  |
| temperature | Float | 220.0 |  |
| topk | Int | 2 |  |
| start_image | Image | — |  |
| clip_vision_output | ClipVisionOutput | — |  |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `positive` | CONDITIONING | Positive conditioning with motion track information applied |
| `negative` | CONDITIONING | Negative conditioning with motion track information applied |
| `latent` | LATENT | Generated video latent representation |

**Source**: `comfy_extras/nodes_wan.py`

**Used in 1 template(s)**
