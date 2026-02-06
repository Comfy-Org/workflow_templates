# Hunyuan-DiT

Hunyuan-DiT is Tencent's open-source text-to-image diffusion transformer with native Chinese and English language support.

## Model Variants

### Hunyuan-DiT v1.2

- Latest version with improved quality
- Bilingual text encoder (Chinese + English)
- 1.5B parameter DiT architecture
- Native 1024x1024 resolution

### Hunyuan-DiT v1.0

- Initial public release
- Foundation model for fine-tuning

## Key Features

- Native bilingual support (Chinese and English)
- Strong text rendering in images
- High-quality artistic outputs
- Multi-resolution generation (512-1024px)
- Fine-grained semantic understanding
- Excellent at Asian artistic styles

## Hardware Requirements

- Minimum: 11GB VRAM (fp16)
- Recommended: 16GB VRAM
- FP8 quantization available for 8GB cards
- Distilled versions for faster inference

## Common Use Cases

- Bilingual content creation
- Asian-style artwork and illustrations
- Text-in-image generation
- Marketing materials in Chinese/English
- Character design with CJK text

## Key Parameters

- **steps**: 25-50 for quality (default 40)
- **cfg_scale**: 5-8 (6 typical)
- **sampler**: DDPM, UniPC samplers supported
- **resolution**: 1024x1024, 768x1280, 1280x768
- **negative_prompt**: Recommended for quality control
