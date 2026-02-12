# ImageFromBatch

**Category**: image/batch

**Also known as**: select image, pick from batch, extract image

## Description

The `ImageFromBatch` node is designed for extracting a specific segment of images from a batch based on the provided index and length. It allows for more granular control over the batched images, enabling operations on individual or subsets of images within a larger batch.

## Inputs

| Field          | Data Type | Description                                                                           |
|----------------|-------------|---------------------------------------------------------------------------------------|
| `image`        | `IMAGE`     | The batch of images from which a segment will be extracted. This parameter is crucial for specifying the source batch. |
| `batch_index`  | `INT`       | The starting index within the batch from which the extraction begins. It determines the initial position of the segment to be extracted from the batch. |
| `length`       | `INT`       | The number of images to extract from the batch starting from the batch_index. This parameter defines the size of the segment to be extracted. |

## Outputs

| Field | Data Type | Description                                                                                   |
|-------|-------------|-----------------------------------------------------------------------------------------------|
| `image` | `IMAGE`    | The extracted segment of images from the specified batch. This output represents a subset of the original batch, determined by the batch_index and length parameters. |

**Source**: `comfy_extras/nodes_images.py`

**Used in 11 template(s)**
