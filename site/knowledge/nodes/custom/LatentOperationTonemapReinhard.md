# LatentOperationTonemapReinhard

**Category**: latent/advanced/operations

**Also known as**: hdr latent

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/LatentOperationTonemapReinhard/en.md)

The LatentOperationTonemapReinhard node applies Reinhard tonemapping to latent vectors. This technique normalizes the latent vectors and adjusts their magnitude using a statistical approach based on mean and standard deviation, with the intensity controlled by a multiplier parameter.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| multiplier | Float | 1.0 |  |

## Outputs

| Output | Type |
|--------|------|
| ),
            ],
        )

    @classmethod
    def execute(cls, multiplier) -> io.NodeOutput:
        def tonemap_reinhard(latent, **kwargs):
            latent_vector_magnitude = (torch.linalg.vector_norm(latent, dim=(1)) + 0.0000000001)[:,None]
            normalized_latent = latent / latent_vector_magnitude

            mean = torch.mean(latent_vector_magnitude, dim=(1,2,3), keepdim=True)
            std = torch.std(latent_vector_magnitude, dim=(1,2,3), keepdim=True)

            top = (std * 5 + mean) * multiplier

            #reinhard
            latent_vector_magnitude *= (1.0 / top)
            new_magnitude = latent_vector_magnitude / (latent_vector_magnitude + 1.0)
            new_magnitude *= top

            return normalized_latent * new_magnitude
        return io.NodeOutput(tonemap_reinhard | LatentOperation |

**Source**: `comfy_extras/nodes_latent.py`

**Used in 3 template(s)**
