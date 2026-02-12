# EmptyLatentHunyuan3Dv2

**Category**: latent/3d

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/EmptyLatentHunyuan3Dv2/en.md)

The EmptyLatentHunyuan3Dv2 node creates blank latent tensors specifically formatted for Hunyuan3Dv2 3D generation models. It generates empty latent spaces with the correct dimensions and structure required by the Hunyuan3Dv2 architecture, allowing you to start 3D generation workflows from scratch. The node produces latent tensors filled with zeros that serve as the foundation for subsequent 3D generation processes.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `resolution` | INT | Yes | 1 - 8192 | The resolution dimension for the latent space (default: 3072) |
| `batch_size` | INT | Yes | 1 - 4096 | The number of latent images in the batch (default: 1) |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `LATENT` | LATENT | Returns a latent tensor containing empty samples formatted for Hunyuan3Dv2 3D generation |

**Source**: `comfy_extras/nodes_hunyuan3d.py`

**Used in 4 template(s)**
