# LatentConcat

**Category**: latent/advanced

**Also known as**: join latents, stitch latents

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/LatentConcat/en.md)

The LatentConcat node combines two latent samples along a specified dimension. It takes two latent inputs and concatenates them together along the chosen axis (x, y, or t dimension). The node automatically adjusts the batch size of the second input to match the first input before performing the concatenation operation.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| samples1 | Latent | — |  |
| samples2 | Latent | — |  |
| dim | Combo | — |  |

## Outputs

| Output | Type |
|--------|------|
| ),
            ],
        )

    @classmethod
    def execute(cls, samples1, samples2, dim) -> io.NodeOutput:
        samples_out = samples1.copy( | Latent |

**Source**: `comfy_extras/nodes_latent.py`

**Used in 1 template(s)**
