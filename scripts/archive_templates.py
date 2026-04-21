#!/usr/bin/env python3
"""
Archive templates script.

This script:
1. RESTORES templates with "status": "active" in archived/index.json (runs first)
2. ARCHIVES templates with "status": "archived" in templates/index.json (runs after restore)

Restore process:
1. Finds all templates with "status": "active" in archived/index.json
2. Moves template JSON files and thumbnails back to templates/ folder
3. Moves template entries from archived/index.json to templates/index.json
4. Moves i18n translations from archived/archived_i18n.json back to i18n.json
5. Restores template entries in index.[locale].json files
6. Removes "status": "active" from template entries

Archive process:
1. Finds all templates with "status": "archived" in templates/index.json
2. Moves template JSON files and thumbnails to archived/ folder
3. Removes template entries from bundles.json
4. Moves i18n translations to archived/archived_i18n.json
5. Creates/updates archived/index.[locale].json files
6. Removes archived templates from original index files
"""

import json
import shutil
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Base paths (script is at scripts/archive_templates.py, so parent.parent = repo root)
BASE_DIR = Path(__file__).parent.parent
TEMPLATES_DIR = BASE_DIR / "templates"
ARCHIVED_DIR = BASE_DIR / "archived"
SCRIPTS_DIR = BASE_DIR / "scripts"
BUNDLES_FILE = BASE_DIR / "bundles.json"
INDEX_FILE = TEMPLATES_DIR / "index.json"
ARCHIVED_INDEX_FILE = ARCHIVED_DIR / "index.json"
I18N_FILE = SCRIPTS_DIR / "i18n.json"
ARCHIVED_I18N_FILE = ARCHIVED_DIR / "archived_i18n.json"

# Locale files pattern
LOCALE_PATTERN = "index.*.json"


def load_json(file_path: Path) -> Any:
    """Load JSON file."""
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(file_path: Path, data: Any, indent: int = 2) -> None:
    """Save JSON file with proper formatting, preserving compact array format."""
    # First get the standard JSON with indentation
    json_str = json.dumps(data, ensure_ascii=False, indent=indent, separators=(',', ': '))
    
    # Compact arrays (like tags, models) to single line when they contain simple values
    import re
    
    # Pattern to match arrays with simple string elements that span multiple lines
    def compact_array(match):
        content = match.group(1)
        # Only compact if array contains only simple values (strings, numbers) and is reasonably short
        try:
            # Try to parse the array content
            array_content = json.loads(f"[{content}]")
            if all(isinstance(item, (str, int, float, bool)) or item is None for item in array_content):
                # Check total length to avoid making lines too long
                compacted = ', '.join(json.dumps(item, ensure_ascii=False) for item in array_content)
                if len(compacted) < 150:  # Only compact if result is not too long
                    return f'[{compacted}]'
        except:
            pass
        return match.group(0)
    
    # Match arrays that span multiple lines: [\n  ... \n]
    # This pattern matches arrays with newlines and indentation
    json_str = re.sub(r'\[\s*\n\s*([^[\]]*?)\s*\n\s*\]', compact_array, json_str, flags=re.DOTALL)
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(json_str)
        if not json_str.endswith('\n'):
            f.write("\n")


def find_active_templates_in_archived(archived_index_data: List[Dict]) -> List[Dict]:
    """Find all templates with status: 'active' in archived/index.json."""
    active = []
    for category in archived_index_data:
        if "templates" in category:
            for template in category["templates"]:
                if template.get("status") == "active":
                    active.append((template, category))
    return active


def find_archived_templates(index_data: List[Dict]) -> List[Dict]:
    """Find all templates with status: 'archived'."""
    archived = []
    for category in index_data:
        if "templates" in category:
            for template in category["templates"]:
                if template.get("status") == "archived":
                    archived.append(template)
    return archived


def restore_template_files(template_name: str, archived_dir: Path, templates_dir: Path) -> None:
    """Restore template JSON and all thumbnail files from archived folder back to templates."""
    # Move JSON file back
    archived_json = archived_dir / f"{template_name}.json"
    if archived_json.exists():
        json_file = templates_dir / f"{template_name}.json"
        try:
            shutil.move(str(archived_json), str(json_file))
            print(f"  Restored {json_file.name} from archived/")
        except Exception as e:
            print(f"  Error restoring {archived_json.name}: {e}")

    # Move thumbnail files back (could be -1.webp, -2.webp, etc.)
    for ext in [".webp", ".mp3", ".mp4"]:  # Support various media types
        thumbnail_num = 1
        while True:
            archived_thumbnail = archived_dir / f"{template_name}-{thumbnail_num}{ext}"
            if archived_thumbnail.exists():
                thumbnail_file = templates_dir / f"{template_name}-{thumbnail_num}{ext}"
                try:
                    shutil.move(str(archived_thumbnail), str(thumbnail_file))
                    print(f"  Restored {thumbnail_file.name} from archived/")
                except Exception as e:
                    print(f"  Error restoring {archived_thumbnail.name}: {e}")
                thumbnail_num += 1
            else:
                break


def move_template_files(template_name: str, templates_dir: Path, archived_dir: Path) -> None:
    """Move template JSON and all thumbnail files to archived folder."""
    # Move JSON file
    json_file = templates_dir / f"{template_name}.json"
    if json_file.exists():
        archived_json = archived_dir / f"{template_name}.json"
        try:
            shutil.move(str(json_file), str(archived_json))
            print(f"  Moved {json_file.name} to archived/")
        except Exception as e:
            print(f"  Error moving {json_file.name}: {e}")

    # Move thumbnail files (could be -1.webp, -2.webp, etc.)
    for ext in [".webp", ".mp3", ".mp4"]:  # Support various media types
        thumbnail_num = 1
        while True:
            thumbnail_file = templates_dir / f"{template_name}-{thumbnail_num}{ext}"
            if thumbnail_file.exists():
                archived_thumbnail = archived_dir / f"{template_name}-{thumbnail_num}{ext}"
                try:
                    shutil.move(str(thumbnail_file), str(archived_thumbnail))
                    print(f"  Moved {thumbnail_file.name} to archived/")
                except Exception as e:
                    print(f"  Error moving {thumbnail_file.name}: {e}")
                thumbnail_num += 1
            else:
                break


def remove_from_bundles(template_name: str, bundles_data: Dict) -> bool:
    """Remove template name from all bundles arrays. Returns True if found and removed."""
    found = False
    for bundle_type, templates in bundles_data.items():
        if template_name in templates:
            templates.remove(template_name)
            found = True
            print(f"  Removed from bundles.{bundle_type}")
    return found


def merge_i18n_data(existing: Dict, new: Dict) -> Dict:
    """Merge i18n data, preserving existing entries."""
    merged = existing.copy()
    for key, value in new.items():
        if key not in merged:
            merged[key] = value
        elif isinstance(merged[key], dict) and isinstance(value, dict):
            # Recursively merge nested dictionaries
            merged[key] = merge_i18n_data(merged[key], value)
        # If key exists and is not a dict, keep existing (don't overwrite)
    return merged


def restore_i18n(template_name: str) -> None:
    """Restore i18n data for template from archived_i18n.json back to i18n.json."""
    if not ARCHIVED_I18N_FILE.exists():
        print(f"  No archived_i18n.json found for {template_name}")
        return

    archived_i18n = load_json(ARCHIVED_I18N_FILE)
    templates_data = archived_i18n.get("templates", {})

    if template_name not in templates_data:
        print(f"  No i18n data found for {template_name} in archived_i18n.json")
        return

    # Load i18n.json
    i18n_data = load_json(I18N_FILE)
    if "templates" not in i18n_data:
        i18n_data["templates"] = {}

    # Restore template i18n data
    template_i18n = {template_name: templates_data[template_name]}
    i18n_data["templates"] = merge_i18n_data(i18n_data["templates"], template_i18n)

    # Save i18n.json
    save_json(I18N_FILE, i18n_data)
    print(f"  Restored i18n data for {template_name}")

    # Remove from archived_i18n
    del templates_data[template_name]
    save_json(ARCHIVED_I18N_FILE, archived_i18n)


def update_archived_i18n(template_name: str, i18n_data: Dict) -> None:
    """Extract and move i18n data for template to archived_i18n.json."""
    # i18n.json structure: {"_status": {...}, "templates": {...}, ...}
    templates_data = i18n_data.get("templates", {})
    
    if template_name not in templates_data:
        print(f"  No i18n data found for {template_name}")
        return

    # Load or create archived i18n file
    if ARCHIVED_I18N_FILE.exists():
        archived_i18n = load_json(ARCHIVED_I18N_FILE)
    else:
        archived_i18n = {"templates": {}}

    # Ensure templates key exists in archived_i18n
    if "templates" not in archived_i18n:
        archived_i18n["templates"] = {}

    # Merge template i18n data
    template_i18n = {template_name: templates_data[template_name]}
    archived_i18n["templates"] = merge_i18n_data(archived_i18n["templates"], template_i18n)

    # Save archived i18n
    save_json(ARCHIVED_I18N_FILE, archived_i18n)
    print(f"  Updated archived_i18n.json with {template_name}")

    # Remove from original i18n
    if template_name in templates_data:
        del templates_data[template_name]


def find_template_in_category(template_name: str, category: Dict) -> Optional[Dict]:
    """Find template by name in a category."""
    if "templates" not in category:
        return None
    for template in category["templates"]:
        if template.get("name") == template_name:
            return template
    return None


def update_archived_index_locale(template_name: str, locale_file: Path, archived_locale_file: Path, locale_data: List[Dict]) -> List[Dict]:
    """Extract template from locale index and add to archived locale index. Returns updated locale_data."""
    # Find template in locale data
    archived_template = None
    source_category = None
    for category in locale_data:
        template = find_template_in_category(template_name, category)
        if template:
            archived_template = template
            source_category = category
            # Remove from original
            category["templates"] = [t for t in category["templates"] if t.get("name") != template_name]
            break

    if not archived_template:
        print(f"  Template {template_name} not found in {locale_file.name}")
        return locale_data

    # Load or create archived locale file
    if archived_locale_file.exists():
        archived_data = load_json(archived_locale_file)
    else:
        # Create empty structure
        archived_data = []

    # Add template to archived locale file
    # Find matching category in archived data
    found_category = False
    for archived_category in archived_data:
        if source_category and (
            archived_category.get("moduleName") == source_category.get("moduleName") and
            archived_category.get("type") == source_category.get("type")
        ):
            # Check if template already exists (shouldn't, but be safe)
            if not any(t.get("name") == template_name for t in archived_category.get("templates", [])):
                archived_category.setdefault("templates", []).append(archived_template)
                print(f"  Added to archived/{locale_file.name}")
            found_category = True
            break

    # If category not found in archived data, create it
    if not found_category and source_category:
        archived_category = {
            "moduleName": source_category.get("moduleName"),
            "type": source_category.get("type"),
            "category": source_category.get("category"),
            "icon": source_category.get("icon"),
            "title": source_category.get("title"),
            "templates": [archived_template]
        }
        archived_data.append(archived_category)
        print(f"  Created category and added to archived/{locale_file.name}")

    # Save archived locale file
    save_json(archived_locale_file, archived_data)
    return locale_data


def restore_from_archived_index_locale(template_name: str, locale_file: Path, archived_locale_file: Path, locale_data: List[Dict]) -> List[Dict]:
    """Restore template from archived locale index back to locale index. Returns updated locale_data."""
    if not archived_locale_file.exists():
        print(f"  Template {template_name} not found in archived/{locale_file.name}")
        return locale_data

    archived_data = load_json(archived_locale_file)
    restored_template = None
    source_category = None

    # Find template in archived locale data
    for category in archived_data:
        template = find_template_in_category(template_name, category)
        if template:
            restored_template = template.copy()
            source_category = category
            # Remove from archived
            category["templates"] = [t for t in category["templates"] if t.get("name") != template_name]
            break

    if not restored_template:
        print(f"  Template {template_name} not found in archived/{locale_file.name}")
        return locale_data

    # Remove status: "active" if present
    if "status" in restored_template and restored_template["status"] == "active":
        del restored_template["status"]

    # Add to original locale file
    found_category = False
    for locale_category in locale_data:
        if source_category and (
            locale_category.get("moduleName") == source_category.get("moduleName") and
            locale_category.get("type") == source_category.get("type")
        ):
            # Check if template already exists
            if not any(t.get("name") == template_name for t in locale_category.get("templates", [])):
                locale_category.setdefault("templates", []).append(restored_template)
                print(f"  Restored to {locale_file.name}")
            found_category = True
            break

    # If category not found, create it
    if not found_category and source_category:
        locale_category = {
            "moduleName": source_category.get("moduleName"),
            "type": source_category.get("type"),
            "category": source_category.get("category"),
            "icon": source_category.get("icon"),
            "title": source_category.get("title"),
            "templates": [restored_template]
        }
        locale_data.append(locale_category)
        print(f"  Created category and restored to {locale_file.name}")

    # Save archived locale file
    save_json(archived_locale_file, archived_data)
    return locale_data


def restore_from_archived_index(template_name: str, index_data: List[Dict], archived_index_data: List[Dict]) -> Tuple[List[Dict], List[Dict]]:
    """Restore template from archived/index.json back to templates/index.json. Returns (index_data, archived_index_data)."""
    restored_template = None
    source_category = None

    # Find template in archived index
    for category in archived_index_data:
        template = find_template_in_category(template_name, category)
        if template:
            restored_template = template.copy()
            source_category = category
            # Remove from archived index
            category["templates"] = [
                t for t in category["templates"] if t.get("name") != template_name
            ]
            break

    if not restored_template:
        print(f"  Template {template_name} not found in archived/index.json")
        return index_data, archived_index_data

    # Remove status: "active" if present
    if "status" in restored_template and restored_template["status"] == "active":
        del restored_template["status"]

    # Add to original index
    found_category = False
    for index_category in index_data:
        if source_category and (
            index_category.get("moduleName") == source_category.get("moduleName")
            and index_category.get("type") == source_category.get("type")
            and index_category.get("category") == source_category.get("category")
        ):
            # Check if template already exists
            if not any(
                t.get("name") == template_name
                for t in index_category.get("templates", [])
            ):
                index_category.setdefault("templates", []).append(restored_template)
                print("  Restored to index.json")
            found_category = True
            break

    # If category not found, create it
    if not found_category and source_category:
        index_category = {
            "moduleName": source_category.get("moduleName"),
            "type": source_category.get("type"),
            "category": source_category.get("category"),
            "icon": source_category.get("icon"),
            "title": source_category.get("title"),
            "templates": [restored_template],
        }
        index_data.append(index_category)
        print("  Created category and restored to index.json")

    save_json(ARCHIVED_INDEX_FILE, archived_index_data)
    return index_data, archived_index_data


def update_archived_index(template_name: str, index_data: List[Dict]) -> List[Dict]:
    """Move template from templates/index.json to archived/index.json, preserving category structure."""
    archived_template = None
    source_category = None

    for category in index_data:
        template = find_template_in_category(template_name, category)
        if template:
            archived_template = template
            source_category = category
            category["templates"] = [
                t for t in category["templates"] if t.get("name") != template_name
            ]
            break

    if not archived_template:
        print(f"  Template {template_name} not found in index.json")
        return index_data

    if ARCHIVED_INDEX_FILE.exists():
        archived_data = load_json(ARCHIVED_INDEX_FILE)
    else:
        archived_data = []

    found_category = False
    for archived_category in archived_data:
        if source_category and (
            archived_category.get("moduleName") == source_category.get("moduleName")
            and archived_category.get("type") == source_category.get("type")
            and archived_category.get("category") == source_category.get("category")
        ):
            if not any(
                t.get("name") == template_name
                for t in archived_category.get("templates", [])
            ):
                archived_category.setdefault("templates", []).append(archived_template)
                print("  Added to archived/index.json")
            found_category = True
            break

    if not found_category and source_category:
        archived_category = {
            "moduleName": source_category.get("moduleName"),
            "type": source_category.get("type"),
            "category": source_category.get("category"),
            "icon": source_category.get("icon"),
            "title": source_category.get("title"),
            "templates": [archived_template],
        }
        archived_data.append(archived_category)
        print("  Created category and added to archived/index.json")

    save_json(ARCHIVED_INDEX_FILE, archived_data)
    print("  Removed from index.json")
    return index_data


def restore_templates():
    """Restore templates with status: 'active' from archived folder."""
    if not ARCHIVED_INDEX_FILE.exists():
        print("No archived/index.json found. Skipping restore process.\n")
        return

    print("Starting template restoration process...\n")

    # Load archived index file
    archived_index_data = load_json(ARCHIVED_INDEX_FILE)

    # Find active templates
    active_templates = find_active_templates_in_archived(archived_index_data)
    if not active_templates:
        print("No templates with status: 'active' found in archived/index.json.\n")
        return

    print(f"Found {len(active_templates)} template(s) to restore:")
    for template, category in active_templates:
        print(f"  - {template.get('name')} ({template.get('title')})")
    print()

    # Load main index file and i18n data
    index_data = load_json(INDEX_FILE)
    i18n_data = load_json(I18N_FILE)

    # Find all locale files and load them
    locale_files = list(TEMPLATES_DIR.glob(LOCALE_PATTERN))
    locale_files = [f for f in locale_files if f.name != "index.json" and f.name != "index.schema.json"]
    locale_data_dict = {f: load_json(f) for f in locale_files}

    # Process each active template
    for template, category in active_templates:
        template_name = template.get("name")
        print(f"Restoring: {template_name}")

        # 1. Restore template files
        restore_template_files(template_name, ARCHIVED_DIR, TEMPLATES_DIR)

        # 2. Restore i18n data
        restore_i18n(template_name)

        # 3. Restore locale index files
        for locale_file in locale_files:
            archived_locale_file = ARCHIVED_DIR / locale_file.name
            locale_data_dict[locale_file] = restore_from_archived_index_locale(
                template_name, locale_file, archived_locale_file, locale_data_dict[locale_file]
            )

        # 4. Restore from archived/index.json to templates/index.json
        index_data, archived_index_data = restore_from_archived_index(
            template_name, index_data, archived_index_data
        )

        print()

    # Save updated files
    print("Saving restored files...")
    save_json(INDEX_FILE, index_data)
    save_json(ARCHIVED_INDEX_FILE, archived_index_data)

    # Save updated locale files
    for locale_file, locale_data in locale_data_dict.items():
        save_json(locale_file, locale_data)

    print("Restoration complete!\n")


def main():
    """Main function to restore and archive templates."""
    # Ensure archived directory exists
    ARCHIVED_DIR.mkdir(exist_ok=True)

    # STEP 1: Restore templates with status: "active"
    restore_templates()

    # STEP 2: Archive templates with status: "archived"
    print("Starting template archiving process...\n")

    # Load main index file
    print("Loading index.json...")
    index_data = load_json(INDEX_FILE)

    # Find archived templates
    archived_templates = find_archived_templates(index_data)
    if not archived_templates:
        print("No templates with status: 'archived' found.")
        return

    print(f"Found {len(archived_templates)} archived template(s):")
    for template in archived_templates:
        print(f"  - {template.get('name')} ({template.get('title')})")
    print()

    # Load bundles and i18n data
    bundles_data = load_json(BUNDLES_FILE)
    i18n_data = load_json(I18N_FILE)

    # Find all locale files and load them
    locale_files = list(TEMPLATES_DIR.glob(LOCALE_PATTERN))
    locale_files = [f for f in locale_files if f.name != "index.json" and f.name != "index.schema.json"]
    locale_data_dict = {f: load_json(f) for f in locale_files}

    # Process each archived template
    for template in archived_templates:
        template_name = template.get("name")
        print(f"Processing: {template_name}")

        # 1. Move template files
        move_template_files(template_name, TEMPLATES_DIR, ARCHIVED_DIR)

        # 2. Remove from bundles.json
        remove_from_bundles(template_name, bundles_data)

        # 3. Update archived_i18n.json
        update_archived_i18n(template_name, i18n_data)

        # 4. Update archived index.[locale].json files and update locale_data_dict
        for locale_file in locale_files:
            archived_locale_file = ARCHIVED_DIR / locale_file.name
            locale_data_dict[locale_file] = update_archived_index_locale(
                template_name, locale_file, archived_locale_file, locale_data_dict[locale_file]
            )

        # 5. Remove from original index.[locale].json (already done in update_archived_index_locale)

        # 6. Move from templates/index.json to archived/index.json
        index_data = update_archived_index(template_name, index_data)

        print()

    # Save updated files
    print("Saving updated files...")
    save_json(BUNDLES_FILE, bundles_data)
    save_json(I18N_FILE, i18n_data)
    save_json(INDEX_FILE, index_data)

    # Save updated locale files
    for locale_file, locale_data in locale_data_dict.items():
        save_json(locale_file, locale_data)

    print("\nArchiving complete!")
    print(f"Archived templates are now in: {ARCHIVED_DIR}")


if __name__ == "__main__":
    main()

