# ComfyUI-segment-anything-2

**Author**: Kijai
**URL**: https://github.com/kijai/ComfyUI-segment-anything-2
**Registry**: https://registry.comfy.org/nodes/comfyui-segment-anything-2
**Downloads**: 205,905
**Stars**: 1,165
**Templates using this**: 1

## Description

Nodes to use Meta's Segment Anything 2 (SAM2) for image or video segmentation. SAM2 extends the original SAM with video support, enabling consistent object segmentation across video frames with temporal awareness.

## Key Nodes

- `Sam2Segmentation`: Segments objects in an image or video frame using the SAM2 model, producing precise masks based on point prompts, box prompts, or automatic detection.
- `DownloadAndLoadSAM2Model`: Downloads (if needed) and loads a SAM2 model checkpoint for use in the segmentation workflow.
