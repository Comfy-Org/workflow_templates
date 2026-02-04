# Template Site — Work Split Plan

## Overview

The template site can be split into **5 independent vertical slices**. Each can be developed in parallel by different engineers, with integration at the end.

---

## Workstream 1: Astro Scaffolding + Pages

**Owner:** Frontend engineer  
**Dependency:** None (can use mock data)

**Scope:**
- Initialize Astro project in `site/`
- Create Content Collections schema (`src/content/config.ts`)
- Build page templates:
  - `/templates/[slug].astro` — detail page
  - `/templates/index.astro` — listing page
  - `/category/[type].astro` — category pages
- Components: `TemplateCard`, `TryOnCloudButton`, `SEOHead`
- Styling (Tailwind or vanilla CSS)

**Mock Data:** Create 3-5 fake template JSON files in `src/content/templates/` to develop against.

**Deliverable:** Working Astro site with hardcoded content that renders template pages.

---

## Workstream 2: Template Sync Script

**Owner:** Backend/scripting engineer  
**Dependency:** None

**Scope:**
- `scripts/sync-templates.ts`
- Read `../templates/index.json`, flatten categories
- Copy thumbnails to `public/thumbnails/`
- Filter to top 50 by `usage` field
- Output individual JSON files to `src/content/templates/`

**Key Decisions:**
- Handle missing `usage` field (default to 0)
- Validate template names match file naming conventions

**Deliverable:** Script that runs `npm run sync` and populates content directory.

---

## Workstream 3: AI Content Generation

**Owner:** ML/backend engineer  
**Dependency:** Workstream 2 (needs template data)

**Scope:**
- `scripts/generate-ai.ts`
- OpenAI GPT-4o integration
- Knowledge base structure (`knowledge/models/`, `knowledge/prompts/`)
- System prompt and generation prompt templates
- Caching in `.content-cache/`
- Human override merge logic (`overrides/templates/`)
- `SKIP_AI_GENERATION` env var for local dev

**Key Files to Create:**
- `knowledge/prompts/system.md`
- `knowledge/prompts/generation.md`
- `knowledge/models/flux.md`, `qwen.md` (starter docs)

**Deliverable:** Script that runs `npm run generate:ai` and enriches template JSON with AI content.

---

## Workstream 4: Workflow Preview Generation

**Owner:** Graphics/backend engineer  
**Dependency:** None (reads workflow JSON directly)

**Scope:**
- `scripts/generate-previews.ts`
- Port LiteGraph minimap renderer from ComfyUI_frontend
- Use `node-canvas` for server-side rendering
- Output PNG to `public/previews/{name}.png`
- Mtime-based caching (skip if preview newer than workflow)

**Reference Code:**
- `ComfyUI_frontend/src/renderer/core/thumbnail/graphThumbnailRenderer.ts`
- `ComfyUI_frontend/src/renderer/extensions/minimap/minimapCanvasRenderer.ts`

**Deliverable:** Script that runs `npm run generate:previews` and creates workflow images.

---

## Workstream 5: CI/CD + Deployment

**Owner:** DevOps/infra engineer  
**Dependency:** All workstreams (integration)

**Scope:**
- `.github/workflows/deploy-site.yml`
- Vercel project setup
- Environment secrets (`OPENAI_API_KEY`, `VERCEL_TOKEN`, etc.)
- Manual dispatch trigger (auto-release commented out)
- `site/.env.example`
- `site/README.md` with setup instructions

**Deliverable:** Working GitHub Action that deploys to Vercel on manual trigger.

---

## Integration Order

```
Week 1: Workstreams 1-4 in parallel (independent)
         │
         ▼
Week 2: Workstream 5 integrates all scripts
         │
         ▼
         Test full pipeline locally
         │
         ▼
         Deploy to Vercel
```

---

## Shared Contracts

All workstreams must agree on these interfaces:

### Template Content Schema
```typescript
// Output from sync + AI generation, input to Astro pages
interface TemplateContent {
  // From sync
  name: string;
  title?: string;
  description: string;
  mediaType: 'image' | 'video' | 'audio' | '3d';
  tags?: string[];
  models?: string[];
  usage?: number;
  
  // From AI generation
  extendedDescription: string;
  howToUse: string[];
  metaDescription: string;
  suggestedUseCases: string[];
  
  // From preview generation
  workflowPreviewPath?: string;
}
```

### File Locations
```
site/
├── src/content/templates/*.json    ← Sync + AI output, Astro input
├── public/thumbnails/*-1.webp      ← Sync output
├── public/previews/*.png           ← Preview output
├── overrides/templates/*.json      ← Human overrides (manual)
└── .content-cache/*.json           ← AI cache (git-ignored)
```

### npm Scripts
```json
{
  "sync": "tsx scripts/sync-templates.ts",
  "generate:ai": "tsx scripts/generate-ai.ts", 
  "generate:previews": "tsx scripts/generate-previews.ts",
  "prebuild": "npm run sync && npm run generate:ai && npm run generate:previews",
  "build": "astro build"
}
```

---

## Notes for Engineers

1. **Start with mock data** — Don't wait for upstream workstreams
2. **Use TypeScript** — Shared types prevent integration bugs
3. **Test independently** — Each script should work in isolation
4. **Document env vars** — Add to `.env.example` as you go
5. **Keep scripts idempotent** — Running twice should be safe
