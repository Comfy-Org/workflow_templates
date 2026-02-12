# SVD_img2vid_Conditioning

**Category**: conditioning/video_models

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/SVD_img2vid_Conditioning/en.md)

The SVD_img2vid_Conditioning node prepares conditioning data for video generation using Stable Video Diffusion. It takes an initial image and processes it through CLIP vision and VAE encoders to create positive and negative conditioning pairs, along with an empty latent space for video generation. This node sets up the necessary parameters for controlling motion, frame rate, and augmentation levels in the generated video.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| width | INT | 1024 |  |
| height | INT | 576 |  |
| video_frames | INT | 14 |  |
| motion_bucket_id | INT | 127 |  |
| fps | INT | 6 |  |
| augmentation_level | FLOAT | 0.0 |  |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| positive | CONDITIONING |  |
| negative | CONDITIONING |  |
| latent | LATENT |  |

**Source**: `comfy_extras/nodes_video_model.py`

**Used in 1 template(s)**
