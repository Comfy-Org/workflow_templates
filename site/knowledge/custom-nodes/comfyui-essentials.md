# ComfyUI_essentials

**Author**: Matteo (cubiq)
**URL**: https://github.com/cubiq/ComfyUI_essentials
**Registry**: https://registry.comfy.org/nodes/comfyui_essentials
**Downloads**: 1,874,070
**Stars**: 1,043
**Templates using this**: 24

## Description

Essential nodes that are weirdly missing from ComfyUI core. With few exceptions they are new features and not commodities. Provides utility nodes for image manipulation, math operations, and batch processing that fill common gaps in the default node set.

## Key Nodes

- `GetImageSize+`: Returns the width and height of an input image, useful for conditional logic and dynamic resizing.
- `BatchImagesNode`: Batches multiple images together into a single tensor for parallel processing.
- `ResizeAndPadImage`: Resizes an image to target dimensions while padding to maintain aspect ratio.
- `SimpleMath+`: Evaluates simple mathematical expressions, useful for dynamic parameter calculation within workflows.
- `ImageBatchMulti`: Combines multiple image inputs into a batch with flexible input count.
