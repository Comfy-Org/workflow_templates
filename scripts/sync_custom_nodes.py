#!/usr/bin/env python3
"""
Sync Custom Nodes Requirements Script

This script scans all template JSON files (excluding index files) and extracts
cnr_id information from nodes. It then updates the requiresCustomNodes field
in all index.[locale].json files to keep them synchronized.

Usage:
    python sync_custom_nodes.py --templates-dir ./templates
    python sync_custom_nodes.py --templates-dir ./templates --dry-run

Author: Auto-generated
Date: 2025-12-16
"""

import json
import os
import logging
import argparse
import sys
from typing import Dict, List, Set, Any, Optional
from pathlib import Path
import re


class CustomNodesSyncer:
    """Main class for syncing custom nodes requirements"""
    
    def __init__(self, templates_dir: str, dry_run: bool = False, whitelist_file: Optional[str] = None):
        self.templates_dir = Path(templates_dir).resolve()
        self.dry_run = dry_run
        self.whitelist_file = Path(whitelist_file).resolve() if whitelist_file else Path(__file__).with_name("whitelist.json")
        
        # Setup logging
        self.setup_logging()
        
        # Skip list for templates that should not be scanned or updated
        self.skip_templates = self.load_skip_templates()
        
        # Language files mapping
        self.language_files = {
            "en": "index.json",
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
        
    def setup_logging(self):
        """Configure logging system"""
        log_format = '%(asctime)s - %(levelname)s - %(message)s'
        logging.basicConfig(
            level=logging.INFO,
            format=log_format,
            handlers=[
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger(__name__)
    
    def load_skip_templates(self) -> Set[str]:
        """
        Load template names to skip from whitelist.json.
        
        Returns:
            Set of template names that should be ignored when scanning/updating
        """
        if not self.whitelist_file.exists():
            self.logger.warning(f"Whitelist file not found: {self.whitelist_file}")
            return set()
        
        try:
            with open(self.whitelist_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            skip_list = data.get("whitelist", {}).get("skip_templates", [])
            skip_set = {name for name in skip_list if isinstance(name, str) and name.strip()}
            
            if skip_set:
                self.logger.info(f"Loaded {len(skip_set)} whitelisted template(s) to skip: {sorted(skip_set)}")
            else:
                self.logger.info("No templates to skip in whitelist.")
            
            return skip_set
        except Exception as e:
            self.logger.error(f"Failed to load whitelist file {self.whitelist_file}: {e}")
            return set()
        
    def extract_cnr_ids_from_template(self, template_path: Path) -> Set[str]:
        """
        Extract all non-comfy-core cnr_id values from a template JSON file.
        
        Returns:
            Set of unique cnr_id values (excluding 'comfy-core' and empty strings)
        """
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            cnr_ids = set()
            nodes = data.get('nodes', [])
            
            for node in nodes:
                properties = node.get('properties', {})
                cnr_id = properties.get('cnr_id', '')
                
                # Only collect non-empty, non-comfy-core cnr_ids
                if cnr_id and cnr_id != 'comfy-core':
                    cnr_ids.add(cnr_id)
            
            return cnr_ids
            
        except Exception as e:
            self.logger.error(f"Failed to extract cnr_ids from {template_path}: {e}")
            return set()
    
    def scan_all_templates(self) -> Dict[str, Set[str]]:
        """
        Scan all template files and extract cnr_ids for each template.
        
        Returns:
            Dictionary mapping template name (without .json) to set of cnr_ids
        """
        template_cnr_ids = {}
        
        # Pattern to match index files (index.json, index.*.json)
        index_pattern = re.compile(r'^index(\.[^.]+)?\.json$')
        
        for file_path in self.templates_dir.glob('*.json'):
            # Skip index files
            if index_pattern.match(file_path.name):
                continue
            
            # Extract template name (filename without .json extension)
            template_name = file_path.stem
            
            if template_name in self.skip_templates:
                self.logger.info(f"  Skipping {template_name} (whitelisted)")
                continue
            
            # Extract cnr_ids from this template
            cnr_ids = self.extract_cnr_ids_from_template(file_path)
            
            if cnr_ids:
                template_cnr_ids[template_name] = cnr_ids
                self.logger.info(f"  Found {len(cnr_ids)} custom node(s) in {template_name}: {sorted(cnr_ids)}")
            else:
                self.logger.debug(f"  No custom nodes found in {template_name}")
        
        return template_cnr_ids
    
    def load_index_file(self, lang: str) -> Optional[List[Dict[str, Any]]]:
        """Load an index file (index.json or index.[locale].json)"""
        index_file = self.templates_dir / self.language_files[lang]
        
        if not index_file.exists():
            self.logger.warning(f"Index file not found: {index_file}")
            return None
        
        try:
            with open(index_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return data
        except Exception as e:
            self.logger.error(f"Failed to load {index_file}: {e}")
            return None
    
    def save_index_file(self, lang: str, data: List[Dict[str, Any]]):
        """Save an index file with proper formatting"""
        if self.dry_run:
            self.logger.info(f"[DRY RUN] Would save {self.language_files[lang]}")
            return
        
        index_file = self.templates_dir / self.language_files[lang]
        
        try:
            # Use the same formatting as sync_i18n.py
            json_str = json.dumps(data, ensure_ascii=False, indent=2)
            
            # Compact arrays (like tags, models, requiresCustomNodes) to single line
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
            
            with open(index_file, 'w', encoding='utf-8') as f:
                f.write(json_str)
            
            self.logger.info(f"Saved {self.language_files[lang]}")
        except Exception as e:
            self.logger.error(f"Failed to save {index_file}: {e}")
            raise
    
    def update_index_file(self, lang: str, template_cnr_ids: Dict[str, Set[str]]) -> bool:
        """
        Update requiresCustomNodes field in an index file.
        
        Returns:
            True if changes were made, False otherwise
        """
        data = self.load_index_file(lang)
        if data is None:
            return False
        
        changes_made = False
        
        # Iterate through all categories and templates
        for category in data:
            templates = category.get('templates', [])
            
            for template in templates:
                template_name = template.get('name')
                if not template_name:
                    continue
                
                if template_name in self.skip_templates:
                    self.logger.debug(f"  Skipping requiresCustomNodes update for {template_name} in {lang} (whitelisted)")
                    continue
                
                # Get expected cnr_ids for this template
                expected_cnr_ids = template_cnr_ids.get(template_name, set())
                expected_list = sorted(list(expected_cnr_ids)) if expected_cnr_ids else None
                
                # Get current requiresCustomNodes
                current_list = template.get('requiresCustomNodes')
                
                # Update if different
                if expected_list is None:
                    # No custom nodes required, remove field if it exists
                    if current_list is not None:
                        del template['requiresCustomNodes']
                        changes_made = True
                        self.logger.info(f"  Removed requiresCustomNodes from {template_name} in {lang}")
                else:
                    # Custom nodes required, update field
                    if current_list != expected_list:
                        template['requiresCustomNodes'] = expected_list
                        changes_made = True
                        if current_list is None:
                            self.logger.info(f"  Added requiresCustomNodes to {template_name} in {lang}: {expected_list}")
                        else:
                            self.logger.info(f"  Updated requiresCustomNodes for {template_name} in {lang}: {current_list} -> {expected_list}")
        
        if changes_made:
            self.save_index_file(lang, data)
        
        return changes_made
    
    def run_sync(self) -> bool:
        """Run the complete synchronization process"""
        self.logger.info("🚀 Starting custom nodes synchronization...")
        self.logger.info(f"Templates directory: {self.templates_dir}")
        self.logger.info(f"Dry run: {self.dry_run}")
        
        # Step 1: Scan all templates and extract cnr_ids
        self.logger.info("\n📋 Step 1: Scanning templates for custom nodes...")
        template_cnr_ids = self.scan_all_templates()
        
        if not template_cnr_ids:
            self.logger.info("  No templates with custom nodes found.")
            return True
        
        self.logger.info(f"\n  Found {len(template_cnr_ids)} template(s) with custom nodes")
        
        # Step 2: Update all index files
        self.logger.info("\n🔄 Step 2: Updating index files...")
        total_changes = 0
        
        for lang, lang_file in self.language_files.items():
            self.logger.info(f"\n  Processing {lang} ({lang_file})...")
            if self.update_index_file(lang, template_cnr_ids):
                total_changes += 1
        
        # Summary
        self.logger.info("\n" + "="*80)
        self.logger.info("📊 Synchronization Summary")
        self.logger.info("="*80)
        self.logger.info(f"  Templates with custom nodes: {len(template_cnr_ids)}")
        self.logger.info(f"  Index files updated: {total_changes}")
        
        if self.dry_run:
            self.logger.info("\n  ℹ️  This was a dry run. No files were actually modified.")
        
        return True


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Sync custom nodes requirements from templates to index files',
        epilog="""
Examples:
  # Normal sync
  python sync_custom_nodes.py --templates-dir ./templates
  
  # Dry run to see what would change
  python sync_custom_nodes.py --templates-dir ./templates --dry-run
        """
    )
    parser.add_argument('--templates-dir', default='./templates', 
                       help='Directory containing template files (default: ./templates)')
    parser.add_argument('--dry-run', action='store_true', 
                       help='Show what would be done without making changes')
    parser.add_argument('--whitelist-file', default=None,
                       help='Path to whitelist.json (default: scripts/whitelist.json)')
    
    args = parser.parse_args()
    
    try:
        syncer = CustomNodesSyncer(args.templates_dir, args.dry_run, args.whitelist_file)
        success = syncer.run_sync()
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\n⏹️ Synchronization cancelled by user")
        sys.exit(1)
    except Exception as e:
        logging.error(f"Synchronization failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

