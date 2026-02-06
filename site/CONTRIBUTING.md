# Contributing to ComfyUI Template Site

## Development Setup

See [README.md](README.md) for full setup instructions. Quick start:

```bash
pnpm install
cp .env.example .env  # Add OPENAI_API_KEY for AI generation
pnpm run dev
```

## Code Style

This project uses ESLint and Prettier:

- **ESLint**: TypeScript + Astro rules configured in `eslint.config.js`
- **Prettier**: Single quotes, 2-space tabs, trailing commas. See `.prettierrc`

### Pre-commit Hooks

This project uses Husky + lint-staged for automatic formatting on commit:

```bash
pnpm run prepare  # Sets up Git hooks (runs automatically on install)
```

Commits will automatically run ESLint and Prettier on staged files.

### Manual Checks

```bash
pnpm lint          # ESLint check
pnpm format:check  # Prettier check
pnpm format        # Auto-format all files
```

### Dead Code Detection

This project uses [Knip](https://knip.dev) to detect unused files, exports, and dependencies:

```bash
pnpm knip          # Report unused code
pnpm knip:fix      # Auto-remove unused exports
```

Run this periodically to keep the codebase clean. Not included in pre-commit hooks due to speed.

## Adding/Modifying Templates

### Sync Pipeline

Templates flow from the source repo through several scripts:

1. **`pnpm run sync`** — Syncs template metadata from `../templates/` to `src/content/templates/`
2. **`pnpm run sync:tutorials`** — Syncs tutorials from docs repo to `knowledge/tutorials/`
3. **`pnpm run generate:ai`** — Generates descriptions, FAQs, and meta content via GPT-4o
4. **`pnpm run generate:previews`** — Creates workflow preview images

The `prebuild` script runs all of these automatically before `pnpm run build`.

### Testing AI Generation

```bash
# Test a specific template (dry run, no API calls)
pnpm run generate:ai -- --template <name> --skip-ai

# Test first template only
pnpm run generate:ai:test --skip-ai

# Full generation (requires OPENAI_API_KEY)
pnpm run generate:ai
```

### AI Prompts

Content prompts are in `knowledge/prompts/`:

- `system.md` — Base system prompt
- `tutorial.md`, `showcase.md`, `comparison.md`, `breakthrough.md` — Content type templates

Edit these to change how AI generates content.

## Content Overrides

Human-edited content lives in `overrides/templates/`. These files are **preserved across AI regeneration**.

### Creating an Override

1. Create a JSON file: `overrides/templates/{template-name}.json`
2. Add only the fields you want to override:

```json
{
  "extendedDescription": "Custom description that won't be regenerated",
  "metaDescription": "Custom meta description for SEO",
  "humanEdited": true
}
```

Supported override fields:

- `extendedDescription` — Long-form description
- `metaDescription` — SEO meta description (150-160 chars)
- `howToUse` — Array of step strings
- `suggestedUseCases` — Array of use case strings
- `faqItems` — Array of `{ question, answer }` objects

The `humanEdited: true` flag prevents AI regeneration for that template.

## Pull Request Process

1. **Create a branch** from `main`
2. **Make changes** following the code style guidelines
3. **Run validation**:
   ```bash
   pnpm exec eslint .
   pnpm exec prettier --check .
   pnpm run build  # Runs sync + AI generation + build
   ```
4. **Test locally**: `pnpm run preview` to check the built site
5. **Submit PR** with:
   - Clear description of changes
   - For content changes: which templates affected
   - For prompt changes: example output before/after

## Pre-Submit Checklist

```bash
# Lint and format
pnpm exec eslint .
pnpm exec prettier --check .

# Type check
pnpm exec astro check

# Full build (includes sync, AI gen, previews)
pnpm run build

# Preview the site
pnpm run preview
```

## Key Files

| Path                        | Purpose                           |
| --------------------------- | --------------------------------- |
| `scripts/sync-templates.ts` | Syncs template metadata           |
| `scripts/generate-ai.ts`    | AI content generation pipeline    |
| `knowledge/prompts/`        | GPT-4o prompt templates           |
| `overrides/templates/`      | Human content overrides           |
| `src/content/templates/`    | Generated content (git-ignored)   |
| `.content-cache/`           | AI generation cache (git-ignored) |

## Related Documentation

- [PRD.md](docs/PRD.md) — Product requirements
- [TDD.md](docs/TDD.md) — Technical design document
- [AGENTS.md](AGENTS.md) — AI agent instructions
