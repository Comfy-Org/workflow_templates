# Template Blog Site — Design Document

## 1. Data Inventory & Mapping

### 1.1 Available Source Data

| Source | Location | Contents |
|--------|----------|----------|
| Template Index | `templates/index.json` | Categories, template metadata |
| Workflow JSON | `templates/{name}.json` | Node graph, model requirements, embedded docs |
| Thumbnails | `templates/{name}-{n}.webp` | Input/output previews |
| Bundle Map | `bundles.json` | Template → package assignment |
| Localized Index | `templates/index.{lang}.json` | 12 language variants (Milestone 2+) |

### 1.2 Template Metadata Schema

```typescript
interface TemplateInfo {
  // Identity
  name: string;                    // "templates-2x2_grid-iso_miniatures"
  title?: string;                  // "Isometric Miniatures from a Selfie"
  description: string;             // Brief description (1-2 sentences)
  
  // Classification
  mediaType: 'image' | 'video' | 'audio' | '3d';
  tags?: string[];                 // ["Portrait", "API", "Character"]
  models?: string[];               // ["Nano Banana Pro", "Flux", "Qwen-Image-Edit"]
  
  // Metadata
  date?: string;                   // "2026-01-19"
  openSource?: boolean;            // true = runs locally, false = uses cloud APIs
  requiresCustomNodes?: string[];  // ["comfyui-kjnodes"]
  tutorialUrl?: string;            // Link to docs.comfy.org
  
  // Stats
  usage?: number;                  // Cloud usage count (for top 50 filtering)
  size?: number;                   // Total model size (bytes)
  vram?: number;                   // VRAM requirement (bytes)
}
```

**Note:** The `models` field contains OSS model names (Flux, Qwen, Wan, SDXL, etc.) which are heavily searched terms. These MUST be prominently included in page content.

### 1.3 Data → SEO Feature Mapping

| SEO Element | Source Data | Transformation |
|-------------|-------------|----------------|
| **Page Title** | `title \|\| name` | `{title} - ComfyUI Workflow Template` |
| **H1** | `title` | Direct use, unique per page |
| **H2 (How-to)** | `title + tags` | `How to {action} with {model} in ComfyUI` |
| **H2 (Guide)** | Generated | `Step-by-Step Guide: {task}` |
| **Meta Description** | AI-generated | 150-160 chars from template data |
| **URL Slug** | `name` | `/templates/{name}/` |
| **Open Graph Image** | `{name}-1.webp` | Primary output thumbnail |
| **Structured Data** | Multiple fields | SoftwareApplication schema |
| **Keywords** | `tags + models` | Natural inclusion in body text |
| **Internal Links** | `tags`, `models`, category | Links to aggregation pages |
| **Last Modified** | `date` | Sitemap `<lastmod>` |
| **FAQ Schema** | AI-generated | "How to..." questions for PAA boxes |

### 1.4 SEO Keyword Strategy

**Primary H1:** Template title (unique, descriptive)

**H2 Keyword Variations:**
```html
<h1>Isometric Miniatures from a Selfie – ComfyUI Workflow</h1>
<h2>How to Generate Isometric Figurines with Nano Banana Pro</h2>
<h2>Step-by-Step: Upload Your Photo and Create Character Turnarounds</h2>
<h2>What You'll Need</h2>
<h2>Frequently Asked Questions</h2>
```

**FAQ Schema for "People Also Ask":**
```json
{
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How do I create isometric miniatures in ComfyUI?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Use the Isometric Miniatures template..."
      }
    }
  ]
}
```

---

## 2. SSG Choice: Astro

### 2.1 Why Astro

| Criteria | Astro | VitePress |
|----------|-------|-----------|
| Core Web Vitals | 62% passing | ~50% |
| Primary Use | Content-driven SEO sites | Documentation |
| JSON → Pages | Native Content Collections | Custom loader |
| Image Optimization | Built-in `<Image>` | Manual |
| JS Payload | Zero by default | Vue runtime always |

### 2.2 Content Collections Setup

```typescript
// site/src/content/config.ts
import { defineCollection, z } from 'astro:content';

const templates = defineCollection({
  type: 'data',
  schema: z.object({
    // Original metadata
    name: z.string(),
    title: z.string().optional(),
    description: z.string(),
    mediaType: z.enum(['image', 'video', 'audio', '3d']),
    tags: z.array(z.string()).optional(),
    models: z.array(z.string()).optional(),
    date: z.string().optional(),
    openSource: z.boolean().optional(),
    requiresCustomNodes: z.array(z.string()).optional(),
    usage: z.number().optional(),
    
    // AI-generated content
    extendedDescription: z.string(),
    howToUse: z.array(z.string()),
    metaDescription: z.string(),
    suggestedUseCases: z.array(z.string()),
    faqItems: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })).optional(),
    
    // Generated assets
    workflowPreviewPath: z.string().optional(),
    
    // Override tracking
    humanEdited: z.boolean().default(false),
    lastAIGeneration: z.string().optional(),
  }),
});

export const collections = { templates };
```

---

## 3. URL Structure & Domain

### 3.1 Recommended URL Structure

```
templates.comfy.org/
├── /                                    # Homepage: featured templates
├── /templates/                          # All templates listing
├── /templates/{slug}/                   # Template detail page
├── /category/{type}/                    # image | video | audio | 3d
├── /tag/{tag}/                          # Portrait | API | Inpainting | ...
├── /model/{model}/                      # Flux | Qwen | Wan | ...
└── /about/                              # About the library
```

### 3.2 Domain Decision

| Option | Implementation | SEO Impact |
|--------|----------------|------------|
| `templates.comfy.org` | Subdomain DNS + Cloudflare/Vercel | Builds separate authority, easy to measure |
| `comfy.org/templates` | Reverse proxy from main site | Inherits main domain authority |

**Recommendation:** Start with `templates.comfy.org` (simpler), can migrate later.

---

## 4. Deployment

### 4.1 Vercel (Milestone 1)

Chosen for immediate availability (org already has account).

```yaml
# .github/workflows/deploy-site.yml
name: Deploy Template Site

on:
  workflow_dispatch:  # Manual trigger for initial development
  # Uncomment after stable:
  # workflow_run:
  #   workflows: ["Publish to PyPI"]
  #   types: [completed]
  #   branches: [main]

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: site/package-lock.json
          
      - name: Install dependencies
        run: npm ci
        working-directory: site
        
      - name: Sync templates
        run: npm run sync
        working-directory: site
        
      - name: Generate AI content
        run: npm run generate:ai
        working-directory: site
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          
      - name: Generate workflow previews
        run: npm run generate:previews
        working-directory: site
        
      - name: Build site
        run: npm run build
        working-directory: site
        
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: site
          vercel-args: '--prod'
```

### 4.2 Migration to Cloudflare Pages (Future)

Migration is low-overhead:
1. Create Cloudflare Pages project
2. Swap GitHub Action (`cloudflare/pages-action@v1`)
3. Update DNS CNAME
4. Keep Vercel running 1-2 weeks for rollback
5. Delete Vercel project

No code changes required — both use same static output.

---

## 5. Local Development Setup

### 5.1 Environment Variables

```bash
# site/.env.example
OPENAI_API_KEY=sk-...  # Required for AI content generation

# Optional (for full builds)
SKIP_AI_GENERATION=true  # Skip AI calls, use cached/placeholder content
```

### 5.2 Setup Instructions

Create `site/README.md`:

```markdown
# Template Site Development

## Quick Start

\`\`\`bash
cd site
npm install
cp .env.example .env  # Add your OPENAI_API_KEY

# Development server (uses cached content)
npm run dev

# Full build with AI generation
npm run build
\`\`\`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on localhost:4321 |
| `npm run sync` | Sync templates from ../templates/ |
| `npm run generate:ai` | Generate AI content (requires API key) |
| `npm run generate:previews` | Render workflow preview images |
| `npm run build` | Production build to dist/ |
| `npm run preview` | Preview production build |

## Skipping AI Generation

For quick iteration without API calls:

\`\`\`bash
SKIP_AI_GENERATION=true npm run build
\`\`\`

This uses cached content from `.content-cache/` or placeholder text.

## Adding Human Overrides

1. Create `overrides/templates/{template-name}.json`
2. Add fields to override (set others to `null`)
3. Rebuild — your content persists across AI regeneration

\`\`\`json
{
  "extendedDescription": "Custom marketing copy...",
  "howToUse": null,
  "humanEdited": true
}
\`\`\`
```

### 5.3 Package.json Scripts

```json
{
  "scripts": {
    "dev": "astro dev",
    "sync": "tsx scripts/sync-templates.ts",
    "generate:ai": "tsx scripts/generate-ai.ts",
    "generate:previews": "tsx scripts/generate-previews.ts",
    "prebuild": "npm run sync && npm run generate:ai && npm run generate:previews",
    "build": "astro build",
    "preview": "astro preview"
  }
}
```

---

## 6. Content Management & Human Overrides

### 6.1 File Structure

```
site/
├── src/content/templates/      # GENERATED (git-ignored)
│   └── {template}.json
├── overrides/templates/        # HUMAN EDITS (committed)
│   └── {template}.json
└── .content-cache/             # AI generation cache
    └── {template}.json
```

### 6.2 Override Schema

```typescript
// overrides/templates/flux_schnell.json
{
  "extendedDescription": "Custom marketing copy here...",
  "howToUse": null,           // null = use AI-generated
  "metaDescription": null,
  "humanEdited": true,        // Prevents AI regeneration
  "featured": true,           // Custom metadata
  "customCTA": "Get started with Flux on Cloud →"
}
```

### 6.3 Merge Logic

```typescript
// scripts/generate-ai.ts

async function generateTemplateContent(template: TemplateInfo) {
  const overridePath = `overrides/templates/${template.name}.json`;
  const override = await loadIfExists(overridePath);
  
  // If marked as human-edited, skip AI entirely
  if (override?.humanEdited) {
    return { ...getDefaults(template), ...override };
  }
  
  // Check cache validity
  const cached = await loadCache(template.name);
  if (cached && !shouldRegenerate(template, cached)) {
    return applyOverrides(cached, override);
  }
  
  // Generate AI content
  const aiContent = await callOpenAI(template);
  await saveCache(template.name, aiContent);
  
  // Merge: override fields take precedence
  return applyOverrides(aiContent, override);
}

function applyOverrides(content: GeneratedContent, override?: Partial<GeneratedContent>) {
  if (!override) return content;
  
  return {
    ...content,
    ...Object.fromEntries(
      Object.entries(override).filter(([_, v]) => v !== null)
    ),
  };
}
```

---

## 7. AI Content Generation Pipeline

### 7.1 Knowledge Base Structure

```
site/
└── knowledge/
    ├── models/               # Model capability docs
    │   ├── flux.md
    │   ├── qwen-image.md
    │   ├── wan.md
    │   └── ...
    ├── concepts/             # Domain concepts
    │   ├── inpainting.md
    │   ├── controlnet.md
    │   └── ...
    ├── nodes/                # Node documentation (synced from embedded-docs)
    │   └── ...
    └── prompts/
        ├── system.md
        └── generation.md
```

### 7.2 Knowledge Sources

| Source | URL | Content |
|--------|-----|---------|
| Node Docs | `github.com/Comfy-Org/embedded-docs` | Per-node documentation |
| Comfy Docs | `docs.comfy.org` | Tutorials, concepts |
| Comfy Blog | `blog.comfy.org` | Feature announcements |
| HuggingFace | Model cards | Model capabilities, usage |
| Registry API | `api.comfy.org/openapi` | Custom node metadata |

**embedded-docs Integration:**

The embedded-docs repo contains a pipeline for node documentation. We can:
1. Clone/submodule the repo
2. Reference docs during AI generation
3. Or run their pipeline to embed docs into our knowledge base

### 7.3 System Prompt

```markdown
<!-- knowledge/prompts/system.md -->

# Role
You are a technical content writer for ComfyUI, an AI image and video generation platform. Your goal is to create clear, accurate content that helps users discover and use workflow templates.

# Voice & Tone
- Professional but approachable
- Technically accurate without jargon overload
- Focus on outcomes and benefits (what can users CREATE)
- Confident, not salesy

# Constraints
- ONLY use information from the provided context
- NEVER invent model capabilities not in the data
- NEVER mention pricing or costs
- NEVER use superlatives like "revolutionary" or "cutting-edge"
- ALWAYS be accurate about hardware requirements
- Include the model names naturally in the content

# SEO Guidelines
- Include primary keyword (model name + task) in first paragraph
- Use H2-style sections for scannability
- Create FAQ items that match "How to..." search patterns
- Keep meta description under 160 characters

# Model Knowledge
{model_docs}

# Concept Knowledge
{concept_docs}
```

### 7.4 Generation Prompt

```typescript
// scripts/generate-ai.ts

const buildPrompt = (ctx: GenerationContext) => `
# Task
Generate SEO-optimized content for a ComfyUI workflow template page.

# Template Data
Name: ${ctx.template.title || ctx.template.name}
Description: ${ctx.template.description}
Category: ${ctx.template.mediaType}
Tags: ${ctx.template.tags?.join(', ') || 'None'}
Models Used: ${ctx.template.models?.join(', ') || 'None'}
Open Source: ${ctx.template.openSource ? 'Yes (runs locally)' : 'No (uses cloud APIs)'}
Custom Nodes: ${ctx.template.requiresCustomNodes?.join(', ') || 'None (core nodes only)'}

# Workflow Analysis
Input Type: ${ctx.workflow.hasInputImage ? 'Image' : ctx.workflow.hasInputVideo ? 'Video' : 'Text/prompt only'}
Output Type: ${ctx.workflow.outputType}
Key Nodes: ${ctx.workflow.nodeTypes.slice(0, 10).join(', ')}

# Model Context
${ctx.template.models?.map(m => ctx.modelDocs[m] || '').join('\n\n')}

# Output Format (JSON)
{
  "extendedDescription": "2-3 paragraphs (150-250 words). Explain what this template does, who it's for, and the key models/techniques. Include model names naturally.",
  
  "howToUse": [
    "Step 1: Clear action with specific details",
    "Step 2: ...",
    "Step 3: ..."
  ],
  
  "metaDescription": "150-160 character summary. Include primary keyword. Focus on user benefit.",
  
  "suggestedUseCases": [
    "Specific use case with context",
    "Another specific application",
    "Third use case"
  ],
  
  "faqItems": [
    {
      "question": "How do I [specific task] with ComfyUI?",
      "answer": "Concise answer using this template..."
    }
  ]
}

# Keywords to Include
- comfyui workflow
- ${ctx.template.mediaType} generation
- ${ctx.template.models?.[0]?.toLowerCase() || ''}
- ${ctx.template.tags?.[0]?.toLowerCase() || ''}
`;
```

### 7.5 Complete AI Pipeline Implementation

```typescript
// scripts/generate-ai.ts
import OpenAI from 'openai';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const openai = new OpenAI();

interface GenerationContext {
  template: TemplateInfo;
  workflow: WorkflowAnalysis;
  modelDocs: Record<string, string>;
  conceptDocs: Record<string, string>;
}

async function loadKnowledgeBase(): Promise<{
  models: Record<string, string>;
  concepts: Record<string, string>;
  systemPrompt: string;
}> {
  const modelsDir = 'knowledge/models';
  const conceptsDir = 'knowledge/concepts';
  
  const models: Record<string, string> = {};
  const concepts: Record<string, string> = {};
  
  // Load model docs
  if (existsSync(modelsDir)) {
    const files = await readdir(modelsDir);
    for (const file of files) {
      const name = path.basename(file, '.md');
      models[name] = await readFile(path.join(modelsDir, file), 'utf-8');
    }
  }
  
  // Load concept docs
  if (existsSync(conceptsDir)) {
    const files = await readdir(conceptsDir);
    for (const file of files) {
      const name = path.basename(file, '.md');
      concepts[name] = await readFile(path.join(conceptsDir, file), 'utf-8');
    }
  }
  
  const systemPrompt = await readFile('knowledge/prompts/system.md', 'utf-8');
  
  return { models, concepts, systemPrompt };
}

async function generateContent(ctx: GenerationContext, systemPrompt: string): Promise<GeneratedContent> {
  const userPrompt = buildPrompt(ctx);
  
  // Inject knowledge into system prompt
  const fullSystemPrompt = systemPrompt
    .replace('{model_docs}', Object.entries(ctx.modelDocs)
      .map(([name, doc]) => `## ${name}\n${doc}`).join('\n\n'))
    .replace('{concept_docs}', Object.entries(ctx.conceptDocs)
      .map(([name, doc]) => `## ${name}\n${doc}`).join('\n\n'));
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: fullSystemPrompt },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 1500,
  });
  
  const content = JSON.parse(response.choices[0].message.content!);
  return validateContent(content);
}

async function main() {
  const skipAI = process.env.SKIP_AI_GENERATION === 'true';
  
  // Load templates
  const indexPath = '../templates/index.json';
  const categories = JSON.parse(await readFile(indexPath, 'utf-8'));
  
  // Flatten and sort by usage
  const allTemplates = categories.flatMap((cat: any) => cat.templates);
  const top50 = allTemplates
    .filter((t: any) => t.usage !== undefined)
    .sort((a: any, b: any) => (b.usage || 0) - (a.usage || 0))
    .slice(0, 50);
  
  console.log(`Processing ${top50.length} templates...`);
  
  // Load knowledge base
  const knowledge = await loadKnowledgeBase();
  
  // Ensure output directories
  await mkdir('src/content/templates', { recursive: true });
  await mkdir('.content-cache', { recursive: true });
  
  for (const template of top50) {
    const outPath = `src/content/templates/${template.name}.json`;
    
    // Check for human override
    const override = await loadOverride(template.name);
    if (override?.humanEdited) {
      console.log(`[SKIP] ${template.name} - human edited`);
      await writeFile(outPath, JSON.stringify({ ...template, ...override }, null, 2));
      continue;
    }
    
    // Check cache
    const cached = await loadCache(template.name);
    if (cached && !shouldRegenerate(template, cached)) {
      console.log(`[CACHE] ${template.name}`);
      const merged = applyOverrides(cached, override);
      await writeFile(outPath, JSON.stringify({ ...template, ...merged }, null, 2));
      continue;
    }
    
    if (skipAI) {
      console.log(`[PLACEHOLDER] ${template.name}`);
      await writeFile(outPath, JSON.stringify({
        ...template,
        extendedDescription: template.description,
        howToUse: ['Load the template', 'Configure inputs', 'Run the workflow'],
        metaDescription: template.description.slice(0, 160),
        suggestedUseCases: [],
      }, null, 2));
      continue;
    }
    
    // Analyze workflow
    const workflowPath = `../templates/${template.name}.json`;
    const workflow = await analyzeWorkflow(workflowPath);
    
    // Build context
    const ctx: GenerationContext = {
      template,
      workflow,
      modelDocs: pickRelevantDocs(template.models || [], knowledge.models),
      conceptDocs: pickRelevantDocs(template.tags || [], knowledge.concepts),
    };
    
    // Generate
    console.log(`[GENERATE] ${template.name}`);
    const content = await generateContent(ctx, knowledge.systemPrompt);
    
    // Cache
    await saveCache(template.name, { ...content, lastAIGeneration: new Date().toISOString() });
    
    // Apply overrides and write
    const merged = applyOverrides(content, override);
    await writeFile(outPath, JSON.stringify({ ...template, ...merged }, null, 2));
  }
  
  console.log('Done!');
}

main().catch(console.error);
```

---

## 8. Workflow Preview: LiteGraph Canvas

### 8.1 Implementation

Port the minimap renderer from ComfyUI_frontend:

```typescript
// scripts/generate-previews.ts
import { createCanvas } from 'canvas';  // node-canvas
import { readFile, writeFile, mkdir } from 'fs/promises';

interface MinimapNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  bgcolor?: string;
  type: string;
}

async function generateWorkflowPreview(
  workflowPath: string,
  outputPath: string,
  options = { width: 500, height: 400 }
) {
  const workflow = JSON.parse(await readFile(workflowPath, 'utf-8'));
  const nodes = extractNodes(workflow);
  const links = extractLinks(workflow);
  
  const bounds = calculateBounds(nodes);
  const scale = calculateScale(bounds, options.width, options.height, 0.85);
  
  const canvas = createCanvas(options.width, options.height);
  const ctx = canvas.getContext('2d');
  
  // Dark background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, options.width, options.height);
  
  const offsetX = (options.width - bounds.width * scale) / 2 - bounds.minX * scale;
  const offsetY = (options.height - bounds.height * scale) / 2 - bounds.minY * scale;
  
  // Draw links
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 1;
  for (const link of links) {
    const source = nodes.find(n => n.id === link.sourceId);
    const target = nodes.find(n => n.id === link.targetId);
    if (source && target) {
      ctx.beginPath();
      ctx.moveTo(
        (source.x + source.width) * scale + offsetX,
        (source.y + source.height / 2) * scale + offsetY
      );
      ctx.lineTo(
        target.x * scale + offsetX,
        (target.y + target.height / 2) * scale + offsetY
      );
      ctx.stroke();
    }
  }
  
  // Draw nodes
  for (const node of nodes) {
    ctx.fillStyle = node.bgcolor || '#374151';
    ctx.fillRect(
      node.x * scale + offsetX,
      node.y * scale + offsetY,
      node.width * scale,
      node.height * scale
    );
  }
  
  // Save
  const buffer = canvas.toBuffer('image/png');
  await writeFile(outputPath, buffer);
}
```

### 8.2 Caching Strategy

```typescript
async function shouldRegeneratePreview(templateName: string, workflowPath: string): Promise<boolean> {
  const previewPath = `public/previews/${templateName}.png`;
  
  if (!existsSync(previewPath)) return true;
  
  const workflowStat = await stat(workflowPath);
  const previewStat = await stat(previewPath);
  
  return workflowStat.mtime > previewStat.mtime;
}
```

---

## 9. Open Graph Images

### 9.1 Strategy

Use the primary output thumbnail (`{name}-1.webp`) as the OG image.

```astro
<!-- src/components/SEOHead.astro -->
---
const { template } = Astro.props;
const ogImage = `https://templates.comfy.org/thumbnails/${template.name}-1.webp`;
---

<meta property="og:image" content={ogImage} />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content={ogImage} />
```

### 9.2 Future Enhancement (Optional)

Generate composite images with Sharp:
- Left: Input thumbnail
- Right: Output thumbnail  
- Bottom: Workflow preview strip

---

## 10. Telemetry & Analytics

### 10.1 Tool Selection

| Tool | Purpose | Implementation |
|------|---------|----------------|
| **Vercel Analytics** | Core Web Vitals, page views | Built-in with Vercel |
| **Mixpanel** | Conversion tracking, user flows | JS snippet + server events |
| **Google Search Console** | SEO rankings, indexing | DNS verification |

### 10.2 Events to Track

```typescript
// Mixpanel events
interface TemplatePageEvents {
  'Template Viewed': {
    template_name: string;
    template_category: string;
    models: string[];
    source: 'organic' | 'direct' | 'referral';
  };
  
  'Try Cloud Clicked': {
    template_name: string;
    button_location: 'hero' | 'sidebar' | 'footer';
  };
  
  'Download Clicked': {
    template_name: string;
    download_type: 'workflow' | 'models';
  };
}
```

### 10.3 Mixpanel Setup

```astro
<!-- src/layouts/BaseLayout.astro -->
<script>
  import mixpanel from 'mixpanel-browser';
  
  mixpanel.init(import.meta.env.PUBLIC_MIXPANEL_TOKEN, {
    track_pageview: true,
    persistence: 'localStorage',
  });
</script>
```

### 10.4 SEO Monitoring Playbook

**Setup (Day 1):**
1. Add site to Google Search Console
2. Submit sitemap: `https://templates.comfy.org/sitemap-index.xml`
3. Set up Ahrefs/Semrush project for keyword tracking

**Weekly Check:**
1. Search Console → Coverage → Check for indexing errors
2. Search Console → Performance → Track impressions/clicks
3. Mixpanel → Funnels → Template View → Cloud Click conversion

**Monthly Review:**
1. Keyword ranking changes (Ahrefs)
2. Top performing templates by traffic
3. Conversion rate by template category
4. Core Web Vitals trends

**Action Triggers:**
- Indexing drops > 10% → Check for crawl errors
- CTR < 2% for high-impression page → Improve meta description
- Conversion < 1% on high-traffic page → A/B test CTA

---

## 11. CI Testing

### 11.1 Content Validation

```yaml
# .github/workflows/validate-site.yml
name: Validate Site Content

on:
  pull_request:
    paths:
      - 'site/**'
      - 'templates/**'
      - 'overrides/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          
      - name: Install dependencies
        run: npm ci
        working-directory: site
        
      - name: Validate content schema
        run: npm run validate:content
        working-directory: site
        
      - name: Check for broken links
        run: npm run check:links
        working-directory: site
        
      - name: Lint HTML output
        run: npm run lint:html
        working-directory: site
```

### 11.2 Override System Tests

```typescript
// site/scripts/validate-overrides.ts

import Ajv from 'ajv';
import { glob } from 'glob';

const overrideSchema = {
  type: 'object',
  properties: {
    extendedDescription: { type: ['string', 'null'] },
    howToUse: { type: ['array', 'null'] },
    metaDescription: { type: ['string', 'null'] },
    humanEdited: { type: 'boolean' },
  },
  additionalProperties: true,
};

async function validateOverrides() {
  const ajv = new Ajv();
  const validate = ajv.compile(overrideSchema);
  
  const files = await glob('overrides/templates/*.json');
  let hasErrors = false;
  
  for (const file of files) {
    const content = JSON.parse(await readFile(file, 'utf-8'));
    if (!validate(content)) {
      console.error(`Invalid override: ${file}`);
      console.error(validate.errors);
      hasErrors = true;
    }
  }
  
  if (hasErrors) process.exit(1);
}
```

---

## 12. Competitor Analysis: OpenArt.ai

Based on analysis of OpenArt.ai workflow pages:

### 12.1 Features They Have

| Feature | OpenArt | Our Plan |
|---------|---------|----------|
| Workflow title/description | ✅ | ✅ |
| Multiple thumbnails | ✅ (15+) | ✅ (2-3) |
| Node details (grouped by pack) | ✅ | ✅ Milestone 2 |
| Model details (checkpoints, LoRAs) | ✅ | ✅ |
| Author profile | ✅ | ❌ (official templates) |
| Reviews/ratings | ✅ | P2 |
| Download counts | ✅ | ✅ (usage field) |
| Version history | ✅ | ❌ |
| Custom node links to GitHub | ✅ | ✅ |
| "Run on Cloud" button | ✅ | ✅ |

### 12.2 SEO Elements to Adopt

1. **Structured node listing** — Show which nodes are used, grouped by source
2. **Model download links** — Direct links to HuggingFace/Civitai
3. **Social proof** — Show download/usage counts prominently
4. **Related workflows** — Internal linking to similar templates

### 12.3 Elements to Skip

1. **User accounts** — We're doing official templates only
2. **Reviews/comments** — Adds complexity, defer to P2
3. **Version history** — Our templates update infrequently

---

## 13. Initial Scope: Top 50 Templates

### 13.1 Selection Criteria

Filter templates by `usage` field, sort descending, take top 50.

```typescript
const top50 = allTemplates
  .filter(t => t.usage !== undefined)
  .sort((a, b) => (b.usage || 0) - (a.usage || 0))
  .slice(0, 50);
```

### 13.2 Scaling Plan

| Milestone | Template Count | Content |
|-----------|---------------|---------|
| M1 | 50 | Top by usage |
| M2 | All (200+) | Full catalog |
| M3 | All + i18n | Localized versions |

---

## 14. File Structure (Final)

```
workflow_templates/
├── templates/                    # Existing source data
├── site/                         # Astro project
│   ├── astro.config.mjs
│   ├── package.json
│   ├── .env.example
│   ├── README.md
│   ├── src/
│   │   ├── content/
│   │   │   ├── config.ts
│   │   │   └── templates/        # Generated (git-ignored)
│   │   ├── pages/
│   │   │   ├── index.astro
│   │   │   └── templates/
│   │   │       ├── index.astro
│   │   │       └── [slug].astro
│   │   ├── layouts/
│   │   └── components/
│   ├── scripts/
│   │   ├── sync-templates.ts
│   │   ├── generate-ai.ts
│   │   ├── generate-previews.ts
│   │   └── validate-overrides.ts
│   ├── knowledge/
│   │   ├── models/
│   │   ├── concepts/
│   │   └── prompts/
│   ├── overrides/templates/      # Human edits (committed)
│   ├── public/
│   │   ├── thumbnails/           # Synced from templates/
│   │   └── previews/             # Generated workflow images
│   └── .content-cache/           # AI generation cache (git-ignored)
├── docs/
│   ├── template-site-prd.md
│   └── template-site-design.md
└── .github/workflows/
    └── deploy-site.yml
```

---

*Document Version: 1.0*
