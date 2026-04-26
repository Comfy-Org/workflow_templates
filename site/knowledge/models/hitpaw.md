---
title: "HitPaw"
description: "AI-powered image and video enhancement platform with specialized portrait enhancement, generative upscaling, and multi-frame video restoration."
sidebarTitle: "HitPaw"
---

import ReqHint from "/snippets/tutorials/partner-nodes/req-hint.mdx";
import UpdateReminder from "/snippets/tutorials/update-reminder.mdx";

**HitPaw** has established itself as a versatile and accessible AI enhancement platform that delivers professional-grade image and video upscaling, restoration, and denoising through an intuitive API. What sets HitPaw apart from other enhancement tools is its deep specialization in portrait and facial enhancement — the platform offers dedicated models that handle human faces with remarkable precision, preserving natural skin texture, facial features, and expressions even when working from heavily compressed or low-resolution source material. The image enhancement pipeline provides multiple processing paths tailored to different content types. A **General Generative Enhancement** model handles broad scene and object upscaling at one-time, two-times, and four-times magnification, while the **Portrait Enhancement** models go further with a dual-model approach: one optimized for face clarity at two-times and four-times scales, and another for natural facial texture preservation that avoids the plastic-looking results that plague many upscaling tools. For the most challenging cases involving heavily compressed or extremely low-resolution portraits, HitPaw offers a diffusion-based generative model that can reconstruct facial detail from remarkably little source information, making it possible to salvage images that would otherwise be considered unusable.

On the video side, HitPaw's **VikPea** engine brings frame-aware restoration and ultra-high-definition upscaling to motion content. The video enhancement pipeline includes a Face Soft model tailored to reducing noise and blur in facial regions across video frames, a Portrait Restore model that uses multi-frame fusion to reconstruct facial detail by aggregating information across multiple frames of a video sequence, and a General Restore model leveraging GAN-based architectures for broader scene enhancement that handles everything from indoor environments to complex outdoor landscapes. The Ultra HD model is designed specifically for the highest-quality upscaling, taking standard HD content to ultra-high-definition resolutions with sharp, artifact-free results. A diffusion-based generative model rounds out the video offering, providing repair capabilities for extremely low-resolution or heavily compressed footage where traditional upscaling approaches would fail. The combination of portrait-specific optimization and powerful general-purpose enhancement makes HitPaw a compelling choice for anyone who regularly works with human subjects in their visual content, from portrait photographers and social media creators to event videographers and e-commerce teams producing product imagery featuring models.

<ReqHint/>
<UpdateReminder/>

## Available workflows

### Image Enhancement

The **Image Enhancement** workflow integrates HitPaw's full image enhancement pipeline into ComfyUI, providing access to the platform's specialized portrait enhancement models alongside general-purpose upscaling at one-time, two-times, and four-times magnification scales. When you send an image through this workflow, HitPaw analyzes its content and applies the most appropriate enhancement strategy — for portraits, the face clarity and natural texture models work in concert to reconstruct facial features with lifelike detail, while for scenes and objects the generative enhancement model intelligently upscales while preserving edges, texture, and natural gradients. The workflow handles all model selection and parameter optimization automatically, so you get optimal results without needing to understand the intricacies of each enhancement model. This is ideal for photographers preparing portraits for large prints, e-commerce teams enhancing product images featuring human models, and content creators who want to push AI-generated imagery to publication quality with a single pass.

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=utility_hitpaw_general_image_enhance&utm_source=docs">
    Enhance and upscale images with HitPaw's specialized portrait and generative enhancement models on ComfyCloud.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/utility_hitpaw_general_image_enhance.json">
    Download the workflow JSON.
  </Card>
</CardGroup>

### Video Enhancement

The **Video Enhancement** workflow brings HitPaw's VikPea frame-aware video restoration and upscaling engine into your ComfyUI pipeline. This workflow accepts a video input and processes it through HitPaw's suite of video enhancement models, applying specialized face optimization for portrait-heavy footage while using general restoration models for broader scenes. The multi-frame fusion approach in the Portrait Restore model is particularly powerful for video — by aggregating facial detail information across multiple frames, it can reconstruct features that might be unclear in any single frame, resulting in consistent, natural-looking facial detail across an entire video sequence. The Ultra HD model handles resolution upscaling with impressive sharpness, while the generative model provides a safety net for the most challenging low-resolution or heavily compressed source material. This workflow is essential for video editors working with mobile-shot footage, event videographers who need to polish recordings of speeches and presentations, and content creators who record with consumer-grade cameras but need to deliver broadcast-quality output.

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=utility_hitpaw_video_enhance&utm_source=docs">
    Restore, denoise, and upscale video with HitPaw's frame-aware enhancement pipeline on ComfyCloud.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/utility_hitpaw_video_enhance.json">
    Download the workflow JSON.
  </Card>
</CardGroup>

## Use cases

**Portrait photography enhancement for professional delivery.** Portrait photographers delivering final images to clients face the challenge of consistently producing sharp, detailed results regardless of shooting conditions. HitPaw's specialized portrait enhancement models are built to address exactly this scenario — they can clean up noise from low-light portrait sessions, sharpen details that may have been softened by wide apertures or motion, and reconstruct facial texture in images that were shot on older or lower-resolution camera equipment. The dual-model face approach means you get both clarity and naturalness, avoiding the over-processed look that cheaper enhancement tools produce. For photographers working with AI-generated portrait imagery, the generative enhancement model can smooth out the characteristic artifacts and inconsistencies that plague AI face generation, delivering results that are indistinguishable from traditionally photographed portraits.

**Social media and event video restoration.** Content creators covering live events, conferences, ceremonies, or social gatherings frequently work with footage shot on smartphones or consumer cameras under less-than-ideal conditions. Low light, camera motion, compression artifacts, and distance from subjects all degrade video quality in ways that are immediately noticeable to viewers. HitPaw's video enhancement pipeline specifically addresses these real-world shooting conditions — the Face Soft model reduces noise and blur in facial regions where viewers naturally focus their attention, the Portrait Restore model uses multi-frame fusion to reconstruct detail from subtly different frames in a sequence, and the general restoration models clean up the broader scene. The result is polished, professional-looking video that retains the authentic atmosphere of the original event while meeting the visual quality standards that audiences expect from professional content.

**Restoring and upscaling legacy family media.** Archives of family photographs and home videos represent irreplaceable personal history, but age, storage conditions, and the technical limitations of older recording equipment often leave these treasures in poor condition. HitPaw's image and video enhancement capabilities are well suited to the delicate work of restoring legacy media. The diffusion-based generative models can reconstruct facial features in old, heavily compressed photographs of relatives that may be the only surviving visual record. The video restoration pipeline handles the unique challenges of old footage — film grain, analog noise, stabilization issues, and generational quality loss from repeated copying. The multi-frame fusion approach is especially valuable here, as the subtle differences between frames of slightly shaky old video provide complementary information that the model can aggregate to reconstruct detail that would be unrecoverable from any single frame alone.
