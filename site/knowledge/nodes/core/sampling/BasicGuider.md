# BasicGuider

**Category**: sampling/custom_sampling/guiders

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/BasicGuider/en.md)

The BasicGuider node creates a simple guidance mechanism for the sampling process. It takes a model and conditioning data as inputs and produces a guider object that can be used to guide the generation process during sampling. This node provides the fundamental guidance functionality needed for controlled generation.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| model | Model | — |  |
| conditioning | Conditioning | — |  |

## Outputs

| Output | Type |
|--------|------|
| )]
        )

    @classmethod
    def execute(cls, model, conditioning) -> io.NodeOutput:
        guider = Guider_Basic(model)
        guider.set_conds(conditioning)
        return io.NodeOutput(guider | Guider |

**Source**: `comfy_extras/nodes_custom_sampler.py`

**Used in 2 template(s)**
