# CFGGuider

**Category**: sampling/custom_sampling/guiders

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/CFGGuider/en.md)

The CFGGuider node creates a guidance system for controlling the sampling process in image generation. It takes a model along with positive and negative conditioning inputs, then applies a classifier-free guidance scale to steer the generation toward desired content while avoiding unwanted elements. This node outputs a guider object that can be used by sampling nodes to control the image generation direction.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| model | Model | — |  |
| positive | Conditioning | — |  |
| negative | Conditioning | — |  |
| cfg | Float | 8.0 |  |

## Outputs

| Output | Type |
|--------|------|
| )]
        )

    @classmethod
    def execute(cls, model, positive, negative, cfg) -> io.NodeOutput:
        guider = comfy.samplers.CFGGuider(model)
        guider.set_conds(positive, negative)
        guider.set_cfg(cfg)
        return io.NodeOutput(guider | Guider |

**Source**: `comfy_extras/nodes_custom_sampler.py`

**Used in 3 template(s)**
