# LTXVScheduler

**Category**: sampling/custom_sampling/schedulers

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/LTXVScheduler/en.md)

The LTXVScheduler node generates sigma values for custom sampling processes. It calculates noise schedule parameters based on the number of tokens in the input latent and applies a sigmoid transformation to create the sampling schedule. The node can optionally stretch the resulting sigmas to match a specified terminal value.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| steps | Int | 20 |  |
| max_shift | Float | 2.05 |  |
| base_shift | Float | 0.95 |  |
| latent | Latent | — |  |

## Outputs

| Output | Type |
|--------|------|
| ),
            ],
        )

    @classmethod
    def execute(cls, steps, max_shift, base_shift, stretch, terminal, latent=None | Sigmas |

**Source**: `comfy_extras/nodes_lt.py`

**Used in 2 template(s)**
