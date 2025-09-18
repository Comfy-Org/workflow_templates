#!/usr/bin/env python3
"""
Script to sync icon information from index.json to all other language-specific index files.
Uses index-based matching since the order of categories is consistent across languages.
"""

import json
import os
import glob
from pathlib import Path

def extract_icons_by_index(source_file):
    """
    Extract icons from source file by index position
    
    Returns:
        list: List of icons in order (None if no icon for that category)
    """
    try:
        with open(source_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        icons = []
        for i, category in enumerate(data):
            icon = category.get('icon', None)
            icons.append(icon)
            if icon:
                print(f"Index {i}: {category.get('title', 'Unknown')} → {icon}")
            else:
                print(f"Index {i}: {category.get('title', 'Unknown')} → No icon")
        
        return icons
        
    except Exception as e:
        print(f"❌ Error reading {source_file}: {str(e)}")
        return []

def sync_icons_by_index(target_file, icons_list):
    """
    Sync icons to target file by index position
    
    Returns:
        int: Number of icons added/updated
    """
    try:
        with open(target_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        modified_count = 0
        
        for i, category in enumerate(data):
            if i < len(icons_list) and icons_list[i]:  # If there's an icon for this index
                target_icon = icons_list[i]
                
                if 'icon' not in category:
                    category['icon'] = target_icon
                    modified_count += 1
                    print(f"  [{i}] Added icon '{target_icon}' to {category.get('title', 'Unknown')}")
                elif category['icon'] != target_icon:
                    old_icon = category['icon']
                    category['icon'] = target_icon
                    modified_count += 1
                    print(f"  [{i}] Updated icon for {category.get('title', 'Unknown')}: {old_icon} → {target_icon}")
        
        # Write back to file if modifications were made
        if modified_count > 0:
            with open(target_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"✅ Updated {target_file}: {modified_count} icons synced")
        else:
            print(f"✅ {target_file}: No changes needed")
        
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
    
    print("Extracting icons by index from index.json...")
    icons_list = extract_icons_by_index(source_file)
    
    if not icons_list:
        print("❌ No data found in source file!")
        return
    
    icons_count = sum(1 for icon in icons_list if icon)
    print(f"Found {icons_count} icons across {len(icons_list)} categories")
    print()
    
    # Find all other index files (excluding source and schema)
    target_files = []
    for pattern in ['index.*.json']:
        files = glob.glob(str(script_dir / pattern))
        target_files.extend(files)
    
    # Filter out schema file
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
        synced = sync_icons_by_index(file_path, icons_list)
        total_synced += synced
        print()
    
    # Summary
    print("=" * 50)
    print("SUMMARY:")
    print(f"📁 Files processed: {len(target_files)}")
    print(f"🎨 Total icons synced: {total_synced}")
    print(f"🎯 Icons available: {icons_count}")
    print("=" * 50)

if __name__ == "__main__":
    main()
