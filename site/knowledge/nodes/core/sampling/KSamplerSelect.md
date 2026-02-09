# KSamplerSelect

**Category**: sampling/custom_sampling/samplers

## Description

The KSamplerSelect node is designed to select a specific sampler based on the provided sampler name. It abstracts the complexity of sampler selection, allowing users to easily switch between different sampling strategies for their tasks.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| sampler_name | Combo | — |  |

## Outputs

| Output | Type |
|--------|------|
| )]
        )

    @classmethod
    def execute(cls, sampler_name) -> io.NodeOutput:
        sampler = comfy.samplers.sampler_object(sampler_name)
        return io.NodeOutput(sampler | Sampler |

**Source**: `comfy_extras/nodes_custom_sampler.py`

**Used in 11 template(s)**
