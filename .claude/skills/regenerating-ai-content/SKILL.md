---
name: regenerating-ai-content
description: "Manages AI content generation for the ComfyUI template site. Regenerates descriptions, clears cache, debugs placeholder content, and runs the AI pipeline. Use when asked to: regenerate content, refresh AI content, clear cache, fix placeholder text, re-run AI generation, update generated descriptions, force regenerate, check cache status, debug AI content, why is content missing, content looks wrong, run the AI pipeline, generate descriptions, update AI text, rebuild content, fix generated content, content not showing, stale content, outdated descriptions. Triggers on: regenerate, AI content, clear cache, placeholder, generate descriptions, content pipeline, refresh content, rebuild AI."
---

# Regenerating AI Content

## Overview

The site at `site/` uses an AI pipeline (`site/scripts/generate-ai.ts`) that generates the following fields for each template page:

- `extendedDescription`
- `howToUse`
- `metaDescription`
- `suggestedUseCases`
- `faqItems`

Results are cached in `site/.content-cache/` and written to `site/src/content/templates/` (git-ignored).

## All commands must be run from the `site/` directory

Ensure `pnpm` is installed before running any commands.

## Common Commands

| Task | Command |
|---|---|
| Regenerate ALL content | `pnpm run generate:ai` |
| Regenerate one template | `pnpm run generate:ai -- --template <name>` |
| Force regenerate (ignore cache) | `pnpm run generate:ai -- --force` |
| Force one template | `pnpm run generate:ai -- --template <name> --force` |
| Test mode (first template only) | `pnpm run generate:ai:test` |
| Skip AI (use placeholders) | `pnpm run generate:ai -- --skip-ai` |
| Dry run (preview changes) | `pnpm run generate:ai -- --dry-run` |
| View cache stats | `pnpm run cache:status` |
| Clear all cache | `pnpm run cache:clear --force` |
| Preview what cache clear would delete | `pnpm run cache:clear --dry-run` |

## Requirements

- `OPENAI_API_KEY` environment variable must be set (unless using `--skip-ai`).

## How Caching Works

- Cache lives in `site/.content-cache/` with a `_manifest.json` tracking hashes.
- Cache invalidates when:
  - Template metadata changes (hash mismatch)
  - Prompt files change (prompts hash)
  - Cache version is bumped
- `--force` bypasses all cache checks.
- `--dry-run` shows what would be regenerated without making changes.

## Debugging Common Issues

### Placeholder text showing

Template was generated with `--skip-ai`.

**Fix:** Run `pnpm run generate:ai -- --template <name>`.

### Content is stale/outdated

Cache hit on old content.

**Fix:** Run with `--force` flag: `pnpm run generate:ai -- --template <name> --force`.

### OPENAI_API_KEY not set

Set the environment variable or use `--skip-ai` for development.

### Content doesn't match override

Overrides in `site/overrides/templates/` merge on top of AI content. Check if there's an override file conflicting with expectations.

### humanEdited template not regenerating

By design. Templates with `humanEdited: true` in their override file skip AI generation entirely. Remove the override file or set `humanEdited: false` to re-enable.

## Content Template Types

The pipeline auto-selects one of the following types based on template metadata:

- tutorial
- showcase
- comparison
- breakthrough

These correspond to prompt files in `site/knowledge/prompts/`.

## Rules

- Always run commands from the `site/` directory.
- Never manually edit files in `site/src/content/templates/` — they are generated.
- Never manually edit `site/.content-cache/` — use the CLI commands.
- The `site/overrides/templates/` directory is for human overrides, not AI content.
