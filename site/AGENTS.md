# Site Directory - Agent Instructions

## Overview

This directory contains the AI content generation pipeline for the ComfyUI template site.

## Key Commands

```bash
# Install dependencies
pnpm install

# Sync tutorials from docs repo (builds knowledge base)
pnpm run sync:tutorials

# Test AI generation with specific template
pnpm run generate:ai -- --template <name> --skip-ai

# Full AI generation (requires OPENAI_API_KEY)
pnpm run generate:ai

# Test mode (first template only)
pnpm run generate:ai:test --skip-ai
```

## Project Structure

```
site/
├── scripts/
│   ├── generate-ai.ts       # Main AI generation pipeline
│   └── sync-tutorials.ts    # Syncs tutorials from docs repo
├── knowledge/
│   ├── prompts/
│   │   ├── system.md        # Base system prompt
│   │   ├── tutorial.md      # Tutorial content template
│   │   ├── showcase.md      # Showcase content template
│   │   ├── comparison.md    # Comparison content template
│   │   └── breakthrough.md  # Breakthrough content template
│   ├── models/              # Model-specific documentation
│   ├── concepts/            # Domain concept documentation
│   └── tutorials/           # Synced tutorials from docs repo
├── overrides/templates/     # Human-edited content (preserved)
├── src/content/templates/   # Generated content (git-ignored)
└── .content-cache/          # AI generation cache (git-ignored)
```

## Content Template Types

When generating content, select appropriate template based on:
- **tutorial**: Default for most templates, step-by-step guides
- **showcase**: Templates with strong visual outputs
- **comparison**: Templates that compete with alternatives
- **breakthrough**: New model releases, cutting-edge features

## Key Features

- **Content template selection**: Automatically selects tutorial/showcase/comparison/breakthrough based on template metadata
- **Tutorial context injection**: Matches templates to relevant docs.comfy.org tutorials for better AI context
- **Quality validation**: Checks word count, step count, FAQ count, keyword presence, and meta description length
- **Caching**: AI-generated content is cached and only regenerated when template metadata changes

## Key Files

- `generate-ai.ts` - Main generation pipeline with CLI options
- `sync-tutorials.ts` - Syncs tutorials from docs repo to knowledge base
- `knowledge/prompts/system.md` - Base GPT-4o system prompt
- `../docs/ai-content-generation-strategy.md` - Full strategy documentation

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | For AI gen | OpenAI API key |
| `SKIP_AI_GENERATION` | Optional | Set `true` for placeholder mode |

## Related Documentation

- `../docs/ai-content-generation-strategy.md` - Content strategy
- `../docs/template-site-prd.md` - Product requirements
- `../docs/template-site-design.md` - Technical design
