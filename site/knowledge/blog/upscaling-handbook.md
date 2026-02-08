# The Complete AI Upscaling Handbook: All in ComfyUI

**Date**: 2026-02-06
**Source**: https://blog.comfy.org/p/upscaling-in-comfyui
**Category**: feature-announcement

## Key Facts

- Comprehensive guide covering 10 use cases and 20 workflows across all modern AI upscaling models
- Two categories: conservative upscale (preserve original) vs creative upscale (reimagine details)
- Conservative models: Magnific Precise, SeedVR2, FlashVSR, Topaz Fast, HitPaw
- Creative models: Wan 2.2, Magnific Creative, Topaz Astra Creative, HitPaw
- Magnific Skin Enhancer is best for portraits
- SeedVR2 or Nano Banana Pro recommended for product photography
- Do not rely on upscaling to fix common AI artifacts

## Benchmarks

- Image upscale 1K→4K times: Nano Banana Pro ~80s, Topaz ~100s, Magnific Creative ~50s, Magnific Skin Enhancer ~60s, Magnific Precise ~40s, HitPaw ~60s, WaveSpeed SeedVR2 ~40s
- Video upscale 10s 720p: FlashVSR 1080p ~41s, FlashVSR 4K ~52s, SeedVR2 1080p on 5090 ~312s, Topaz 1080p ~374s, Topaz 4K ~560s, HitPaw 2K ~80s, HitPaw 4K ~175s

## Related Templates

- image_upscale_seedvr2
- video_upscale_flashvsr
- video_upscale_topaz
- video_upscale_hitpaw
