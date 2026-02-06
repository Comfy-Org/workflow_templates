# LTX-Video

LTX-Video is Lightricks' open-source video generation model optimized for fast, high-quality video synthesis.

## Model Variants

### LTX-Video 0.9.1

- Latest stable release
- Text-to-video and image-to-video modes
- 2B parameter DiT architecture
- 768x512 native resolution at 24fps

### LTX-Video 0.9

- Initial public release
- Foundation for community fine-tunes

## Key Features

- Fast inference (real-time capable on high-end GPUs)
- Temporal VAE for smooth motion
- Native 24fps video output
- Up to 5 seconds video generation
- Efficient memory usage
- Strong motion quality for its size

## Hardware Requirements

- Minimum: 12GB VRAM
- Recommended: 16GB VRAM for full quality
- FP8/INT8 quantization supported
- 32GB+ system RAM recommended

## Common Use Cases

- Short-form video content
- Product demos and animations
- Social media clips
- Creative video experiments
- Rapid video prototyping

## Key Parameters

- **num_frames**: Output frame count (97 frames = ~4s at 24fps)
- **steps**: Inference steps (30-50 recommended)
- **cfg_scale**: Guidance strength (3-5 typical)
- **width/height**: Output dimensions (768x512 native)
- **seed**: For reproducible generation
