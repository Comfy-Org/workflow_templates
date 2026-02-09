# SDTurboScheduler

**Category**: sampling/custom_sampling/schedulers

## Description

SDTurboScheduler is designed to generate a sequence of sigma values for image sampling, adjusting the sequence based on the denoise level and the number of steps specified. It leverages a specific model's sampling capabilities to produce these sigma values, which are crucial for controlling the denoising process during image generation.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| model | Model | — |  |
| steps | Int | 1 |  |
| denoise | Float | 1.0 |  |

## Outputs

| Output | Type |
|--------|------|
| )]
        )

    @classmethod
    def execute(cls, model, steps, denoise) -> io.NodeOutput:
        start_step = 10 - int(10 * denoise)
        timesteps = torch.flip(torch.arange(1, 11) * 100 - 1, (0,) | Sigmas |

**Source**: `comfy_extras/nodes_custom_sampler.py`

**Used in 1 template(s)**
