# WanMoveVisualizeTracks

**Category**: conditioning/video_models

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/WanMoveVisualizeTracks/en.md)

The WanMoveVisualizeTracks node overlays motion tracking data onto a sequence of images or video frames. It draws visual representations of tracked points, including their movement paths and current positions, making the motion data visible and easier to analyze.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| images | Image | — |  |
| tracks | Tracks | — |  |
| line_resolution | Int | 24 |  |
| circle_size | Int | 12 |  |
| opacity | Float | 0.75 |  |
| line_width | Int | 16 |  |

## Outputs

| Output | Type |
|--------|------|
| ),
            ],
        )

    @classmethod
    def execute(cls, images, line_resolution, circle_size, opacity, line_width, tracks=None) -> io.NodeOutput:
        if tracks is None:
            return io.NodeOutput(images | Image |

**Source**: `comfy_extras/nodes_wanmove.py`

**Used in 2 template(s)**
