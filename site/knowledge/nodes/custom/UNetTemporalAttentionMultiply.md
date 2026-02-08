# UNetTemporalAttentionMultiply

**Category**: _for_testing/attention_experiments

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/UNetTemporalAttentionMultiply/en.md)

The UNetTemporalAttentionMultiply node applies multiplication factors to different types of attention mechanisms in a temporal UNet model. It modifies the model by adjusting the weights of self-attention and cross-attention layers, distinguishing between structural and temporal components. This allows fine-tuning of how much influence each attention type has on the model's output.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| model | Model | — |  |
| self_structural | Float | 1.0 |  |
| self_temporal | Float | 1.0 |  |
| cross_structural | Float | 1.0 |  |
| cross_temporal | Float | 1.0 |  |

## Outputs

| Output | Type |
|--------|------|
| )],
            is_experimental=True,
        )

    @classmethod
    def execute(cls, model, self_structural, self_temporal, cross_structural, cross_temporal) -> io.NodeOutput:
        m = model.clone()
        sd = model.model_state_dict( | Model |

**Source**: `comfy_extras/nodes_attention_multiply.py`

**Used in 2 template(s)**
