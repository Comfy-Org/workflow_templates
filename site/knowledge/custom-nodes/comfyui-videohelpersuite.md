# ComfyUI-VideoHelperSuite

**Author**: Kosinkadink
**URL**: https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite
**Registry**: https://registry.comfy.org/nodes/comfyui-videohelpersuite
**Downloads**: 2,106,142
**Stars**: 1,483
**Templates using this**: 32

## Description

Nodes related to video workflows. Provides essential utilities for loading, combining, and inspecting video files within ComfyUI. This is the most widely used custom node pack in our workflow templates, powering the majority of video-based pipelines.

## Key Nodes

- `GetVideoComponents`: Extracts individual components (frames, audio, metadata) from a video file for downstream processing.
- `VHS_LoadVideo`: Loads a video file into the workflow, outputting frames and audio for further manipulation.
- `VHS_VideoCombine`: Combines processed frames and audio back into a video file, with options for format and codec.
- `VHS_VideoInfo`: Retrieves metadata about a video file such as frame count, resolution, frame rate, and duration.
- `VHS_BatchManager`: Manages batches of video frames for efficient processing in large video workflows.
