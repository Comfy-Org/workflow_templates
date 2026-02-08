# DisableNoise

**Category**: sampling/custom_sampling/noise

**Also known as**: zero noise

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/DisableNoise/en.md)

The DisableNoise node provides an empty noise configuration that can be used to disable noise generation in sampling processes. It returns a special noise object that contains no noise data, allowing other nodes to skip noise-related operations when connected to this output.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| *No input parameters* | - | - | - | This node does not require any input parameters. |

## Outputs

| Output | Type |
|--------|------|
| )]
        )

    @classmethod
    def execute(cls) -> io.NodeOutput:
        return io.NodeOutput(Noise_EmptyNoise() | Noise |

**Source**: `comfy_extras/nodes_custom_sampler.py`

**Used in 2 template(s)**
