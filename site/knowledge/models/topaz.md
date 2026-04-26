---
title: "Topaz Labs"
description: "Industry-leading AI image and video enhancement platform covering upscaling, denoising, sharpening, restoration, and creative enhancement."
sidebarTitle: "Topaz"
---

import ReqHint from "/snippets/tutorials/partner-nodes/req-hint.mdx";
import UpdateReminder from "/snippets/tutorials/update-reminder.mdx";

**Topaz Labs** has been at the forefront of AI-powered image and video enhancement for over a decade, earning a reputation as the go-to solution for professional photographers, videographers, and post-production studios who demand the highest quality in upscaling, denoising, sharpening, and restoration. The platform offers a comprehensive suite of AI models that handle everything from enhancing a single photograph to transforming entire video sequences, all accessible through a unified API that integrates seamlessly into existing production pipelines. On the image side, the **Reimagine** workflow provides creative enhancement capabilities including face enhancement, subject detection and isolation, and super-resolution up to an extraordinary 8K output. Each enhancement pass is driven by specialized models optimized for different content types — portrait photos benefit from models tuned for natural skin texture and facial detail, while landscape and architectural shots use models that preserve fine geometric edges and environmental texture without introducing artifacts.

For video enhancement, Topaz brings an even richer arsenal of AI models to the table. The flagship **Starlight** model family includes three distinct variants: **Starlight** for standard diffusion-based upscaling to 4K, **Starlight Fast** for accelerated processing when turnaround time is critical, and the latest **Starlight Precise 2.5** which delivers noticeably sharper results with significantly fewer artifacts than its predecessors, making it the preferred choice for high-end post-production where every frame must be pristine. Beyond upscaling, Topaz Video AI includes **Apollo** for frame interpolation and slow-motion generation, multiple super-resolution models including **Proteus**, **Iris**, and **Rhea** each optimized for different source material characteristics, and **Chronos** and **Aion** for additional frame interpolation and temporal enhancement. The platform also supports SDR to HDR conversion, breathing new life into standard dynamic range footage by intelligently reconstructing highlight and shadow detail. Whether you are restoring archival footage, upscaling user-generated content for broadcast, or enhancing AI-generated imagery for photorealistic output, Topaz provides the depth and quality that professional workflows demand.

<ReqHint/>
<UpdateReminder/>

## Available workflows

### Image Enhancement with Reimagine

The **Image Enhancement** workflow brings Topaz's powerful Reimagine engine into your ComfyUI pipeline, giving you access to creative image enhancement capabilities including face enhancement, subject-aware processing, and super-resolution up to 8K output. This workflow accepts a standard image input and applies Topaz's AI models to intelligently enhance detail, reduce noise, sharpen edges, and improve overall image quality while preserving natural textures and avoiding the plastic-looking artifacts common with simpler upscaling approaches. The face enhancement model in particular is outstanding for portrait photography, reconstructing facial features with remarkable fidelity even from low-resolution or heavily compressed source images. This workflow is ideal for photographers preparing images for large-format print, e-commerce teams enhancing product photography, and anyone working with AI-generated imagery who needs to push their outputs to publication-ready quality.

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_topaz_image_enhance&utm_source=docs">
    Enhance and upscale images to 8K using Topaz Reimagine AI on ComfyCloud.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_topaz_image_enhance.json">
    Download the workflow JSON.
  </Card>
</CardGroup>

### Video Enhancement

The **Video Enhancement** workflow connects ComfyUI directly to Topaz Video AI's suite of enhancement models, enabling frame-aware video upscaling, denoising, and restoration with the full range of Topaz models available for selection. You can choose between models like **Starlight Precise 2.5** for maximum sharpness and minimal artifacts, **Starlight Fast** for accelerated batch processing, or **Apollo** for generating smooth slow-motion footage through intelligent frame interpolation. The workflow handles video input and output seamlessly, automatically processing each frame through the selected enhancement model and reassembling the result into a polished video file. This is particularly valuable for content creators who need to upscale legacy footage to modern resolutions, filmmakers restoring archival material for remastering projects, and video producers who want to enhance user-generated content or AI-generated video to meet broadcast-quality standards.

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_topaz_video_enhance&utm_source=docs">
    Upscale, denoise, and restore video with Topaz Video AI models on ComfyCloud.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_topaz_video_enhance.json">
    Download the workflow JSON.
  </Card>
</CardGroup>

### Landscape Upscaler

The **Landscape Upscaler** workflow is purpose-built for enhancing outdoor and scenic photography, using Topaz models specifically tuned to preserve the fine detail, texture, and natural gradients that make landscape images compelling. Landscape shots present unique challenges for AI upscaling — distant mountain ranges, cloud formations, foliage, and water surfaces all require different handling to avoid producing artificial-looking results. This workflow applies specialized processing that maintains the organic feel of natural scenes while dramatically increasing resolution and sharpness, making it perfect for landscape photographers preparing images for large prints, real estate photography that needs to showcase property surroundings, and travel content creators who want their scenic imagery to pop at any display size.

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=utility-topaz_landscape_upscaler&utm_source=docs">
    Enhance and upscale landscape photography with purpose-tuned Topaz models on ComfyCloud.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/utility-topaz_landscape_upscaler.json">
    Download the workflow JSON.
  </Card>
</CardGroup>

### Illustration Upscaler

The **Illustration Upscaler** workflow addresses the specific needs of digital art and illustration upscaling, where preserving crisp lines, flat color regions, and artistic texture is essential. Unlike photographic enhancement which optimizes for natural texture and gradation, illustration upscaling requires a fundamentally different approach that respects the artist's original line work and color choices without introducing photographic-looking noise or smoothing away intentional stylistic detail. This workflow uses Topaz models that excel at maintaining the clean, sharp appearance of digital illustrations while increasing resolution for large-format printing, high-DPI displays, or publication. It is ideal for concept artists preparing work for print portfolios, game asset artists who need to upscale textures without losing the hand-crafted look, and illustrators delivering high-resolution files to clients.

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=utility_topaz_illustration_upscale&utm_source=docs">
    Upscale digital illustrations and concept art with line-preserving Topaz models on ComfyCloud.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/utility_topaz_illustration_upscale.json">
    Download the workflow JSON.
  </Card>
</CardGroup>

## Use cases

**Professional photo restoration and enhancement.** Photographers and preservationists working with archival or vintage imagery can use Topaz's image enhancement capabilities to restore detail in faded, damaged, or low-resolution photographs that would otherwise be lost to time. The combination of intelligent face enhancement for portrait restoration, careful denoising that preserves grain structure rather than eliminating it entirely, and super-resolution upscaling that reconstructs genuine detail rather than inventing fake texture makes Topaz an indispensable tool for anyone working with legacy image material. The results are consistently natural enough for gallery display and museum-grade archival work, while the API-based workflow means it can process large collections at scale without manual intervention.

**Broadcast-quality video upscaling from any source.** Video producers facing the challenge of integrating archival footage, user-generated content, or mobile-shot material into broadcast or streaming productions can rely on Topaz Video AI to bring substandard source material up to professional quality. The **Starlight Precise 2.5** model excels here, delivering sharp, artifact-free 4K output even from heavily compressed or low-resolution input. The SDR to HDR conversion capability adds further value, automatically expanding the dynamic range of standard footage to take full advantage of modern HDR displays. Frame interpolation through **Apollo** then enables smooth slow-motion effects or frame-rate conversion for format compatibility, all in a single automated pipeline.

**Creative enhancement for AI-generated imagery.** As AI image generation becomes ubiquitous in creative workflows, the ability to polish generated outputs to a photorealistic standard has become critical. Topaz's Reimagine engine excels at removing the characteristic artifacts and inconsistencies of AI-generated images — smoothing out unnatural skin textures, sharpening muddied details, and adding realistic surface texture to objects that often appear overly smooth in raw generation output. The creative enhancement models can also add artistic effects and style transfer, giving artists and designers a powerful post-processing tool that bridges the gap between AI generation and publication-ready visual assets.
