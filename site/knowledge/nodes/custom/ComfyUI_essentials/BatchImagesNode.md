# BatchImagesNode

**Category**: image

**Display Name**: Batch Images

**Also known as**: batch, image batch, batch images, combine images, merge images, stack images

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/BatchImagesNode/en.md)

The Batch Images node combines multiple individual images into a single batch. It takes a variable number of image inputs and outputs them as one batched image tensor, allowing them to be processed together in subsequent nodes.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| image | Image | — |  |
| images | Autogrow | — |  |

## Outputs

| Output | Type |
|--------|------|
| )
            ]
        )

    @classmethod
    def execute(cls, images: io.Autogrow.Type) -> io.NodeOutput:
        return io.NodeOutput(batch_images(list(images.values())) | Image |

**Source**: `comfy_extras/nodes_post_processing.py`

**Used in 8 template(s)**
