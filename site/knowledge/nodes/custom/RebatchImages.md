# RebatchImages

**Category**: image/batch

**Display Name**: Rebatch Images

## Description

The RebatchImages node is designed to reorganize a batch of images into a new batch configuration, adjusting the batch size as specified. This process is essential for managing and optimizing the processing of image data in batch operations, ensuring that images are grouped according to the desired batch size for efficient handling.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| images | Image | — |  |
| batch_size | Int | 1 |  |

## Outputs

| Output | Type |
|--------|------|
| is_output_list=True),
            ],
        )

    @classmethod
    def execute(cls, images, batch_size):
        batch_size = batch_size[0]

        output_list = []
        all_images = []
        for img in images:
            for i in range(img.shape[0]):
                all_images.append(img[i:i+1])

        for i in range(0, len(all_images), batch_size):
            output_list.append(torch.cat(all_images[i:i+batch_size], dim=0))

        return io.NodeOutput(output_list | Image |

**Source**: `comfy_extras/nodes_rebatch.py`

**Used in 1 template(s)**
