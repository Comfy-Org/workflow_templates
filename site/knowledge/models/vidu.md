---
title: "Vidu"
description: "Vidu — the AI video generation model by Shengshu AI. Fast generation, strong anime and 2D animation quality, with multi-input (text, image, subject reference, start/end frames, video extension) across Q1, Q2, and Q3 series."
sidebarTitle: "Vidu"
---

import ReqHint from "/snippets/tutorials/partner-nodes/req-hint.mdx";
import UpdateReminder from "/snippets/tutorials/update-reminder.mdx";

**Vidu** is the AI video generation model developed by Shengshu AI, known for its exceptional speed and outstanding quality — especially in anime, 2D animation, and stylized content. Vidu has gone through three major generation series — **Vidu Q1**, **Vidu Q2**, and **Vidu Q3** — each building on the last to offer richer input modalities, stronger motion control, faster generation, and higher scene consistency. What sets Vidu apart from the competition is its remarkable generation speed: some workflows can produce a high-quality video clip in as little as ten seconds. This makes Vidu an excellent choice for rapid prototyping, iterative creative work, and any scenario where turnaround time matters. In addition to raw speed, Vidu excels at anime and 2D animation rendering — character-driven scenes, stylized backgrounds, and expressive motion sequences look noticeably better on Vidu than on many other video models. The **Vidu Q1** series laid the foundation with support for text-to-video, image-to-video, reference-based video, start-to-end frame interpolation, and video extension, giving creators multiple entry points into video generation. **Vidu Q2** upgraded the engine significantly: it is up to three times faster than Q1, introduces the strongest multimodal understanding in the Vidu lineup, supports up to seven subject reference images for consistent character generation, enables finer micro-motion and facial expression control, and adds comprehensive camera language control including push, pull, pan, tilt, dolly zoom, tracking shots, and close-ups. It also delivers more stable scene composition when generating multi-character interactions. **Vidu Q3** is the latest generation, focusing on multi-shot narrative structure and upgraded scene consistency, making it ideal for longer-form storytelling where visual coherence across multiple clips is essential. Whether you need a quick animated loop, a realistic product demo, an expressive character performance, or a cinematic multi-shot sequence, Vidu offers a generation mode tailored to the task. With workflows available across all three series, ComfyUI users can easily integrate Vidu into their production pipeline, choosing the right balance of speed, quality, and control.

<ReqHint/>
<UpdateReminder/>

## Available workflows

### Text to Video (Q1)

Generate a video directly from a text prompt using the Vidu Q1 engine. This is Vidu’s foundational text-to-video workflow: you provide a descriptive prompt, and it produces a video that matches the scene, style, and motion described. Q1 handles a wide range of styles — from realistic landscapes and product shots to anime characters and fantastical scenes — making it a great all-rounder for quick video generation from pure text.

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_vidu_text_to_video&utm_source=docs">
    Run the Text to Video (Q1) workflow on ComfyCloud with a single click.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_vidu_text_to_video.json">
    Download the Text to Video (Q1) workflow JSON.
  </Card>
</CardGroup>

### Image to Video (Q1)

Transform any reference image into a moving video with the Vidu Q1 image-to-video workflow. Provide a start image and an optional text prompt to guide the motion, and Vidu animates the scene while preserving the original composition and key visual details. This is especially useful when you have a specific character, setting, or frame in mind and want to breathe life into it. Q1 delivers smooth animation with good adherence to the reference image.

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_vidu_image_to_video&utm_source=docs">
    Run the Image to Video (Q1) workflow on ComfyCloud with a single click.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_vidu_image_to_video.json">
    Download the Image to Video (Q1) workflow JSON.
  </Card>
</CardGroup>

### Subject Reference to Video (Q1)

Generate a video that maintains a consistent subject across the entire clip by supplying one or more reference images of the character or object. In this Q1 workflow, Vidu learns the subject’s appearance from the reference and animates it following your text prompt. This is ideal for maintaining character identity in animated shorts, product showcases, or any scenario where you need the same entity to appear consistently from frame to frame.

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_vidu_reference_to_video&utm_source=docs">
    Run the Subject Reference to Video (Q1) workflow on ComfyCloud.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_vidu_reference_to_video.json">
    Download the Subject Reference to Video (Q1) workflow JSON.
  </Card>
</CardGroup>

### Start/End Frame to Video (Q1)

Provide both a start frame and an end frame, and let Vidu Q1 interpolate the motion between them. This workflow is perfect for creating smooth transitions, looping animations, or specific motion arcs where you have precise control over the beginning and ending states. The model fills in the intermediate frames naturally, producing a coherent video that bridges the two keyframes.

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_vidu_start_end_to_video&utm_source=docs">
    Run the Start/End Frame to Video (Q1) workflow on ComfyCloud.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_vidu_start_end_to_video.json">
    Download the Start/End Frame to Video (Q1) workflow JSON.
  </Card>
</CardGroup>

### Video Extension (Q1)

Extend an existing video clip by adding new content at either the beginning or the end with the Q1 video extension workflow. Provide a base video along with an optional text prompt, and Vidu generates additional frames that seamlessly blend with the original footage. This is useful when a generated clip is too short and you need to lengthen it, or when you want to create a longer narrative sequence from a shorter segment.

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_vidu_video_extension&utm_source=docs">
    Run the Video Extension (Q1) workflow on ComfyCloud.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_vidu_video_extension.json">
    Download the Video Extension (Q1) workflow JSON.
  </Card>
</CardGroup>

### Text to Video (Q2)

Generate video from text using the upgraded Vidu Q2 engine, which is up to three times faster than Q1 while delivering significantly better motion quality, facial expression detail, and camera control. Q2 introduces the strongest multimodal understanding in Vidu's lineup — it interprets complex prompts with multiple characters, scene elements, and action descriptions more accurately. The model also supports up to seven subject reference images for consistent character rendering across the generated clip. For creators who need speed without compromising quality, Q2 text-to-video is the sweet spot.

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_vidu_q2_t2v&utm_source=docs">
    Run the Text to Video (Q2) workflow on ComfyCloud.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_vidu_q2_t2v.json">
    Download the Text to Video (Q2) workflow JSON.
  </Card>
</CardGroup>

### Image to Video (Q2)

Convert a reference image into a video with the Q2 engine, benefiting from faster generation, richer motion, and finer camera language control including dolly zooms, tracking shots, pan, tilt, and close-ups. Q2 excels at preserving the composition and key visual elements of the input image while adding natural, expressive motion. The improved multimodal understanding also means that text prompts paired with images are interpreted with higher fidelity, leading to better alignment between what you describe and what the video shows.

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_vidu_q2_i2v&utm_source=docs">
    Run the Image to Video (Q2) workflow on ComfyCloud.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_vidu_q2_i2v.json">
    Download the Image to Video (Q2) workflow JSON.
  </Card>
</CardGroup>

### Subject Reference to Video (Q2)

Maintain subject consistency with up to seven reference images using the Q2 engine. This is Vidu Q2's upgraded reference-to-video workflow: it supports multiple reference inputs for the same subject, allowing the model to learn appearance details from different angles, lighting conditions, or poses. The result is a video where the character or object stays on-model throughout the entire clip. Q2 also adds finer control over micro-motion — subtle movements like breathing, blinking, or clothing flutter — making characters feel more alive and natural.

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_vidu_q2_r2v&utm_source=docs">
    Run the Subject Reference to Video (Q2) workflow on ComfyCloud.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_vidu_q2_r2v.json">
    Download the Subject Reference to Video (Q2) workflow JSON.
  </Card>
</CardGroup>

### First/Last Frame to Video (Q2)

Generate a video from a first frame and a last frame using the faster Q2 engine. Like its Q1 counterpart, this workflow interpolates motion between two keyframes, but Q2 delivers smoother transitions, more natural motion arcs, and better handling of complex scenes with multiple moving elements. The speed improvement — up to three times faster than Q1 — makes iterative experimentation practical: tweak your keyframes, regenerate, and see results in seconds rather than minutes.

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_vidu_q2_flf2v&utm_source=docs">
    Run the First/Last Frame to Video (Q2) workflow on ComfyCloud.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_vidu_q2_flf2v.json">
    Download the First/Last Frame to Video (Q2) workflow JSON.
  </Card>
</CardGroup>

### Text to Video (Q3)

Generate video from text with Vidu Q3, the latest generation optimized for multi-shot narrative and enhanced scene consistency. Q3 builds on everything Q2 achieved — speed, multimodal understanding, camera control — and adds improved coherence across longer video outputs. If you need to generate multiple clips that feel like they belong to the same visual world, or if your project demands consistent lighting, color grading, and environmental details across different shots, Q3 is the generation engine to use. It is especially well-suited for storytelling workflows where visual continuity between cuts matters.

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_vidu_q3_text_to_video&utm_source=docs">
    Run the Text to Video (Q3) workflow on ComfyCloud.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_vidu_q3_text_to_video.json">
    Download the Text to Video (Q3) workflow JSON.
  </Card>
</CardGroup>

### Image to Video (Q3)

Transform a reference image into video with the latest Vidu Q3 engine. This workflow retains all the improvements from earlier image-to-video workflows — composition preservation, natural motion, optional text guidance — while adding the upgraded scene consistency and narrative awareness that Q3 brings. Scene elements like lighting direction, character appearance, and environmental details stay stable throughout the generated clip, making Q3 image-to-video a strong choice for professional production work or any project where visual fidelity and coherence are paramount.

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_vidu_q3_image_to_video&utm_source=docs">
    Run the Image to Video (Q3) workflow on ComfyCloud.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_vidu_q3_image_to_video.json">
    Download the Image to Video (Q3) workflow JSON.
  </Card>
</CardGroup>

## Use cases

**Rapid ideation and creative prototyping.** When you want to explore multiple visual directions quickly — character poses, scene compositions, or motion styles — Vidu's speed advantage matters. Generating a clip in around ten seconds means you can iterate through dozens of variations in minutes, compare results side by side, and converge on the best direction without interrupting your creative flow. This is especially valuable for pre-visualization, mood boards, and early-stage concept development where quantity and speed outweigh polished final output.

**Anime and 2D animation production.** Vidu's standout strength is its anime and 2D animation quality. Character-driven scenes, stylized backgrounds, expressive facial animations, and action sequences with cartoon aesthetics look distinctly better on Vidu than on models primarily optimized for photorealistic output. Animation studios, indie animators, and content creators working in anime or illustrated styles will find Vidu's Q1, Q2, and Q3 series all capable of maintaining character consistency, smooth line art, and appealing motion dynamics that match the hand-drawn look.

**Multi-shot storytelling with consistent visual identity.** For narrative projects that span multiple clips — a short film, a commercial sequence, or an educational series — Vidu Q3 excels at maintaining scene consistency across shots. The same character, the same lighting, the same environment — each clip feels like it belongs in the same visual world. Combined with Q2's camera language controls (push, pull, pan, tilt, tracking, close-up), creators can craft coherent multi-shot sequences with professional-grade visual direction.

**Product showcase with subject consistency.** E-commerce, marketing, and product design teams can use Vidu's reference-to-video workflows to generate product demos where the item stays visually consistent across the entire video. Supply reference images of the product from multiple angles, describe the motion (rotating, being held, transitioning between settings), and Vidu produces a polished showcase clip. Q2's seven-reference capacity and micro-motion control make this particularly effective for detailed product presentations.
