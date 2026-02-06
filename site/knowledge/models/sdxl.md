# Stable Diffusion XL

Stable Diffusion XL (SDXL) is Stability AI's flagship text-to-image model, offering high-quality 1024x1024 native resolution output.

## Model Variants

### SDXL Base

- Primary generation model
- 6.6B parameter U-Net architecture
- Native 1024x1024 resolution
- Two text encoders (CLIP ViT-L + OpenCLIP ViT-bigG)

### SDXL Refiner

- Optional second-stage refinement model
- Enhances details and textures
- Uses img2img on base output
- Best at 0.7-0.8 denoising strength

### SDXL Turbo / Lightning

- Distilled fast inference variants
- 1-4 step generation
- Reduced quality vs full model

## Key Features

- Excellent composition and layout
- Strong photorealism capabilities
- Large ecosystem of LoRAs and fine-tunes
- Flexible aspect ratios around 1MP total
- Dual CLIP text encoding for better prompts

## Hardware Requirements

- Minimum: 8GB VRAM (fp16)
- Recommended: 12GB VRAM for comfortable use
- Base + Refiner: 16GB+ VRAM
- Quantized versions available for 6GB cards

## Common Use Cases

- Photorealistic image generation
- Artistic illustrations
- Concept art and design
- Product photography
- Character and portrait generation

## Key Parameters

- **steps**: 20-40 for base, 15-25 for refiner
- **cfg_scale**: 5-10 (7 is common default)
- **sampler**: DPM++ 2M Karras, Euler a popular choices
- **resolution**: 1024x1024, 896x1152, 1152x896
