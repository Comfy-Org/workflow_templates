#!/usr/bin/env python3
"""
Script to sync icon information from index.json to all other language-specific index files.
Icons should be consistent across all language versions.
"""

import json
import os
import glob
from pathlib import Path

def extract_icon_mapping(source_file):
    """
    Extract icon mapping from the source file (index.json)
    
    Returns:
        dict: Mapping of category info to icon
    """
    try:
        with open(source_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        icon_mapping = {}
        
        for category in data:
            # Create a unique key based on category info that should be consistent across languages
            category_key = (
                category.get('moduleName', ''),
                category.get('category', ''),
                category.get('type', ''),
                category.get('title', '')  # Title might be different in other languages, but we'll use it as fallback
            )
            
            if 'icon' in category:
                icon_mapping[category_key] = category['icon']
                print(f"Found icon for {category.get('title', 'Unknown')}: {category['icon']}")
        
        return icon_mapping
        
    except Exception as e:
        print(f"❌ Error reading {source_file}: {str(e)}")
        return {}

def find_matching_category(target_category, icon_mapping):
    """
    Find the matching icon for a category in the target file
    """
    target_key = (
        target_category.get('moduleName', ''),
        target_category.get('category', ''),
        target_category.get('type', ''),
        target_category.get('title', '')
    )
    
    # First try exact match
    if target_key in icon_mapping:
        return icon_mapping[target_key]
    
    # Try match without title (since titles are translated)
    for key, icon in icon_mapping.items():
        if (key[0] == target_key[0] and  # moduleName
            key[1] == target_key[1] and  # category  
            key[2] == target_key[2]):    # type
            return icon
    
    return None

def sync_icons_to_file(target_file, icon_mapping):
    """
    Sync icons from mapping to target file
    
    Returns:
        int: Number of icons added/updated
    """
    try:
        with open(target_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        modified_count = 0
        
        for category in data:
            matching_icon = find_matching_category(category, icon_mapping)
            
            if matching_icon:
                if 'icon' not in category:
                    category['icon'] = matching_icon
                    modified_count += 1
                    print(f"  Added icon '{matching_icon}' to {category.get('title', 'Unknown')}")
                elif category['icon'] != matching_icon:
                    old_icon = category['icon']
                    category['icon'] = matching_icon
                    modified_count += 1
                    print(f"  Updated icon for {category.get('title', 'Unknown')}: {old_icon} → {matching_icon}")
        
        # Write back to file if modifications were made
        if modified_count > 0:
            with open(target_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"✅ Updated {target_file}: {modified_count} icons synced")
        else:
            print(f"✅ {target_file}: No changes needed (all icons already synced)")
        
        return modified_count
        
    except Exception as e:
        print(f"❌ Error processing {target_file}: {str(e)}")
        return 0

def main():
    """Main function to sync icons across all language files"""
    script_dir = Path(__file__).parent
    source_file = script_dir / 'index.json'
    
    if not source_file.exists():
        print("❌ Source file index.json not found!")
        return
    
    print("Extracting icon mapping from index.json...")
    icon_mapping = extract_icon_mapping(source_file)
    
    if not icon_mapping:
        print("❌ No icons found in source file!")
        return
    
    print(f"Found {len(icon_mapping)} icon mappings")
    print()
    
    # Find all other index files (excluding source and schema)
    target_files = []
    for pattern in ['index.*.json']:
        files = glob.glob(str(script_dir / pattern))
        target_files.extend(files)
    
    # Filter out source file and schema file
    target_files = [f for f in target_files if not f.endswith('schema.json')]
    target_files.sort()
    
    if not target_files:
        print("❌ No target language files found!")
        return
    
    print(f"Found {len(target_files)} target files to sync:")
    for file in target_files:
        print(f"  - {os.path.basename(file)}")
    print()
    
    # Sync icons to each target file
    total_synced = 0
    
    for file_path in target_files:
        print(f"Processing {os.path.basename(file_path)}...")
        synced = sync_icons_to_file(file_path, icon_mapping)
        total_synced += synced
        print()
    
    # Summary
    print("=" * 50)
    print("SUMMARY:")
    print(f"📁 Files processed: {len(target_files)}")
    print(f"🎨 Total icons synced: {total_synced}")
    print(f"🎯 Icon mappings available: {len(icon_mapping)}")
    print("=" * 50)

if __name__ == "__main__":
    main()
