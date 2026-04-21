# ComfyUI_IPAdapter_plus

**Author**: Matteo (cubiq)
**URL**: https://github.com/cubiq/ComfyUI_IPAdapter_plus
**Registry**: https://registry.comfy.org/nodes/comfyui_ipadapter_plus
**Downloads**: 959,299
**Stars**: 5,770
**Templates using this**: 1

## Description

ComfyUI reference implementation for the IPAdapter models. The IPAdapter models are very powerful for image conditioning — the style and composition of a reference image can be easily transferred to the generation. Think of it as a 1-image LoRA.

## Key Nodes

- `IPAdapterUnifiedLoader`: Loads an IPAdapter model and its required CLIP vision encoder in a single node, simplifying setup.
- `IPAdapterApply`: Applies the loaded IPAdapter model to condition generation based on a reference image, transferring style, composition, or subject features.
