#!/usr/bin/env python3
"""
Template Synchronization Script for ComfyUI Workflow Templates

This script synchronizes template information from the English master file (index.json)
to all other language versions, with automatic tag translation support.

Key Features:
- Auto-sync technical fields (models, date, size, vram, etc.)
- Automatic tag translation using i18n.json
- Preserve language-specific translations (title, description)
- Detect and track new tags for manual translation
- Maintain consistent structure across all language files

Translation Workflow:
1. Tags are automatically translated from English to target language using i18n.json
2. New tags not in mappings are temporarily kept in English
3. New tags are added to i18n.json for later translation
4. Update i18n.json with proper translations
5. Re-run sync to apply translations to all language files

Usage:
    python sync_templates.py --templates-dir ./templates
    python sync_templates.py --templates-dir ./templates --dry-run
    python sync_templates.py --templates-dir ./templates --force-sync-language-fields

Author: Claude Code
Date: 2025-11-27
Version: 3.0
"""

import json
import os
import logging
import argparse
import sys
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from pathlib import Path


class TemplateSyncer:
    """Main class for template synchronization operations"""
    
    def __init__(self, templates_dir: str, dry_run: bool = False):
        self.templates_dir = Path(templates_dir).resolve()
        self.dry_run = dry_run
        self.master_file = self.templates_dir / "index.json"
        # i18n file is in the scripts directory (sibling to templates)
        scripts_dir = self.templates_dir.parent / "scripts"
        self.i18n_file = scripts_dir / "i18n.json"
        
        # Configuration for field handling
        self.auto_sync_fields = {
            "models", "date", "size", "vram", "mediaType", "mediaSubtype", 
            "tutorialUrl", "thumbnailVariant"
        }
        self.language_specific_fields = {"title", "description"}
        self.special_handling_fields = {"tags"}
        
        # Language files mapping
        self.language_files = {
            "zh": "index.zh.json",
            "zh-TW": "index.zh-TW.json", 
            "ja": "index.ja.json",
            "ko": "index.ko.json",
            "es": "index.es.json",
            "fr": "index.fr.json",
            "ru": "index.ru.json",
            "tr": "index.tr.json",
            "ar": "index.ar.json"
        }
        
        # Setup logging first
        self.setup_logging()
        
        # Load i18n data
        self.i18n_data = self.load_i18n()
        self.new_tags = set()  # Track new tags discovered during sync
        self.used_tags = set()  # Track tags that are actually used in templates
        self.used_categories = set()  # Track categories that are actually used
        self.translation_stats = {
            'templates_scanned': 0,
            'untranslated_found': 0,
            'translations_applied': 0,
            'translations_synced': 0
        }
        
    def setup_logging(self):
        """Configure logging system"""
        log_format = '%(asctime)s - %(levelname)s - %(message)s'
        logging.basicConfig(
            level=logging.INFO,
            format=log_format,
            handlers=[
                logging.StreamHandler(sys.stdout),
                logging.FileHandler(self.templates_dir / 'sync.log', encoding='utf-8')
            ]
        )
        self.logger = logging.getLogger(__name__)
        
    def load_i18n(self) -> Dict[str, Any]:
        """Load i18n data from JSON file"""
        if not self.i18n_file.exists():
            self.logger.warning(f"i18n file not found: {self.i18n_file}")
            return {
                "_status": {
                    "comment": "Pending translation tasks. Only templates with missing translations appear here.",
                    "pending_templates": {}
                },
                "templates": {},
                "tags": {},
                "categories": {}
            }
            
        try:
            with open(self.i18n_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Ensure structure
            if "_status" not in data:
                data["_status"] = {
                    "comment": "Pending translation tasks. Only templates with missing translations appear here.",
                    "pending_templates": {}
                }
            if "templates" not in data:
                data["templates"] = {}
            if "tags" not in data:
                data["tags"] = {}
            if "categories" not in data:
                data["categories"] = {}
                
            self.logger.info(f"Loaded i18n data - Templates: {len(data['templates'])}, Tags: {len(data['tags'])}, Categories: {len(data['categories'])}")
            
            return data
        except Exception as e:
            self.logger.error(f"Failed to load i18n data: {e}")
            return {
                "_status": {
                    "comment": "Pending translation tasks. Only templates with missing translations appear here.",
                    "pending_templates": {}
                },
                "templates": {},
                "tags": {},
                "categories": {}
            }
            
    def save_i18n(self):
        """Save i18n data to JSON file"""
        if self.dry_run:
            self.logger.info(f"[DRY RUN] Would save i18n data")
            return
            
        try:
            # Save to file
            with open(self.i18n_file, 'w', encoding='utf-8') as f:
                json.dump(self.i18n_data, f, ensure_ascii=False, indent=2)
            
            self.logger.info(f"Saved i18n data: {len(self.i18n_data['templates'])} templates, {len(self.i18n_data['tags'])} tags")
        except Exception as e:
            self.logger.error(f"Failed to save i18n data: {e}")
            
    def translate_tag(self, tag: str, target_lang: str) -> str:
        """Translate a tag to target language using i18n data"""
        tags_data = self.i18n_data.get("tags", {})
        
        if tag in tags_data:
            lang_mappings = tags_data[tag]
            if target_lang in lang_mappings:
                return lang_mappings[target_lang]
        
        # Tag not found in mappings - track it as new
        if tag not in tags_data:
            self.new_tags.add(tag)
            self.logger.warning(f"  ⚠️  New tag discovered: '{tag}' (using English temporarily)")
            
            # Add to mappings with English as default for all languages
            self.i18n_data["tags"][tag] = {
                lang: tag for lang in self.language_files.keys()
            }
        
        # Return English as fallback
        return tag
        
    def translate_tags(self, tags: List[str], target_lang: str) -> List[str]:
        """Translate a list of tags to target language"""
        # Track which tags are being used
        self.used_tags.update(tags)
        return [self.translate_tag(tag, target_lang) for tag in tags]
    
    def translate_category(self, category: str, target_lang: str) -> str:
        """Translate a category to target language using i18n data"""
        self.used_categories.add(category)
        
        categories_data = self.i18n_data.get("categories", {})
        if category in categories_data:
            lang_mappings = categories_data[category]
            if target_lang in lang_mappings:
                return lang_mappings[target_lang]
        
        # Category not found in mappings - return English
        return category
    
    def get_template_translation(self, template_name: str, field: str, target_lang: str) -> Optional[str]:
        """
        Get translation for a template field from i18n data
        Returns translation if available, None otherwise
        """
        templates_data = self.i18n_data.get("templates", {})
        
        if template_name not in templates_data:
            return None
        
        template_data = templates_data[template_name]
        if field not in template_data:
            return None
        
        field_data = template_data[field]
        
        # Return translation for this language if it exists
        if target_lang in field_data:
            translation = field_data[target_lang]
            if translation:
                return translation
        
        return None
    
    def update_pending_status(self, template_name: str, field: str, en_value: str, target_lang: str, current_value: str):
        """
        Update the pending translation status in i18n data
        Adds to pending_templates if translation is missing
        """
        pending_templates = self.i18n_data["_status"]["pending_templates"]
        
        # Check if translation is missing (same as English)
        if current_value == en_value and en_value:
            # Initialize template entry if needed
            if template_name not in pending_templates:
                pending_templates[template_name] = {
                    "missing_fields": [],
                    "missing_languages": []
                }
            
            # Add field if not already there
            if field not in pending_templates[template_name]["missing_fields"]:
                pending_templates[template_name]["missing_fields"].append(field)
            
            # Add language if not already there
            if target_lang not in pending_templates[template_name]["missing_languages"]:
                pending_templates[template_name]["missing_languages"].append(target_lang)
            
            # Ensure template exists in templates section
            if template_name not in self.i18n_data["templates"]:
                self.i18n_data["templates"][template_name] = {}
            
            if field not in self.i18n_data["templates"][template_name]:
                self.i18n_data["templates"][template_name][field] = {}
            
            # Store English value
            self.i18n_data["templates"][template_name][field]["en"] = en_value
            
            # Store untranslated value for this language
            self.i18n_data["templates"][template_name][field][target_lang] = current_value
            
        else:
            # Translation exists, remove from pending if present
            if template_name in pending_templates:
                if field in pending_templates[template_name]["missing_fields"]:
                    # Check if this language has translation
                    if current_value != en_value:
                        # Remove language from missing list for this field
                        if target_lang in pending_templates[template_name]["missing_languages"]:
                            # Only remove if all fields are translated for this language
                            all_fields_translated = True
                            for f in ["title", "description"]:
                                if f in pending_templates[template_name]["missing_fields"]:
                                    # Check if this specific field is translated
                                    if f == field:
                                        continue  # Current field is translated
                                    # Check other fields
                                    template_data = self.i18n_data["templates"].get(template_name, {})
                                    field_data = template_data.get(f, {})
                                    en_val = field_data.get("en", "")
                                    lang_val = field_data.get(target_lang, en_val)
                                    if lang_val == en_val:
                                        all_fields_translated = False
                                        break
                            
                            if all_fields_translated:
                                pending_templates[template_name]["missing_languages"].remove(target_lang)
                        
                        # Clean up if no more missing languages
                        if not pending_templates[template_name]["missing_languages"]:
                            del pending_templates[template_name]
    
    def load_json_file(self, file_path: Path) -> List[Dict[str, Any]]:
        """Load and parse JSON file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            self.logger.info(f"Loaded {file_path.name} - {len(data)} categories")
            return data
        except Exception as e:
            self.logger.error(f"Failed to load {file_path}: {e}")
            raise
            
    def save_json_file(self, file_path: Path, data: List[Dict[str, Any]]):
        """Save data to JSON file with compact array formatting"""
        if self.dry_run:
            self.logger.info(f"[DRY RUN] Would save {file_path.name}")
            return
            
        try:
            # First get the standard JSON with indentation
            json_str = json.dumps(data, ensure_ascii=False, indent=2)
            
            # Compact arrays (like tags, models) to single line
            import re
            
            # Pattern to match arrays with simple string elements
            def compact_array(match):
                content = match.group(1)
                # Only compact if array contains only strings and is not too long
                try:
                    array_content = json.loads(f"[{content}]")
                    if all(isinstance(item, str) for item in array_content) and len(content) < 200:
                        return f"[{', '.join(json.dumps(item, ensure_ascii=False) for item in array_content)}]"
                except:
                    pass
                return match.group(0)
            
            # Compact arrays that span multiple lines
            json_str = re.sub(r'\[\s*\n\s*([^[\]]*?)\s*\n\s*\]', compact_array, json_str, flags=re.DOTALL)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(json_str)
            self.logger.info(f"Saved {file_path.name}")
        except Exception as e:
            self.logger.error(f"Failed to save {file_path}: {e}")
            raise
            
        
    def build_template_index(self, data: List[Dict[str, Any]]) -> Dict[str, Tuple[int, int, Dict[str, Any]]]:
        """Build index of templates by name for quick lookup"""
        index = {}
        for cat_idx, category in enumerate(data):
            for template_idx, template in enumerate(category.get("templates", [])):
                template_name = template.get("name")
                if template_name:
                    index[template_name] = (cat_idx, template_idx, template)
        return index
        
    def compare_field_values(self, field: str, old_value: Any, new_value: Any) -> bool:
        """Compare field values and determine if they're different"""
        if field in {"tags"} and isinstance(old_value, list) and isinstance(new_value, list):
            return set(old_value) != set(new_value)
        return old_value != new_value
        
    def get_template_names_from_category(self, category: Dict[str, Any]) -> set:
        """Extract template names from a category"""
        return {template.get("name") for template in category.get("templates", []) if template.get("name")}
        
    def find_matching_category(self, master_category: Dict[str, Any], target_data: List[Dict[str, Any]]) -> Optional[int]:
        """Find matching category in target data based on template names"""
        master_templates = self.get_template_names_from_category(master_category)
        if not master_templates:
            return None
            
        best_match_idx = None
        best_match_score = 0
        
        for idx, target_category in enumerate(target_data):
            target_templates = self.get_template_names_from_category(target_category)
            if not target_templates:
                continue
                
            # Calculate intersection ratio
            intersection = master_templates & target_templates
            if intersection:
                # Score based on intersection size relative to both sets
                score = len(intersection) / max(len(master_templates), len(target_templates))
                if score > best_match_score:
                    best_match_score = score
                    best_match_idx = idx
                    
        # Only return match if score is above threshold (at least 50% overlap)
        return best_match_idx if best_match_score >= 0.5 else None


class TemplateSyncManager:
    """Manager class for handling synchronization workflow"""
    
    def __init__(self, syncer: TemplateSyncer, sync_options: Dict[str, Any]):
        self.syncer = syncer
        self.sync_options = sync_options
        self.stats = {
            'files_processed': 0,
            'templates_added': 0,
            'templates_removed': 0,
            'templates_updated': 0,
            'fields_updated': 0
        }
        
    def sync_template_data(self, master_template: Dict[str, Any], target_template: Dict[str, Any], 
                          template_name: str, lang: str) -> Dict[str, Any]:
        """Sync data from master template to target template"""
        updated_template = target_template.copy()
        changes_made = False
        
        # Auto-sync fields
        for field in self.syncer.auto_sync_fields:
            if field in master_template:
                if field not in target_template or target_template[field] != master_template[field]:
                    updated_template[field] = master_template[field]
                    changes_made = True
                    self.syncer.logger.info(f"  ✓ Auto-synced {field}: {master_template[field]}")
                    
        # Handle tags - always translate using i18n data
        if "tags" in master_template:
            # Translate tags from English to target language
            translated_tags = self.syncer.translate_tags(master_template["tags"], lang)
            
            # Update if different or missing
            if "tags" not in target_template or target_template["tags"] != translated_tags:
                updated_template["tags"] = translated_tags
                changes_made = True
                if translated_tags != master_template["tags"]:
                    self.syncer.logger.info(f"  🏷️  Translated tags: {master_template['tags']} → {translated_tags}")
                else:
                    self.syncer.logger.info(f"  ➕ Added tags: {translated_tags}")
                        
        # Handle language-specific fields - sync from i18n.json if available
        for field in self.syncer.language_specific_fields:
            if field in master_template:
                en_value = master_template[field]
                current_value = target_template.get(field)
                
                # Get translation from i18n data
                translation = self.syncer.get_template_translation(template_name, field, lang)
                
                if translation:
                    # Apply translation from i18n
                    if current_value != translation:
                        updated_template[field] = translation
                        changes_made = True
                        self.syncer.translation_stats['translations_applied'] += 1
                        self.syncer.logger.info(f"  🌐 Applied translation from i18n for {field}: '{translation}'")
                elif current_value is None:
                    # Field doesn't exist in target, use English as fallback for new templates
                    updated_template[field] = en_value
                    changes_made = True
                    self.syncer.logger.info(f"  ➕ Added missing {field} (no i18n translation): '{en_value}'")
                else:
                    # No translation in i18n but field exists, preserve existing value
                    self.syncer.logger.debug(f"  ⏭ Preserved existing {field}: '{current_value}' (no i18n translation)")
        
        # Track that we scanned this template
        self.syncer.translation_stats['templates_scanned'] += 1
                            
        if changes_made:
            self.stats['templates_updated'] += 1
            self.stats['fields_updated'] += 1
            
        return updated_template
        
    def sync_language_file(self, lang: str, lang_file: str) -> bool:
        """Synchronize a single language file"""
        self.syncer.logger.info(f"\n🌐 Synchronizing {lang} ({lang_file})...")
        
        # Load files
        master_data = self.syncer.load_json_file(self.syncer.master_file)
        target_file = self.syncer.templates_dir / lang_file
        
        if target_file.exists():
            target_data = self.syncer.load_json_file(target_file)
        else:
            self.syncer.logger.warning(f"Target file {lang_file} not found, will create new one")
            target_data = []
            
        # Build template indices
        master_index = self.syncer.build_template_index(master_data)
        target_index = self.syncer.build_template_index(target_data)
        
        # Create new synchronized data structure following master category order
        new_data = []
        used_target_indices = set()
        
        for master_category in master_data:
            # Try to find matching category in target data
            matching_idx = self.syncer.find_matching_category(master_category, target_data)
            
            new_category = {
                "moduleName": master_category["moduleName"],
                "type": master_category["type"]
            }
            
            # Copy isEssential if it exists
            if "isEssential" in master_category:
                new_category["isEssential"] = master_category["isEssential"]
                
            # Copy category if it exists, translate it
            if "category" in master_category:
                new_category["category"] = master_category["category"]
                
            # Copy icon if it exists
            if "icon" in master_category:
                new_category["icon"] = master_category["icon"]
            
            if matching_idx is not None and matching_idx not in used_target_indices:
                # Use existing category data for language-specific fields
                existing_category = target_data[matching_idx]
                used_target_indices.add(matching_idx)
                
                # Use translated title from i18n or existing
                if "title" in master_category:
                    master_title = master_category["title"]
                    translated_title = self.syncer.translate_category(master_title, lang)
                    
                    # If no translation in i18n, use existing title from target
                    if translated_title == master_title and "title" in existing_category:
                        new_category["title"] = existing_category["title"]
                    else:
                        new_category["title"] = translated_title
                    
                    self.syncer.logger.info(f"  🔗 Matched category '{master_category['moduleName']}' with existing category (title: '{new_category['title']}')")
                else:
                    if "title" in existing_category:
                        new_category["title"] = existing_category["title"]
            else:
                # No matching category found, use translated title from i18n or master
                if "title" in master_category:
                    master_title = master_category["title"]
                    new_category["title"] = self.syncer.translate_category(master_title, lang)
                    if matching_idx is None:
                        self.syncer.logger.info(f"  ➕ Added new category: '{master_category['moduleName']}' (title: '{new_category['title']}')")
                
            new_category["templates"] = []
            
            for template in master_category.get("templates", []):
                template_name = template["name"]
                
                if template_name in target_index:
                    # Update existing template
                    _, _, existing_template = target_index[template_name]
                    new_template = self.sync_template_data(template, existing_template, template_name, lang)
                else:
                    # Add new template - also apply translations from i18n
                    new_template = template.copy()
                    
                    # Apply translations from i18n for new templates
                    for field in self.syncer.language_specific_fields:
                        if field in template:
                            translation = self.syncer.get_template_translation(template_name, field, lang)
                            if translation:
                                new_template[field] = translation
                                self.syncer.logger.info(f"  🌐 Applied i18n translation for new template {field}: '{translation}'")
                    
                    # Translate tags for new templates
                    if "tags" in template:
                        new_template["tags"] = self.syncer.translate_tags(template["tags"], lang)
                    
                    self.stats['templates_added'] += 1
                    self.syncer.logger.info(f"  ➕ Added new template: {template_name}")
                    
                new_category["templates"].append(new_template)
                
            new_data.append(new_category)
            
        # Check for removed templates and categories
        for template_name in target_index:
            if template_name not in master_index:
                self.stats['templates_removed'] += 1
                self.syncer.logger.info(f"  🗑️ Removed template: {template_name}")
                
        # Check for removed categories
        removed_categories = []
        for idx, target_category in enumerate(target_data):
            if idx not in used_target_indices and target_category.get("templates"):
                removed_categories.append(target_category.get("moduleName", f"Category {idx}"))
                
        if removed_categories:
            self.syncer.logger.info(f"  🗑️ Removed categories: {', '.join(removed_categories)}")
                
        # Save synchronized data
        self.syncer.save_json_file(target_file, new_data)
        self.stats['files_processed'] += 1
        
        return True
    
    def generate_translation_report(self):
        """Generate detailed translation status report"""
        self.syncer.logger.info("\n" + "="*80)
        self.syncer.logger.info("📊 Translation Status Report")
        self.syncer.logger.info("="*80)
        
        pending_templates = self.syncer.i18n_data["_status"]["pending_templates"]
        
        if not pending_templates:
            self.syncer.logger.info("✅ All templates are fully translated!")
            return
        
        # Count statistics
        total_templates = len(pending_templates)
        
        for template_name, status in sorted(pending_templates.items()):
            missing_fields = status.get("missing_fields", [])
            missing_languages = status.get("missing_languages", [])
            
            self.syncer.logger.info(f"\nTemplate: {template_name}")
            self.syncer.logger.info(f"├─ Missing fields: {', '.join(missing_fields)}")
            self.syncer.logger.info(f"└─ Missing languages: {', '.join(missing_languages)}")
        
        # Summary
        self.syncer.logger.info("\n" + "-"*80)
        self.syncer.logger.info("Summary:")
        self.syncer.logger.info("-"*80)
        self.syncer.logger.info(f"📝 Total templates with pending translations: {total_templates}")
        self.syncer.logger.info(f"🔍 Templates scanned: {self.syncer.translation_stats['templates_scanned']}")
        self.syncer.logger.info(f"🌐 Translations applied: {self.syncer.translation_stats['translations_applied']}")
        
    def run_sync(self) -> bool:
        """Run complete synchronization process"""
        self.syncer.logger.info("🚀 Starting template synchronization...")
        self.syncer.logger.info(f"Master file: {self.syncer.master_file}")
        self.syncer.logger.info(f"i18n file: {self.syncer.i18n_file}")
        self.syncer.logger.info(f"Dry run: {self.syncer.dry_run}")
        
        if not self.syncer.master_file.exists():
            self.syncer.logger.error(f"Master file not found: {self.syncer.master_file}")
            return False
            
        success = True
        for lang, lang_file in self.syncer.language_files.items():
            try:
                if not self.sync_language_file(lang, lang_file):
                    success = False
            except Exception as e:
                self.syncer.logger.error(f"Failed to sync {lang}: {e}")
                success = False
                
        # Check for unused tags in i18n data
        unused_tags = set(self.syncer.i18n_data.get("tags", {}).keys()) - self.syncer.used_tags
        if unused_tags:
            self.syncer.logger.info(f"\n🗑️  Unused tags in i18n data: {len(unused_tags)}")
            self.syncer.logger.info(f"   These tags exist in i18n.json but are not used in any template:")
            for tag in sorted(unused_tags):
                self.syncer.logger.info(f"   - {tag}")
            self.syncer.logger.info(f"   💡 You can manually remove these from {self.syncer.i18n_file} if they are no longer needed")
        
        # Save i18n data
        needs_save = False
        
        if self.syncer.new_tags:
            self.syncer.logger.info(f"\n🆕 New tags discovered: {len(self.syncer.new_tags)}")
            for tag in sorted(self.syncer.new_tags):
                self.syncer.logger.info(f"   - {tag}")
            needs_save = True
        
        if self.syncer.i18n_data["_status"]["pending_templates"]:
            self.syncer.logger.info(f"\n💾 Saving translation tracking data...")
            needs_save = True
        
        if needs_save:
            self.syncer.save_i18n()
            self.syncer.logger.info(f"✅ Saved to: {self.syncer.i18n_file}")
        
        # Generate translation report
        self.generate_translation_report()
        
        # Print summary
        self.syncer.logger.info(f"\n📊 Synchronization Summary:")
        self.syncer.logger.info(f"   Files processed: {self.stats['files_processed']}")
        self.syncer.logger.info(f"   Templates added: {self.stats['templates_added']}")
        self.syncer.logger.info(f"   Templates removed: {self.stats['templates_removed']}")
        self.syncer.logger.info(f"   Templates updated: {self.stats['templates_updated']}")
        self.syncer.logger.info(f"   Fields updated: {self.stats['fields_updated']}")
        if self.syncer.new_tags:
            self.syncer.logger.info(f"   New tags found: {len(self.syncer.new_tags)}")
        
        return success


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Synchronize ComfyUI workflow template files with automatic tag translation',
        epilog="""
Examples:
  # Normal sync with tag translation
  python sync_templates.py --templates-dir ./templates
  
  # Dry run to see what would change
  python sync_templates.py --templates-dir ./templates --dry-run
  
  # Force sync language fields (overwrite existing translations)
  python sync_templates.py --templates-dir ./templates --force-sync-language-fields

Translation System:
  Translations are stored in i18n.json with the following structure:
  - templates: Template title and description translations
  - tags: Tag translations
  - categories: Category translations
  - _status: Tracks pending translations
        """
    )
    parser.add_argument('--templates-dir', default='.', help='Directory containing template files')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be done without making changes')
    parser.add_argument('--force-sync-language-fields', action='store_true', 
                       help='Force sync language-specific fields (title, description) - overwrite existing translations')
    
    args = parser.parse_args()
    
    sync_options = {
        'force_sync_language_fields': args.force_sync_language_fields
    }
    
    try:
        syncer = TemplateSyncer(args.templates_dir, args.dry_run)
        sync_manager = TemplateSyncManager(syncer, sync_options)
        
        success = sync_manager.run_sync()
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\n⏹️ Synchronization cancelled by user")
        sys.exit(1)
    except Exception as e:
        logging.error(f"Synchronization failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
