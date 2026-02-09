# Wan22ImageToVideoLatent

**Category**: conditioning/inpaint

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/Wan22ImageToVideoLatent/en.md)

The Wan22ImageToVideoLatent node creates video latent representations from images. It generates a blank video latent space with specified dimensions and can optionally encode a starting image sequence into the beginning frames. When a start image is provided, it encodes the image into the latent space and creates a corresponding noise mask for the inpainted regions.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| vae | Vae | — |  |
| width | Int | 1280 |  |
| height | Int | 704 |  |
| length | Int | 49 |  |
| batch_size | Int | 1 |  |
| start_image | Image | — |  |

## Outputs

| Output | Type |
|--------|------|
| ),
            ],
        )

    @classmethod
    def execute(cls, vae, width, height, length, batch_size, start_image=None) -> io.NodeOutput:
        latent = torch.zeros([1, 48, ((length - 1) // 4) + 1, height // 16, width // 16], device=comfy.model_management.intermediate_device() | Latent |

**Source**: `comfy_extras/nodes_wan.py`

**Used in 1 template(s)**
