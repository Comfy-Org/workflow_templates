# WanInfiniteTalkToVideo

**Category**: conditioning/video_models

**Display Name**: model

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/WanInfiniteTalkToVideo/en.md)

The WanInfiniteTalkToVideo node generates video sequences from audio input. It uses a video diffusion model, conditioned on audio features extracted from one or two speakers, to produce a latent representation of a talking head video. The node can generate a new sequence or extend an existing one using previous frames for motion context.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| mode | DynamicCombo | — |  |
| audio_encoder_output_2 | AudioEncoderOutput | — |  |
| mask_1 | Mask | — | Mask for the first speaker, required if using two audio inputs. |
| mask_2 | Mask | — | Mask for the second speaker, required if using two audio inputs. |
| model | Model | — |  |
| model_patch | ModelPatch | — |  |
| positive | Conditioning | — |  |
| negative | Conditioning | — |  |
| vae | Vae | — |  |
| width | Int | 832 |  |
| height | Int | 480 |  |
| length | Int | 81 |  |
| clip_vision_output | ClipVisionOutput | — |  |
| start_image | Image | — |  |
| audio_encoder_output_1 | AudioEncoderOutput | — |  |
| motion_frame_count | Int | 9 | Number of previous frames to use as motion context. |
| audio_scale | Float | 1.0 |  |
| previous_frames | Image | — |  |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `model` | MODEL | The patched model with audio conditioning applied. |
| `positive` | CONDITIONING | The positive conditioning, potentially modified with additional context (e.g., start image, CLIP vision). |
| `negative` | CONDITIONING | The negative conditioning, potentially modified with additional context. |
| `latent` | LATENT | The generated video sequence in latent space. |
| `trim_image` | INT | The number of frames from the start of the motion context that should be trimmed when extending a sequence. |

**Source**: `comfy_extras/nodes_wan.py`

**Used in 1 template(s)**
