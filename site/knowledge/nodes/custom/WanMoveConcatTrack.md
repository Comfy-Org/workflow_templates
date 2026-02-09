# WanMoveConcatTrack

**Category**: conditioning/video_models

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/WanMoveConcatTrack/en.md)

The WanMoveConcatTrack node combines two sets of motion tracking data into a single, longer sequence. It works by joining the track paths and visibility masks from the input tracks along their respective dimensions. If only one track input is provided, it simply passes that data through unchanged.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| tracks_1 | Tracks | — |  |
| tracks_2 | Tracks | — |  |

## Outputs

| Output | Type |
|--------|------|
| ),
            ],
        )

    @classmethod
    def execute(cls, tracks_1=None, tracks_2=None) -> io.NodeOutput:
        if tracks_2 is None:
            return io.NodeOutput(tracks_1 | Tracks |

**Source**: `comfy_extras/nodes_wanmove.py`

**Used in 1 template(s)**
