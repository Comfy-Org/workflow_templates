# Few-Shot Example: Tutorial — ControlNet Scribble Guide

> This example demonstrates the ideal output for a **tutorial**-type content page.

## INPUT: Template Metadata

| Field | Value |
|-------|-------|
| Name | controlnet_scribble |
| Title | ControlNet Scribble Guide |
| Description | Generate images from rough sketches using ControlNet scribble model for precise control. |
| Media Type | image |
| Tags | ControlNet, Image |
| Models | Stable Diffusion, ControlNet v1.1 |

## OUTPUT: Generated Content

### extendedDescription

ControlNet scribble-guided image generation lets you turn rough sketches into detailed images in ComfyUI. By combining a Stable Diffusion checkpoint with the ControlNet v1.1 scribble model, this workflow interprets simple hand-drawn lines as structural guidance for the diffusion process — giving you direct control over composition, pose, and layout without needing polished artwork as input.

The ControlNet architecture works by injecting spatial conditioning into the diffusion model at multiple stages of the generation process. The scribble variant (`control_v11p_sd15_scribble_fp16.safetensors`) is specifically trained on paired data of rough sketches and finished images, making it highly tolerant of imprecise or messy input. The `Apply ControlNet` node provides `strength`, `start_percent`, and `end_percent` parameters that let you fine-tune how closely the output follows your sketch versus allowing creative interpretation by the model.

Whether you are a concept artist blocking out compositions, a designer iterating on layouts, or a hobbyist exploring creative ideas, this ComfyUI workflow gives you an intuitive sketch-to-image pipeline. You can chain multiple ControlNet models together for layered control — combining scribble with depth or pose conditioning for even more precise results.

### howToUse

1. **Load the workflow**: Open ComfyUI and load the ControlNet Scribble template from the workflow launcher, or drag the workflow JSON file into the canvas.
2. **Verify the checkpoint**: Confirm the `Load Checkpoint` node has loaded your preferred Stable Diffusion 1.5 checkpoint (e.g., `v1-5-pruned-emaonly.safetensors`). Any SD 1.5-compatible model will work with this ControlNet.
3. **Load the ControlNet model**: Ensure the `Load ControlNet Model` node has loaded `control_v11p_sd15_scribble_fp16.safetensors`. If missing, download it from Hugging Face and place it in your `ComfyUI/models/controlnet/` folder.
4. **Upload your sketch**: Use the `Load Image` node to upload a sketch or rough drawing. Black lines on a white background produce the best results. You can draw your sketch in any image editor or even photograph a pencil drawing.
5. **Configure ControlNet strength**: In the `Apply ControlNet` node, adjust the `strength` value (default: 1.0). Lower values (0.4–0.7) allow more creative freedom; higher values (0.8–1.0) follow the sketch more strictly. Set `start_percent` to 0.0 and `end_percent` to 1.0 for full-process guidance.
6. **Write your prompt**: In the positive `CLIP Text Encode` node, describe the final image you want. Be specific about style, colors, and details — the prompt fills in everything the sketch does not define.
7. **Generate the image**: Click the `Queue` button or press `Ctrl+Enter` to run the workflow. Experiment with different strength values and prompts to find the right balance between sketch fidelity and creative output.

### faq

**Q: What kind of sketch input works best with ControlNet scribble in ComfyUI?**
A: The ControlNet scribble model works best with simple black lines on a white background. Your sketch does not need to be detailed or polished — rough outlines, stick figures, and basic shapes all produce usable results. Avoid using colored or shaded drawings, as the scribble model is trained specifically on binary line art. You can draw directly in any image editor or scan a pencil sketch.

**Q: How do I adjust how closely the output follows my sketch?**
A: Use the `strength` parameter in the `Apply ControlNet` node to control sketch adherence. A strength of 1.0 follows the sketch very closely, while 0.4–0.6 gives the model more freedom to interpret and embellish your drawing. You can also use the `start_percent` and `end_percent` parameters to limit ControlNet influence to specific phases of the denoising process — for example, setting `end_percent` to 0.8 lets the final steps refine details without strict sketch constraints.

**Q: Can I use multiple ControlNet models together in ComfyUI?**
A: Yes, you can chain multiple ControlNet models by connecting the output of one `Apply ControlNet` node into the conditioning input of another. For example, combining the scribble model with a depth ControlNet gives you control over both composition and spatial depth. Each ControlNet node has its own strength parameter, so you can balance the influence of each conditioning source independently.

**Q: What Stable Diffusion models are compatible with ControlNet v1.1 scribble?**
A: The `control_v11p_sd15_scribble_fp16.safetensors` model is designed for Stable Diffusion 1.5 checkpoints. It is compatible with any SD 1.5-based model, including fine-tuned variants and community models trained on the SD 1.5 architecture. It is not compatible with SDXL or Flux models — those require their own ControlNet implementations. Always match the ControlNet version to your base model architecture.

**Q: How much VRAM does the ControlNet scribble workflow require?**
A: Running Stable Diffusion 1.5 with a single ControlNet model requires approximately 6 GB of VRAM at 512×512 resolution. Each additional ControlNet in the chain adds roughly 1–2 GB of VRAM usage. If you experience out-of-memory errors, try reducing the output resolution or using the FP16 version of the ControlNet model, which this workflow already includes by default.
