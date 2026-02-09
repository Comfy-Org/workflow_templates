# GeminiInputFiles

**Category**: api node/text/Gemini

**Display Name**: Gemini Input Files

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/GeminiInputFiles/en.md)

Loads and formats input files for use with the Gemini API. This node allows users to include text (.txt) and PDF (.pdf) files as input context for the Gemini model. Files are converted to the appropriate format required by the API and can be chained together to include multiple files in a single request.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `file` | COMBO | Yes | Multiple options available | Input files to include as context for the model. Only accepts text (.txt) and PDF (.pdf) files for now. Files must be smaller than the maximum input file size limit. |
| `GEMINI_INPUT_FILES` | GEMINI_INPUT_FILES | No | N/A | An optional additional file(s) to batch together with the file loaded from this node. Allows chaining of input files so that a single message can include multiple input files. |

**Note:** The `file` parameter only displays text (.txt) and PDF (.pdf) files that are smaller than the maximum input file size limit. Files are automatically filtered and sorted by name.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `GEMINI_INPUT_FILES` | GEMINI_INPUT_FILES | Formatted file data ready for use with Gemini LLM nodes, containing the loaded file content in the appropriate API format. |

**Source**: `comfy_api_nodes/nodes_gemini.py`

**Used in 1 template(s)**
