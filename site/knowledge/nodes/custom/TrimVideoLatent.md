# TrimVideoLatent

**Category**: latent/video

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/TrimVideoLatent/en.md)

The TrimVideoLatent node removes frames from the beginning of a video latent representation. It takes a latent video sample and trims off a specified number of frames from the start, returning the remaining portion of the video. This allows you to shorten video sequences by removing the initial frames.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| samples | Latent | — |  |
| trim_amount | Int | 0 |  |

## Outputs

| Output | Type |
|--------|------|
| ),
            ],
        )

    @classmethod
    def execute(cls, samples, trim_amount) -> io.NodeOutput:
        samples_out = samples.copy( | Latent |

**Source**: `comfy_extras/nodes_wan.py`

**Used in 6 template(s)**
