# TextEncodeAceStepAudio

**Category**: conditioning

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/TextEncodeAceStepAudio/en.md)

The TextEncodeAceStepAudio node processes text inputs for audio conditioning by combining tags and lyrics into tokens, then encoding them with adjustable lyrics strength. It takes a CLIP model along with text descriptions and lyrics, tokenizes them together, and generates conditioning data suitable for audio generation tasks. The node allows fine-tuning the influence of lyrics through a strength parameter that controls their impact on the final output.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| clip | Clip | — |  |
| tags | String | — |  |
| lyrics | String | — |  |
| lyrics_strength | Float | 1.0 |  |

## Outputs

| Output | Type |
|--------|------|
| )],
        )

    @classmethod
    def execute(cls, clip, tags, lyrics, lyrics_strength) -> io.NodeOutput:
        tokens = clip.tokenize(tags, lyrics=lyrics)
        conditioning = clip.encode_from_tokens_scheduled(tokens | Conditioning |

**Source**: `comfy_extras/nodes_ace.py`

**Used in 3 template(s)**
