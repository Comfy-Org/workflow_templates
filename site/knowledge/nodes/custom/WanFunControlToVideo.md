# WanFunControlToVideo

**Category**: conditioning/video_models

**Display Name**: positive

## Description

This node was added to support the Alibaba Wan Fun Control model for video generation, and was added after [this commit](https://github.com/comfyanonymous/ComfyUI/commit/3661c833bcc41b788a7c9f0e7bc48524f8ee5f82).

- **Purpose:** Prepare the conditioning information needed for video generation, using the Wan 2.1 Fun Control model.

The WanFunControlToVideo node is a ComfyUI addition designed to support Wan Fun Control models for video generation, aimed at utilizing WanFun control for video creation.

This node serves as a preparation point for essential conditioning information and initializes the center point of the latent space, guiding the subsequent video generation process using the Wan 2.1 Fun model. The node's name clearly indicates its function: it accepts various inputs and converts them into a format suitable for controlling video generation within the WanFun framework.

The node's position in the ComfyUI node hierarchy indicates that it operates in the early stages of the video generation pipeline, focusing on manipulating conditioning signals before actual sampling or decoding of video frames.

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
| control_video | Image | — |  |

## Outputs

| Parameter Name      | Data Type           | Description                                                  |
|:-------------------|:-------------------|:-------------------------------------------------------------|
| positive           | CONDITIONING       | Provides enhanced positive conditioning data, including encoded start_image and control_video. |
| negative           | CONDITIONING       | Provides negative conditioning data that has also been enhanced, containing the same concat_latent_image. |
| latent             | LATENT             | A dictionary containing an empty latent tensor with the key "samples". |

**Source**: `comfy_extras/nodes_wan.py`

**Used in 1 template(s)**
