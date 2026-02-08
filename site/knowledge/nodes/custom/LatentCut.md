# LatentCut

**Category**: latent/advanced

**Also known as**: crop latent, slice latent, extract region

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/LatentCut/en.md)

The LatentCut node extracts a specific section from latent samples along a chosen dimension. It allows you to cut out a portion of the latent representation by specifying the dimension (x, y, or t), starting position, and amount to extract. The node handles both positive and negative indexing and automatically adjusts the extraction amount to stay within the available bounds.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| samples | Latent | — |  |
| dim | Combo | — |  |
| index | Int | 0 |  |
| amount | Int | 1 |  |

## Outputs

| Output | Type |
|--------|------|
| ),
            ],
        )

    @classmethod
    def execute(cls, samples, dim, index, amount) -> io.NodeOutput:
        samples_out = samples.copy( | Latent |

**Source**: `comfy_extras/nodes_latent.py`

**Used in 1 template(s)**
