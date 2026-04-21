# HunyuanVideo Native Support in ComfyUI

**Date**: 2024-12-20
**Source**: https://blog.comfy.org/p/hunyuanvideo-native-support-in-comfyui
**Category**: model-release

## Key Facts

- HunyuanVideo is a 13-billion-parameter open-source video foundation model from Tencent
- "Dual-stream to Single-stream" Transformer architecture fuses text and visuals
- MLLM text encoder outperforms CLIP and T5 for instruction following and complex reasoning
- Custom 3D VAE compresses videos into compact latent space preserving resolution and frame rate
- Prompt Rewrite model with Normal Mode (improves intent) and Master Mode (optimizes composition/lighting)
- Can generate both videos and still images (setting video length to 1)

## Related Templates

- video_hunyuan_video_t2v
