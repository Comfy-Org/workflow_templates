#!/usr/bin/env python3
"""
Template Synchronization Script for ComfyUI Workflow Templates

This script synchronizes template information from the English master file (index.json)
to all other language versions, with automatic tag translation support.

Key Features:
- Auto-sync technical fields (models, date, size, vram, etc.)
- Automatic tag translation using tag_mappings.json
- Preserve language-specific translations (title, description)
- Detect and track new tags for manual translation
- Maintain consistent structure across all language files

Tag Translation Workflow:
1. Tags are automatically translated from English to target language using tag_mappings.json
2. New tags not in mappings are temporarily kept in English
3. New tags are added to tag_mappings.json for later translation
4. Update tag_mappings.json with proper translations
5. Re-run sync to apply translations to all language files

Usage:
    python sync_templates.py --templates-dir ./templates
    python sync_templates.py --templates-dir ./templates --dry-run
    python sync_templates.py --templates-dir ./templates --force-sync-language-fields

Author: Claude Code
Date: 2025-10-17
Version: 2.0
"""

import json
import os
import shutil
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
        # Tag mappings file is in the scripts directory (sibling to templates)
        scripts_dir = self.templates_dir.parent / "scripts"
        self.tag_mappings_file = scripts_dir / "tag_mappings.json"
        
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
            "ru": "index.ru.json"
        }
        
        # Setup logging first
        self.setup_logging()
        
        # Load tag mappings (needs logger) - this also loads untranslated_templates
        self.tag_mappings = self.load_tag_mappings()
        # Note: category_mappings, title_mappings, and untranslated_templates are loaded in load_tag_mappings
        self.new_tags = set()  # Track new tags discovered during sync
        self.used_tags = set()  # Track tags that are actually used in templates
        self.used_categories = set()  # Track categories that are actually used
        self.used_titles = set()  # Track titles that are actually used
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
        
    def load_tag_mappings(self) -> Dict[str, Dict[str, str]]:
        """Load tag mappings from JSON file"""
        if not self.tag_mappings_file.exists():
            self.logger.warning(f"Tag mappings file not found: {self.tag_mappings_file}")
            return {}
            
        try:
            with open(self.tag_mappings_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Extract metadata if present
            metadata = data.get('_metadata', {})
            supported_langs = []
            if metadata:
                self.logger.info(f"Tag mappings metadata: {metadata.get('description', 'N/A')}")
                # Get supported languages from metadata
                supported_langs = metadata.get('languages', [])
                if supported_langs:
                    self.logger.info(f"Supported languages: {', '.join(supported_langs)}")
                    # Update language files based on metadata
                    self.language_files = {lang: f"index.{lang}.json" for lang in supported_langs}
            
            # Extract categories and titles mappings
            self.category_mappings = data.get('_categories', {})
            self.title_mappings = data.get('_titles', {})
            
            # Load untranslated templates FIRST - before any save operations
            self.untranslated_templates = data.get('_untranslated_templates', {})
            self.original_untranslated_templates = json.loads(json.dumps(self.untranslated_templates))  # Deep copy
            self.logger.info(f"DEBUG: Loaded {len(self.untranslated_templates)} templates with translation tracking")
            
            # Filter out metadata and special sections, return only tag mappings
            mappings = {k: v for k, v in data.items() if not k.startswith('_')}
            
            # Ensure all tags, categories, and titles have entries for all supported languages
            if supported_langs:
                updated = False
                
                # Update tag mappings
                for tag, translations in mappings.items():
                    for lang in supported_langs:
                        if lang not in translations:
                            translations[lang] = tag
                            updated = True
                            self.logger.info(f"  ➕ Added missing language '{lang}' for tag '{tag}'")
                
                # Update category mappings
                for category, translations in self.category_mappings.items():
                    for lang in supported_langs:
                        if lang not in translations:
                            translations[lang] = category
                            updated = True
                            self.logger.info(f"  ➕ Added missing language '{lang}' for category '{category}'")
                
                # Update title mappings
                for title, translations in self.title_mappings.items():
                    for lang in supported_langs:
                        if lang not in translations:
                            translations[lang] = title
                            updated = True
                            self.logger.info(f"  ➕ Added missing language '{lang}' for title '{title}'")
                
                if updated:
                    # Save updated mappings
                    self.logger.info(f"Saving mappings with added language entries...")
                    data['_categories'] = self.category_mappings
                    data['_titles'] = self.title_mappings
                    self._save_mappings_with_metadata(data, mappings)
            
            self.logger.info(f"Loaded mappings - Tags: {len(mappings)}, Categories: {len(self.category_mappings)}, Titles: {len(self.title_mappings)}")
            self.logger.info(f"DEBUG: Final untranslated_templates count: {len(self.untranslated_templates)}")
            
            return mappings
        except Exception as e:
            self.logger.error(f"Failed to load tag mappings: {e}")
            return {}
            
    def _save_mappings_with_metadata(self, original_data: dict, mappings: dict):
        """Helper method to save mappings with metadata preserved"""
        if self.dry_run:
            return
            
        try:
            # Preserve metadata if it exists
            output_data = {}
            if '_metadata' in original_data:
                output_data['_metadata'] = original_data['_metadata']
            
            # Add categories and titles
            if self.category_mappings:
                output_data['_categories'] = self.category_mappings
            if self.title_mappings:
                output_data['_titles'] = self.title_mappings
            
            # Add untranslated templates - prioritize memory version over file version
            if self.untranslated_templates:
                output_data['_untranslated_templates'] = self.untranslated_templates
            elif '_untranslated_templates' in original_data:
                output_data['_untranslated_templates'] = original_data['_untranslated_templates']
            
            # Add tag mappings (sorted for consistency)
            for tag in sorted(mappings.keys()):
                output_data[tag] = mappings[tag]
            
            # Save to file
            with open(self.tag_mappings_file, 'w', encoding='utf-8') as f:
                json.dump(output_data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            self.logger.error(f"Failed to save tag mappings: {e}")
    
    def save_tag_mappings(self):
        """Save tag mappings to JSON file, preserving metadata and creating backup"""
        if self.dry_run:
            self.logger.info(f"[DRY RUN] Would save tag mappings")
            return
            
        try:
            # Create backup before saving
            if self.tag_mappings_file.exists():
                backup_file = self.tag_mappings_file.with_suffix('.json.backup')
                shutil.copy2(self.tag_mappings_file, backup_file)
                self.logger.info(f"Created backup: {backup_file.name}")
            
            # Load existing file to preserve metadata
            existing_data = {}
            if self.tag_mappings_file.exists():
                with open(self.tag_mappings_file, 'r', encoding='utf-8') as f:
                    existing_data = json.load(f)
            
            self._save_mappings_with_metadata(existing_data, self.tag_mappings)
            self.logger.info(f"Saved tag mappings: {len(self.tag_mappings)} tags")
        except Exception as e:
            self.logger.error(f"Failed to save tag mappings: {e}")
            
    def translate_tag(self, tag: str, target_lang: str) -> str:
        """Translate a tag to target language using mappings"""
        if tag in self.tag_mappings:
            lang_mappings = self.tag_mappings[tag]
            if target_lang in lang_mappings:
                return lang_mappings[target_lang]
        
        # Tag not found in mappings - track it as new
        if tag not in self.tag_mappings:
            self.new_tags.add(tag)
            self.logger.warning(f"  ⚠️  New tag discovered: '{tag}' (using English temporarily)")
            
            # Add to mappings with English as default for all languages
            self.tag_mappings[tag] = {
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
        """Translate a category to target language using mappings"""
        self.used_categories.add(category)
        
        if category in self.category_mappings:
            lang_mappings = self.category_mappings[category]
            if target_lang in lang_mappings:
                return lang_mappings[target_lang]
        
        # Category not found in mappings - return English
        return category
    
    def translate_title(self, title: str, target_lang: str) -> str:
        """Translate a title to target language using mappings"""
        self.used_titles.add(title)
        
        if title in self.title_mappings:
            lang_mappings = self.title_mappings[title]
            if target_lang in lang_mappings:
                return lang_mappings[target_lang]
        
        # Title not found in mappings - return English
        return title
    
    def detect_untranslated_field(self, template_name: str, field: str, 
                                   en_value: str, lang: str, lang_value: str) -> bool:
        """
        Detect if a field is untranslated (same as English)
        Returns True if untranslated and recorded
        IMPORTANT: Never overwrites manually added translations
        """
        if en_value == lang_value and en_value:  # Same as English and not empty
            # Initialize template entry if needed
            if template_name not in self.untranslated_templates:
                self.untranslated_templates[template_name] = {}
            
            # Initialize field entry if needed
            if field not in self.untranslated_templates[template_name]:
                self.untranslated_templates[template_name][field] = {
                    '_sync_status': {
                        'last_synced': datetime.now().isoformat(),
                        'needs_translation': [],
                        'translated': [],
                        'manually_added': []
                    },
                    'en': en_value
                }
            
            # Get the field data
            field_data = self.untranslated_templates[template_name][field]
            sync_status = field_data['_sync_status']
            
            # Check if we already have a manually added translation for this language
            existing_value = field_data.get(lang, '')
            if existing_value and existing_value != en_value:
                # User has manually added a translation, don't overwrite or modify
                # Just update the status lists if needed
                if lang in sync_status['needs_translation']:
                    sync_status['needs_translation'].remove(lang)
                if lang not in sync_status['manually_added']:
                    sync_status['manually_added'].append(lang)
                return False  # Not untranslated, has manual translation
            
            # Only add to needs_translation if not already there
            if lang not in sync_status['needs_translation'] and lang not in sync_status['translated']:
                sync_status['needs_translation'].append(lang)
            
            # Only store English value if no translation exists
            if lang not in field_data:
                field_data[lang] = lang_value
            
            # Update sync time
            sync_status['last_synced'] = datetime.now().isoformat()
            
            return True
        return False
    
    def apply_translation_from_mapping(self, template_name: str, field: str, 
                                       lang: str) -> Optional[str]:
        """
        Get translation from mapping for a specific template field
        Returns translation if available and different from English, None otherwise
        """
        if template_name not in self.untranslated_templates:
            return None
        
        template_data = self.untranslated_templates[template_name]
        if field not in template_data:
            return None
        
        field_data = template_data[field]
        en_value = field_data.get('en', '')
        
        # Check if we have a translation for this language
        if lang in field_data:
            translation = field_data[lang]
            # Only return if it's actually a translation (different from English)
            if translation != en_value and translation:
                return translation
        
        return None
    
    def update_translation_status(self, template_name: str, field: str, 
                                   lang: str, current_value: str, en_value: str):
        """
        Update the translation status after syncing
        Moves language from needs_translation to translated if translation is applied
        """
        if template_name not in self.untranslated_templates:
            return
        
        template_data = self.untranslated_templates[template_name]
        if field not in template_data:
            return
        
        field_data = template_data[field]
        sync_status = field_data['_sync_status']
        
        # Check if the value is now different from English (translated)
        if current_value != en_value and current_value:
            # Move from needs_translation to translated
            if lang in sync_status['needs_translation']:
                sync_status['needs_translation'].remove(lang)
            if lang not in sync_status['translated']:
                sync_status['translated'].append(lang)
            
            # Remove from manually_added if present
            if lang in sync_status.get('manually_added', []):
                sync_status['manually_added'].remove(lang)
            
            # Remove the untranslated value from field_data
            if lang in field_data and field_data[lang] == en_value:
                del field_data[lang]
        
        # Update sync time
        sync_status['last_synced'] = datetime.now().isoformat()
        
        # Clean up if this field is fully translated
        if not sync_status['needs_translation'] and not sync_status.get('manually_added', []):
            # All languages translated, can optionally remove this field
            # For now, keep it for tracking but mark it
            sync_status['fully_translated'] = True
    
    def detect_manually_added_translations(self):
        """
        Detect translations that were manually added to the mapping
        but not yet synced to language files
        """
        self.logger.info(f"\n🔍 Scanning for manually added translations...")
        self.logger.info(f"   Checking {len(self.untranslated_templates)} templates")
        
        manually_added_count = 0
        for template_name, template_data in self.untranslated_templates.items():
            for field in ['title', 'description']:
                if field not in template_data:
                    continue
                
                field_data = template_data[field]
                sync_status = field_data.get('_sync_status', {})
                en_value = field_data.get('en', '')
                
                # Check each language in the field
                for lang in self.language_files.keys():
                    if lang not in field_data:
                        continue
                    
                    value = field_data[lang]
                    
                    # If value is different from English, it's a translation
                    if value != en_value and value:
                        # Check if it's in needs_translation (meaning not yet synced)
                        if lang in sync_status.get('needs_translation', []):
                            if 'manually_added' not in sync_status:
                                sync_status['manually_added'] = []
                            if lang not in sync_status['manually_added']:
                                sync_status['manually_added'].append(lang)
                                manually_added_count += 1
                                self.logger.info(f"  💾 Detected manually added translation: {template_name}.{field}[{lang}]")
                        
                        # Also check if this translation is already applied to language files
                        # If so, move it from needs_translation to translated
                        lang_file = self.language_files.get(lang)
                        if lang_file:
                            try:
                                with open(self.templates_dir / lang_file, 'r', encoding='utf-8') as f:
                                    lang_data = json.load(f)
                                
                                # Find the template in the language file
                                lang_templates = [t for cat in lang_data for t in cat.get('templates', []) if t.get('name') == template_name]
                                if lang_templates and field in lang_templates[0]:
                                    current_lang_value = lang_templates[0][field]
                                    if current_lang_value == value:
                                        # Translation is already applied, update status
                                        if lang in sync_status.get('needs_translation', []):
                                            sync_status['needs_translation'].remove(lang)
                                        if lang not in sync_status.get('translated', []):
                                            sync_status['translated'].append(lang)
                                        if lang in sync_status.get('manually_added', []):
                                            sync_status['manually_added'].remove(lang)
                                        self.logger.info(f"  ✅ Translation already applied: {template_name}.{field}[{lang}]")
                            except Exception as e:
                                self.logger.debug(f"Could not check language file {lang_file}: {e}")
        
        if manually_added_count > 0:
            self.logger.info(f"\n✅ Found {manually_added_count} manually added translations ready to sync")
        
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
                    
        # Handle tags - always translate using mappings
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
                        
        # Handle language-specific fields with translation detection and application
        for field in self.syncer.language_specific_fields:
            if field in master_template:
                en_value = master_template[field]
                current_value = target_template.get(field, en_value)
                
                # First, check if we have a translation in the mapping
                translation = self.syncer.apply_translation_from_mapping(template_name, field, lang)
                
                if translation:
                    # We have a translation in mapping, apply it
                    if current_value != translation:
                        updated_template[field] = translation
                        changes_made = True
                        self.syncer.translation_stats['translations_applied'] += 1
                        self.syncer.logger.info(f"  🌐 Applied translation from mapping for {field}: '{translation}'")
                        
                        # Update translation status
                        self.syncer.update_translation_status(template_name, field, lang, translation, en_value)
                elif field not in target_template:
                    # Add missing language-specific field from English
                    updated_template[field] = en_value
                    changes_made = True
                    self.syncer.logger.info(f"  ➕ Added missing {field}: {en_value}")
                    
                    # Detect as untranslated
                    self.syncer.detect_untranslated_field(template_name, field, en_value, lang, en_value)
                elif self.sync_options.get("force_sync_language_fields", False):
                    # Only update if explicitly forced
                    if self.syncer.compare_field_values(field, current_value, en_value):
                        updated_template[field] = en_value
                        changes_made = True
                        self.syncer.logger.info(f"  ✓ Force-synced {field}: {en_value}")
                else:
                    # Check if current value is same as English (untranslated)
                    is_untranslated = self.syncer.detect_untranslated_field(
                        template_name, field, en_value, lang, current_value
                    )
                    
                    if is_untranslated:
                        self.syncer.logger.info(f"  ⚠️  Untranslated {field} detected in {lang}: '{current_value}'")
                    elif self.syncer.compare_field_values(field, current_value, en_value):
                        # Different from English, it's translated
                        self.syncer.logger.info(f"  ⏭ Preserved translated {field}: '{current_value}' (English: '{en_value}')")
                        
                        # Update status to mark as translated
                        self.syncer.update_translation_status(template_name, field, lang, current_value, en_value)
        
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
                
            # Copy category if it exists
            if "category" in master_category:
                new_category["category"] = master_category["category"]
                
            # Copy icon if it exists
            if "icon" in master_category:
                new_category["icon"] = master_category["icon"]
            
            if matching_idx is not None and matching_idx not in used_target_indices:
                # Use existing category data for language-specific fields
                existing_category = target_data[matching_idx]
                used_target_indices.add(matching_idx)
                
                # Use translated title from mappings
                master_title = master_category.get("title", "")
                translated_title = self.syncer.translate_title(master_title, lang)
                new_category["title"] = translated_title
                self.syncer.logger.info(f"  🔗 Matched category '{master_category['moduleName']}' with existing category (translated title: '{translated_title}')")
            else:
                # No matching category found, use translated title from mappings
                master_title = master_category.get("title", "")
                translated_title = self.syncer.translate_title(master_title, lang)
                new_category["title"] = translated_title
                if matching_idx is None:
                    self.syncer.logger.info(f"  ➕ Added new category: '{master_category['moduleName']}' (translated title: '{translated_title}')")
                
            new_category["templates"] = []
            
            for template in master_category.get("templates", []):
                template_name = template["name"]
                
                if template_name in target_index:
                    # Update existing template
                    _, _, existing_template = target_index[template_name]
                    new_template = self.sync_template_data(template, existing_template, template_name, lang)
                else:
                    # Add new template
                    new_template = template.copy()
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
        
        if not self.syncer.untranslated_templates:
            self.syncer.logger.info("✅ All templates are fully translated!")
            return
        
        # Count statistics
        total_templates = len(self.syncer.untranslated_templates)
        needs_translation_count = 0
        ready_to_sync_count = 0
        fully_translated_count = 0
        
        for template_name, template_data in sorted(self.syncer.untranslated_templates.items()):
            has_needs_translation = False
            has_manually_added = False
            is_fully_translated = True
            
            self.syncer.logger.info(f"\nTemplate: {template_name}")
            
            for field in ['title', 'description']:
                if field not in template_data:
                    continue
                
                field_data = template_data[field]
                sync_status = field_data.get('_sync_status', {})
                
                needs_trans = sync_status.get('needs_translation', [])
                translated = sync_status.get('translated', [])
                manually_added = sync_status.get('manually_added', [])
                last_synced = sync_status.get('last_synced', 'N/A')
                
                if needs_trans or manually_added:
                    is_fully_translated = False
                
                if needs_trans:
                    has_needs_translation = True
                if manually_added:
                    has_manually_added = True
                
                # Display field status
                self.syncer.logger.info(f"├─ {field}:")
                
                if translated:
                    self.syncer.logger.info(f"│  ├─ ✅ Translated ({len(translated)}): {', '.join(translated)}")
                
                if manually_added:
                    self.syncer.logger.info(f"│  ├─ 💾 Ready to Sync ({len(manually_added)}): {', '.join(manually_added)} [manually added]")
                
                if needs_trans:
                    self.syncer.logger.info(f"│  ├─ ⚠️  Needs Translation ({len(needs_trans)}): {', '.join(needs_trans)}")
                
                if not needs_trans and not manually_added:
                    self.syncer.logger.info(f"│  ├─ ✅ Fully Translated ({len(translated)} languages)")
                
                self.syncer.logger.info(f"│  └─ 🕐 Last synced: {last_synced}")
            
            # Update counts
            if is_fully_translated:
                fully_translated_count += 1
            if has_needs_translation:
                needs_translation_count += 1
            if has_manually_added:
                ready_to_sync_count += 1
        
        # Summary
        self.syncer.logger.info("\n" + "-"*80)
        self.syncer.logger.info("Summary:")
        self.syncer.logger.info("-"*80)
        self.syncer.logger.info(f"📝 Total templates tracked: {total_templates}")
        self.syncer.logger.info(f"⚠️  Templates needing translation: {needs_translation_count}")
        self.syncer.logger.info(f"💾 Templates ready to sync: {ready_to_sync_count}")
        self.syncer.logger.info(f"✅ Fully translated templates: {fully_translated_count}")
        self.syncer.logger.info(f"🔍 Templates scanned: {self.syncer.translation_stats['templates_scanned']}")
        self.syncer.logger.info(f"🌐 Translations applied: {self.syncer.translation_stats['translations_applied']}")
        
    def run_sync(self) -> bool:
        """Run complete synchronization process"""
        self.syncer.logger.info("🚀 Starting template synchronization...")
        self.syncer.logger.info(f"Master file: {self.syncer.master_file}")
        self.syncer.logger.info(f"Dry run: {self.syncer.dry_run}")
        
        if not self.syncer.master_file.exists():
            self.syncer.logger.error(f"Master file not found: {self.syncer.master_file}")
            return False
            
        # Detect manually added translations before syncing
        self.syncer.detect_manually_added_translations()
        
        success = True
        for lang, lang_file in self.syncer.language_files.items():
            try:
                if not self.sync_language_file(lang, lang_file):
                    success = False
            except Exception as e:
                self.syncer.logger.error(f"Failed to sync {lang}: {e}")
                success = False
                
        # Check for unused tags in mappings
        unused_tags = set(self.syncer.tag_mappings.keys()) - self.syncer.used_tags
        if unused_tags:
            self.syncer.logger.info(f"\n🗑️  Unused tags in mappings: {len(unused_tags)}")
            self.syncer.logger.info(f"   These tags exist in tag_mappings.json but are not used in any template:")
            for tag in sorted(unused_tags):
                self.syncer.logger.info(f"   - {tag}")
            self.syncer.logger.info(f"   💡 You can manually remove these from {self.syncer.tag_mappings_file} if they are no longer needed")
        
        # Save tag mappings and untranslated templates
        needs_save = False
        
        if self.syncer.new_tags:
            self.syncer.logger.info(f"\n🆕 New tags discovered: {len(self.syncer.new_tags)}")
            for tag in sorted(self.syncer.new_tags):
                self.syncer.logger.info(f"   - {tag}")
            needs_save = True
        
        if self.syncer.untranslated_templates:
            self.syncer.logger.info(f"\n💾 Saving translation tracking data...")
            needs_save = True
        
        if needs_save:
            self.syncer.save_tag_mappings()
            self.syncer.logger.info(f"✅ Saved to: {self.syncer.tag_mappings_file}")
        
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

Tag Translation:
  Tags are automatically translated using tag_mappings.json. New tags will be 
  added to the mappings file using English as default. You can then manually 
  update the translations for each language in tag_mappings.json.
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