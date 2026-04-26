---
title: "Google Veo"
description: "Google DeepMind's video generation model family delivering cinema-quality video with native audio, 4K output, and unmatched physics accuracy."
sidebarTitle: "Veo"
---

import ReqHint from "/snippets/tutorials/partner-nodes/req-hint.mdx";
import UpdateReminder from "/snippets/tutorials/update-reminder.mdx";

Google DeepMind's **Veo** family represents one of the most advanced lines of AI video generation models available today, spanning from the capable **Veo 2.0** to the cutting-edge **Veo 3.1**. These models are designed to produce cinema-quality video with exceptional prompt adherence, realistic physics simulation, and natural human motion that sets a new standard in the industry. Veo 2.0, identified by the model ID `veo-2.0-generate-001`, delivers crisp 720p to 4K output with eight-second clips that can be extended into longer sequences, making it an ideal choice for short-form content, product demonstrations, and social media video production. It supports both text-to-video and image-to-video workflows, allowing creators to animate still imagery or describe a scene from scratch and watch it come to life with coherent motion and lighting.

The latest generation, **Veo 3.1**, pushes the frontier even further by introducing native audio generation alongside video — the model can produce synchronized sound effects, ambient environmental audio, and even dialogue, creating a complete audiovisual output in a single generation pass. Operating under the model IDs `veo-3.1-generate`, `veo-3.1-fast-generate`, and `veo-3.1-lite`, this generation supports up to 4K cinematic output with enhanced capabilities including scene extension, first and last frame conditioning, object insertion, and style reference image support for maintaining consistent aesthetics across shots. The **Veo 3.1 Fast** variant offers accelerated generation for time-sensitive workflows while preserving much of the quality that makes the standard model stand out. All Veo outputs carry SynthID invisible watermarking, ensuring responsible deployment with traceable content provenance. Whether you are producing marketing assets, film pre-visualization, or dynamic social media content, the Veo family provides a versatile and powerful foundation for AI-driven video creation that rivals traditional production pipelines in quality while dramatically reducing the time and cost involved.

<ReqHint/>
<UpdateReminder/>

## Available workflows

### Veo 3.1 Video Generation with Native Audio

The full-powered **Veo 3.1** workflow enables you to generate high-quality video clips complete with synchronized audio. This template connects directly to the Veo 3.1 API endpoint using the `veo-3.1-generate` model, giving you access to the latest capabilities including native sound effects, ambient audio, and dialogue generation that matches your scene perfectly. The workflow handles prompt construction, aspect ratio configuration, and duration settings through an intuitive node-based interface, making it straightforward to produce production-ready video content without writing any code. Outputs include the generated video file along with its accompanying audio track, all packaged for immediate use in editing pipelines or direct publishing.

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_veo3&utm_source=docs">
    Generate cinema-quality video with native audio using the latest Veo 3.1 API on ComfyCloud.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_veo3.json">
    Download the workflow JSON.
  </Card>
</CardGroup>

### Veo 3.1 Fast Video Generation

For projects where speed matters, the **Veo 3.1 Fast** workflow offers accelerated video generation using the `veo-3.1-fast-generate` model. This variant is optimized to deliver results significantly faster than the standard model while maintaining impressive visual quality and prompt adherence. It is particularly well suited for iterative creative workflows where you need to quickly explore multiple scene concepts, test different prompts, or generate rapid prototypes of visual ideas before committing to a full production pass. The fast mode retains support for the same aspect ratios and duration settings, making it a drop-in replacement when time is of the essence.

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_veo3_fast&utm_source=docs">
    Accelerated video generation with Veo 3.1 Fast for rapid prototyping and iterative creative workflows.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_veo3_fast.json">
    Download the workflow JSON.
  </Card>
</CardGroup>

### Veo 2.0 Image-to-Video

The **Veo 2.0 Image-to-Video** workflow brings static imagery to life by animating your reference images with coherent motion, natural physics, and cinematic camera movement. Using the `veo-2.0-generate-001` model, this workflow takes an input image along with a text prompt describing the desired motion, then generates a smooth video sequence that respects both the visual content of the source image and the textual direction. This capability is especially powerful for transforming product photos into dynamic demonstrations, bringing concept art to life for pre-visualization, or adding movement to stock imagery for social media content. Veo 2.0's strong physics simulation ensures that generated motion feels natural rather than artificial, with realistic lighting, shadow behavior, and object interactions throughout the clip.

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_veo2_i2v&utm_source=docs">
    Animate still images into video clips using Veo 2.0 image-to-video generation on ComfyCloud.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_veo2_i2v.json">
    Download the workflow JSON.
  </Card>
</CardGroup>

## Use cases

**Cinematic video production for marketing and advertising.** Veo 3.1's combination of high-resolution 4K output, native audio generation, and cinematic camera control makes it an exceptional tool for producing professional-grade marketing and advertising content. Marketers can generate product showcase videos with dramatic camera movements and synchronized soundscapes, create social media advertisements that stand out in crowded feeds, or rapidly produce multiple variations of a commercial concept for A/B testing — all without the expensive overhead of traditional video production. The model's strong prompt adherence means you can precisely control lens types, camera angles, depth of field, and scene composition, giving you the same creative control you would expect from a professional film crew, delivered in minutes rather than days.

**Creative prototyping and concept pre-visualization.** Filmmakers, game designers, and creative directors can use the Veo family to rapidly visualize concepts before committing significant resources to production. Veo 2.0's image-to-video capability is particularly valuable here, allowing artists to sketch or render still concept art and immediately see how a scene would play out in motion. The Veo 3.1 Fast variant accelerates this process further, enabling rapid iteration on scene composition, timing, and visual style. This dramatically shortens the feedback loop between creative vision and visual execution, letting teams explore many more ideas in the same amount of time and arrive at stronger final concepts with less wasted effort.

**Dynamic content for e-commerce and product showcases.** E-commerce teams can leverage Veo's video generation to transform standard product photography into engaging video content that drives conversions. A product shot becomes a cinematic demonstration showing the item in use, from multiple angles, with appropriate ambient audio that enhances the viewing experience. The ability to extend clips and control scene composition means you can create consistent video assets across an entire product catalog, maintaining brand aesthetic while dramatically reducing the per-asset production cost. Veo's support for various aspect ratios ensures the output fits seamlessly across different platforms from widescreen website embeds to vertical social media stories.
