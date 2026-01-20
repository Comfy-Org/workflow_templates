# ComfyUI Template Site

A static site for browsing and discovering ComfyUI workflow templates.

## Quick Start

```bash
cd site
npm install
npm run sync       # Sync templates from ../templates/
npm run build      # Build the static site
npm run dev        # Start dev server at localhost:4321
```

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start local dev server at `localhost:4321` |
| `npm run sync` | Sync templates from templates/ directory |
| `npm run generate:ai` | Generate AI content for templates |
| `npm run generate:previews` | Generate workflow preview images |
| `npm run build` | Build production site to `./dist/` |
| `npm run preview` | Preview build locally |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key (required for AI generation) |
| `SKIP_AI_GENERATION` | Set to `true` to use placeholders instead of AI |

## Directory Structure

```
site/
├── scripts/
│   ├── sync-templates.ts     # Template sync script
│   ├── generate-ai.ts        # AI content generation
│   └── generate-previews.ts  # Workflow preview generation
├── knowledge/
│   ├── prompts/
│   │   └── system.md         # GPT-4o system prompt
│   └── models/               # Model documentation
├── overrides/
│   └── templates/            # Human-edited content (committed)
├── src/
│   ├── components/           # Astro components
│   ├── content/templates/    # Generated content (git-ignored)
│   ├── layouts/              # Page layouts
│   └── pages/                # Site pages
├── public/
│   ├── thumbnails/           # Template thumbnails
│   └── previews/             # Workflow preview images
└── .content-cache/           # AI generation cache (git-ignored)
```

## Human Overrides

To preserve custom content that won't be overwritten by AI:

1. Create `overrides/templates/{template-name}.json`
2. Set `humanEdited: true` to skip AI generation entirely
3. Or set individual fields to override (use `null` for AI-generated)

## Learn More

- [Astro Documentation](https://docs.astro.build)
- [ComfyUI](https://github.com/comfyanonymous/ComfyUI)
