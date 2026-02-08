# EmptySD3LatentImage

**Category**: latent/sd3

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/EmptySD3LatentImage/en.md)

The EmptySD3LatentImage node creates a blank latent image tensor specifically formatted for Stable Diffusion 3 models. It generates a tensor filled with zeros that has the correct dimensions and structure expected by SD3 pipelines. This is commonly used as a starting point for image generation workflows.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| width | Int | 1024 |  |
| height | Int | 1024 |  |
| batch_size | Int | 1 |  |

## Outputs

| Output | Type |
|--------|------|
| ),
            ],
        )

    @classmethod
    def execute(cls, width, height, batch_size=1) -> io.NodeOutput:
        latent = torch.zeros([batch_size, 16, height // 8, width // 8], device=comfy.model_management.intermediate_device() | Latent |

**Source**: `comfy_extras/nodes_sd3.py`

**Used in 16 template(s)**
