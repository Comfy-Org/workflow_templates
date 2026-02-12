# VideoLinearCFGGuidance

**Category**: sampling/video_models

## Description

The VideoLinearCFGGuidance node applies a linear conditioning guidance scale to a video model, adjusting the influence of conditioned and unconditioned components over a specified range. This enables dynamic control over the generation process, allowing for fine-tuning of the model's output based on the desired level of conditioning.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| min_cfg | FLOAT | 1.0 |  |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| MODEL | MODEL |  |

**Source**: `comfy_extras/nodes_video_model.py`

**Used in 1 template(s)**
