# ControlNetApplyAdvanced

**Category**: conditioning/controlnet

## Description

This node applies advanced control net transformations to conditioning data based on an image and a control net model. It allows for fine-tuned adjustments of the control net's influence over the generated content, enabling more precise and varied modifications to the conditioning.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| strength | FLOAT | 1.0 |  |
| start_percent | FLOAT | 0.0 |  |
| end_percent | FLOAT | 1.0 |  |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| positive | CONDITIONING |  |
| negative | CONDITIONING |  |

**Source**: `nodes.py`

**Used in 3 template(s)**
