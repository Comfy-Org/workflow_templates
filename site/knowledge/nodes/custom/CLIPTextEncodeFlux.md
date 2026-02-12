# CLIPTextEncodeFlux

**Category**: advanced/conditioning/flux

## Description

`CLIPTextEncodeFlux` is an advanced text encoding node in ComfyUI, specifically designed for the Flux architecture. It uses a dual-encoder mechanism (CLIP-L and T5XXL) to process both structured keywords and detailed natural language descriptions, providing the Flux model with more accurate and comprehensive text understanding for improved text-to-image generation quality.

This node is based on a dual-encoder collaboration mechanism:

1. The `clip_l` input is processed by the CLIP-L encoder, extracting style, theme, and other keyword features—ideal for concise descriptions.
2. The `t5xxl` input is processed by the T5XXL encoder, which excels at understanding complex and detailed natural language scene descriptions.
3. The outputs from both encoders are fused, and combined with the `guidance` parameter to generate unified conditioning embeddings (`CONDITIONING`) for downstream Flux sampler nodes, controlling how closely the generated content matches the text description.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| clip | Clip | — |  |
| clip_l | String | — |  |
| t5xxl | String | — |  |
| guidance | Float | 3.5 |  |

## Outputs

| Output | Type |
|--------|------|
| ),
            ],
        )

    @classmethod
    def execute(cls, clip, clip_l, t5xxl, guidance) -> io.NodeOutput:
        tokens = clip.tokenize(clip_l | Conditioning |

**Source**: `comfy_extras/nodes_flux.py`

**Used in 2 template(s)**
