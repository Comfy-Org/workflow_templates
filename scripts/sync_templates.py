#!/usr/bin/env python3
"""
Template Synchronization Script for ComfyUI Workflow Templates

This script synchronizes template information from the English master file (index.json)
to all other language versions, maintaining consistency while preserving language-specific content.

Author: Claude Code
Date: 2025-09-01
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
        self.templates_dir = Path(templates_dir)
        self.dry_run = dry_run
        self.master_file = self.templates_dir / "index.json"
        
        # Configuration for field handling
        self.auto_sync_fields = {
            "models", "date", "size", "mediaType", "mediaSubtype", 
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
        
        # Setup logging
        self.setup_logging()
        
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
                    
        # Handle tags based on options - default is to preserve existing translations
        if "tags" in master_template:
            if self.sync_options.get("force_sync_tags", False):
                # Only sync tags if explicitly forced
                if "tags" not in target_template or set(target_template["tags"]) != set(master_template["tags"]):
                    updated_template["tags"] = master_template["tags"]
                    changes_made = True
                    self.syncer.logger.info(f"  ✓ Force-synced tags: {master_template['tags']}")
            else:
                # Default: preserve existing translated tags
                if "tags" not in target_template:
                    # Only add tags if template doesn't have any
                    updated_template["tags"] = master_template["tags"]
                    changes_made = True
                    self.syncer.logger.info(f"  ➕ Added missing tags: {master_template['tags']}")
                else:
                    # Keep existing translated tags
                    if set(target_template["tags"]) != set(master_template["tags"]):
                        self.syncer.logger.info(f"  ⏭ Preserved translated tags: {target_template['tags']} (English: {master_template['tags']})")
                        
        # Handle language-specific fields - default is to preserve existing translations
        for field in self.syncer.language_specific_fields:
            if field in master_template:
                if field not in target_template:
                    # Add missing language-specific field from English
                    updated_template[field] = master_template[field]
                    changes_made = True
                    self.syncer.logger.info(f"  ➕ Added missing {field}: {master_template[field]}")
                elif self.sync_options.get("force_sync_language_fields", False):
                    # Only update if explicitly forced
                    if self.syncer.compare_field_values(field, target_template[field], master_template[field]):
                        updated_template[field] = master_template[field]
                        changes_made = True
                        self.syncer.logger.info(f"  ✓ Force-synced {field}: {master_template[field]}")
                else:
                    # Default: preserve existing translations
                    if self.syncer.compare_field_values(field, target_template[field], master_template[field]):
                        self.syncer.logger.info(f"  ⏭ Preserved translated {field}: '{target_template[field]}' (English: '{master_template[field]}')")
                            
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
                
                # Preserve existing title if available
                if "title" in existing_category:
                    new_category["title"] = existing_category["title"]
                    self.syncer.logger.info(f"  🔗 Matched category '{master_category['moduleName']}' with existing category (preserved title: '{existing_category['title']}')")
                else:
                    new_category["title"] = master_category["title"]
            else:
                # No matching category found, use master data
                new_category["title"] = master_category["title"]
                if matching_idx is None:
                    self.syncer.logger.info(f"  ➕ Added new category: '{master_category['moduleName']}'")
                
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
        
    def run_sync(self) -> bool:
        """Run complete synchronization process"""
        self.syncer.logger.info("🚀 Starting template synchronization...")
        self.syncer.logger.info(f"Master file: {self.syncer.master_file}")
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
                
        # Print summary
        self.syncer.logger.info(f"\n📊 Synchronization Summary:")
        self.syncer.logger.info(f"   Files processed: {self.stats['files_processed']}")
        self.syncer.logger.info(f"   Templates added: {self.stats['templates_added']}")
        self.syncer.logger.info(f"   Templates removed: {self.stats['templates_removed']}")
        self.syncer.logger.info(f"   Templates updated: {self.stats['templates_updated']}")
        self.syncer.logger.info(f"   Fields updated: {self.stats['fields_updated']}")
        
        return success


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Synchronize ComfyUI workflow template files')
    parser.add_argument('--templates-dir', default='.', help='Directory containing template files')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be done without making changes')
    parser.add_argument('--force-sync-tags', action='store_true', help='Force sync all tags (overwrite translations)')
    parser.add_argument('--force-sync-language-fields', action='store_true', help='Force sync language-specific fields (overwrite translations)')
    parser.add_argument('--preserve-translations', action='store_true', default=True, help='Preserve existing translations (default behavior)')
    
    args = parser.parse_args()
    
    sync_options = {
        'force_sync_tags': args.force_sync_tags,
        'force_sync_language_fields': args.force_sync_language_fields,
        'preserve_translations': args.preserve_translations
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