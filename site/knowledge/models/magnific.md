---
title: "Magnific AI — Image Upscaling & Enhancement"
description: "AI-powered upscaling, relighting, style transfer, and enhancement models integrated as ComfyUI partner nodes."
sidebarTitle: "Magnific"
---

import ReqHint from "/snippets/tutorials/partner-nodes/req-hint.mdx";
import UpdateReminder from "/snippets/tutorials/update-reminder.mdx";

**Magnific** is a professional-grade AI image enhancement platform powered by Freepik, offering a comprehensive suite of generative upscaling, relighting, style transfer, and skin enhancement capabilities. Unlike traditional upscalers that merely interpolate pixels, Magnific uses generative AI to "hallucinate" new details — adding texture to surfaces, sharpening edges, and reconstructing lost information — making it ideal for photographers, concept artists, game designers, and anyone working with low-resolution or compressed imagery. The Magnific partner nodes for ComfyUI expose five core workflows directly within your pipeline: Precise Upscale for faithful enlargement based on GigaPixel technology, Creative Upscale for AI-driven detail generation up to 16x magnification, Style Transfer for transforming photos into illustrations or paintings, Relight for re-imagining scene lighting, and Skin Enhancer for portrait refinement. Each workflow is powered by dedicated AI engines — Illusio for illustration, Sharpy for photography, and Sparkle as the balanced default — and controlled via intuitive sliders for Creativity, HDR micro-contrast, and Resemblance fidelity. Whether you're restoring old family photos, upscaling AI-generated concept art for print production, or adding cinematic lighting to a 3D render, Magnific brings studio-grade image processing into your ComfyUI node graph without requiring local GPU hardware.

<ReqHint/>
<UpdateReminder/>

## Available workflows

### Precise Upscale — Faithful high-fidelity enlargement

The **Precise Upscale** workflow enlarges images while staying strictly faithful to the original source. Built on top of GigaPixel technology with AI-driven enhancement, it excels at photo restoration, upscaling compressed JPEGs, and preparing images for print where accuracy matters more than creative reinterpretation. Unlike Creative Upscale, Precise mode does not hallucinate new content — it cleans up artifacts, sharpens details that are already present, and produces a clean enlargement that looks natural at any scale factor up to 4x. This is the workflow to reach for when you need a pixel-perfect upscale of a treasured photograph or a faithful enlargement of product imagery for e-commerce.

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_magnific_image_upscale_precise&utm_source=docs">
    Run Magnific Precise Upscale on cloud-hosted ComfyUI — no local GPU needed.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_magnific_image_upscale_precise.json">
    Download the workflow JSON.
  </Card>
</CardGroup>

### Creative Upscale — Generative detail up to 16x

The **Creative Upscale** workflow is where Magnific's generative AI truly shines. It can magnify images up to 16x (with a maximum of 10,000 pixels per dimension), and at each scale step the AI fills in new detail — grass blades, fabric weave, skin pores, brick textures — that wasn't in the original image. The Creativity slider (0–10) controls this tradeoff: at 0, the output is nearly identical to Precise mode; at 10, the AI freely adds significant new content guided by your text prompt. The HDR slider fine-tunes micro-contrast for crispness, and the Resemblance slider lets you dial back creative liberty when you want the output to stay closer to the source. Combined with the AI engine selector (Illusio for illustrations, Sharpy for photography, Sparkle for balanced results), Creative Upscale is the go-to for breathing life into low-resolution concept art, AI-generated images bound for print, or any scenario where more detail equals more impact.

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_magnific_image_upscale_creative&utm_source=docs">
    Run Magnific Creative Upscale on cloud-hosted ComfyUI — scale images up to 16x with AI-generated detail.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_magnific_image_upscale_creative.json">
    Download the workflow JSON.
  </Card>
</CardGroup>

### Style Transfer — Photo to illustration, painting, and more

The **Style Transfer** workflow transforms the artistic medium of any input image, turning photographs into oil paintings, line illustrations, watercolors, anime-style art, or any custom aesthetic you can describe. Rather than just applying a filter overlay, Magnific's approach rebuilds the image in the target style at the structural level — brush strokes follow contours, color palettes shift organically, and textures match the chosen medium. This makes it far more convincing than conventional style filters. It pairs naturally with Creative Upscale: first transfer the style, then upscale the result for maximum detail. Digital artists and illustrators use it to generate style-consistent reference sheets, while marketers use it to give product photos a unified branded aesthetic.

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_magnific_image_style_transfer&utm_source=docs">
    Run Magnific Style Transfer on cloud-hosted ComfyUI — transform photos into illustrations and paintings.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_magnific_image_style_transfer.json">
    Download the workflow JSON.
  </Card>
</CardGroup>

### Relight — Re-imagine scene lighting

The **Relight** workflow gives you full control over the lighting of any image. You can change the direction and intensity of the primary light source, adjust the ambient color temperature to shift between warm sunset tones and cool blue-hour moods, and add rim or fill lights to sculpt the subject. This is especially powerful for product photography, where consistent lighting across a catalog is essential, and for portrait retouching, where a subtle catch light or softer shadows can dramatically improve skin presentation. The result is not a flat brightness adjustment but a physically plausible re-lighting — shadows cast in new directions, highlights appear on new surfaces, and the overall atmosphere transforms convincingly.

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_magnific_image_relight&utm_source=docs">
    Run Magnific Relight on cloud-hosted ComfyUI — re-light any image with directional control.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_magnific_image_relight.json">
    Download the workflow JSON.
  </Card>
</CardGroup>

### Skin Enhancer — Portrait and skin refinement

The **Skin Enhancer** workflow is purpose-built for portrait photography and character close-ups. It smooths skin texture naturally — reducing blemishes, evening out skin tone, and softening fine lines — without the waxy, plastic look that plagues many automated beauty retouching tools. It also handles facial expression optimization, subtly adjusting the mouth and eye area for a more natural or polished appearance. For portrait photographers, e-commerce models, and game character renders, this workflow provides a one-click polish step that dramatically improves final image quality while preserving natural skin detail and pore texture.

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_magnific_skin_enhancer&utm_source=docs">
    Run Magnific Skin Enhancer on cloud-hosted ComfyUI — natural portrait retouching and skin optimization.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_magnific_skin_enhancer.json">
    Download the workflow JSON.
  </Card>
</CardGroup>

## Use cases

**Restoring old or compressed photographs.** When you scan a vintage family photo or download a heavily compressed JPEG from social media, the result is often soft, noisy, and lacking detail. Magnific's Precise Upscale workflow cleans up compression artifacts, sharpens existing detail, and enlarges the image to a printable resolution — all without inventing features that weren't there. For photos that are damaged or missing large areas of detail, Creative Upscale can step in to reconstruct textures and fill gaps in a visually plausible way, guided by a text description of what the original scene likely looked like.

**Upscaling AI-generated art for print and merchandise.** Generative AI image models produce stunning results, but they typically output at resolutions far too low for T-shirts, posters, or gallery prints. The Creative Upscale workflow with the Illusio engine takes a 1024×1024 AI illustration and scales it to 8K or beyond, adding coherent brush-like detail at each step. The Creativity slider ensures the output matches your intent — low creativity for faithful enlargement, high creativity when you want the AI to reinterpret and enrich the original concept.

**Product photography with consistent lighting.** E-commerce teams need every product shot to look cohesive, but location shoots or user-submitted photos vary wildly in lighting. Magnific's Relight workflow lets you standardize the lighting across an entire catalog — rotate the primary light source, match color temperatures, and add consistent catch lights — all without reshooting. Combined with Precise Upscale for clean enlargement and Skin Enhancer for any human models in the frame, you can produce studio-grade product imagery entirely from within ComfyUI.
