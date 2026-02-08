# Wan 2.1

Wan 2.1 is a video generation model from Alibaba capable of both image-to-video and text-to-video synthesis.

## Model Variants

### Wan 2.1 T2V (Text-to-Video)

- Generate videos directly from text prompts
- Available in 1.3B and 14B parameter sizes
- Supports variable aspect ratios and durations

### Wan 2.1 I2V (Image-to-Video)

- Animate static images into videos
- Maintains subject consistency from source image
- 480p and 720p output resolutions

## Key Features

- High temporal consistency between frames
- Natural motion and physics simulation
- Multiple aspect ratios (16:9, 9:16, 1:1)
- Video lengths up to 5 seconds at 24fps
- Strong prompt adherence for motion

## Hardware Requirements

- 1.3B model: 8GB VRAM minimum
- 14B model: 24GB VRAM recommended
- FP8 quantization available for lower VRAM
- Significant system RAM needed for video processing

## Common Use Cases

- Social media video content
- Product animation
- Character animation from reference images
- Motion graphics and visual effects
- Storyboard-to-video conversion

## Key Parameters

- **frames**: Number of output frames (typically 81 for ~3.4s at 24fps)
- **steps**: Inference steps (20-50 recommended)
- **cfg_scale**: Guidance scale for prompt adherence (3-7 typical)
- **motion_bucket_id**: Controls amount of motion in I2V

## Blog References

- [Wan 2.1 Video Model Native Support](../blog/wan21-video-model-native-support.md) — Initial release with 4 model variants, 8.19GB VRAM minimum
- [Wan 2.1 VACE Native Support](../blog/wan21-vace-native-support.md) — Unified video editing: Move/Swap/Reference/Expand/Animate Anything
- [Wan 2.2 Day-0 Support](../blog/wan22-day-0-support.md) — MoE architecture, Apache 2.0 license, cinematic controls
- [WAN 2.6 Reference-to-Video](../blog/wan26-reference-to-video.md) — Generate videos from reference clips at up to 1080p
- [The Complete AI Upscaling Handbook](../blog/upscaling-handbook.md) — Wan 2.2 used for creative video upscaling
