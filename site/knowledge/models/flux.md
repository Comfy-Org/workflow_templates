# Flux

Flux is a family of state-of-the-art text-to-image models developed by Black Forest Labs.

## Model Variants

### Flux.1 Schnell

- Ultra-fast inference (1-4 steps)
- Best for rapid prototyping and real-time applications
- Apache 2.0 license (open source)
- 12B parameter rectified flow transformer

### Flux.1 Dev

- High-quality development model
- 20-50 steps for best results
- Non-commercial license for research
- Same architecture as Schnell with distilled guidance

### Flux.1 Pro

- Highest quality outputs
- Commercial API available
- Best prompt adherence and detail

## Key Features

- Excellent text rendering in images
- Strong prompt following
- High resolution output (up to 2048x2048)
- Consistent style and quality

## Hardware Requirements

- Minimum: 12GB VRAM (fp16)
- Recommended: 24GB VRAM for full quality
- Quantized versions available for lower VRAM

## Common Use Cases

- Text-to-image generation
- Concept art and illustrations
- Product visualization
- Character design

## Blog References

- [FLUX.2 Day-0 Support in ComfyUI](../blog/flux2-day-0-support.md) — FLUX.2 with 4MP output, multi-reference consistency, professional text rendering
- [FLUX.2 [klein] 4B & 9B](../blog/flux2-klein-4b.md) — Fastest Flux models, sub-second inference, unified generation and editing
- [The Complete AI Upscaling Handbook](../blog/upscaling-handbook.md) — Benchmarks for upscaling workflows
