# Few-Shot Example: Showcase — Image Upscaling with ESRGAN

> This example demonstrates the ideal output for a **showcase**-type content page.

## INPUT: Template Metadata

| Field | Value |
|-------|-------|
| Name | basic_upscale |
| Title | Image Upscaling with ESRGAN |
| Description | Convert low-resolution images to high-resolution using AI upscaling models like ESRGAN. |
| Media Type | image |
| Tags | Upscale, Image |
| Models | ESRGAN |

## OUTPUT: Generated Content

### extendedDescription

ESRGAN upscaling transforms low-resolution images into crisp, high-resolution output with remarkable detail recovery in ComfyUI. Using the Load Upscale Model and Upscale Image (Using Model) nodes, this workflow produces smooth, natural results that preserve edges, textures, and fine detail — turning blurry or pixelated source images into clean, usable assets.

The real power of this workflow lies in its flexibility. Multiple ESRGAN model variants from OpenModelDB let you tailor the upscale to your content: RealESRGAN for general-purpose photography, BSRGAN for images with text and sharp edges, and SwinIR for landscapes and natural scenes. You can also chain models — running a 2x pass followed by a 4x pass — to achieve ultra-high-resolution output from even the smallest sources. Each model preserves the character of the original image while adding convincing detail at the new resolution.

Artists, photographers, and content creators can pair this upscaling workflow with any text-to-image pipeline for a seamless generate-and-enhance process. Produce an image at a manageable resolution, then upscale it for print, large-format display, or high-DPI screens. The result is professional-quality output that looks sharp at any viewing distance.

### howToUse

1. **Load the Workflow**: Open the Image Upscaling with ESRGAN template from the ComfyUI workflow browser.
2. **Upload Your Image**: Drag your low-resolution source image into the Load Image node. The workflow accepts PNG, JPEG, and WebP inputs.
3. **Select an Upscale Model**: Choose the ESRGAN variant that best fits your content — RealESRGAN for photos, BSRGAN for text-heavy images, or SwinIR for nature scenes.
4. **Set the Scale Factor**: Pick your target multiplier (2x or 4x). For ultra-high resolution, chain two upscale passes in sequence.
5. **Queue the Prompt**: Click Queue Prompt to run the upscale. Processing time depends on input size and your GPU, but most single images complete in seconds.
6. **Review and Save**: Inspect the upscaled output for detail and sharpness, then save or pass it along to the next stage in your pipeline.

### faq

**Q: Which ESRGAN model should I use for my images?**
A: It depends on your content. RealESRGAN handles most photographs and general images well, producing smooth, natural results. BSRGAN is the better choice for images containing text, UI elements, or hard edges. SwinIR produces especially clean output for landscapes and natural scenes. You can experiment with multiple models on the same image to compare.

**Q: Can I upscale beyond 4x with ESRGAN in ComfyUI?**
A: Yes — chain multiple upscale passes to go beyond a single model's scale factor. For example, run a 2x upscale followed by a 4x upscale to achieve an effective 8x enlargement. Keep in mind that each pass increases processing time and output file size, and extreme upscales can introduce subtle softness in areas with limited source detail.

**Q: How long does ESRGAN upscaling take?**
A: Most single-image upscales finish in a few seconds on a modern GPU. A 2x upscale of a 512×512 image typically completes in under 5 seconds on an RTX 3080. Larger inputs and higher scale factors take proportionally longer, but ESRGAN is one of the fastest upscaling approaches available in ComfyUI.

**Q: Can I combine ESRGAN upscaling with a text-to-image workflow?**
A: Absolutely. A popular pipeline is to generate images at a lower resolution using a model like Stable Diffusion or Flux, then pass the output directly into this ESRGAN upscale workflow. This gives you the creative control of text-to-image generation at a manageable VRAM cost, followed by a fast upscale to print- or display-ready resolution.

**Q: Where do I get ESRGAN upscale models?**
A: The primary source is OpenModelDB, which hosts a curated collection of ESRGAN-family models including RealESRGAN, BSRGAN, SwinIR, and many community-trained variants. Download the model file and place it in your ComfyUI `models/upscale_models/` directory — the Load Upscale Model node will detect it automatically.
