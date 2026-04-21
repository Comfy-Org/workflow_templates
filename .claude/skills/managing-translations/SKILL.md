---
name: managing-translations
description: "Manages internationalization and translations for ComfyUI workflow templates. Syncs translations, adds new languages, checks translation coverage, and manages locale files. Use when asked to: translate, add translations, sync translations, check translations, missing translations, add a language, localize, internationalize, i18n, update translations, translation status, which templates need translation, language support, sync locales, translate description, translate title, add Chinese, add Japanese, add Spanish, multi-language, multilingual. Triggers on: translate, translation, i18n, locale, language, localize, internationalize, sync translations, missing translations."
---

# Managing Translations

## Overview

The repo supports 11 languages. The English master file is `templates/index.json`. Locale files follow the pattern `templates/index.{locale}.json`:

| Code | Language | File |
|---|---|---|
| en | English | `templates/index.json` (master) |
| zh | Chinese (Simplified) | `templates/index.zh.json` |
| zh-TW | Chinese (Traditional) | `templates/index.zh-TW.json` |
| ja | Japanese | `templates/index.ja.json` |
| ko | Korean | `templates/index.ko.json` |
| es | Spanish | `templates/index.es.json` |
| fr | French | `templates/index.fr.json` |
| ru | Russian | `templates/index.ru.json` |
| tr | Turkish | `templates/index.tr.json` |
| ar | Arabic | `templates/index.ar.json` |
| pt-BR | Portuguese (Brazil) | `templates/index.pt-BR.json` |

## How Sync Works

Run the sync script to propagate changes from English master to all locale files:

```bash
python3 scripts/sync_data.py --templates-dir templates
```

### What sync does

- **Technical fields** (models, date, size, vram, tags, etc.) are auto-copied from English master to all locales.
- **Translatable fields** (`title`, `description`) are preserved if already translated — they are NOT overwritten.
- **New templates** get English fallback text until translated.
- **Tags** are auto-translated using mappings defined in `scripts/i18n.json`.

### Useful flags

- `--dry-run` — Preview changes without writing files.
- `--force-sync-language-fields` — Overwrite existing translations with English text (destructive — use with caution).

## Translation Tracking

`scripts/i18n.json` stores:

- Translation status for each template (per language).
- Tag translation mappings (English → each language).
- Category title translations.

## Adding Translations for a Template

1. Edit `scripts/i18n.json` to add translations under the template's name.
2. Run the sync script:
   ```bash
   python3 scripts/sync_data.py --templates-dir templates
   ```
3. Verify the locale files were updated correctly.

## Checking Translation Coverage

- Look at `scripts/missing_translations_report.json` for untranslated entries.
- Or manually compare a locale file against `index.json` to find templates with English-only text.

## Site-Level i18n (Separate System)

The template site (`site/`) has its own i18n system for UI strings — this is separate from the template translation system above:

- `site/src/i18n/config.ts` — Language definitions.
- `site/src/i18n/ui.ts` — UI string translations.
- `site/src/i18n/utils.ts` — URL localization helpers.
- Site sync: `pnpm run sync` (from `site/` directory) reads all locale index files.

## After Changes, Always Run

```bash
python3 scripts/sync_data.py --templates-dir templates
python scripts/validate_templates.py
```

## Rules

- English `index.json` is the master — always edit it first for structural changes.
- Never manually edit locale files for technical fields — use the sync script.
- Translatable fields (`title`, `description`) CAN be manually edited in locale files.
- After adding a new template to `index.json`, always run sync to propagate to all locales.
- Tag translations go in `scripts/i18n.json`, not in the locale files directly.
