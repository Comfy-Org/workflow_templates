# OpenAIChatConfig

**Category**: api node/text/OpenAI

**Display Name**: OpenAI ChatGPT Advanced Options

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/OpenAIChatConfig/en.md)

The OpenAIChatConfig node allows setting additional configuration options for the OpenAI Chat Node. It provides advanced settings that control how the model generates responses, including truncation behavior, output length limits, and custom instructions.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `truncation` | COMBO | Yes | `"auto"`<br>`"disabled"` | The truncation strategy to use for the model response. auto: If the context of this response and previous ones exceeds the model's context window size, the model will truncate the response to fit the context window by dropping input items in the middle of the conversation.disabled: If a model response will exceed the context window size for a model, the request will fail with a 400 error (default: "auto") |
| `max_output_tokens` | INT | No | 16-16384 | An upper bound for the number of tokens that can be generated for a response, including visible output tokens (default: 4096) |
| `instructions` | STRING | No | - | Additional instructions for the model response (multiline input supported) |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `OPENAI_CHAT_CONFIG` | OPENAI_CHAT_CONFIG | Configuration object containing the specified settings for use with OpenAI Chat Nodes |

**Source**: `comfy_api_nodes/nodes_openai.py`

**Used in 1 template(s)**
