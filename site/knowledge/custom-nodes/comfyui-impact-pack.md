# ComfyUI Impact Pack

**Author**: Dr.Lt.Data
**URL**: https://github.com/ltdrdata/ComfyUI-Impact-Pack
**Registry**: https://registry.comfy.org/nodes/comfyui-impact-pack
**Downloads**: 2,055,471
**Stars**: 2,950
**Templates using this**: 1

## Description

This node pack offers various detector nodes and detailer nodes that allow you to configure a workflow that automatically enhances facial details. It also provides an iterative upscaler and segment-based processing for targeted inpainting and enhancement.

## Key Nodes

- `FaceDetailer`: Automatically detects faces in an image and re-generates them at higher detail, improving facial quality in full-scene generations.
- `DetailerForEach`: Runs a detailing pass on each detected segment individually, useful for enhancing multiple faces or objects in a single image.
- `SAMLoader`: Loads a Segment Anything Model (SAM) for use with detection-based workflows.
- `SAMDetectorCombined`: Combines SAM segmentation with a detection model to produce precise masks for detected regions.
