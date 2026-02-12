# GrowMask

**Category**: mask

**Display Name**: Grow Mask

**Also known as**: expand mask, shrink mask

## Description

The `GrowMask` node is designed to modify the size of a given mask, either expanding or contracting it, while optionally applying a tapered effect to the corners. This functionality is crucial for dynamically adjusting mask boundaries in image processing tasks, allowing for more flexible and precise control over the area of interest.

## Inputs

| Parameter | Data Type | Description |
|-----------|-------------|-------------|
| `mask`    | MASK        | The input mask to be modified. This parameter is central to the node's operation, serving as the base upon which the mask is either expanded or contracted. |
| `expand`  | INT         | Determines the magnitude and direction of the mask modification. Positive values cause the mask to expand, while negative values lead to contraction. This parameter directly influences the final size of the mask. |
| `tapered_corners` | BOOLEAN    | A boolean flag that, when set to True, applies a tapered effect to the corners of the mask during modification. This option allows for smoother transitions and visually appealing results. |

## Outputs

| Parameter | Data Type | Description |
|-----------|-------------|-------------|
| `mask`    | MASK        | The modified mask after applying the specified expansion/contraction and optional tapered corners effect. |

**Source**: `comfy_extras/nodes_mask.py`

**Used in 1 template(s)**
