# Translation Management Guide

## Quick Start

### Sync translations and templates

```bash
# Normal sync
python3 scripts/sync_i18n.py --templates-dir ./templates

# Preview changes without modifying files
python3 scripts/sync_i18n.py --templates-dir ./templates --dry-run
```

## Workflow

### Adding a New Template

1. Add template to `templates/index.json`
2. Run `python3 scripts/sync_i18n.py --templates-dir ./templates`
3. Check `i18n.json` - new template will be added to `_status.pending_templates`
4. Add translations in `i18n.json` under `templates` section
5. Run sync again to apply translations

### Adding Translations

Edit `i18n.json`:

```json
{
  "templates": {
    "template_name": {
      "title": {
        "en": "English Title",
        "zh": "中文标题",
        "zh-TW": "繁體中文標題"
      },
      "description": {
        "en": "English Description",
        "zh": "中文描述"
      }
    }
  }
}
```

### Adding New Tags

1. Use new tag in a template
2. Run sync script - new tag will be auto-added to `i18n.json`
3. Add tag translations in `i18n.json` under `tags` section
4. Run sync again

## Data Structure

### i18n.json Format

- `_status.pending_templates` - Templates with missing translations
- `templates` - Template title and description translations
- `tags` - Tag translations
- `categories` - Category translations

## Supported Languages

`zh`, `zh-TW`, `ja`, `ko`, `es`, `fr`, `ru`, `tr`, `ar`

## Notes

- Script automatically syncs technical fields (models, date, size, etc.)
- Only title and description require translation
- Tags are auto-translated from `i18n.json`

