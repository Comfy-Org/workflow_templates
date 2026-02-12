# Few-Shot Example: Breakthrough — Flux.2 Dev Text to Image

> This example demonstrates the ideal output for a **breakthrough**-type content page.

## INPUT: Template Metadata

| Field | Value |
|-------|-------|
| Name | flux_2_dev |
| Title | Flux.2 Dev Text to Image |
| Description | Next-gen image model with 4MP output, multi-reference consistency, and professional text rendering. |
| Media Type | image |
| Tags | Text to Image, Image |
| Models | Flux.2, BFL |

## OUTPUT: Generated Content

### extendedDescription

Flux.2 Dev introduces a new tier of photorealistic image generation to ComfyUI, succeeding the widely adopted Flux.1 family from Black Forest Labs. For the first time in a locally runnable model, users can generate images at up to 4 megapixel resolution with accurate text rendering, hex-code brand color control, and multi-reference consistency across up to 10 input images. The workflow uses the mistral_3_small_flux2_bf16 text encoder and flux2_dev_fp8mixed diffusion model paired with the flux2-vae decoder.

Previously, achieving photorealistic lighting, skin texture, and fabric detail at high resolution required careful prompt engineering or multiple post-processing steps. Flux.2 Dev handles these elements natively, producing images with noticeably improved hand anatomy, natural skin tones, and physically plausible material rendering. The multi-reference consistency feature allows users to supply up to 10 reference images, enabling character sheets, product catalogs, and brand-consistent visual series without manual style matching.

Professional text rendering is where Flux.2 Dev marks the clearest advancement over its predecessor. Logos, headlines, and body text render cleanly at various sizes, making this model practical for mockups, social media graphics, and marketing materials. Combined with hex-code color specification, designers can produce on-brand visuals directly from a ComfyUI workflow without additional editing tools. This represents a significant step toward production-ready AI image generation for creative professionals.

### howToUse

1. **Update ComfyUI**: Ensure you are running the latest ComfyUI version, as Flux.2 Dev requires updated node support for its architecture.
2. **Load the text encoder**: Add a Load Diffusion Model node and select mistral_3_small_flux2_bf16. This new encoder replaces the CLIP/T5 combination used in Flux.1.
3. **Load the diffusion model**: Add a Load Diffusion Model node and select flux2_dev_fp8mixed. The FP8 mixed-precision format balances quality and VRAM usage.
4. **Load the VAE**: Add a VAE Loader node and select flux2-vae for image decoding.
5. **Write your prompt**: Enter a detailed text prompt. Try the new text rendering capability by including quoted text (e.g., 'a sign reading "OPEN"') or specify exact brand colors using hex codes.
6. **Set resolution**: Configure width and height for up to 4MP output. Higher resolutions benefit from the model's improved detail handling.
7. **Add reference images (optional)**: To use multi-reference consistency, connect up to 10 reference images to maintain visual coherence across generated outputs.
8. **Generate and iterate**: Queue the workflow. Experiment with different prompts to explore the improved lighting, material, and anatomy capabilities.

### faq

**Q: What's new in Flux.2 Dev compared to Flux.1 Dev?**
A: Flux.2 Dev introduces several capabilities over Flux.1 Dev: up to 4MP output resolution (vs ~2MP), multi-reference consistency using up to 10 images, professional text rendering, and hex-code brand color control. It also uses a new mistral_3_small_flux2_bf16 text encoder that replaces the dual CLIP/T5 setup from Flux.1, resulting in better prompt comprehension.

**Q: Do I need to update ComfyUI for Flux.2 Dev?**
A: Yes, Flux.2 Dev requires an updated ComfyUI installation with support for the new model architecture and mistral text encoder. Update your ComfyUI to the latest version before downloading the model files. Older node configurations from Flux.1 workflows are not directly compatible.

**Q: Can Flux.2 Dev render text accurately in generated images?**
A: Yes, professional text rendering is one of the key advancements in Flux.2 Dev. It can render logos, headlines, and body text at various sizes with high legibility. You can also specify exact colors using hex codes in your prompt for brand-consistent output. Results are best with short, clearly quoted text strings.

**Q: How much VRAM does Flux.2 Dev require?**
A: The flux2_dev_fp8mixed checkpoint is designed to work on GPUs with 12GB+ VRAM using FP8 mixed precision. For full-quality 4MP generation, 24GB VRAM is recommended. Quantized versions may become available for lower-end hardware as the community develops optimizations.

**Q: Is Flux.2 Dev production-ready?**
A: Flux.2 Dev is stable and suitable for creative and professional workflows. The model produces consistent, high-quality output with reliable text rendering and reference consistency. Check Black Forest Labs' licensing terms for commercial use requirements, as the Dev variant has specific usage conditions.
