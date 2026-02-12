# StringReplace

**Category**: utils/string

**Display Name**: Replace

**Also known as**: find and replace, substitute, swap text

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/StringReplace/en.md)

The StringReplace node performs text replacement operations on input strings. It searches for a specified substring within the input text and replaces all occurrences with a different substring. This node returns the modified string with all replacements applied.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| string | String | — |  |
| find | String | — |  |
| replace | String | — |  |

## Outputs

| Output | Type |
|--------|------|
| ),
            ]
        )

    @classmethod
    def execute(cls, string, find, replace):
        return io.NodeOutput(string.replace(find, replace) | String |

**Source**: `comfy_extras/nodes_string.py`

**Used in 1 template(s)**
