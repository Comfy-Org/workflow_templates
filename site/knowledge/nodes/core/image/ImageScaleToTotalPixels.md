# ImageScaleToTotalPixels

**Category**: image/upscaling

## Description

The ImageScaleToTotalPixels node is designed for resizing images to a specified total number of pixels while maintaining the aspect ratio. It provides various methods for upscaling the image to achieve the desired pixel count.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| image | Image | — |  |
| upscale_method | Combo | — |  |
| megapixels | Float | 1.0 |  |
| resolution_steps | Int | 1 |  |

## Outputs

| Output | Type |
|--------|------|
| ),
            ],
        )

    @classmethod
    def execute(cls, image, upscale_method, megapixels, resolution_steps) -> io.NodeOutput:
        samples = image.movedim(-1,1)
        total = megapixels * 1024 * 1024

        scale_by = math.sqrt(total / (samples.shape[3] * samples.shape[2]))
        width = round(samples.shape[3] * scale_by / resolution_steps) * resolution_steps
        height = round(samples.shape[2] * scale_by / resolution_steps) * resolution_steps

        s = comfy.utils.common_upscale(samples, int(width), int(height | Image |

**Source**: `comfy_extras/nodes_post_processing.py`

**Used in 7 template(s)**
