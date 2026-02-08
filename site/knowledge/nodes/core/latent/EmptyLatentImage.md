# EmptyLatentImage

**Category**: latent

## Description

The `EmptyLatentImage` node is designed to generate a blank latent space representation with specified dimensions and batch size. This node serves as a foundational step in generating or manipulating images in latent space, providing a starting point for further image synthesis or modification processes.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| width | INT | 512 | The width of the latent images in pixels. |
| height | INT | 512 | The height of the latent images in pixels. |
| batch_size | INT | 1 | The number of latent images in the batch. |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| LATENT | LATENT | The empty latent image batch. |

**Source**: `nodes.py`

**Used in 7 template(s)**
