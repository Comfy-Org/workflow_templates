# Template Synchronization Script

This script is used to automatically synchronize template information from the English master file (`index.json`) to other language versions, ensuring consistency across all language versions.

## Features

- 🔄 **Automatic Synchronization**: Synchronizes additions, deletions, and updates of templates from the English version
- 📊 **Order Maintenance**: Maintains the order of templates and categories consistent with the English version across all language versions
- 🎯 **Intelligent Field Handling**: Automatically synchronizes technical fields while prompting for handling language-specific fields
- 💬 **Interactive Processing**: Provides flexible handling options for fields like tags and descriptions
- 📝 **Detailed Logging**: Provides complete operation logs and change records
- 🔒 **Safe Backup**: Automatically creates backup files and supports dry-run mode

## Supported Language Versions

- 🇨🇳 Simplified Chinese (`index.zh.json`)
- 🇹🇼 Traditional Chinese (`index.zh-TW.json`)
- 🇯🇵 Japanese (`index.ja.json`)
- 🇰🇷 Korean (`index.ko.json`)
- 🇪🇸 Spanish (`index.es.json`)
- 🇫🇷 French (`index.fr.json`)
- 🇷🇺 Russian (`index.ru.json`)

## Installation Requirements

- Python 3.6+
- No additional dependencies required

## Usage

### Basic Usage

```bash
# Run in the templates directory - preserves all translated content by default
python3 scripts/sync_templates.py --templates-dir templates

# Or run from the scripts directory
cd scripts
python3 sync_templates.py --templates-dir ../templates
```

### Parameter Options

```bash
# Dry run mode - see what operations would be performed without actually modifying files
python3 sync_templates.py --templates-dir templates --dry-run

# Force sync tags (overwrite translated tags)
python3 sync_templates.py --templates-dir templates --force-sync-tags

# Force sync language fields (overwrite translated titles and descriptions)
python3 sync_templates.py --templates-dir templates --force-sync-language-fields

# Combine multiple parameters
python3 sync_templates.py --templates-dir templates --dry-run --force-sync-tags
```

### Parameter Descriptions

| Parameter | Description | Default |
|-----------|-------------|---------|
| `--templates-dir` | Directory where template files are located | `.` |
| `--dry-run` | Dry run mode, shows operations without modifying files | `False` |
| `--force-sync-tags` | Force sync tags (overwrites translations) | `False` |
| `--force-sync-language-fields` | Force sync language fields (overwrites translations) | `False` |
| `--preserve-translations` | Preserve existing translations (default behavior) | `True` |

## Field Handling Strategy

### 🔄 Automatically Synced Fields
These fields are directly synchronized from the English version without confirmation:
- `models` - Model list
- `date` - Date
- `size` - File size
- `mediaType` - Media type
- `mediaSubtype` - Media subtype
- `tutorialUrl` - Tutorial URL
- `thumbnailVariant` - Thumbnail variant

### 🌐 Language-Specific Fields (Translation Preserved by Default)
These fields preserve existing translations by default unless `--force-sync-language-fields` is used to force synchronization:
- `title` - Title
- `description` - Description

### 🏷️ Tag Fields (Translation Preserved by Default)
- `tags` - Tags: Preserves translated tags by default unless `--force-sync-tags` is used to force synchronization

## Default Behavior Explanation

**🎯 Intelligent Protection of Translations**:
- ✅ **Automatic Synchronization of Technical Fields**: Automatically updates technical parameters such as models, date, size
- 🛡️ **Protection of Translation Content**: Preserves all translated titles, descriptions, and tags
- ➕ **Intelligent Addition**: Only adds new fields when missing
- 📊 **Maintaining Consistency**: Maintains template order and structure

**Example Log Output**:
```
✓ Auto-synced size: 1.99                    # Automatically sync technical field
⏭ Preserved translated tags: ['文生图', '图像']  # Preserve translated tags
➕ Added new template: new_template_name     # Add new template
```

## Operation Types

### ➕ Adding New Templates
When new templates exist in the English version, they are automatically added to all language versions:
```
➕ Added new template: new_template_name
```

### 🗑️ Removing Templates
When templates are deleted from the English version, they are removed from all language versions:
```
🗑️ Removed template: old_template_name
```

### ✓ Updating Templates
When template fields change:
```
✓ Auto-synced size: 1.99                    # Technical field auto-synced
⏭ Preserved translated title: '图像生成'      # Preserve translated content
➕ Added missing tutorialUrl: https://...    # Add missing field
```

## Log Output

The script generates detailed log files (`sync.log`) recording all operations:

```
2025-09-01 23:51:52 - INFO - 🚀 Starting template synchronization...
2025-09-01 23:51:52 - INFO - 🌐 Synchronizing zh (index.zh.json)...
2025-09-01 23:51:52 - INFO - ✓ Auto-synced size: 1.99
2025-09-01 23:51:52 - INFO - ➕ Added new template: new_template
```

## Synchronization Summary

After completion, an operation summary is displayed:
```
📊 Synchronization Summary:
   Files processed: 7
   Templates added: 3
   Templates removed: 1
   Templates updated: 15
   Fields updated: 42
```

## Security Features

### 🔒 Automatic Backup
Automatic backup files are created before each run:
- Backup location: `templates/backups/`
- Naming format: `index.zh_20250901_235152.json`

### 🧪 Dry Run Mode
Use the `--dry-run` parameter to safely see what operations would be performed:
```bash
python3 sync_templates.py --templates-dir templates --dry-run
```

## Troubleshooting

### Common Issues

1. **Permission Errors**
   ```bash
   chmod +x scripts/sync_templates.py
   ```

2. **File Encoding Issues**
   Ensure all JSON files use UTF-8 encoding

3. **JSON Format Errors**
   Use JSON validation tools to check file format

### Log Viewing
```bash
# View latest logs
tail -f templates/sync.log

# Search for error messages
grep -i error templates/sync.log
```

## Development Information

- **Script Location**: `scripts/sync_templates.py`
- **Python Version**: 3.6+
- **Encoding**: UTF-8
- **Log Level**: INFO

## Best Practices

1. **Pre-Run Check**: Use `--dry-run` to see what operations would be performed first
2. **Regular Backups**: The script automatically backs up files, but it's recommended to manually back up important files regularly
3. **Batch Processing**: For large-scale changes, consider using `--auto-sync-tags` to reduce interaction
4. **Test Validation**: After synchronization, verify that JSON files are correctly formatted

## Example Workflow

```bash
# 1. First see what operations would be performed
python3 scripts/sync_templates.py --templates-dir templates --dry-run

# 2. If everything looks good, execute the actual synchronization
python3 scripts/sync_templates.py --templates-dir templates

# 3. Check logs to confirm operation results
cat templates/sync.log
```

---

For issues or suggestions, please contact the development team.