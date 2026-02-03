# Upwork Designer Posting — Ready to Use

This folder contains everything needed to post the designer job on Upwork.

## Files

| File | Purpose |
|------|---------|
| `upwork-fields.md` | Copy/paste content for title and summary |
| `design-brief.md` | Source markdown for the attached brief |
| `design-brief.pdf` | **Ready to attach** — the compiled design brief with screenshots |
| `screenshots/` | Source images used in the brief |

## Ready to Post

The PDF is already generated with all screenshots embedded.

---

## Upwork Form Fields — Complete Guide

### Title (3-10 words gets 20-30% more proposals)
```
Designer for AI Tool Landing Pages — Figma
```
*(7 words)*

### Job Category & Specialty

| Field | Selection |
|-------|-----------|
| **Category** | Design & Creative |
| **Specialty** | Web Design → Landing Page Design |

*(Alternative: UX/UI Design → Web App Design)*

### Skills

**Mandatory Skills** (select these):
- Figma
- Web Design
- Landing Page Design
- UI Design
- UX Design

**Nice-to-Have Skills** (select if available):
- Responsive Design
- Mobile UI Design
- Design Systems
- Prototyping

### Tools (optional)
- Figma

### Experience Level
```
Intermediate
```
*(Expert also works if budget allows going to $2k+)*

### Budget
```
Fixed Price: $800 - $1,500
```

### Scope
```
Medium
```

### Duration
```
1 to 3 months
```
*(Actual work is 2-3 weeks, but Upwork requires a range)*

---

## Other Preferences

### Screening Questions

Add 1-2 of these:

**Question 1:**
```
Please share a link to a portfolio piece showing a landing page or product page you designed.
```

**Question 2:**
```
Have you designed for technical/developer audiences or creative tools before? Describe briefly.
```

### Location
```
Worldwide
```
*(Or limit to specific regions if preferred)*

### English Level
```
Fluent
```

### Languages
```
English (required)
```

### Hiring Preferences

| Preference | Selection |
|------------|-----------|
| **Freelancer type** | Independent freelancers (not agencies) |
| **Rising talent** | Include rising talent (good for finding new designers) |
| **Upwork history** | No preference (or "Any job success score") |

### Hours per Week
```
Less than 30 hrs/week
```

### Project Type
```
One-time project
```

---

## Attachments

Attach these files:
1. **`design-brief.pdf`** — The full design brief with screenshots
2. *(Optional)* 1-2 key screenshots directly: templates gallery, n8n reference

---

## Summary Field (under 150 words for higher hiring rates)

Copy from `upwork-fields.md` — it's ~100 words, with full details in the attached PDF.

## Screenshots Included

| File | Description |
|------|-------------|
| `templates-gallery.png` | Grid of template cards from cloud.comfy.org |
| `comfyui-interface.png` | ComfyUI editor showing connected nodes |
| `workflow-graph.png` | A workflow's node graph view |
| `before-after-upscale.png` | Before/after from upscaling template |
| `api_topaz_image_enhance-1.png` | Before image (enhancement template) |
| `api_topaz_image_enhance-2.png` | After image (enhancement template) |
| `video-output.png` | Frame from video generation template |
| `n8n-reference.png` | Screenshot of the n8n page layout |

## If You Need to Regenerate the PDF

```bash
cd docs/upwork-designer-posting
pandoc design-brief.md \
  -o design-brief.pdf \
  --pdf-engine=xelatex \
  -V geometry:margin=1in \
  -V colorlinks=true \
  -V linkcolor=blue \
  -V urlcolor=blue
```

## Notes

- **Don't share raw JSON files** — designers won't understand them
- **GitHub link provides credibility** (40k stars)
- **Brand kit** — have ready to share after hiring (logos, colors, fonts)

## Alternative Platforms

Consider also posting on:
- **Dribbble Jobs** (dribbble.com/jobs) — Higher design quality, ~$100-$200 to post
- **Contra** (contra.com) — No fees, growing platform
