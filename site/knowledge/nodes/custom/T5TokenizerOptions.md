# T5TokenizerOptions

**Category**: _for_testing/conditioning

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/T5TokenizerOptions/en.md)

The T5TokenizerOptions node allows you to configure tokenizer settings for various T5 model types. It sets minimum padding and minimum length parameters for multiple T5 model variants including t5xxl, pile_t5xl, t5base, mt5xl, and umt5xxl. The node takes a CLIP input and returns a modified CLIP with the specified tokenizer options applied.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| clip | Clip | — |  |
| min_padding | Int | 0 |  |
| min_length | Int | 0 |  |

## Outputs

| Output | Type |
|--------|------|
| )],
            is_experimental=True,
        )

    @classmethod
    def execute(cls, clip, min_padding, min_length) -> io.NodeOutput:
        clip = clip.clone( | Clip |

**Source**: `comfy_extras/nodes_cond.py`

**Used in 1 template(s)**
