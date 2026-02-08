# RegexReplace

**Category**: utils/string

**Display Name**: Regex Replace

**Also known as**: pattern replace, find and replace, substitution

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/RegexReplace/en.md)

The RegexReplace node finds and replaces text in strings using regular expression patterns. It allows you to search for text patterns and replace them with new text, with options to control how the pattern matching works including case sensitivity, multiline matching, and limiting the number of replacements.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| string | String | — |  |
| regex_pattern | String | — |  |
| replace | String | — |  |
| case_insensitive | Boolean | True |  |
| multiline | Boolean | False |  |
| dotall | Boolean | False |  |
| count | Int | 0 |  |

## Outputs

| Output | Type |
|--------|------|
| ),
            ]
        )

    @classmethod
    def execute(cls, string, regex_pattern, replace, case_insensitive=True, multiline=False, dotall=False, count=0):
        flags = 0

        if case_insensitive:
            flags |= re.IGNORECASE
        if multiline:
            flags |= re.MULTILINE
        if dotall:
            flags |= re.DOTALL
        result = re.sub(regex_pattern, replace, string, count=count, flags=flags)
        return io.NodeOutput(result | String |

**Source**: `comfy_extras/nodes_string.py`

**Used in 8 template(s)**
