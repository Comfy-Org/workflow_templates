# ComfyUI Template Site

Static site for browsing and discovering ComfyUI workflow templates. Built with Astro and Tailwind CSS, featuring AI-generated content for each template.

## Prerequisites

- Node.js 18+
- pnpm 9.15+

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy environment file and add your OpenAI API key
cp .env.example .env

# Run development server
pnpm run dev
```

The site will be available at `http://localhost:4321`.

## Available Scripts

| Command                         | Description                                               |
| ------------------------------- | --------------------------------------------------------- |
| `pnpm run dev`                  | Start Astro development server                            |
| `pnpm run build`                | Full production build (runs all prebuild steps)           |
| `pnpm run preview`              | Preview production build locally                          |
| `pnpm run sync`                 | Sync templates from `../templates/` to content collection |
| `pnpm run sync:tutorials`       | Sync tutorials from docs repo to knowledge base           |
| `pnpm run generate:ai`          | Generate AI descriptions and FAQs for all templates       |
| `pnpm run generate:ai:test`     | Test AI generation with first template only               |
| `pnpm run generate:ai:template` | Generate AI content for a specific template               |
| `pnpm run generate:previews`    | Generate workflow preview images                          |

### Build Pipeline

The `prebuild` script runs automatically before `build`:

```
sync → sync:tutorials → generate:ai → generate:previews → astro build
```

## Project Structure

```
site/
├── src/
│   ├── components/            # Astro/UI components
│   ├── content/
│   │   ├── config.ts          # Content collection schema
│   │   └── templates/         # Generated template content (git-ignored)
│   ├── layouts/               # Page layouts
│   ├── pages/
│   │   ├── index.astro        # Homepage
│   │   └── templates/
│   │       ├── index.astro    # Template listing
│   │       └── [slug].astro   # Template detail page
│   └── styles/                # Global styles
├── scripts/
│   ├── sync-templates.ts      # Sync from ../templates/
│   ├── sync-tutorials.ts      # Sync tutorials from docs repo
│   ├── generate-ai.ts         # AI content generation pipeline
│   └── generate-previews.ts   # Workflow preview image generation
├── knowledge/
│   ├── prompts/               # AI content template prompts
│   ├── models/                # Model-specific documentation
│   ├── concepts/              # Domain concept documentation
│   └── tutorials/             # Synced tutorials (git-ignored)
├── overrides/
│   └── templates/             # Human-edited content overrides (committed)
├── public/
│   ├── thumbnails/            # Synced from ../templates/
│   └── previews/              # Generated workflow images
└── .content-cache/            # AI generation cache (git-ignored)
```

## Environment Variables

| Variable                  | Required | Description                                                   |
| ------------------------- | -------- | ------------------------------------------------------------- |
| `OPENAI_API_KEY`          | Yes\*    | OpenAI API key for AI content generation                      |
| `SKIP_AI_GENERATION`      | No       | Set to `true` to skip AI generation                           |
| `PUBLIC_HUB_API_URL`      | No       | Hub API base URL for local builds and any manual build setup  |
| `PUBLIC_COMFY_CLOUD_URL`  | No       | Comfy Cloud app URL used for CTA links in local/manual builds |

\*Required for production builds; can skip for local development.

The app and build scripts continue to read `PUBLIC_HUB_API_URL`. In CI, preview and production
workflows map different GitHub secrets to that variable:

- Preview: `HUB_API_URL_PREVIEW` -> `PUBLIC_HUB_API_URL`
- Production: `HUB_API_URL_PRODUCTION` -> `PUBLIC_HUB_API_URL`

CTA links continue to read `PUBLIC_COMFY_CLOUD_URL`. In CI, preview and production workflows map
different GitHub secrets to that variable:

- Preview: `COMFY_CLOUD_URL_PREVIEW` -> `PUBLIC_COMFY_CLOUD_URL`
- Production: `COMFY_CLOUD_URL_PRODUCTION` -> `PUBLIC_COMFY_CLOUD_URL`

For local development, set `PUBLIC_HUB_API_URL` and `PUBLIC_COMFY_CLOUD_URL` directly when you
need to point builds at specific backends.

Production values should also be mirrored in Vercel Project Settings for `PUBLIC_HUB_API_URL` and
`PUBLIC_COMFY_CLOUD_URL`. The scheduled rebuild workflow triggers a Vercel deploy hook, so that
path uses Vercel-managed environment variables instead of the GitHub Actions build-time mapping.

### Skipping AI Generation

For quick local builds without API calls:

```bash
SKIP_AI_GENERATION=true pnpm run build
```

Or set `SKIP_AI_GENERATION=true` in your `.env` file. Templates will use placeholder content for AI-generated fields.

## AI Content Generation

### Content Templates

Four content template types for different user intents:

| Template         | Target User    | SEO Focus                  |
| ---------------- | -------------- | -------------------------- |
| **tutorial**     | Beginners      | "How to [task] in ComfyUI" |
| **showcase**     | Creators       | "[Model] examples"         |
| **comparison**   | Researchers    | "best [task] workflow"     |
| **breakthrough** | Early adopters | "[Model] new features"     |

### Human Overrides

To manually edit AI-generated content for a specific template:

1. Create a file in `overrides/templates/{template-name}.json`
2. Add only the fields you want to override:
   ```json
   {
     "extendedDescription": "Your custom description here.",
     "humanEdited": true
   }
   ```
3. The sync script will merge overrides with generated content
4. Templates with `humanEdited: true` will not be regenerated by AI

### Adding Knowledge

Improve AI output by adding documentation:

- `knowledge/models/{model-name}.md` - Model capabilities
- `knowledge/concepts/{concept-name}.md` - Domain concepts
- `knowledge/prompts/{template-type}.md` - Content templates

## Deployment

The site is deployed to Vercel via GitHub Actions. See `.github/workflows/deploy-site.yml`.

### Required Secrets

Configure these in GitHub repository settings:

- `OPENAI_API_KEY` - OpenAI API key
- `VERCEL_TOKEN` - Vercel authentication token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID

## Documentation

- [Template Site PRD](docs/template-site-prd.md)
- [Template Site Design](docs/template-site-design.md)
- [AI Content Generation Strategy](docs/ai-content-generation-strategy.md)
- [Implementation Roadmap](docs/ROADMAP.md)
