# Canny

**Category**: image/preprocessors

**Also known as**: edge detection, outline, contour detection, line art

## Description

Extract all edge lines from photos, like using a pen to outline a photo, drawing out the contours and detail boundaries of objects.

## Working Principle

Imagine you are an artist who needs to use a pen to outline a photo. The Canny node acts like an intelligent assistant, helping you decide where to draw lines (edges) and where not to.

This process is like a screening job:

- **High threshold** is the "must draw line standard": only very obvious and clear contour lines will be drawn, such as facial contours of people and building frames
- **Low threshold** is the "definitely don't draw line standard": edges that are too weak will be ignored to avoid drawing noise and meaningless lines
- **Middle area**: edges between the two standards will be drawn together if they connect to "must draw lines", but won't be drawn if they are isolated

The final output is a black and white image, where white parts are detected edge lines and black parts are areas without edges.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| image | Image | — |  |
| low_threshold | Float | 0.4 |  |
| high_threshold | Float | 0.8 |  |

## Outputs

| Output | Type |
|--------|------|
| )],
        )

    @classmethod
    def detect_edge(cls, image, low_threshold, high_threshold):
        # Deprecated: use the V3 schema's `execute` method instead of this.
        return cls.execute(image, low_threshold, high_threshold)

    @classmethod
    def execute(cls, image, low_threshold, high_threshold) -> io.NodeOutput:
        output = canny(image.to(comfy.model_management.get_torch_device()).movedim(-1, 1), low_threshold, high_threshold)
        img_out = output[1].to(comfy.model_management.intermediate_device()).repeat(1, 3, 1, 1).movedim(1, -1)
        return io.NodeOutput(img_out | Image |

**Source**: `comfy_extras/nodes_canny.py`

**Used in 11 template(s)**
