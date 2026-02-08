# SolidMask

**Category**: mask

## Description

The SolidMask node generates a uniform mask with a specified value across its entire area. It's designed to create masks of specific dimensions and intensity, useful in various image processing and masking tasks.

## Inputs

| Parameter | Data Type | Description |
|-----------|-------------|-------------|
| `value`   | FLOAT       | Specifies the intensity value of the mask, affecting its overall appearance and utility in subsequent operations. |
| `width`   | INT         | Determines the width of the generated mask, directly influencing its size and aspect ratio. |
| `height`  | INT         | Sets the height of the generated mask, affecting its size and aspect ratio. |

## Outputs

| Parameter | Data Type | Description |
|-----------|-------------|-------------|
| `mask`    | MASK        | Outputs a uniform mask with the specified dimensions and value. |

**Source**: `comfy_extras/nodes_mask.py`

**Used in 1 template(s)**
