# ComfyUI_InstantID

**Author**: Matteo (cubiq)
**URL**: https://github.com/cubiq/ComfyUI_InstantID
**Registry**: https://registry.comfy.org/nodes/comfyui_instantid
**Downloads**: 259,261
**Stars**: 1,794
**Templates using this**: 1

## Description

Native InstantID support for ComfyUI. InstantID enables zero-shot identity-preserving generation — given a single reference face image, it can generate new images that maintain the identity of the person without any fine-tuning.

## Key Nodes

- `InstantIDFaceAnalysis`: Analyzes a reference face image and extracts facial embeddings for identity preservation during generation.
- `ApplyInstantID`: Applies the extracted identity embeddings to condition the generation pipeline, ensuring the output preserves the facial identity from the reference image.
