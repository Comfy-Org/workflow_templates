# JoinImageWithAlpha

**Category**: mask/compositing

**Display Name**: Join Image with Alpha

**Also known as**: add transparency, apply alpha, composite alpha, RGBA

## Description

This node is designed for compositing operations, specifically to join an image with its corresponding alpha mask to produce a single output image. It effectively combines visual content with transparency information, enabling the creation of images where certain areas are transparent or semi-transparent.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| image | Image | — |  |
| alpha | Mask | — |  |

## Outputs

| Output | Type |
|--------|------|
| )],
        )

    @classmethod
    def execute(cls, image: torch.Tensor, alpha: torch.Tensor) -> io.NodeOutput:
        batch_size = min(len(image), len(alpha))
        out_images = []

        alpha = 1.0 - resize_mask(alpha, image.shape[1:])
        for i in range(batch_size):
           out_images.append(torch.cat((image[i][:,:,:3], alpha[i].unsqueeze(2)), dim=2))

        return io.NodeOutput(torch.stack(out_images) | Image |

**Source**: `comfy_extras/nodes_compositing.py`

**Used in 1 template(s)**
