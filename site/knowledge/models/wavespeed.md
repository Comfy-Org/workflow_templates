---
title: "WaveSpeed"
description: "High-performance AI inference platform with specialized video upscaling, diffusion-based image restoration, and universal image enhancement."
sidebarTitle: "WaveSpeed"
---

import ReqHint from "/snippets/tutorials/partner-nodes/req-hint.mdx";
import UpdateReminder from "/snippets/tutorials/update-reminder.mdx";

**WaveSpeed** distinguishes itself in the AI media landscape as a unified API platform that aggregates an extensive library of over seven hundred curated, production-ready models while simultaneously developing its own specialized enhancement pipelines for image upscaling, video super-resolution, and AI-powered image restoration. Rather than simply wrapping existing open-source models, WaveSpeed has invested in building purpose-engineered solutions that address specific enhancement challenges with best-in-class results. The **FlashVSR** video upscaling pipeline exemplifies this approach — it is a dedicated video super-resolution and enhancement engine designed to process video frames with temporal coherence, meaning it maintains consistent visual quality across frames without the flickering, pulsing, or detail inconsistency that plagues naive per-frame upscaling approaches. FlashVSR is particularly effective on lower-resolution video sources, reconstructing fine detail that was never present in the original recording through intelligent inference that respects motion vectors and scene composition. The result is noticeably sharper, cleaner video that holds up at larger display sizes and higher bitrates.

For still imagery, WaveSpeed offers two complementary tools that cover the full spectrum of image enhancement needs. The **Image Upscale Ultimate** is a universal image upscaling engine that handles general-purpose magnification with strong detail preservation across a wide range of content types — from photographs and digital art to screenshots and AI-generated images. It applies intelligent analysis to determine the optimal enhancement strategy for each input, balancing sharpness against natural texture to avoid the artificial smoothness that can make upscaled images look fake. The **SeedVR2** workflow takes image enhancement a step further by combining diffusion-based AI restoration with super-resolution upscaling in a single pipeline. SeedVR2 is designed for the most challenging cases — severely compressed JPEGs with visible block artifacts, low-resolution images that lack the detail needed for meaningful upscaling, and images with localized damage or degradation. Its diffusion-based approach means it can genuinely reconstruct missing visual information rather than simply interpolating from what is already there, making it possible to salvage images that appear irreparably damaged. The pairing of these three specialized tools gives WaveSpeed a uniquely comprehensive enhancement offering that covers everything from quick batch upscaling of clean source material to painstaking restoration of heavily degraded imagery.

<ReqHint/>
<UpdateReminder/>

## Available workflows

### FlashVSR Video Upscaling

The **FlashVSR Video Upscaling** workflow brings WaveSpeed's dedicated video super-resolution engine into ComfyUI, enabling high-quality video upscaling with temporal coherence that preserves consistent detail across every frame. FlashVSR processes video with awareness of motion and scene structure, meaning that fine details reconstructed in one frame remain stable in subsequent frames without the flickering or swimming artifacts that per-frame upscaling produces. This workflow is ideal for video editors working with archival footage, low-resolution web video, or mobile-shot content who need to deliver results that look natural in motion rather than just impressive as still frames. The workflow accepts standard video input formats, processes through FlashVSR's enhancement pipeline, and outputs the upscaled video ready for further editing or direct use. For content creators, this means older video libraries can be brought up to modern resolution standards without the telltale inconsistencies that betray AI upscaling.

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_wavespeed_flshvsr_video_upscale&utm_source=docs">
    Upscale video with temporal-coherent super-resolution using WaveSpeed FlashVSR on ComfyCloud.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_wavespeed_flshvsr_video_upscale.json">
    Download the workflow JSON.
  </Card>
</CardGroup>

### Image Upscale Ultimate

The **Image Upscale Ultimate** workflow provides general-purpose image upscaling through WaveSpeed's universal enhancement engine, handling magnification with strong detail preservation across a wide variety of content types. Whether you are upscaling product photography for an e-commerce catalog, enlarging digital art for print, or preparing AI-generated images for high-resolution display, the Ultimate engine adapts its processing strategy to the specific characteristics of your input. It analyzes the image to identify edges, textures, smooth regions, and fine detail, then applies different enhancement approaches to each area for optimal results — sharp edges stay crisp, smooth gradients remain natural, and fine texture is preserved rather than smoothed away. The workflow is straightforward to use, accepting a standard image input and producing a high-resolution output with the upscaling applied, making it an excellent choice for batch processing workflows where consistency and reliability matter more than per-image manual tuning.

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_wavespped_image_upscale&utm_source=docs">
    Universal image upscaling with WaveSpeed Image Upscale Ultimate on ComfyCloud.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_wavespped_image_upscale.json">
    Download the workflow JSON.
  </Card>
</CardGroup>

### SeedVR2 Image Restoration and Upscaling

The **SeedVR2 Image Restoration and Upscaling** workflow is WaveSpeed's most powerful image enhancement tool, combining diffusion-based AI restoration with super-resolution upscaling in a single pipeline to tackle the most challenging enhancement scenarios. SeedVR2 excels where traditional upscaling fails — heavily compressed JPEGs with obvious block artifacts and banding, extremely low-resolution images that lack sufficient detail for conventional upscaling to work meaningfully, and images with localized damage or degradation where portions are missing or corrupted. The diffusion-based approach means SeedVR2 can genuinely reconstruct missing visual information rather than simply blurring and stretching what is already there, filling in lost texture, detail, and structure in a way that looks natural and coherent. This makes it the tool of choice for restoration work on legacy imagery, enhancing AI-generated images with severe artifacts, or salvaging web-downloaded images that were heavily compressed for bandwidth savings.

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_wavespped_seedvr2_ai_image_fix&utm_source=docs">
    Restore and upscale heavily degraded images with SeedVR2 diffusion-based AI on ComfyCloud.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_wavespped_seedvr2_ai_image_fix.json">
    Download the workflow JSON.
  </Card>
</CardGroup>

## Use cases

**Restoring archival and legacy video footage.** Video archivists and preservationists working with historical footage face a fundamental problem — the source material is often low-resolution by modern standards, degraded by age and repeated copying, and inconsistent in quality across segments. WaveSpeed's FlashVSR addresses these challenges directly with its temporally aware upscaling that maintains consistent quality across an entire sequence. Whether the source is VHS captures, early digital video, film transfers, or web-archived content, FlashVSR can reconstruct detail and clean up artifacts while ensuring that the enhanced result looks natural in motion rather than exhibiting the frame-by-frame inconsistencies that betray simple upscaling. The result is archival footage that can be presented on modern displays and streaming platforms without quality apology.

**Salvaging heavily compressed and low-resolution imagery.** The internet is filled with potentially valuable images that have been compressed to the point of visual degradation — JPEG artifacts, color banding, blockiness from aggressive compression, and detail loss from thumbnail-sized originals. SeedVR2's diffusion-based restoration was specifically built to handle this scenario. It can take a 256-pixel-wide heavily compressed JPEG and reconstruct a usable high-resolution image by inferring the missing detail, texture, and structure that the compression destroyed. This capability is invaluable for researchers working with web-harvested reference imagery, designers who need to use reference images too low-resolution to work with directly, and historians preserving digital cultural artifacts that exist only in compressed form.

**Batch upscaling for content production pipelines.** For teams producing large volumes of visual content — e-commerce catalogs, social media asset libraries, game texture collections — the ability to batch upscale consistently and reliably is critical. WaveSpeed's Image Upscale Ultimate is well suited to this workflow, providing predictable, high-quality results across diverse content types without requiring per-image adjustment. Its content-adaptive processing means that a single batch can contain photographs, illustrations, AI-generated art, and screenshots, and each will receive appropriate enhancement without manual sorting. Combined with WaveSpeed's API platform architecture, this makes it straightforward to integrate into automated production pipelines where images flow from generation through enhancement to final delivery without human intervention.
