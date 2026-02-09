# LatentApplyOperationCFG

**Category**: latent/advanced/operations

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/LatentApplyOperationCFG/en.md)

The LatentApplyOperationCFG node applies a latent operation to modify the conditioning guidance process in a model. It works by intercepting the conditioning outputs during the classifier-free guidance (CFG) sampling process and applying the specified operation to the latent representations before they are used for generation.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| model | Model | — |  |
| operation | LatentOperation | — |  |

## Outputs

| Output | Type |
|--------|------|
| ),
            ],
        )

    @classmethod
    def execute(cls, model, operation) -> io.NodeOutput:
        m = model.clone()

        def pre_cfg_function(args | Model |

**Source**: `comfy_extras/nodes_latent.py`

**Used in 3 template(s)**
