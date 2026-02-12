# HunyuanVideo15LatentUpscaleWithModel

**Category**: latent

**Display Name**: Hunyuan Video 15 Latent Upscale With Model

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/HunyuanVideo15LatentUpscaleWithModel/en.md)

The Hunyuan Video 15 Latent Upscale With Model node increases the resolution of a latent image representation. It first upscales the latent samples to a specified size using a chosen interpolation method, then refines the upscaled result using a specialized Hunyuan Video 1.5 upscale model to improve quality.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| model | LatentUpscaleModel | — |  |
| samples | Latent | — |  |
| upscale_method | Combo | bilinear |  |
| width | Int | 1280 |  |
| height | Int | 720 |  |
| crop | Combo | — |  |

## Outputs

| Output | Type |
|--------|------|
| ),
            ],
        )

    @classmethod
    def execute(cls, model, samples, upscale_method, width, height, crop) -> io.NodeOutput:
        if width == 0 and height == 0:
            return io.NodeOutput(samples)
        else:
            if width == 0:
                height = max(64, height | Latent |

**Source**: `comfy_extras/nodes_hunyuan.py`

**Used in 2 template(s)**
