# Few-Shot Example: Tutorial — Basic Inpainting Workflow

> This example demonstrates the ideal output for a **tutorial**-type content page.

## INPUT: Template Metadata

| Field | Value |
|-------|-------|
| Name | basic_inpaint |
| Title | Basic Inpainting Workflow |
| Description | Modify specific parts of an image using inpainting with mask editor support. |
| Media Type | image |
| Tags | Inpainting, Image |
| Models | Stable Diffusion |

## OUTPUT: Generated Content

### extendedDescription

Stable Diffusion inpainting allows you to selectively modify specific regions of an image while keeping the rest untouched. This ComfyUI workflow provides a straightforward step-by-step setup for replacing objects, fixing details, or adding new elements to existing images using the dedicated inpainting checkpoint and a built-in mask editor.

The workflow uses the `512-inpainting-ema.safetensors` checkpoint, which was specifically fine-tuned for inpainting tasks. Unlike standard img2img approaches that repaint the entire image, this inpainting model understands masked regions and generates content that blends naturally with the surrounding context. The `VAE Encode (for Inpainting)` node includes a `grow_mask_by` parameter that expands the mask boundary, ensuring smooth transitions between the original and generated areas.

You can use this workflow to remove unwanted objects from photos, repair damaged sections of images, or creatively replace elements with new content. The mask editor is accessible directly within ComfyUI, making it easy to paint precise selections without external tools. Load this template and start editing your images in minutes.

### howToUse

1. **Load the workflow**: Open ComfyUI and load the Basic Inpainting template from the workflow launcher, or drag the workflow JSON into the canvas.
2. **Verify the checkpoint**: Confirm the `Load Checkpoint` node has loaded `512-inpainting-ema.safetensors`. If missing, download it from Hugging Face and place it in your `ComfyUI/models/checkpoints/` folder.
3. **Upload your image**: Use the `Load Image` node to upload the image you want to edit. Click the upload button or drag your image directly onto the node.
4. **Create your mask**: Right-click the `Load Image` node and select `Open in MaskEditor`. Paint over the area you want to modify using the brush tool. White areas will be regenerated; black areas will be preserved. Click `Save to Node` when finished.
5. **Configure the inpainting encoder**: In the `VAE Encode (for Inpainting)` node, adjust the `grow_mask_by` value (default: 6 pixels). Increase this value for smoother blending at mask edges.
6. **Write your prompt**: In the positive `CLIP Text Encode` node, describe what should appear in the masked region. In the negative prompt node, describe what you want to avoid.
7. **Adjust sampler settings**: Set the `KSampler` denoise strength between 0.7 and 1.0. Higher values give the model more creative freedom; lower values keep results closer to the original image.
8. **Generate the result**: Click the `Queue` button or press `Ctrl+Enter` to run the workflow. Review the output and adjust your prompt or mask as needed.

### faq

**Q: What is the difference between inpainting and img2img in ComfyUI?**
A: Inpainting uses a mask to selectively regenerate only specific regions of an image, while img2img reprocesses the entire image based on a denoise strength. The inpainting checkpoint (`512-inpainting-ema.safetensors`) is specifically trained to understand masked regions and generate content that blends seamlessly with untouched areas. For targeted edits, inpainting produces significantly more natural results.

**Q: How do I create a precise mask for Stable Diffusion inpainting?**
A: Right-click the `Load Image` node in ComfyUI and select `Open in MaskEditor`. Use the brush tool to paint over the area you want to modify — white indicates regions to regenerate, black indicates regions to preserve. You can adjust the brush size for finer control. For complex shapes, paint slightly beyond the edges and rely on the `grow_mask_by` parameter to handle blending.

**Q: What does the grow_mask_by parameter do in the inpainting workflow?**
A: The `grow_mask_by` parameter in the `VAE Encode (for Inpainting)` node expands the mask boundary by a specified number of pixels before encoding. This expansion creates a soft transition zone where the newly generated content blends with the original image. A value of 6-8 pixels works well for most use cases. Increase this value if you notice hard edges between the inpainted region and the original.

**Q: Can I use a regular Stable Diffusion checkpoint for inpainting?**
A: While you can technically use a standard checkpoint, the dedicated `512-inpainting-ema.safetensors` model produces substantially better results for masked editing. Standard models lack the fine-tuning needed to seamlessly blend generated content with existing image regions. If you prefer to use a different checkpoint, consider using higher `grow_mask_by` values and lower denoise strengths to compensate.

**Q: What resolution should my input image be for this inpainting workflow?**
A: The inpainting checkpoint was trained at 512×512 resolution, so input images closest to that size produce the best results. Larger images will still work but may show reduced quality in the inpainted region. For higher-resolution images, consider cropping to the area of interest, inpainting at 512×512, and compositing the result back into the original.
