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
import csv
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from pathlib import Path

# Import sync_bundles module
# Add scripts directory to path to ensure we can import sync_bundles
_scripts_dir = Path(__file__).parent
if str(_scripts_dir) not in sys.path:
    sys.path.insert(0, str(_scripts_dir))

try:
    import sync_bundles
except ImportError:
    sync_bundles = None

try:
    import check_input_assets
except ImportError:
    check_input_assets = None

try:
    import analyze_models
except ImportError:
    analyze_models = None

try:
    import validate_templates
except ImportError:
    validate_templates = None

try:
    import generate_workflow_io
except ImportError:
    generate_workflow_io = None


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
            "models",
            "date",
            "size",
            "vram",
            "mediaType",
            "mediaSubtype", 
            "tutorialUrl",
            "thumbnailVariant",
            "requiresCustomNodes",
            "usage",
            "searchRank",
            "includeOnDistributions",
            "logos",
            "io"
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
            "ar": "index.ar.json",
            "pt-BR": "index.pt-BR.json"
        }
        
        # Setup logging first
        self.setup_logging()
        
        # Load i18n data
        self.i18n_data = self.load_i18n()
        # Load usage data from CSV file (if exists)
        self.usage_data = self.load_usage_data()
        self.new_tags = set()  # Track new tags discovered during sync
        self.used_tags = set()  # Track tags that are actually used in templates
        self.used_categories = set()  # Track categories that are actually used
        self.new_category_titles = set()  # Track new category titles discovered during sync
        self.new_category_fields = set()  # Track new category field values (like "MODELS", "GENERATION TYPE") discovered during sync
        self.vram_size_update_templates = set()  # Track templates that need vram/size data updates in i18n
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
            level=logging.WARNING,
            format=log_format,
            handlers=[
                logging.StreamHandler(sys.stdout),
                logging.FileHandler(self.templates_dir.parent / 'sync.log', encoding='utf-8')
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
                    "pending_templates": {},
                    "vram_size_update_templates": {
                        "comment": "Templates that need vram and size data management in i18n.json",
                        "templates": []
                    }
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
                    "pending_templates": {},
                    "vram_size_update_templates": {
                        "comment": "Templates that need vram and size data management in i18n.json",
                        "templates": []
                    }
                }
            if "vram_size_update_templates" not in data["_status"]:
                data["_status"]["vram_size_update_templates"] = {
                    "comment": "Templates that need vram and size data management in i18n.json",
                    "templates": []
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
                    "pending_templates": {},
                    "vram_size_update_templates": {
                        "comment": "Templates that need vram and size data management in i18n.json",
                        "templates": []
                    }
                },
                "templates": {},
                "tags": {},
                "categories": {}
            }
    
    def load_usage_data(self) -> Dict[str, int]:
        """Load usage data from CSV file if it exists"""
        # CSV file is in temp directory (sibling to templates directory)
        temp_dir = self.templates_dir.parent / "temp"
        usage_csv_file = temp_dir / "usage.csv"
        
        usage_data = {}
        
        if not usage_csv_file.exists():
            self.logger.info(f"Usage CSV file not found: {usage_csv_file} (skipping usage data sync)")
            return usage_data
        
        try:
            with open(usage_csv_file, 'r', encoding='utf-8') as f:
                reader = csv.reader(f)
                # Skip header row
                next(reader, None)
                
                for row in reader:
                    if len(row) >= 3:
                        # Format: Metric,workflow_name,usage_count
                        workflow_name = row[1].strip()
                        try:
                            usage_count = int(row[2].strip())
                            usage_data[workflow_name] = usage_count
                        except (ValueError, IndexError):
                            # Skip invalid rows
                            continue
            
            self.logger.info(f"Loaded usage data for {len(usage_data)} templates from {usage_csv_file}")
        except Exception as e:
            self.logger.warning(f"Failed to load usage data from {usage_csv_file}: {e} (continuing without usage data)")
        
        return usage_data
            
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
        """Translate a category field (like 'MODELS', 'GENERATION TYPE') to target language using i18n data"""
        self.used_categories.add(category)
        
        categories_data = self.i18n_data.get("categories", {})
        if category in categories_data:
            lang_mappings = categories_data[category]
            if target_lang in lang_mappings:
                return lang_mappings[target_lang]
        
        # Category not found in mappings - track it as new
        if category not in categories_data:
            self.new_category_fields.add(category)
            self.logger.warning(f"  ⚠️  New category field discovered: '{category}' (using English temporarily)")
            
            # Add to mappings with English as default for all languages
            self.i18n_data["categories"][category] = {
                lang: category for lang in self.language_files.keys()
            }
        
        # Return English as fallback
        return category
    
    def get_category_title_translation(self, category_title: str, target_lang: str) -> Optional[str]:
        """
        Get translation for a category title from i18n data
        Returns translation if available, None otherwise
        Similar to get_template_translation but for category titles
        """
        categories_data = self.i18n_data.get("categories", {})
        
        if category_title in categories_data:
            lang_mappings = categories_data[category_title]
            if target_lang in lang_mappings:
                translation = lang_mappings[target_lang]
                if translation and translation != category_title:
                    return translation
        
        return None
    
    def translate_category_title(self, category_title: str, target_lang: str) -> str:
        """
        Translate a category title (like 'Image', 'Use cases') to target language using i18n data
        Similar to translate_tag but for category titles
        """
        categories_data = self.i18n_data.get("categories", {})
        
        if category_title in categories_data:
            lang_mappings = categories_data[category_title]
            if target_lang in lang_mappings:
                return lang_mappings[target_lang]
        
        # Category title not found in mappings - track it as new
        if category_title not in categories_data:
            self.new_category_titles.add(category_title)
            self.logger.warning(f"  ⚠️  New category title discovered: '{category_title}' (using English temporarily)")
            
            # Add to mappings with English as default for all languages
            self.i18n_data["categories"][category_title] = {
                lang: category_title for lang in self.language_files.keys()
            }
        
        # Return English as fallback
        return category_title
    
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
    
    def mark_template_for_vram_size_update(self, template_name: str):
        """
        Mark a template for vram/size data updates in i18n.json
        This indicates that vram and size values should be managed in i18n.json
        """
        self.vram_size_update_templates.add(template_name)
        self.logger.info(f"  🏷️  Marked template '{template_name}' for vram/size data management in i18n")
    
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
                        return f"[{','.join(json.dumps(item, ensure_ascii=False) for item in array_content)}]"
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
        self.errors: List[str] = []
        self.stats = {
            'files_processed': 0,
            'templates_added': 0,
            'templates_removed': 0,
            'templates_updated': 0,
            'fields_updated': 0
        }
    
    def record_error(self, message: str):
        self.errors.append(message)
        
    def sync_template_data(self, master_template: Dict[str, Any], target_template: Dict[str, Any], 
                          template_name: str, lang: str) -> Dict[str, Any]:
        """Sync data from master template to target template"""
        # Start with master_template to preserve field order from master
        updated_template = master_template.copy()
        changes_made = False
        
        # Since we start from master_template, all fields are already in correct order
        # We only need to update translated fields and handle special cases
        
        # Handle vram data filling - use size data when vram is missing or 0
        if "size" in updated_template:
            if updated_template["size"] > 0:
                # If vram is missing or 0, use size data
                if "vram" not in updated_template or updated_template.get("vram", 0) == 0:
                    updated_template["vram"] = updated_template["size"]
                    changes_made = True
                    self.syncer.logger.info(f"  💾 Auto-filled vram using size: {updated_template['size']}")
                    
                    # Mark this template for vram/size data updates in i18n
                    self.syncer.mark_template_for_vram_size_update(template_name)
            else:  # size == 0
                # If size is 0, ensure vram field exists and is 0
                if "vram" not in updated_template:
                    updated_template["vram"] = 0
                    changes_made = True
                    self.syncer.logger.info(f"  💾 Added vram=0 because size is 0")
                elif updated_template["vram"] != 0:
                    updated_template["vram"] = 0
                    changes_made = True
                    self.syncer.logger.info(f"  💾 Set vram to 0 because size is 0")
        
        # Handle tags - always translate using i18n data
        if "tags" in master_template:
            # Translate tags from English to target language
            translated_tags = self.syncer.translate_tags(master_template["tags"], lang)
            
            # Update tags (they're already in updated_template from master, just need translation)
            updated_template["tags"] = translated_tags
            if translated_tags != master_template["tags"]:
                changes_made = True
                self.syncer.logger.info(f"  🏷️  Translated tags: {master_template['tags']} → {translated_tags}")
                        
        # Handle language-specific fields - sync from i18n.json if available
        for field in self.syncer.language_specific_fields:
            if field in master_template:
                en_value = master_template[field]
                current_value = target_template.get(field)
                
                # Get translation from i18n data
                translation = self.syncer.get_template_translation(template_name, field, lang)
                
                # Only apply translation if it's actually translated (different from English)
                if translation and translation != en_value:
                    # Apply real translation from i18n
                    updated_template[field] = translation
                    if current_value != translation:
                        changes_made = True
                        self.syncer.translation_stats['translations_applied'] += 1
                        self.syncer.logger.info(f"  🌐 Applied translation from i18n for {field}: '{translation}'")
                # If no translation, keep English value from master (already in updated_template)
        
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
                
            # Handle category field - translate it using i18n data
            if "category" in master_category:
                master_category_value = master_category["category"]
                # Translate category field (like "MODELS", "GENERATION TYPE")
                translated_category = self.syncer.translate_category(master_category_value, lang)
                new_category["category"] = translated_category
                if translated_category != master_category_value:
                    self.syncer.logger.info(f"  🏷️  Translated category field: {master_category_value} → {translated_category}")
                
            # Copy icon if it exists
            if "icon" in master_category:
                new_category["icon"] = master_category["icon"]
            
            if matching_idx is not None and matching_idx not in used_target_indices:
                # Use existing category data for language-specific fields
                existing_category = target_data[matching_idx]
                used_target_indices.add(matching_idx)
                
                # Handle category title - sync from i18n.json if available (similar to template title/description)
                if "title" in master_category:
                    master_title = master_category["title"]
                    current_title = existing_category.get("title")
                    
                    # Get translation from i18n data
                    translation = self.syncer.get_category_title_translation(master_title, lang)
                    
                    # Only apply translation if it's actually translated (different from English)
                    if translation and translation != master_title:
                        # Apply real translation from i18n
                        if current_title != translation:
                            new_category["title"] = translation
                            self.syncer.translation_stats['translations_applied'] += 1
                            self.syncer.logger.info(f"  🌐 Applied category title translation from i18n: '{translation}'")
                        else:
                            new_category["title"] = current_title
                    elif current_title is None:
                        # Field doesn't exist in target, use English as fallback for new categories
                        new_category["title"] = master_title
                        self.syncer.logger.info(f"  ➕ Added missing category title (no translation): '{master_title}'")
                    else:
                        # No real translation in i18n (or it's a placeholder), preserve existing value
                        new_category["title"] = current_title
                        self.syncer.logger.debug(f"  ⏭ Preserved existing category title: '{current_title}'")
                    
                    self.syncer.logger.info(f"  🔗 Matched category '{master_category['moduleName']}' with existing category (title: '{new_category['title']}')")
                else:
                    if "title" in existing_category:
                        new_category["title"] = existing_category["title"]
            else:
                # No matching category found, use translated title from i18n or master
                if "title" in master_category:
                    master_title = master_category["title"]
                    
                    # Get translation from i18n data
                    translation = self.syncer.get_category_title_translation(master_title, lang)
                    
                    # Only apply translation if it's actually translated (different from English)
                    if translation and translation != master_title:
                        new_category["title"] = translation
                        self.syncer.translation_stats['translations_applied'] += 1
                        self.syncer.logger.info(f"  🌐 Applied category title translation from i18n: '{translation}'")
                    else:
                        # Use translated title using translate_category_title (which handles new titles)
                        new_category["title"] = self.syncer.translate_category_title(master_title, lang)
                    
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
        
    def collect_new_templates_from_language_files(self):
        """
        Step 1: Collect translations for NEW templates only (templates not in i18n.json yet)
        Also collects category title translations for new categories
        """
        master_data = self.syncer.load_json_file(self.syncer.master_file)
        master_index = self.syncer.build_template_index(master_data)
        templates_data = self.syncer.i18n_data.get("templates", {})
        categories_data = self.syncer.i18n_data.get("categories", {})
        
        collected_count = 0
        category_title_collected_count = 0
        new_templates = set()
        
        # Find templates that exist in master but not in i18n
        for template_name in master_index.keys():
            if template_name not in templates_data:
                new_templates.add(template_name)
        
        # Find category titles and category fields that exist in master but not in i18n
        new_category_titles = set()
        new_category_fields = set()
        for master_category in master_data:
            if "title" in master_category:
                master_title = master_category["title"]
                if master_title not in categories_data:
                    new_category_titles.add(master_title)
            if "category" in master_category:
                master_category_field = master_category["category"]
                if master_category_field not in categories_data:
                    new_category_fields.add(master_category_field)
        
        if not new_templates and not new_category_titles and not new_category_fields:
            self.syncer.logger.info(f"  ℹ️ No new templates, category titles, or category fields found")
            return
        
        if new_templates:
            self.syncer.logger.info(f"  📋 Found {len(new_templates)} new templates")
        if new_category_titles:
            self.syncer.logger.info(f"  📋 Found {len(new_category_titles)} new category titles")
        if new_category_fields:
            self.syncer.logger.info(f"  📋 Found {len(new_category_fields)} new category fields")
        
        for lang, lang_file in self.syncer.language_files.items():
            target_file = self.syncer.templates_dir / lang_file
            if not target_file.exists():
                continue
            
            target_data = self.syncer.load_json_file(target_file)
            target_index = self.syncer.build_template_index(target_data)
            
            # Collect template translations
            for template_name in new_templates:
                if template_name not in target_index:
                    continue
                
                _, _, target_template = target_index[template_name]
                _, _, master_template = master_index[template_name]
                
                # Initialize template in i18n
                if template_name not in templates_data:
                    templates_data[template_name] = {}
                
                for field in self.syncer.language_specific_fields:
                    if field not in target_template:
                        continue
                    
                    target_value = target_template[field]
                    en_value = master_template.get(field, "")
                    
                    # Initialize field in i18n
                    if field not in templates_data[template_name]:
                        templates_data[template_name][field] = {"en": en_value}
                    
                    field_data = templates_data[template_name][field]
                    
                    # Only update if it's different from English (meaning it's translated)
                    if lang not in field_data and target_value != en_value:
                        field_data[lang] = target_value
                        collected_count += 1
            
            # Collect category title and category field translations for new categories
            for master_category in master_data:
                # Find matching category in target data
                matching_idx = self.syncer.find_matching_category(master_category, target_data)
                
                if matching_idx is None:
                    continue
                
                target_category = target_data[matching_idx]
                
                # Collect category title translations for new categories
                if "title" in master_category:
                    master_title = master_category["title"]
                    if master_title in new_category_titles and "title" in target_category:
                        target_title = target_category["title"]
                        
                        # Initialize category title in i18n
                        if master_title not in categories_data:
                            categories_data[master_title] = {
                                lang_code: master_title for lang_code in self.syncer.language_files.keys()
                            }
                        
                        category_data = categories_data[master_title]
                        
                        # Only update if it's different from English (meaning it's translated)
                        if lang not in category_data and target_title != master_title:
                            category_data[lang] = target_title
                            category_title_collected_count += 1
                
                # Collect category field translations for new categories
                if "category" in master_category:
                    master_category_field = master_category["category"]
                    if master_category_field in new_category_fields and "category" in target_category:
                        target_category_field = target_category["category"]
                        
                        # Initialize category field in i18n
                        if master_category_field not in categories_data:
                            categories_data[master_category_field] = {
                                lang_code: master_category_field for lang_code in self.syncer.language_files.keys()
                            }
                        
                        category_field_data = categories_data[master_category_field]
                        
                        # Only update if it's different from English (meaning it's translated)
                        if lang not in category_field_data and target_category_field != master_category_field:
                            category_field_data[lang] = target_category_field
                            category_title_collected_count += 1
        
        self.syncer.i18n_data["templates"] = templates_data
        self.syncer.i18n_data["categories"] = categories_data
        
        if collected_count > 0:
            self.syncer.logger.info(f"  ✅ Collected {collected_count} translations for new templates")
        if category_title_collected_count > 0:
            self.syncer.logger.info(f"  ✅ Collected {category_title_collected_count} translations for new category titles")
    
    def collect_all_translations_from_language_files(self) -> Tuple[int, int]:
        """
        Step 3: Collect ALL translations from language files to i18n.json (after sync)
        Includes both template translations and category title translations
        """
        master_data = self.syncer.load_json_file(self.syncer.master_file)
        master_index = self.syncer.build_template_index(master_data)
        
        collected_count = 0
        category_title_collected_count = 0
        
        for lang, lang_file in self.syncer.language_files.items():
            target_file = self.syncer.templates_dir / lang_file
            if not target_file.exists():
                continue
            
            target_data = self.syncer.load_json_file(target_file)
            target_index = self.syncer.build_template_index(target_data)
            
            # Collect template translations
            for template_name, (_, _, target_template) in target_index.items():
                # Only collect translations for templates that exist in master
                if template_name not in master_index:
                    continue
                
                _, _, master_template = master_index[template_name]
                
                # Ensure template exists in i18n
                if template_name not in self.syncer.i18n_data["templates"]:
                    self.syncer.i18n_data["templates"][template_name] = {}
                
                for field in self.syncer.language_specific_fields:
                    if field not in target_template:
                        continue
                    
                    target_value = target_template[field]
                    en_value = master_template.get(field, "")
                    
                    # Ensure field exists in i18n
                    if field not in self.syncer.i18n_data["templates"][template_name]:
                        self.syncer.i18n_data["templates"][template_name][field] = {"en": en_value}
                    
                    field_data = self.syncer.i18n_data["templates"][template_name][field]
                    
                    # Update i18n with current value from language file
                    if field_data.get(lang) != target_value:
                        field_data[lang] = target_value
                        collected_count += 1
            
            # Collect category title and category field translations
            # Use find_matching_category to match categories reliably
            for master_category in master_data:
                # Find matching category in target data
                matching_idx = self.syncer.find_matching_category(master_category, target_data)
                
                if matching_idx is None:
                    # No matching category found, skip
                    continue
                
                target_category = target_data[matching_idx]
                
                # Collect category title translations
                if "title" in master_category and "title" in target_category:
                    master_title = master_category["title"]
                    target_title = target_category["title"]
                    
                    # Ensure category title exists in i18n
                    if master_title not in self.syncer.i18n_data["categories"]:
                        # Initialize with English for all languages
                        self.syncer.i18n_data["categories"][master_title] = {
                            lang_code: master_title for lang_code in self.syncer.language_files.keys()
                        }
                    
                    category_data = self.syncer.i18n_data["categories"][master_title]
                    
                    # Update i18n with current value from language file
                    if category_data.get(lang) != target_title:
                        category_data[lang] = target_title
                        category_title_collected_count += 1
                
                # Collect category field translations (like "MODELS", "GENERATION TYPE")
                if "category" in master_category and "category" in target_category:
                    master_category_field = master_category["category"]
                    target_category_field = target_category["category"]
                    
                    # Ensure category field exists in i18n
                    if master_category_field not in self.syncer.i18n_data["categories"]:
                        # Initialize with English for all languages
                        self.syncer.i18n_data["categories"][master_category_field] = {
                            lang_code: master_category_field for lang_code in self.syncer.language_files.keys()
                        }
                    
                    category_field_data = self.syncer.i18n_data["categories"][master_category_field]
                    
                    # Update i18n with current value from language file
                    if category_field_data.get(lang) != target_category_field:
                        category_field_data[lang] = target_category_field
                        category_title_collected_count += 1
        
        if collected_count > 0:
            self.syncer.logger.info(f"  ✅ Collected {collected_count} template translations to i18n.json")
        if category_title_collected_count > 0:
            self.syncer.logger.info(f"  ✅ Collected {category_title_collected_count} category title translations to i18n.json")
        
        return collected_count, category_title_collected_count
    
    def sync_i18n_from_master(self) -> int:
        """
        Sync English title/description in i18n.json from master index.json.
        Returns number of fields updated.
        """
        master_data = self.syncer.load_json_file(self.syncer.master_file)
        master_index = self.syncer.build_template_index(master_data)
        templates_data = self.syncer.i18n_data.get("templates", {})
        updated_fields = 0
        
        for template_name, (_, _, master_template) in master_index.items():
            # Ensure template exists
            if template_name not in templates_data:
                templates_data[template_name] = {}
            
            for field in self.syncer.language_specific_fields:
                if field not in master_template:
                    continue
                
                en_value = master_template[field]
                if field not in templates_data[template_name]:
                    templates_data[template_name][field] = {}
                
                field_data = templates_data[template_name][field]
                if field_data.get("en") != en_value:
                    field_data["en"] = en_value
                    updated_fields += 1
        
        self.syncer.i18n_data["templates"] = templates_data
        if updated_fields > 0:
            self.syncer.logger.info(f"  ✅ Synced {updated_fields} English field(s) from master index.json")
        
        return updated_fields

    def sync_bundles(self):
        """
        Sync manifest and bundle package assets using sync_bundles module
        """
        if sync_bundles is None:
            raise ImportError("sync_bundles module is not available")
        
        dry_run = self.syncer.dry_run
        
        try:
            # Build manifest
            self.syncer.logger.info("  Building manifest...")
            manifest = sync_bundles.build_manifest()
            
            # Write manifest
            self.syncer.logger.info("  Writing manifest...")
            sync_bundles.write_manifest(manifest, dry_run=dry_run)
            
            # Sync bundle directories
            self.syncer.logger.info("  Syncing bundle directories...")
            sync_bundles.sync_bundle_directories(manifest, dry_run=dry_run)
            
            target = sync_bundles.CORE_MANIFEST if not dry_run else sync_bundles.SAMPLE_MANIFEST
            self.syncer.logger.info(f"  ✅ Wrote manifest to {target}")
            if not dry_run:
                self.syncer.logger.info("  ✅ Synced media assets into package directories")
        except SystemExit as e:
            # sync_bundles uses SystemExit for errors, convert to exception
            raise Exception(f"Bundle sync failed: {e}")
    
    def check_input_assets(self):
        """
        Validate input assets referenced in workflow files using check_input_assets module
        """
        if check_input_assets is None:
            raise ImportError("check_input_assets module is not available")
        
        try:
            # Get repository root (parent of scripts directory)
            repo_root = self.syncer.templates_dir.parent
            templates_dir = repo_root / "templates"
            inputs_dir = repo_root / "input"
            
            # Find workflow files
            self.syncer.logger.info("  Finding workflow files...")
            workflow_files = check_input_assets.find_workflow_files(templates_dir)
            self.syncer.logger.info(f"  Found {len(workflow_files)} workflow files")
            
            # Extract all asset references
            self.syncer.logger.info("  Extracting asset references...")
            all_assets = []
            for workflow_file in workflow_files:
                assets = check_input_assets.extract_asset_references(
                    workflow_file, 
                    check_input_assets.ASSET_NODE_TYPES
                )
                all_assets.extend(assets)
            
            self.syncer.logger.info(f"  Found {len(all_assets)} asset references")
            
            # Validate assets
            self.syncer.logger.info("  Validating assets...")
            valid_assets, missing_assets = check_input_assets.validate_assets(all_assets, inputs_dir)
            
            # Generate report
            report = check_input_assets.generate_report(
                valid_assets, 
                missing_assets, 
                len(workflow_files),
                check_input_assets.ASSET_NODE_TYPES
            )
            
            # Save report
            report_file = repo_root / "asset_validation_report.md"
            if not self.syncer.dry_run:
                with open(report_file, 'w', encoding='utf-8') as f:
                    f.write(report)
                self.syncer.logger.info(f"  ✅ Report saved to: {report_file}")
            
            # Generate and save upload JSON file
            self.syncer.logger.info("  Generating upload JSON...")
            base_url = "https://raw.githubusercontent.com/Comfy-Org/workflow_templates/refs/heads/main/input/"
            upload_data = check_input_assets.generate_upload_json(inputs_dir, templates_dir, base_url)
            upload_file = repo_root / "workflow_template_input_files.json"
            
            if not self.syncer.dry_run:
                with open(upload_file, 'w', encoding='utf-8') as f:
                    json.dump(upload_data, f, indent=2, ensure_ascii=False)
                self.syncer.logger.info(f"  ✅ Generated {len(upload_data['assets'])} asset entries")
                self.syncer.logger.info(f"  ✅ Upload JSON saved to: {upload_file}")
            else:
                self.syncer.logger.info(f"  [DRY RUN] Would generate {len(upload_data['assets'])} asset entries")
            
            # Log summary
            if missing_assets:
                self.syncer.logger.warning(f"  ⚠️  Validation found {len(missing_assets)} missing asset(s)")
                self.syncer.logger.warning(f"  ✅ {len(valid_assets)} asset(s) successfully validated")
            else:
                self.syncer.logger.info(f"  ✅ Validation passed: All {len(valid_assets)} asset(s) found")
            
            return len(missing_assets) == 0
            
        except Exception as e:
            raise Exception(f"Input assets validation failed: {e}")

    def generate_workflow_io(self) -> None:
        """
        Update master index.json with workflow input/output nodes using generate_workflow_io module.
        Runs after fix_master_vram_data so that io fields are present before syncing to language files.
        """
        if generate_workflow_io is None:
            raise ImportError("generate_workflow_io module is not available")

        self.syncer.logger.info("  Running workflow I/O extraction...")
        old_argv = sys.argv
        try:
            sys.argv = [
                "generate_workflow_io.py",
                "--dry-run" if self.syncer.dry_run else ""
            ]
            sys.argv = [a for a in sys.argv if a]
            generate_workflow_io.main()
        except SystemExit as e:
            if e.code != 0:
                raise Exception(f"generate_workflow_io exited with code {e.code}") from e
        finally:
            sys.argv = old_argv
        self.syncer.logger.info("  ✅ Workflow I/O extraction completed")

    def fix_master_vram_data(self):
        """
        Fix vram data in the master index.json file before synchronization
        Also syncs usage data from CSV if available
        """
        self.syncer.logger.info("\n🔧 Step 0: Fixing vram data and syncing usage data in master file...")
        
        # Load master data
        master_data = self.syncer.load_json_file(self.syncer.master_file)
        changes_made = False
        fixed_templates = []
        
        for category in master_data:
            for template in category.get("templates", []):
                template_name = template.get("name", "")
                
                # Apply vram fixing logic
                if "size" in template:
                    if template["size"] > 0:
                        # If vram is missing or 0, use size data
                        if "vram" not in template or template.get("vram", 0) == 0:
                            template["vram"] = template["size"]
                            changes_made = True
                            fixed_templates.append(template_name)
                            self.syncer.logger.info(f"  ✓ Fixed vram for '{template_name}': {template['size']}")
                    else:  # size == 0
                        # If size is 0, ensure vram field exists and is 0
                        if "vram" not in template:
                            template["vram"] = 0
                            changes_made = True
                            fixed_templates.append(template_name)
                            self.syncer.logger.info(f"  ✓ Added vram=0 for '{template_name}' (size is 0)")
                        elif template["vram"] != 0:
                            template["vram"] = 0
                            changes_made = True
                            fixed_templates.append(template_name)
                            self.syncer.logger.info(f"  ✓ Set vram to 0 for '{template_name}' (size is 0)")
                
                # Handle usage data - sync from CSV if available
                if self.syncer.usage_data and template_name in self.syncer.usage_data:
                    usage_value = self.syncer.usage_data[template_name]
                    if "usage" not in template or template["usage"] != usage_value:
                        template["usage"] = usage_value
                        changes_made = True
                        self.syncer.logger.info(f"  📊 Updated usage for '{template_name}': {usage_value}")
                else:
                    # If usage has no data (missing or not in CSV), fill with 0
                    if "usage" not in template:
                        template["usage"] = 0
                        changes_made = True
                        self.syncer.logger.info(f"  📊 Filled missing usage with 0 for '{template_name}'")
        
        # Save the fixed master file
        if changes_made:
            self.syncer.save_json_file(self.syncer.master_file, master_data)
            self.syncer.logger.info(f"  💾 Fixed {len(fixed_templates)} templates in master file")
            for template in fixed_templates:
                self.syncer.logger.info(f"    - {template}")
        else:
            self.syncer.logger.info(f"  ✅ Master file vram data is already correct")

    def run_sync(self) -> bool:
        """
        Run complete synchronization process:
        0. Fix vram data in master index.json file
        0b. Generate workflow I/O (inputs/outputs) in master index.json
        1. Collect translations for NEW templates only from language files
        2. Sync i18n.json translations to all language files
        3. Collect ALL translations from language files back to i18n.json
        4. Sync bundles (manifest and bundle package assets)
        5. Check input assets (validate referenced assets exist)
        6. Analyze model references and generate report
        """
        self.syncer.logger.info("🚀 Starting template synchronization...")
        self.syncer.logger.info(f"Master file: {self.syncer.master_file}")
        self.syncer.logger.info(f"i18n file: {self.syncer.i18n_file}")
        self.syncer.logger.info(f"Dry run: {self.syncer.dry_run}")
        
        if not self.syncer.master_file.exists():
            self.syncer.logger.error(f"Master file not found: {self.syncer.master_file}")
            return False

        success = True

        # Step 0: Fix vram data in master file first
        self.fix_master_vram_data()

        # Step 0b: Generate workflow I/O in master index.json
        if generate_workflow_io is not None:
            self.syncer.logger.info("\n📎 Step 0b: Generating workflow I/O in master index.json...")
            try:
                self.generate_workflow_io()
            except Exception as e:
                self.record_error(f"Workflow I/O generation failed: {e}")
                success = False
        else:
            self.syncer.logger.warning("\n⚠️  generate_workflow_io module not available, skipping workflow I/O generation")

        # Step 1: Sync English fields to i18n.json from master file
        self.syncer.logger.info("\n📥 Step 1: Syncing English fields to i18n.json...")
        en_fields_updated = self.sync_i18n_from_master()
        
        # Step 1b: Collect translations for NEW templates only
        self.syncer.logger.info("\n📥 Step 1b: Collecting translations for new templates...")
        self.collect_new_templates_from_language_files()
        
        # Step 2: Sync i18n.json translations to all language files
        self.syncer.logger.info("\n🔄 Step 2: Syncing i18n.json to language files...")
        for lang, lang_file in self.syncer.language_files.items():
            try:
                if not self.sync_language_file(lang, lang_file):
                    success = False
            except Exception as e:
                self.record_error(f"Sync language file failed ({lang}): {e}")
                success = False
        
        # Step 3: Collect ALL translations from language files back to i18n.json
        self.syncer.logger.info("\n📥 Step 3: Collecting all translations to i18n.json...")
        collected_count, category_title_collected_count = self.collect_all_translations_from_language_files()
                
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
        
        if en_fields_updated > 0:
            needs_save = True
        
        if collected_count > 0 or category_title_collected_count > 0:
            needs_save = True
        
        if self.syncer.new_tags:
            self.syncer.logger.info(f"\n🆕 New tags discovered: {len(self.syncer.new_tags)}")
            for tag in sorted(self.syncer.new_tags):
                self.syncer.logger.info(f"   - {tag}")
            needs_save = True
        
        if self.syncer.new_category_titles:
            self.syncer.logger.info(f"\n🆕 New category titles discovered: {len(self.syncer.new_category_titles)}")
            for title in sorted(self.syncer.new_category_titles):
                self.syncer.logger.info(f"   - {title}")
            needs_save = True
        
        if self.syncer.new_category_fields:
            self.syncer.logger.info(f"\n🆕 New category fields discovered: {len(self.syncer.new_category_fields)}")
            for field in sorted(self.syncer.new_category_fields):
                self.syncer.logger.info(f"   - {field}")
            needs_save = True
        
        # Update vram_size_update_templates in i18n data
        if self.syncer.vram_size_update_templates:
            vram_size_update_list = list(self.syncer.vram_size_update_templates)
            self.syncer.i18n_data["_status"]["vram_size_update_templates"]["templates"] = vram_size_update_list
            self.syncer.logger.info(f"\n🔧 Templates marked for vram/size data management: {len(vram_size_update_list)}")
            for template in sorted(vram_size_update_list):
                self.syncer.logger.info(f"   - {template}")
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
        if self.syncer.new_category_titles:
            self.syncer.logger.info(f"   New category titles found: {len(self.syncer.new_category_titles)}")
        if self.syncer.new_category_fields:
            self.syncer.logger.info(f"   New category fields found: {len(self.syncer.new_category_fields)}")
        if self.syncer.vram_size_update_templates:
            self.syncer.logger.info(f"   Templates marked for vram/size management: {len(self.syncer.vram_size_update_templates)}")
        
        # Step 4: Sync bundles (manifest and bundle package assets)
        if sync_bundles is not None:
            self.syncer.logger.info("\n📦 Step 4: Syncing bundles (manifest and package assets)...")
            try:
                self.sync_bundles()
            except Exception as e:
                self.record_error(f"Bundle sync failed: {e}")
                # Don't fail the entire sync if bundle sync fails, but log the error
                success = False
        else:
            self.syncer.logger.warning("\n⚠️  sync_bundles module not available, skipping bundle synchronization")
        
        # Step 5: Check input assets
        if check_input_assets is not None:
            self.syncer.logger.info("\n🔍 Step 5: Validating input assets...")
            try:
                validation_passed = self.check_input_assets()
                if not validation_passed:
                    self.record_error("Input assets validation found missing assets (see report for details)")
                    # Don't fail the entire sync if validation fails, but log the warning
            except Exception as e:
                self.record_error(f"Input assets validation failed: {e}")
                # Don't fail the entire sync if validation fails, but log the error
        else:
            self.syncer.logger.warning("\n⚠️  check_input_assets module not available, skipping input assets validation")

        # Step 6: Analyze model references
        if analyze_models is not None:
            self.syncer.logger.info("\n🧪 Step 6: Analyzing model references...")
            try:
                repo_root = self.syncer.templates_dir.parent
                whitelist_config = analyze_models.load_whitelist_config()
                results, statistics = analyze_models.analyze_all_templates(
                    str(self.syncer.templates_dir),
                    whitelist_config
                )
                report = analyze_models.generate_report(results, statistics)
                report_path = repo_root / "model_analysis_report.md"
                with open(report_path, 'w', encoding='utf-8') as f:
                    f.write(report)
                self.syncer.logger.info(f"  ✅ Model analysis report saved to: {report_path}")

                if (
                    statistics.get('files_with_errors')
                    or statistics.get('markdown_link_errors')
                    or statistics.get('model_link_errors')
                ):
                    self.record_error("Model analysis found issues (see model_analysis_report.md)")
                    success = False
            except Exception as e:
                self.record_error(f"Model analysis failed: {e}")
                success = False
        else:
            self.syncer.logger.warning("\n⚠️  analyze_models module not available, skipping model analysis")

        # Step 7: Validate templates
        if validate_templates is not None:
            self.syncer.logger.info("\n✅ Step 7: Validating templates...")
            try:
                # Run the validation main function
                validation_result = validate_templates.main()
                if validation_result != 0:
                    self.record_error("Template validation failed (see validation output above)")
                    success = False
                else:
                    self.syncer.logger.info("  ✅ All template validations passed")
            except Exception as e:
                self.record_error(f"Template validation failed: {e}")
                success = False
        else:
            self.syncer.logger.warning("\n⚠️  validate_templates module not available, skipping template validation")

        if self.errors:
            self.syncer.logger.error("\n❌ Errors summary:")
            for err in self.errors:
                self.syncer.logger.error(f"  - {err}")
        else:
            self.syncer.logger.info("\n✅ No errors detected.")
        
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
    parser.add_argument('--templates-dir', default='./templates', help='Directory containing template files')
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
