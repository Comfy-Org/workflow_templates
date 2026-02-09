# BasicScheduler

**Category**: sampling/custom_sampling/schedulers

## Description

The `BasicScheduler` node is designed to compute a sequence of sigma values for diffusion models based on the provided scheduler, model, and denoising parameters. It dynamically adjusts the total number of steps based on the denoise factor to fine-tune the diffusion process, providing precise "recipes" for different stages in advanced sampling processes that require fine control (such as multi-stage sampling).

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| model | Model | — |  |
| scheduler | Combo | — |  |
| steps | Int | 20 |  |
| denoise | Float | 1.0 |  |

## Outputs

| Output | Type |
|--------|------|
| )]
        )

    @classmethod
    def execute(cls, model, scheduler, steps, denoise) -> io.NodeOutput:
        total_steps = steps
        if denoise < 1.0:
            if denoise <= 0.0:
                return io.NodeOutput(torch.FloatTensor([]))
            total_steps = int(steps/denoise | Sigmas |

**Source**: `comfy_extras/nodes_custom_sampler.py`

**Used in 8 template(s)**
