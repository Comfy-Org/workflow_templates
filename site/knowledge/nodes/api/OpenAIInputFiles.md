# OpenAIInputFiles

**Category**: api node/text/OpenAI

**Display Name**: OpenAI ChatGPT Input Files

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/OpenAIInputFiles/en.md)

Loads and formats input files for OpenAI API. This node prepares text and PDF files to include as context inputs for the OpenAI Chat Node. The files will be read by the OpenAI model when generating responses. Multiple input file nodes can be chained together to include multiple files in a single message.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `file` | COMBO | Yes | Multiple options available | Input files to include as context for the model. Only accepts text (.txt) and PDF (.pdf) files for now. Files must be smaller than 32MB. |
| `OPENAI_INPUT_FILES` | OPENAI_INPUT_FILES | No | N/A | An optional additional file(s) to batch together with the file loaded from this node. Allows chaining of input files so that a single message can include multiple input files. |

**File Constraints:**

- Only .txt and .pdf files are supported
- Maximum file size: 32MB
- Files are loaded from the input directory

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `OPENAI_INPUT_FILES` | OPENAI_INPUT_FILES | Formatted input files ready to be used as context for OpenAI API calls. |

**Source**: `comfy_api_nodes/nodes_openai.py`

**Used in 1 template(s)**
