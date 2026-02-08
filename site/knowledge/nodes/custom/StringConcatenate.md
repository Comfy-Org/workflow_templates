# StringConcatenate

**Category**: utils/string

**Display Name**: Concatenate

**Also known as**: text concat, join text, merge text, combine strings, concat, concatenate, append text, combine text, string

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/StringConcatenate/en.md)

The StringConcatenate node combines two text strings into one by joining them with a specified delimiter. It takes two input strings and a delimiter character or string, then outputs a single string where the two inputs are connected with the delimiter placed between them.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| string_a | String | — |  |
| string_b | String | — |  |
| delimiter | String | — |  |

## Outputs

| Output | Type |
|--------|------|
| ),
            ]
        )

    @classmethod
    def execute(cls, string_a, string_b, delimiter):
        return io.NodeOutput(delimiter.join((string_a, string_b)) | String |

**Source**: `comfy_extras/nodes_string.py`

**Used in 1 template(s)**
