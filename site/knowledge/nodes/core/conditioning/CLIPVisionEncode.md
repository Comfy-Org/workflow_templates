# CLIPVisionEncode

**Category**: conditioning

## Description

The `CLIP Vision Encode` node is an image encoding node in ComfyUI, used to convert input images into visual feature vectors through the CLIP Vision model. This node is an important bridge connecting image and text understanding, and is widely used in various AI image generation and processing workflows.

**Node Functionality**

- **Image feature extraction**: Converts input images into high-dimensional feature vectors
- **Multimodal bridging**: Provides a foundation for joint processing of images and text
- **Conditional generation**: Provides visual conditions for image-based conditional generation

## Inputs

| Parameter Name | Data Type    | Description                                                      |
| -------------- | -----------  | --------------------------------------------------------------- |
| `clip_vision`  | CLIP_VISION  | CLIP vision model, usually loaded via the CLIPVisionLoader node |
| `image`        | IMAGE        | The input image to be encoded                                   |
| `crop`         | Dropdown     | Image cropping method, options: center (center crop), none (no crop) |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| CLIP_VISION_OUTPUT | CLIP_VISION_OUTPUT |  |

**Source**: `nodes.py`

**Used in 15 template(s)**
