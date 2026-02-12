# InpaintModelConditioning

**Category**: conditioning/inpaint

## Description

The InpaintModelConditioning node is designed to facilitate the conditioning process for inpainting models, enabling the integration and manipulation of various conditioning inputs to tailor the inpainting output. It encompasses a broad range of functionalities, from loading specific model checkpoints and applying style or control net models, to encoding and combining conditioning elements, thereby serving as a comprehensive tool for customizing inpainting tasks.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| noise_mask | BOOLEAN | True | Add a noise mask to the latent so sampling will only happen within the mask. Might improve results or completely break things depending on the model. |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| positive | CONDITIONING |  |
| negative | CONDITIONING |  |
| latent | LATENT |  |

**Source**: `nodes.py`

**Used in 1 template(s)**
