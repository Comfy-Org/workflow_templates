---
title: "MiniMax (Hailuo)"
description: "MiniMax Hailuo — AI video generation models by MiniMax. Offers T2V-01 text-to-video, I2V-01 image-to-video, I2V-01-Director with 15 camera controls, I2V-01-Live for motion photo-style output, and S2V-01 subject-reference video generation."
sidebarTitle: "MiniMax (Hailuo)"
---

import ReqHint from "/snippets/tutorials/partner-nodes/req-hint.mdx";
import UpdateReminder from "/snippets/tutorials/update-reminder.mdx";

**MiniMax** — also known as **Hailuo** (海螺AI) — delivers a comprehensive suite of AI video generation models that balance photorealistic quality with animated expressiveness, all under the Hailuo brand. MiniMax's video models are organized into three main generation paradigms: **T2V-01** for text-to-video, **I2V-01** for image-to-video (along with its Director and Live variants), and **S2V-01** for subject-consistent video generation from reference images. What makes MiniMax stand out is its versatility across visual styles: the same model handles cinematic realism, stylized animation, and dynamic motion sequences with equal competence. T2V-01 provides strong text-to-video generation with broad scene diversity — from sweeping landscapes and architectural interiors to character-driven narratives and abstract visual compositions. The I2V-01 series adds image-based input, preserving the reference image's composition while generating natural, well-paced camera movement. For creators who want fine-grained control over camera direction, I2V-01-Director introduces the Director mode, offering fifteen distinct camera control types — push, pull, pan, tilt, boom up, boom down, pedestal, truck left, truck right, dolly in, dolly out, orbit left, orbit right, zoom in, and zoom out — giving filmmakers and video editors professional-grade shot composition without leaving the text prompt interface. I2V-01-Live takes a different approach: it treats a static image like a "living photo," applying subtle, natural motion that simulates breathing life into what would otherwise be a still scene. And S2V-01 rounds out the lineup by enabling subject-reference video generation: provide a reference image of a character or object, describe the desired action, and the model generates a video that keeps the subject visually consistent throughout. Whether you need realistic footage for commercial use, animated sequences for social media, or stylized visuals for creative projects, MiniMax Hailuo provides a model variant matched to the task.

<ReqHint/>
<UpdateReminder/>

## Available workflows

### Text to Video (T2V-01)

Generate video directly from a text description using the T2V-01 model. This is MiniMax's core text-to-video workflow: you write a prompt describing the scene, characters, motion, and atmosphere, and T2V-01 produces a video that matches your intent. The model handles a wide variety of visual styles equally well — photorealistic cityscapes, animated fantasy worlds, product close-ups, and abstract motion sequences — without requiring style-specific configuration. Scene diversity is a strength: T2V-01 can compose complex multi-element scenes with believable lighting, shadow, and depth of field in a single pass.

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_hailuo_minimax_t2v&utm_source=docs">
    Run the Text to Video (T2V-01) workflow on ComfyCloud with a single click.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_hailuo_minimax_t2v.json">
    Download the Text to Video (T2V-01) workflow JSON.
  </Card>
</CardGroup>

### Image to Video (I2V-01)

Transform a reference image into a video using the I2V-01 model. Provide a still image — whether it is a photograph, a digital painting, or a frame from another video — and I2V-01 animates it while preserving the original composition, color palette, and key visual elements. The motion generated is natural and well-paced: camera movements feel intentional rather than random, and the video stays true to the reference frame's visual structure. This workflow is ideal for bringing static artwork to life, animating concept art, or creating video content from a base image without losing the original aesthetic.

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_hailuo_minimax_i2v&utm_source=docs">
    Run the Image to Video (I2V-01) workflow on ComfyCloud with a single click.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_hailuo_minimax_i2v.json">
    Download the Image to Video (I2V-01) workflow JSON.
  </Card>
</CardGroup>

### Subject Reference to Video (S2V-01)

Generate a video that maintains a consistent subject throughout the clip by providing a reference image of the subject. The S2V-01 model — "Subject to Video" — learns the visual identity of the character, object, or creature from the reference image and renders it consistently across all generated frames. You describe the desired action or scene in a text prompt, and S2V-01 places the reference subject into that context while preserving its appearance, proportions, and key visual features. This is particularly powerful for brand mascots, character-driven narratives, or any scenario where a specific entity must stay visually on-model from the first frame to the last.

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_hailuo_minimax_video&utm_source=docs">
    Run the Subject Reference to Video (S2V-01) workflow on ComfyCloud.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_hailuo_minimax_video.json">
    Download the Subject Reference to Video (S2V-01) workflow JSON.
  </Card>
</CardGroup>

## Use cases

**Content creation with cinematic camera control.** For video creators, filmmakers, and social media producers who need specific camera movements — a dramatic dolly-in for emphasis, a pan across a landscape, an orbit around a subject — I2V-01-Director mode provides fifteen professional camera control types through the T2V-01 and I2V-01 models. Describe the shot you want, specify the camera movement in your prompt, and Hailuo executes it with consistent framing and natural motion. This eliminates the need for complex post-production camera rigging or manual keyframing.

**Animating concept art and illustrations.** Artists and designers can use I2V-01 to turn static illustrations, concept art, or mood boards into animated reference clips. A character concept drawing becomes a living pose; an environment painting gains subtle motion in foliage and lighting. I2V-01-Live takes this further by adding the "living photo" treatment — gentle, natural micro-motions like a character's breathing, hair stirring in a breeze, or ambient light flickering — making still images feel alive without changing their fundamental composition.

**Brand content with consistent product or character identity.** Marketing teams and brand studios can rely on S2V-01 to generate videos where the brand mascot or product stays visually consistent across different scenes and actions. Provide one reference image of the subject, describe each new scene with a text prompt, and generate multiple clips where the same character or object appears identically in different contexts. This is invaluable for building cohesive visual campaigns, animated explainer series, or product showcase sequences without the manual labor of traditional character rigging or frame-by-frame consistency checking.

**Rapid scene exploration from text or images.** Whether starting from a blank prompt (T2V-01) or an existing image (I2V-01), Hailuo enables quick exploration of different visual directions. A single prompt can yield varied interpretations of the same scene, allowing creators to compare compositions, motion styles, and atmospheres before committing to a final direction. The combination of strong prompt adherence and broad style coverage means T2V-01 serves as a reliable ideation tool for directors, game designers, and any creative professional exploring visual concepts before entering full production.
