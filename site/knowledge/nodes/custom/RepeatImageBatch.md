# RepeatImageBatch

**Category**: image/batch

**Also known as**: duplicate image, clone image

## Description

The RepeatImageBatch node is designed to replicate a given image a specified number of times, creating a batch of identical images. This functionality is useful for operations that require multiple instances of the same image, such as batch processing or data augmentation.

## Inputs

| Field   | Data Type | Description                                                                 |
|---------|-------------|-----------------------------------------------------------------------------|
| `image` | `IMAGE`     | The 'image' parameter represents the image to be replicated. It is crucial for defining the content that will be duplicated across the batch. |
| `amount`| `INT`       | The 'amount' parameter specifies the number of times the input image should be replicated. It directly influences the size of the output batch, allowing for flexible batch creation. |

## Outputs

| Field | Data Type | Description                                                              |
|-------|-------------|--------------------------------------------------------------------------|
| `image`| `IMAGE`     | The output is a batch of images, each identical to the input image, replicated according to the specified 'amount'. |

**Source**: `comfy_extras/nodes_images.py`

**Used in 3 template(s)**
