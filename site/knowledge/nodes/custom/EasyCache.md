# EasyCache

**Category**: advanced/debug/model

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/EasyCache/en.md)

The EasyCache node implements a native caching system for models to improve performance by reusing previously computed steps during the sampling process. It adds EasyCache functionality to a model with configurable thresholds for when to start and stop using the cache during the sampling timeline.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| model | Model | — | The model to add EasyCache to. |
| reuse_threshold | Float | 0.2 | The threshold for reusing cached steps. |
| start_percent | Float | 0.15 | The relative sampling step to begin use of EasyCache. |
| end_percent | Float | 0.95 | The relative sampling step to end use of EasyCache. |
| verbose | Boolean | False | Whether to log verbose information. |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `model` | MODEL | The model with EasyCache functionality added. |

**Source**: `comfy_extras/nodes_easycache.py`

**Used in 2 template(s)**
