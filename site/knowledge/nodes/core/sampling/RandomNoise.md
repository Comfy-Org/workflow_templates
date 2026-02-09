# RandomNoise

**Category**: sampling/custom_sampling/noise

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/RandomNoise/en.md)

The RandomNoise node generates random noise patterns based on a seed value. It creates reproducible noise that can be used for various image processing and generation tasks. The same seed will always produce the same noise pattern, allowing for consistent results across multiple runs.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| noise_seed | Int | 0 |  |

## Outputs

| Output | Type |
|--------|------|
| )]
        )

    @classmethod
    def execute(cls, noise_seed) -> io.NodeOutput:
        return io.NodeOutput(Noise_RandomNoise(noise_seed) | Noise |

**Source**: `comfy_extras/nodes_custom_sampler.py`

**Used in 8 template(s)**
