# VAEDecodeHunyuan3D

**Category**: latent/3d

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/VAEDecodeHunyuan3D/en.md)

The VAEDecodeHunyuan3D node converts latent representations into 3D voxel data using a VAE decoder. It processes the latent samples through the VAE model with configurable chunking and resolution settings to generate volumetric data suitable for 3D applications.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `samples` | LATENT | Yes | - | The latent representation to be decoded into 3D voxel data |
| `vae` | VAE | Yes | - | The VAE model used for decoding the latent samples |
| `num_chunks` | INT | Yes | 1000-500000 | The number of chunks to split the processing into for memory management (default: 8000) |
| `octree_resolution` | INT | Yes | 16-512 | The resolution of the octree structure used for 3D voxel generation (default: 256) |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `voxels` | VOXEL | The generated 3D voxel data from the decoded latent representation |

**Source**: `comfy_extras/nodes_hunyuan3d.py`

**Used in 4 template(s)**
