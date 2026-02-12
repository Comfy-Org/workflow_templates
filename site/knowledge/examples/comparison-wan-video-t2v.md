# Few-Shot Example: Comparison — Wan 2.1 Text to Video

> This example demonstrates the ideal output for a **comparison**-type content page.

## INPUT: Template Metadata

| Field | Value |
|-------|-------|
| Name | wan_video_t2v |
| Title | Wan 2.1 Text to Video |
| Description | Generate videos from text prompts using Wan 2.1 model with 1.3B and 14B parameter versions. |
| Media Type | video |
| Tags | Text to Video, Video |
| Models | Wan 2.1 |

## OUTPUT: Generated Content

### extendedDescription

Wan 2.1 text-to-video generation addresses the challenge of creating high-quality AI video from text prompts in ComfyUI, offering two parameter sizes to match different hardware setups. Released under the Apache 2.0 license by Alibaba in February 2025, Wan 2.1 uses a umt5_xxl text encoder and wan_2.1_vae to deliver strong temporal consistency and natural motion across multiple aspect ratios. The 1.3B version runs on as little as 8GB VRAM, while the 14B version produces higher fidelity output on 24GB+ systems.

Compared to alternatives like Hunyuan Video (13B parameters, Tencent) and LTX-2 (19B parameters, Lightricks), Wan 2.1 offers a wider accessibility range. Hunyuan Video delivers competitive motion quality but lacks a lightweight variant for consumer GPUs. LTX-2 generates synchronized audio alongside video but demands significantly more VRAM. CogVideoX is another option with strong prompt adherence, though Wan 2.1 outperforms most open-source models on standard video benchmarks while providing both text-to-video and image-to-video capabilities in the same model family.

Choose Wan 2.1 if you need a flexible, well-supported open-source video model that scales across hardware tiers. The 1.3B variant is the best choice for users with consumer GPUs who want fast iteration, while the 14B variant suits creators prioritizing output quality over speed. If your project requires synchronized audio generation, LTX-2 may be a better fit. If you need commercial licensing without restrictions, Wan 2.1's Apache 2.0 license gives it a clear advantage over many alternatives.

### howToUse

1. **Load the text encoder**: Add a Load Diffusion Model node and select the umt5_xxl text encoder. Unlike cloud-based alternatives, this runs entirely on your local machine.
2. **Load the VAE**: Add a VAE Loader node and select wan_2.1_vae for video frame decoding.
3. **Load the diffusion model**: Add a second Load Diffusion Model node and choose either the 1.3B (for 8GB VRAM) or 14B (for 24GB+ VRAM) checkpoint.
4. **Write your prompt**: Enter a descriptive text prompt in the positive conditioning node. Be specific about motion, camera angle, and scene details for best results.
5. **Set video parameters**: Configure frame count (81 frames for ~3.4 seconds at 24fps), inference steps (20-50), and guidance scale (3-7). Higher steps improve quality but increase generation time.
6. **Choose aspect ratio**: Select from 16:9, 9:16, or 1:1 depending on your output needs. This flexibility is not available in all competing models.
7. **Generate and preview**: Queue the workflow and preview the output. Adjust guidance scale or step count to balance speed and quality.

### faq

**Q: Is Wan 2.1 better than Hunyuan Video for text-to-video generation?**
A: Wan 2.1 and Hunyuan Video excel in different areas. Wan 2.1 offers both a lightweight 1.3B model for consumer GPUs and a high-quality 14B model, while Hunyuan Video's 13B model targets a single quality tier. Choose Wan 2.1 if you need hardware flexibility or an Apache 2.0 license; choose Hunyuan Video if you prefer Tencent's ecosystem or specific motion styles.

**Q: When should I use Wan 2.1 vs LTX-2 for video generation?**
A: Use Wan 2.1 when you want a pure video generation model with lower VRAM requirements and broad community support. Use LTX-2 when you need synchronized audio-video output in a single pass or IC-LoRA control features like canny and depth. LTX-2's 19B model demands more resources but handles audio natively.

**Q: Can I run Wan 2.1 on an 8GB GPU?**
A: Yes, the 1.3B parameter version of Wan 2.1 is designed to run on GPUs with 8GB VRAM. Output quality is lower than the 14B variant, but it provides a practical entry point for users with consumer hardware. FP8 quantization is also available for the 14B model to reduce memory usage on mid-range GPUs.

**Q: How does Wan 2.1 compare to CogVideoX for text-to-video?**
A: Wan 2.1 outperforms most open-source models including CogVideoX on standard benchmarks for motion consistency and prompt adherence. CogVideoX can still be a reasonable choice for specific use cases, but Wan 2.1's dual-size model offering and Apache 2.0 license make it more versatile for both experimentation and production workflows.

**Q: When should I NOT use the Wan 2.1 text-to-video workflow?**
A: This workflow may not be ideal if you need audio synchronized with your video output, since Wan 2.1 generates video only. It is also limited to roughly 5 seconds of output at 24fps. For longer videos, consider chaining multiple generations or using a model specifically designed for extended sequences.
