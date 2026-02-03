# AGENTS.md — ComfyUI Template Site

> **Purpose**: SEO-optimized static site for browsing ComfyUI workflow templates with "Try on Cloud" CTAs.

## Quick Start

```bash
# From workspace root (workflow_templates/)
npm run site:install   # Install site dependencies
npm run site:sync      # Sync templates from ../templates/ (MUST run first)
npm run site:dev       # Start dev server at localhost:4321
npm run site:build     # Build (skips AI generation by default)

# From site/ folder
npm install
npm run sync           # Sync templates
npm run dev            # Dev server
SKIP_AI_GENERATION=true npm run build  # Build without AI
```

## Commands Reference

| Command | Description |
|---------|-------------|
| `npm run sync` | Sync top 50 templates + thumbnails from `../templates/` |
| `npm run generate:ai` | Generate AI content (requires `OPENAI_API_KEY`) |
| `npm run generate:previews` | Generate workflow graph preview images |
| `npm run dev` | Start Astro dev server (hot reload) |
| `npm run build` | Full build (runs prebuild: sync → ai → previews → astro) |
| `npm run preview` | Preview production build locally |

## Architecture Overview

```
site/
├── scripts/
│   ├── sync-templates.ts      # Syncs templates + thumbnails from source
│   ├── generate-ai.ts         # GPT-4o content generation pipeline
│   └── generate-previews.ts   # Canvas-based workflow graph renderer
├── src/
│   ├── content/
│   │   ├── config.ts          # Zod schema for template data
│   │   └── templates/         # Generated JSON (git-ignored)
│   ├── components/
│   │   ├── TemplateCard.astro       # Card for listing grid
│   │   ├── ThumbnailDisplay.astro   # Handles thumbnail variants
│   │   └── SEOHead.astro            # Meta tags, structured data
│   ├── layouts/
│   │   └── BaseLayout.astro   # Shared header/footer with Tailwind
│   └── pages/
│       ├── index.astro        # Homepage (redirects to /templates/)
│       └── templates/
│           ├── index.astro    # Template listing grid
│           └── [slug].astro   # Template detail page
├── knowledge/                 # AI prompt context
│   ├── prompts/system.md      # GPT-4o system prompt
│   └── models/                # Model documentation (flux.md, qwen.md)
├── overrides/templates/       # Human-edited content (committed, preserved)
├── public/
│   ├── thumbnails/            # Synced from ../templates/
│   └── previews/              # Generated workflow images
└── .content-cache/            # AI response cache (git-ignored)
```

## Key Concepts

### Data Flow

```
templates/index.json          →  sync-templates.ts  →  src/content/templates/*.json
templates/{name}-{n}.webp     →  sync-templates.ts  →  public/thumbnails/
src/content/templates/*.json  →  generate-ai.ts     →  src/content/templates/*.json (enriched)
templates/{name}.json         →  generate-previews  →  public/previews/{name}.png
```

### Thumbnail Variants

Templates have `thumbnailVariant` field that controls display behavior:

| Variant | Behavior | Requirements |
|---------|----------|--------------|
| `compareSlider` | Before/after slider | 2 thumbnails |
| `hoverDissolve` | Fades to 2nd image on hover | 2 thumbnails |
| `zoomHover` | Enhanced zoom on hover | 1+ thumbnails |
| (default) | Simple zoom | 1+ thumbnails |

Animated `.webp` files show a play overlay icon.

### Human Overrides

To preserve custom content for a specific template:

1. Create `overrides/templates/{template-name}.json`
2. Add fields to override (AI-generated fields will be replaced):
   ```json
   {
     "extendedDescription": "Custom marketing copy...",
     "humanEdited": true
   }
   ```
3. Templates with `humanEdited: true` skip AI regeneration entirely

## Critical Tips (Hard-Learned Lessons)

### Order of Operations
- **Always run `sync` before `generate:ai`** — sync creates the base JSON files with thumbnails
- **The `prebuild` script handles ordering** — just run `npm run build`

### Thumbnail Preservation
- `generate-ai.ts` preserves `thumbnails` array when updating content
- If thumbnails disappear, re-run `npm run sync`

### Environment Variables
- `OPENAI_API_KEY` — Required for AI generation (or use `SKIP_AI_GENERATION=true`)
- `SKIP_AI_GENERATION=true` — Uses placeholder content, no API calls

### Git-Ignored Directories
- `src/content/templates/` — Regenerated on build
- `public/thumbnails/` — Synced from source
- `public/previews/` — Generated workflow images
- `.content-cache/` — AI response cache

### Schema Changes
- Update `src/content/config.ts` when adding new fields
- Ensure `sync-templates.ts` populates new fields
- Ensure `generate-ai.ts` preserves synced fields

### Tailwind CSS
- Uses Tailwind v4 with Vite plugin
- Global styles in `src/styles/global.css`
- Import global.css in `BaseLayout.astro`

### URL Structure
- Template pages: `/templates/{name}/`
- Listing: `/templates/`
- Homepage redirects to listing

### CTA Links
- "Try on Cloud" links to: `https://www.comfy.org/get-started?template={name}`
- Update this URL if cloud onboarding changes

## Common Tasks

### Add a New Template Field

1. Update schema in `src/content/config.ts`
2. Update `sync-templates.ts` to extract the field
3. Update page templates to display it
4. If AI-generated, update `generate-ai.ts` prompts

### Change Top N Templates

Edit `sync-templates.ts`:
```typescript
const topN = getTop50ByUsage(allTemplates);  // Change 50 to desired number
```

### Add a New Thumbnail Variant

1. Add to schema enum in `src/content/config.ts`
2. Add rendering logic in `ThumbnailDisplay.astro`
3. Update `TemplateCard.astro` if card behavior differs

### Debug Missing Thumbnails

```bash
# Check if thumbnails exist in source
ls ../templates/ | grep "template-name"

# Check if synced correctly
cat src/content/templates/template-name.json | grep thumbnails

# Check public folder
ls public/thumbnails/ | grep "template-name"

# Re-sync if missing
npm run sync
```

## Documentation Links

- [PRD (Product Requirements)](./docs/PRD.md) — Goals, success metrics, milestones
- [TDD (Technical Design)](./docs/TDD.md) — Architecture decisions, SEO strategy
- [Roadmap](./docs/ROADMAP.md) — Future improvements

## External Resources

- [Astro Documentation](https://docs.astro.build/)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [ComfyUI](https://github.com/comfyanonymous/ComfyUI)
- [Workflow Templates README](../README.md) — How templates are structured, thumbnail types
