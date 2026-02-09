# DualCFGGuider

**Category**: sampling/custom_sampling/guiders

**Also known as**: dual prompt guidance

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/DualCFGGuider/en.md)

The DualCFGGuider node creates a guidance system for dual classifier-free guidance sampling. It combines two positive conditioning inputs with one negative conditioning input, applying different guidance scales to each conditioning pair to control the influence of each prompt on the generated output.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| model | Model | — |  |
| cond1 | Conditioning | — |  |
| cond2 | Conditioning | — |  |
| negative | Conditioning | — |  |
| cfg_conds | Float | 8.0 |  |
| cfg_cond2_negative | Float | 8.0 |  |
| style | Combo | — |  |

## Outputs

| Output | Type |
|--------|------|
| )]
        )

    @classmethod
    def execute(cls, model, cond1, cond2, negative, cfg_conds, cfg_cond2_negative, style) -> io.NodeOutput:
        guider = Guider_DualCFG(model)
        guider.set_conds(cond1, cond2, negative | Guider |

**Source**: `comfy_extras/nodes_custom_sampler.py`

**Used in 3 template(s)**
