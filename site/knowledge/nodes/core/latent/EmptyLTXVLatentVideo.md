# EmptyLTXVLatentVideo

**Category**: latent/video/ltxv

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/EmptyLTXVLatentVideo/en.md)

The EmptyLTXVLatentVideo node creates an empty latent tensor for video processing. It generates a blank starting point with specified dimensions that can be used as input for video generation workflows. The node produces a zero-filled latent representation with the configured width, height, length, and batch size.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| width | Int | 768 |  |
| height | Int | 512 |  |
| length | Int | 97 |  |
| batch_size | Int | 1 |  |

## Outputs

| Output | Type |
|--------|------|
| ),
            ],
        )

    @classmethod
    def execute(cls, width, height, length, batch_size=1) -> io.NodeOutput:
        latent = torch.zeros([batch_size, 128, ((length - 1) // 8) + 1, height // 32, width // 32], device=comfy.model_management.intermediate_device() | Latent |

**Source**: `comfy_extras/nodes_lt.py`

**Used in 1 template(s)**
