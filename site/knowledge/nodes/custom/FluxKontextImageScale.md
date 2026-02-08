# FluxKontextImageScale

**Category**: advanced/conditioning/flux

## Description

This node scales the input image to an optimal size used during Flux Kontext model training using the Lanczos algorithm, based on the input image's aspect ratio. This node is particularly useful when inputting large-sized images, as oversized inputs may lead to degraded model output quality or issues such as multiple subjects appearing in the output.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| image | Image | — |  |

## Outputs

| Output | Type |
|--------|------|
| ),
            ],
        )

    @classmethod
    def execute(cls, image) -> io.NodeOutput:
        width = image.shape[2]
        height = image.shape[1]
        aspect_ratio = width / height
        _, width, height = min((abs(aspect_ratio - w / h), w, h) for w, h in PREFERED_KONTEXT_RESOLUTIONS)
        image = comfy.utils.common_upscale(image.movedim(-1, 1 | Image |

**Source**: `comfy_extras/nodes_flux.py`

**Used in 1 template(s)**
