# comfyui_controlnet_aux

**Author**: Fannovel16
**URL**: https://github.com/Fannovel16/comfyui_controlnet_aux
**Registry**: https://registry.comfy.org/nodes/comfyui_controlnet_aux
**Downloads**: 1,691,696
**Stars**: 3,764
**Templates using this**: 4

## Description

Plug-and-play ComfyUI node sets for making ControlNet hint images. Provides preprocessor nodes that generate various types of control images (edges, depth maps, poses, line art) from input images for use with ControlNet models.

## Key Nodes

- `DWPreprocessor`: Generates DensePose/DWPose estimations for human pose detection, used as ControlNet input.
- `LineArtPreprocessor`: Extracts line art from an image for use with line art ControlNet models.
- `CannyEdgePreprocessor`: Applies Canny edge detection to produce edge maps for ControlNet conditioning.
- `DepthAnythingPreprocessor`: Generates monocular depth maps using the Depth Anything model.
- `OpenPosePreprocessor`: Detects human body, hand, and face keypoints for pose-guided generation.
