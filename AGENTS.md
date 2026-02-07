# AGENTS.md

## Build & Run Commands
- `npm run sync` — Sync template bundles (run after editing templates/ or bundles.json)
- `python scripts/validate_templates.py` — Validate template JSON files
- `python scripts/sync_bundles.py` — Regenerate manifest and copy assets to packages

## Architecture
- **Monorepo** with Nx, Python packages, and Astro site
- `templates/` — Source workflow JSON files and thumbnails (index.json is the manifest)
- `packages/` — Python packages: core (loader), media_* (templates by type: api, image, video, other)
- `site/` — Astro static site (independently managed; see below)
- `scripts/` — Python validation/sync scripts for CI and local dev

## Template Site
The `site/` directory is an independent Astro project with its own tooling and commands.
For site-specific instructions, see `site/AGENTS.md`.

## Code Style
- **Python**: Ruff linter, line-length 100, target py312. Select rules: E, F
- **Templates**: JSON workflow files with embedded model metadata. Thumbnails named `{template}-1.webp`
- **Naming**: snake_case for Python/templates
- Bump version in root `pyproject.toml` when adding/modifying templates
