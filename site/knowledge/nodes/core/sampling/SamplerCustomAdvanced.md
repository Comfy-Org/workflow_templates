# SamplerCustomAdvanced

**Category**: sampling/custom_sampling

**Display Name**: output

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/SamplerCustomAdvanced/en.md)

The SamplerCustomAdvanced node performs advanced latent space sampling using custom noise, guidance, and sampling configurations. It processes a latent image through a guided sampling process with customizable noise generation and sigma schedules, producing both the final sampled output and a denoised version when available.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| noise | Noise | — |  |
| guider | Guider | — |  |
| sampler | Sampler | — |  |
| sigmas | Sigmas | — |  |
| latent_image | Latent | — |  |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | LATENT | The final sampled latent representation after completing the sampling process |
| `denoised_output` | LATENT | A denoised version of the output when available, otherwise returns the same as the output |

**Source**: `comfy_extras/nodes_custom_sampler.py`

**Used in 8 template(s)**
