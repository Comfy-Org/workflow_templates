# VAEDecodeTiled

**Category**: _for_testing

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/VAEDecodeTiled/en.md)

The VAEDecodeTiled node decodes latent representations into images using a tiled approach to handle large images efficiently. It processes the input in smaller tiles to manage memory usage while maintaining image quality. The node also supports video VAEs by processing temporal frames in chunks with overlap for smooth transitions.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| tile_size | INT | 512 |  |
| overlap | INT | 64 |  |
| temporal_size | INT | 64 | Only used for video VAEs: Amount of frames to decode at a time. |
| temporal_overlap | INT | 8 | Only used for video VAEs: Amount of frames to overlap. |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| IMAGE | IMAGE |  |

**Source**: `nodes.py`

**Used in 3 template(s)**
