# DifferentialDiffusion

**Category**: _for_testing

**Display Name**: Differential Diffusion

**Also known as**: inpaint gradient, variable denoise strength

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/DifferentialDiffusion/en.md)

The Differential Diffusion node modifies the denoising process by applying a binary mask based on timestep thresholds. It creates a mask that blends between the original denoise mask and a threshold-based binary mask, allowing controlled adjustment of the diffusion process strength.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| model | Model | — |  |
| strength | Float | 1.0 |  |

## Outputs

| Output | Type |
|--------|------|
| )],
            is_experimental=True,
        )

    @classmethod
    def execute(cls, model, strength=1.0) -> io.NodeOutput:
        model = model.clone()
        model.set_model_denoise_mask_function(lambda *args, **kwargs: cls.forward(*args, **kwargs, strength=strength))
        return io.NodeOutput(model)

    @classmethod
    def forward(cls, sigma: torch.Tensor, denoise_mask: torch.Tensor, extra_options: dict, strength: float | Model |

**Source**: `comfy_extras/nodes_differential_diffusion.py`

**Used in 1 template(s)**
