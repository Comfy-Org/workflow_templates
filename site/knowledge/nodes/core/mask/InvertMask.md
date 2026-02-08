# InvertMask

**Category**: mask

**Also known as**: reverse mask, flip mask

## Description

The InvertMask node is designed to invert the values of a given mask, effectively flipping the masked and unmasked areas. This operation is fundamental in image processing tasks where the focus of interest needs to be switched between the foreground and the background.

## Inputs

| Parameter | Data Type | Description |
|-----------|--------------|-------------|
| `mask`    | MASK         | The 'mask' parameter represents the input mask to be inverted. It is crucial for determining the areas to be flipped in the inversion process. |

## Outputs

| Parameter | Data Type | Description |
|-----------|--------------|-------------|
| `mask`    | MASK         | The output is an inverted version of the input mask, with previously masked areas becoming unmasked and vice versa. |

**Source**: `comfy_extras/nodes_mask.py`

**Used in 2 template(s)**
