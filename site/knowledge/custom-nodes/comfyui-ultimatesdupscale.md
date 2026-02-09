# ComfyUI_UltimateSDUpscale

**Author**: ssit
**URL**: https://github.com/ssitu/ComfyUI_UltimateSDUpscale
**Registry**: https://registry.comfy.org/nodes/comfyui_ultimatesdupscale
**Downloads**: 1,127,484
**Stars**: 1,422
**Templates using this**: 1

## Description

ComfyUI nodes for the Ultimate Stable Diffusion Upscale script by Coyote-A. Performs tiled upscaling using Stable Diffusion, allowing high-resolution image generation without running out of VRAM by processing the image in overlapping tiles.

## Key Nodes

- `UltimateSDUpscale`: Upscales an image using tiled Stable Diffusion denoising. Splits the image into tiles, processes each tile with img2img, and seamlessly blends them together for a coherent high-resolution result.
