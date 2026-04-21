# FLUX.2 [klein] 4B & 9B

**Date**: 2026-01-16
**Source**: https://blog.comfy.org/p/flux2-klein-4b-fast-local-image-editing
**Category**: model-release

## Key Facts

- Fastest image models in the Flux family, unifying image generation and editing
- Designed for interactive workflows, immediate previews, and latency-critical applications
- End-to-end inference around one second on distilled variants
- Available in Base (undistilled) and Distilled (4-step) variants at both 4B and 9B parameters
- Both sizes support text-to-image and image editing including single/multi-reference

## Benchmarks

- 9B distilled: 4 steps, ~2s on 5090, 19.6GB VRAM
- 9B base: 50 steps, ~35s on 5090, 21.7GB VRAM
- 4B distilled: 4 steps, ~1.2s on 5090, 8.4GB VRAM
- 4B base: 50 steps, ~17s on 5090, 9.2GB VRAM

## Related Templates

- image_flux2_klein_text_to_image
- image_flux2_klein_image_edit_4b_base
- image_flux2_klein_image_edit_4b_distilled
- image_flux2_klein_image_edit_9b_base
- image_flux2_klein_image_edit_9b_distilled
