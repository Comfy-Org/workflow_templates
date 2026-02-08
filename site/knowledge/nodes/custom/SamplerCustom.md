# SamplerCustom

**Category**: sampling/custom_sampling

**Display Name**: output

## Description

The SamplerCustom node is designed to provide a flexible and customizable sampling mechanism for various applications. It enables users to select and configure different sampling strategies tailored to their specific needs, enhancing the adaptability and efficiency of the sampling process.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| model | Model | — |  |
| add_noise | Boolean | True |  |
| noise_seed | Int | 0 |  |
| cfg | Float | 8.0 |  |
| positive | Conditioning | — |  |
| negative | Conditioning | — |  |
| sampler | Sampler | — |  |
| sigmas | Sigmas | — |  |
| latent_image | Latent | — |  |

## Outputs

| Parameter | Data Type | Description |
|-----------|--------------|-------------|
| `output`  | `LATENT`     | The 'output' represents the primary result of the sampling process, containing the generated samples. |
| `denoised_output` | `LATENT` | The 'denoised_output' represents the samples after a denoising process has been applied, potentially enhancing the clarity and quality of the generated samples. |

**Source**: `comfy_extras/nodes_custom_sampler.py`

**Used in 3 template(s)**
