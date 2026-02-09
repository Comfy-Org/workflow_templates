# PreviewAny

**Category**: utils

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/PreviewAny/en.md)

The PreviewAny node displays a preview of any input data type in text format. It accepts any data type as input and converts it to a readable string representation for viewing. The node automatically handles different data types including strings, numbers, booleans, and complex objects by attempting to serialize them to JSON format.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `source` | ANY | Yes | Any data type | Accepts any input data type for preview display |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| UI Text Display | TEXT | Displays the input data converted to text format in the user interface |

**Source**: `comfy_extras/nodes_preview_any.py`

**Used in 7 template(s)**
