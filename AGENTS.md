# AGENTS.md

## Build & Run Commands
- `npm run sync` — Sync template bundles (run after editing templates/ or bundles.json)
- `npm run site:dev` — Start Astro dev server for template site (localhost:4321)
- `npm run site:build` — Build site (skips AI generation)
- `python scripts/validate_templates.py` — Validate template JSON files
- `python scripts/sync_bundles.py` — Regenerate manifest and copy assets to packages

## Architecture
- **Monorepo** with Nx, Python packages, and Astro site
- `templates/` — Source workflow JSON files and thumbnails (index.json is the manifest)
- `packages/` — Python packages: core (loader), media_* (templates by type: api, image, video, other)
- `site/` — Astro + Tailwind static site for template showcase pages
- `scripts/` — Python validation/sync scripts for CI and local dev

## Code Style
- **Python**: Ruff linter, line-length 100, target py312. Select rules: E, F
- **TypeScript/Astro**: ESM modules, tsx for scripts. Use Tailwind for styling
- **Templates**: JSON workflow files with embedded model metadata. Thumbnails named `{template}-1.webp`
- **Naming**: snake_case for Python/templates, kebab-case for site routes
- Bump version in root `pyproject.toml` when adding/modifying templates
