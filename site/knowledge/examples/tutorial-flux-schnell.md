# Few-Shot Example: Tutorial — Flux Schnell FP8

> This example demonstrates the ideal output for a **tutorial**-type content page.

## INPUT: Template Metadata

| Field | Value |
|-------|-------|
| Name | flux_schnell |
| Title | Flux Schnell FP8 |
| Description | Quickly generate images with Flux Schnell fp8 quantized version. Ideal for low-end hardware, requires only 4 steps to generate images. |
| Media Type | image |
| Tags | Text to Image, Image |
| Models | Flux, BFL |

## OUTPUT: Generated Content

### extendedDescription

Flux Schnell text-to-image generation is one of the fastest ways to create high-quality images in ComfyUI. Built on Black Forest Labs' 12-billion parameter Flux architecture, the Schnell variant is optimized for speed — producing finished images in just 4 denoising steps. This FP8 quantized version reduces VRAM requirements significantly, making it accessible on consumer GPUs with as little as 8 GB of memory.

The Flux model family introduced a hybrid architecture combining the strengths of both CLIP and T5 text encoders through a DualCLIPLoader node. This dual-encoder approach gives Flux exceptional prompt-following ability, eliminating the need for negative prompts entirely. The Schnell variant is released under the Apache 2.0 license, making it freely available for both personal and commercial projects without restrictions.

Whether you are prototyping creative ideas, generating reference images, or building a batch image pipeline, this ComfyUI workflow provides a streamlined step-by-step setup. Load the template with one click and start generating images immediately — no complex configuration required.

### howToUse

1. **Load the workflow**: Open ComfyUI and load the Flux Schnell FP8 template from the workflow launcher, or drag the workflow JSON file into the canvas.
2. **Verify the diffusion model**: Confirm the `Load Diffusion Model` node has loaded `flux1-schnell.safetensors`. If the model is missing, download it from Hugging Face and place it in your `ComfyUI/models/diffusion_models/` folder.
3. **Check the CLIP models**: Ensure the `DualCLIPLoader` node has loaded both `t5xxl_fp8_e4m3fn.safetensors` and `clip_l.safetensors`. These two text encoders work together to interpret your prompt.
4. **Verify the VAE**: Confirm the `Load VAE` node is set to `ae.safetensors`. This VAE decodes the latent output into a visible image.
5. **Enter your prompt**: Type your image description in the `CLIP Text Encode` (positive prompt) node. Be descriptive and specific — Flux responds well to natural language descriptions. No negative prompt is needed.
6. **Adjust generation settings**: The `KSampler` node should be set to 4 steps. You can modify the seed for different variations or adjust the image dimensions in the `Empty Latent Image` node.
7. **Generate your image**: Click the `Queue` button or press `Ctrl+Enter` to run the workflow.

### faq

**Q: How much VRAM does Flux Schnell FP8 require in ComfyUI?**
A: The FP8 quantized version of Flux Schnell requires approximately 8 GB of VRAM for standard 1024×1024 generation. This is significantly less than the full-precision version, which needs 16+ GB. If you experience out-of-memory errors, try reducing the output resolution in the `Empty Latent Image` node.

**Q: Why does Flux Schnell not need a negative prompt?**
A: Flux Schnell uses a dual text encoder system (CLIP-L and T5-XXL) that provides highly accurate prompt interpretation, making negative prompts unnecessary. The model reliably follows what you describe without generating unwanted artifacts. Simply focus on describing what you want to see in your positive prompt.

**Q: Can I use Flux Schnell for commercial projects?**
A: Yes, Flux Schnell is released under the Apache 2.0 license by Black Forest Labs, which permits both personal and commercial use without restrictions. You are free to use generated images in commercial products, marketing materials, and client work. No attribution is required, though crediting the model is appreciated.

**Q: What is the difference between Flux Schnell and Flux Dev?**
A: Flux Schnell is optimized for speed and requires only 4 denoising steps to produce a finished image, while Flux Dev typically uses 20-50 steps for higher detail. Schnell is ideal for rapid prototyping and batch generation, whereas Dev is better suited for final production-quality images. Schnell also uses the more permissive Apache 2.0 license compared to Dev's non-commercial license.

**Q: How do I install the Flux Schnell model for ComfyUI?**
A: Download `flux1-schnell.safetensors` from the Black Forest Labs Hugging Face repository and place it in your `ComfyUI/models/diffusion_models/` folder. You also need `t5xxl_fp8_e4m3fn.safetensors` and `clip_l.safetensors` in `ComfyUI/models/clip/`, and `ae.safetensors` in `ComfyUI/models/vae/`. Restart ComfyUI after adding the files to load them.
