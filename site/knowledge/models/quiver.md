---
title: "Quiver — Text & Image to SVG"
description: "Generate scalable vector graphics from text prompts or convert raster images to clean SVG vectors using Quiver's Arrow AI models."
sidebarTitle: "Quiver"
---

import ReqHint from "/snippets/tutorials/partner-nodes/req-hint.mdx";
import UpdateReminder from "/snippets/tutorials/update-reminder.mdx";

**Quiver** converts your ideas into clean, production-ready SVG vector graphics, whether you start from a text prompt or a raster image. Powered by the **Arrow** model family — including **Arrow 1.1** for fast, general-purpose SVG generation, **Arrow 1.1 Max** for high-fidelity vector output with richer detail, and **Arrow Preview** for rapid iteration — Quiver gives designers, developers, and content creators a direct path from concept to scalable vector art without manual tracing or illustration skills. SVG output from Quiver is genuinely resolution-independent: it can be scaled to any size without quality loss, paths remain editable in vector editing software, and the file sizes stay compact, making it ideal for production use in web design, mobile apps, logos, icons, and print materials. The Quiver partner nodes for ComfyUI expose two core workflows: text-to-SVG for generating original vectors from natural language descriptions, and image-to-SVG for converting existing photographs, sketches, or renders into clean, stylized vector graphics. Arrow 1.1 runs quickly and produces clean geometric output suited for icons and simple illustrations, while Arrow 1.1 Max takes more time but delivers fine details, smoother curves, and more complex compositions — think detailed logos, layered illustrations, and anything that will be scrutinized at large display sizes. The Preview variant offers a lightweight, fast option for exploring prompt ideas before committing to a full Max render. For anyone who has wished they could turn a rough sketch into a crisp SVG or generate a full set of app icons from text descriptions alone, Quiver makes vector generation as straightforward as typing a sentence.

<ReqHint/>
<UpdateReminder/>

## Available workflows

### Text to SVG — Generate vectors from prompts

The **Text to SVG** workflow is the quickest way to create vector graphics from nothing but a description. Type "a minimalist line-art mountain landscape logo" or "a flat-style rocket ship icon", and Quiver's Arrow 1.1 model returns a clean, well-structured SVG file. The output is composed of real vector paths — not bitmap traces — so you can open it in Illustrator, Figma, or Inkscape and edit individual nodes, recolor elements, and scale it to any size. For simple icons and logos, Arrow 1.1 is the ideal choice: it generates fast and produces geometrically tidy results. For more complex illustrations that need finer details, gradient handling, or layered composition, Arrow 1.1 Max delivers significantly richer output with smoother curves and more intricate path structures. The Arrow Preview model lets you test prompt variations rapidly before committing to a full Max render.

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_quiver_text_to_svg&utm_source=docs">
    Run Quiver Text to SVG on cloud-hosted ComfyUI — generate scalable vector graphics from text prompts.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_quiver_text_to_svg.json">
    Download the workflow JSON.
  </Card>
</CardGroup>

### Image to SVG — Convert raster images to vector art

The **Image to SVG** workflow takes any raster image — a photograph, a hand-drawn sketch, a screenshot, or an AI-generated image — and converts it into a clean, scalable SVG vector. Unlike automatic tracing tools that produce bloated, messy paths with thousands of anchor points, Quiver's Arrow models intelligently simplify the visual information into well-formed vector shapes. The output is genuinely editable: paths are clean, curves are smooth, and the color palette is structurally maintained. Arrow 1.1 works well for converting flat illustrations, product photos that need a vector silhouette, or simple graphics where path efficiency matters. Arrow 1.1 Max excels at more complex conversions — detailed portraits, multi-color illustrations, and images where preserving fine edge detail is critical for later editing. The result is a production-ready SVG that can be infinitely scaled, recolored in one click, and used directly in web or print layouts.

<CardGroup cols={2}>
  <Card title="Run on Cloud" icon="cloud" href="https://cloud.comfy.org/?template=api_quiver_image_to_svg&utm_source=docs">
    Run Quiver Image to SVG on cloud-hosted ComfyUI — convert photos and sketches to editable vector graphics.
  </Card>
  <Card title="Download workflow" icon="download" href="https://github.com/Comfy-Org/workflow_templates/blob/main/templates/api_quiver_image_to_svg.json">
    Download the workflow JSON.
  </Card>
</CardGroup>

## Use cases

**Generating app icons and UI assets from text.** Mobile and web developers often need a full set of icons — navigation arrows, settings cog, profile silhouette — but commissioning custom vector illustrations for each one is slow and expensive. With Quiver's Text to SVG workflow using Arrow 1.1, you can generate an entire icon set from descriptive prompts in minutes. Each SVG is clean, lightweight, and ready to drop into a Figma component library or directly into code. Need a specific style? Adjust the prompt — "outline style, 2px stroke, rounded corners" — and regenerate. Arrow 1.1's speed makes it perfect for this iterative, high-volume use case where path efficiency and small file sizes matter.

**Converting sketches and whiteboard concepts to polished vectors.** Product designers brainstorm with pen and paper, but presenting those sketches in a client deck means converting them to clean vector graphics. Snap a photo of the whiteboard or scan the sketch, feed it into the Image to SVG workflow with Arrow 1.1 Max, and Quiver returns an editable vector version with smooth curves and clean fills. From there, you can refine paths, apply brand colors, and incorporate the illustration into slides or prototypes — all without redrawing anything from scratch. The Max model's finer detail handling ensures complex sketch lines and shading nuances are faithfully preserved.

**Creating scalable logos and brand assets.** A logo needs to work at 16 pixels as a favicon and at 10 feet wide on a trade show banner — only real vector graphics can span that range without quality loss. Quiver's Image to SVG workflow with Arrow 1.1 Max takes your existing raster logo (or a photograph of a hand-drawn concept) and produces a clean, editable SVG. Because the output uses proper vector paths, you can tweak curves, extract elements, and export at any resolution for any medium. For entirely new logo concepts, the Text to SVG workflow lets you explore directions — "geometric wolf head, single line art style" — and iterate on the output SVG directly in your vector editor.
