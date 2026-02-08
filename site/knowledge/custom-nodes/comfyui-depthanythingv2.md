# ComfyUI-DepthAnythingV2

**Author**: Kijai
**URL**: https://github.com/kijai/ComfyUI-DepthAnythingV2
**Registry**: https://registry.comfy.org/nodes/comfyui-depthanythingv2
**Downloads**: 249,182
**Stars**: 391
**Templates using this**: 1

## Description

ComfyUI nodes to use Depth Anything V2 for monocular depth estimation. Models auto-download from HuggingFace. Depth Anything V2 provides high-quality depth maps from single images, useful for ControlNet conditioning, 3D effects, and scene understanding.

## Key Nodes

- `DepthAnything_V2`: Generates a depth map from an input image using the Depth Anything V2 model.
- `DownloadAndLoadDepthAnythingV2Model`: Downloads (if needed) and loads a Depth Anything V2 model checkpoint for use in the workflow.
