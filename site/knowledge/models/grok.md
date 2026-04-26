---
title: "Grok"
description: "Grok by xAI offers powerful image and video generation models with three quality tiers, a distinctive moody aesthetic, and impressive 7-frame reference consistency for video."
sidebarTitle: "Grok"
---

import ReqHint from "/snippets/tutorials/partner-nodes/req-hint.mdx";
import UpdateReminder from "/snippets/tutorials/update-reminder.mdx";

**Grok**, developed by xAI, brings a distinctive visual identity to AI image and video generation that sets it apart from other models on the market. The image generation capabilities are built around three tiers: **grok-imagine-image-pro** delivers the highest quality output with rich detail and superior composition — this is the tier to use when resolution, texture, and visual fidelity matter most; **grok-imagine-image-standard** offers excellent quality at a more accessible computational cost, suitable for everyday content creation, social media visuals, and rapid prototyping; and **grok-imagine-image-beta** provides the fastest turnaround for experimentation and iterative work, generating images in as little as four seconds. What gives Grok its recognizable character is the **moody** aesthetic — the model consistently produces imagery with dramatic lighting, deep shadows, rich color saturation, and a cinematic atmosphere that feels closer to art direction than vanilla photorealism. This makes it especially strong for anime-style illustrations, cyberpunk cityscapes, dark fantasy scenes, and any visual that benefits from a bold, stylized look rather than neutral realism. On the video side, Grok supports text-to-video generation, video editing with text instructions, video extension (extending a clip beyond its original duration), and a standout **reference-to-video** feature that accepts up to seven reference images to maintain character, style, and scene consistency across the generated video. Whether you are creating game concept art, generating social media assets, producing short-form video content, or building visual mood boards, Grok delivers fast, stylistically distinctive results that often look more like finished art than raw generations.

<ReqHint/>
<UpdateReminder/>

## Available workflows

### Text to Image — generate images from text prompts with three quality tiers: pro, standard, and beta

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_grok_text_to_image&utm_source=docs">
    Turn any text description into an image with Grok's three-tier quality system. Use the pro tier for maximum visual fidelity and compositional complexity, the standard tier for everyday image generation at a balanced cost, or the beta tier for rapid prototyping and experimentation.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_grok_text_to_image.json">
    Download the workflow JSON.
  </Card>
</CardGroup>

### Image Edit — edit existing images with natural language instructions

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_grok_image_edit&utm_source=docs">
    Upload an image and describe the changes you want — replace the background with a cyberpunk cityscape, change the color palette to a moody noir look, or add stylized lighting effects. Grok interprets the instruction and produces the edited image while preserving the core composition.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_grok_image_edit.json">
    Download the workflow JSON.
  </Card>
</CardGroup>

### Text to Video — generate video clips from text descriptions

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_grok_video&utm_source=docs">
    Describe a scene in words and Grok generates a matching video clip. The moody aesthetic carries through to video output, producing cinematic shots with the same dramatic lighting and rich color grading that defines Grok's image output.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_grok_video.json">
    Download the workflow JSON.
  </Card>
</CardGroup>

### Video Edit — edit existing videos using text instructions

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_grok_video_edit&utm_source=docs">
    Take an existing video clip and modify it through natural language commands — change the visual style, replace elements within the scene, or adjust the mood and atmosphere. The edit respects the original motion and timing while applying the requested transformation.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_grok_video_edit.json">
    Download the workflow JSON.
  </Card>
</CardGroup>

### Video Extend — extend a video clip beyond its original duration

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_grok_video_extend&utm_source=docs">
    Take a short video clip and extend it forward in time, generating new frames that continue the scene with consistent motion, style, and content. Useful for turning brief clips into longer segments that feel like natural continuations rather than looped repeats.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_grok_video_extend.json">
    Download the workflow JSON.
  </Card>
</CardGroup>

### Reference to Video — generate a video guided by up to 7 reference images for strong visual consistency

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_grok_reference_to_video&utm_source=docs">
    Provide up to seven reference images — character shots, environment references, style frames, or any combination — and Grok generates a video that respects the visual identity of every reference. This ensures characters look the same from frame to frame, environments stay consistent, and the overall aesthetic matches your source material.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_grok_reference_to_video.json">
    Download the workflow JSON.
  </Card>
</CardGroup>

## Use cases

**Concept art and visual development with a built-in aesthetic.** Grok's moody style — dramatic shadows, saturated colors, cinematic lighting — means concept artists and game designers can generate production-quality imagery without extensive post-processing. A character sheet for a dark fantasy game, a cyberpunk street scene for a visual novel, or an anime-style key visual for a promotional campaign all benefit from Grok's natural inclination toward atmospheric, visually striking compositions. The pro tier delivers enough detail and resolution for portfolio pieces and client presentations, while the beta tier at just four seconds per image lets artists rapidly iterate through dozens of variations to find the right composition before committing to the final render.

**Social media content that stands out in the feed.** In a landscape where most AI-generated imagery looks blandly photorealistic, Grok's aesthetic gives content a visual edge. A promotional post for a music release can carry the moody, dramatic atmosphere of the album itself; a gaming clip edited with Grok's video tools can match the visual identity of the game. The speed matters too — creating a batch of social media assets with the beta tier takes minutes, not hours, and the Pro tier can handle hero images for blog banners, thumbnails, and ad creative with the kind of polish that would normally require a designer.

**Short-form video production with consistent characters.** The reference-to-video feature, accepting up to seven reference images, is transformative for creators who need character consistency across multiple shots. Instead of generating a character in one frame and hoping the next shot looks the same, you provide full reference material — front view, profile, environment, style guide — and every generated clip respects the established visual identity. This makes Grok practical for animated shorts, character showreels, and branded video content where consistency is non-negotiable. Combined with Video Extend, a short character animation can be smoothly lengthened into a more substantial clip without visible looping or quality drop.

**Rapid visual brainstorming and mood board assembly.** The combination of sub-five-second image generation, a distinctive aesthetic, and flexible editing makes Grok a powerful tool for the early stages of creative projects. A filmmaker can generate dozens of mood board images exploring different lighting and color palettes for a scene; a product designer can visualize a product in different environments and styles; a writer can generate visual references for characters and settings. Each image comes out of Grok looking intentional rather than generic, which means the mood board itself communicates a visual direction rather than just being a collection of AI slop — and with Image Edit, those initial concepts can be iterated on directly.
