# Few-Shot Example: Breakthrough — LTX-2 Text to Video

> This example demonstrates the ideal output for a **breakthrough**-type content page.

## INPUT: Template Metadata

| Field | Value |
|-------|-------|
| Name | ltx_2_t2v |
| Title | LTX-2 Text to Video |
| Description | 19B DiT model generating synchronized video and audio in a single pass. |
| Media Type | video |
| Tags | Text to Video, Video, Audio |
| Models | LTX-2, Lightricks |

## OUTPUT: Generated Content

### extendedDescription

LTX-2 enables synchronized video and audio generation from text prompts in ComfyUI, marking the first time a single model produces both media streams in one pass. Built by Lightricks as a 19B parameter DiT (Diffusion Transformer), LTX-2 supports text-to-video, image-to-video, and video-to-video modes with IC-LoRA control for canny, depth, and pose conditioning. A distilled 8-step version is also available for faster generation when speed is prioritized over maximum quality.

Previously, generating video with matching audio required separate models and manual synchronization. LTX-2 eliminates this pipeline complexity by producing both outputs simultaneously, enabling expressive lip sync, ambient sound effects, and dynamic motion in a single workflow. The model also introduces keyframe interpolation for smoother transitions and native 2x spatial and temporal upscalers to enhance output resolution and frame rate without external tools.

For creators, LTX-2 opens new possibilities in short-form content production. Social media clips, product demos, and animated scenes can now include synchronized sound directly from generation. Prompts work best when kept under 200 words with chronological action descriptions. The IC-LoRA control system provides structural guidance through canny edges, depth maps, or pose references, giving users fine-grained control over motion and composition while maintaining the model's natural generation quality.

### howToUse

1. **Update ComfyUI**: Ensure you have the latest ComfyUI version, as LTX-2 requires updated DiT node support and audio output handling.
2. **Load the diffusion model**: Add a Load Diffusion Model node and select ltx-2-19b-dev-fp8 (or ltx-2-19b-distilled for faster 8-step generation).
3. **Write your prompt**: Enter a text prompt describing the scene, motion, and any audio elements. Keep prompts under 200 words and describe actions in chronological order for best results.
4. **Configure generation settings**: Set frame count, resolution, and inference steps. The distilled model works well with 8 steps; the full model benefits from 30-50 steps.
5. **Add IC-LoRA control (optional)**: Connect a canny, depth, or pose reference image to guide the video's structure using the IC-LoRA control nodes.
6. **Enable upscaling (optional)**: Add the native 2x spatial upscaler and temporal upscaler nodes to enhance resolution and frame rate of the generated output.
7. **Generate and review**: Queue the workflow. Both video and audio streams generate simultaneously and can be previewed together in the output node.

### faq

**Q: What's new in LTX-2 compared to earlier LTX-Video models?**
A: LTX-2 is a major leap from earlier versions. It scales from 2B to 19B parameters, adds synchronized audio generation, introduces IC-LoRA control (canny, depth, pose), and includes native 2x spatial and temporal upscalers. The distilled 8-step variant also makes fast generation practical without a separate model architecture.

**Q: How does LTX-2 generate audio and video together?**
A: LTX-2 produces both audio and video in a single forward pass through its 19B DiT architecture. This means sound effects, speech with lip sync, and ambient audio are generated in sync with the visual output. No separate audio model or manual alignment step is needed.

**Q: Do I need to update ComfyUI for LTX-2?**
A: Yes, LTX-2 requires an updated ComfyUI installation with support for the DiT architecture and audio output nodes. Update to the latest version before loading the model. The workflow also depends on updated VAE and upscaler nodes that ship with recent ComfyUI releases.

**Q: What are the hardware requirements for LTX-2?**
A: LTX-2's 19B parameter model is resource-intensive. The FP8 checkpoint reduces VRAM requirements, but 24GB+ is recommended for comfortable generation. The distilled 8-step version is lighter on compute time but has similar memory needs. System RAM of 32GB or more is recommended for smooth operation.

**Q: Can I control the motion and composition in LTX-2 videos?**
A: Yes, LTX-2 supports IC-LoRA control with canny edge, depth map, and pose reference inputs. These provide structural guidance while the model handles natural motion and detail. Keyframe interpolation is also available for defining specific start and end frames, with the model generating smooth transitions between them.
