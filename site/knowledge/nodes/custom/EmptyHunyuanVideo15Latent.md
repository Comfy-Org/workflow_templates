# EmptyHunyuanVideo15Latent

**Display Name**: Empty HunyuanVideo 1.5 Latent

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/EmptyHunyuanVideo15Latent/en.md)

This node creates an empty latent tensor specifically formatted for use with the HunyuanVideo 1.5 model. It generates a blank starting point for video generation by allocating a tensor of zeros with the correct channel count and spatial dimensions for the model's latent space.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `width` | INT | Yes | - | The width of the video frame in pixels. |
| `height` | INT | Yes | - | The height of the video frame in pixels. |
| `length` | INT | Yes | - | The number of frames in the video sequence. |
| `batch_size` | INT | No | - | The number of video samples to generate in a batch (default: 1). |

**Note:** The spatial dimensions of the generated latent tensor are calculated by dividing the input `width` and `height` by 16. The temporal dimension (frames) is calculated as `((length - 1) // 4) + 1`.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `samples` | LATENT | An empty latent tensor with dimensions suitable for the HunyuanVideo 1.5 model. The tensor has a shape of `[batch_size, 32, frames, height//16, width//16]`. |

**Source**: `comfy_extras/nodes_hunyuan.py`

**Used in 1 template(s)**
