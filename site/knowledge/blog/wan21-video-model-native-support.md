# Wan 2.1 Video Model Native Support

**Date**: 2025-02-27
**Source**: https://blog.comfy.org/p/wan21-video-model-native-support
**Category**: model-release

## Key Facts

- Wan 2.1 is a series of 4 video generation models from Alibaba's Wan-AI team
- Text-to-video 14B: Supports both 480P and 720P
- Image-to-video 14B 720P: Supports 720P
- Image-to-video 14B 480P: Supports 480P
- Text-to-video 1.3B: Supports 480P
- T2V-1.3B model requires only 8.19 GB VRAM, compatible with consumer-grade GPUs
- Can generate a 5-second 480P video on an RTX 4090 in about 4 minutes (without quantization)
- First video model capable of generating both Chinese and English text in video
- Wan-VAE can encode/decode 1080P videos of any length while preserving temporal info
- Supports text-to-video, image-to-video, video editing, text-to-image, and video-to-audio
- Confirmed working on RTX 2060 with 6GB VRAM (T2V 1.3B)

## Benchmarks

- T2V-1.3B VRAM: 8.19 GB minimum
- T2V-14B VRAM: 24GB+ recommended
- 5-second 480P generation on RTX 4090: ~4 minutes

## Related Templates

- video_wan_t2v
- video_wan_i2v_720p
- video_wan_i2v_480p
