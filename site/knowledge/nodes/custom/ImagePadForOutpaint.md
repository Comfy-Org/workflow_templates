# ImagePadForOutpaint

**Category**: image

## Description

This node is designed for preparing images for the outpainting process by adding padding around them. It adjusts the image dimensions to ensure compatibility with outpainting algorithms, facilitating the generation of extended image areas beyond the original boundaries.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| left | INT | 0 |  |
| top | INT | 0 |  |
| right | INT | 0 |  |
| bottom | INT | 0 |  |
| feathering | INT | 40 |  |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| IMAGE | IMAGE |  |
| MASK | MASK |  |

**Source**: `nodes.py`

**Used in 4 template(s)**
