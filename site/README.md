# Template Site - AI Content Generation

This directory contains the AI content generation pipeline for the ComfyUI template site.

## Quick Start

```bash
cd site
npm install
cp .env.example .env  # Add your OPENAI_API_KEY

# Development mode (uses placeholders, no API calls)
SKIP_AI_GENERATION=true npm run generate:ai

# Full AI generation
npm run generate:ai
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run generate:ai` | Generate AI content for templates |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key (required for AI generation) |
| `SKIP_AI_GENERATION` | Set to `true` to use placeholders instead of AI |

## Directory Structure

```
site/
├── scripts/
│   └── generate-ai.ts      # AI content generation pipeline
├── knowledge/
│   ├── prompts/
│   │   └── system.md       # GPT-4o system prompt
│   └── models/
│       ├── flux.md         # Flux model documentation
│       └── qwen.md         # Qwen model documentation
├── overrides/
│   └── templates/          # Human-edited content (committed)
├── src/content/templates/  # Generated content (git-ignored)
└── .content-cache/         # AI generation cache (git-ignored)
```

## Human Overrides

To preserve custom content that won't be overwritten by AI:

1. Create `overrides/templates/{template-name}.json`
2. Set `humanEdited: true` to skip AI generation entirely
3. Or set individual fields to override (use `null` for AI-generated)

Example:
```json
{
  "extendedDescription": "Custom marketing copy...",
  "howToUse": null,
  "humanEdited": true
}
```

## How It Works

1. Loads templates from `../templates/index.json`
2. For each template:
   - Skip if `overrides/{name}.json` has `humanEdited: true`
   - Use cache if valid (template hasn't changed)
   - Otherwise, call GPT-4o to generate content
3. Saves generated content to `src/content/templates/`
4. Caches AI responses in `.content-cache/` for reuse

## Adding Knowledge

Add model or concept documentation to improve AI output:

- `knowledge/models/{model-name}.md` - Model capabilities
- `knowledge/concepts/{concept-name}.md` - Domain concepts

The script automatically includes relevant docs based on template tags/models.
