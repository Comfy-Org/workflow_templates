#!/usr/bin/env python3
"""
Script to sync icon information from index.json to all other language-specific index files.
Uses index-based matching and maintains consistent field ordering.
"""

import json
import os
import glob
from pathlib import Path
from collections import OrderedDict

def get_category_structure(source_file):
    """
    Extract the structure (field order and icons) from source file
    
    Returns:
        list: List of category structures with field order and icons
    """
    try:
        with open(source_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        structures = []
        for i, category in enumerate(data):
            # Get the field order from the source
            field_order = list(category.keys())
            icon = category.get('icon', None)
            
            structures.append({
                'field_order': field_order,
                'icon': icon
            })
            
            if icon:
                print(f"Index {i}: {category.get('title', 'Unknown')} → {icon} (fields: {', '.join(field_order)})")
            else:
                print(f"Index {i}: {category.get('title', 'Unknown')} → No icon (fields: {', '.join(field_order)})")
        
        return structures
        
    except Exception as e:
        print(f"❌ Error reading {source_file}: {str(e)}")
        return []

def reorder_category_fields(category, target_field_order, icon=None):
    """
    Reorder category fields to match target order and add icon if needed
    
    Args:
        category: The category object to reorder
        target_field_order: The desired field order
        icon: Icon to add if not None
    
    Returns:
        OrderedDict: Reordered category
    """
    ordered_category = OrderedDict()
    
    # First, add fields in the target order if they exist
    for field in target_field_order:
        if field in category:
            ordered_category[field] = category[field]
        elif field == 'icon' and icon:
            ordered_category[field] = icon
    
    # Add any remaining fields that weren't in the target order
    for field, value in category.items():
        if field not in ordered_category:
            ordered_category[field] = value
    
    return ordered_category

def sync_structure_by_index(target_file, structures):
    """
    Sync structure (field order and icons) to target file by index position
    
    Returns:
        int: Number of categories modified
    """
    try:
        with open(target_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        modified_count = 0
        new_data = []
        
        for i, category in enumerate(data):
            if i < len(structures):
                structure = structures[i]
                target_field_order = structure['field_order']
                target_icon = structure['icon']
                
                # Check if we need to modify this category
                needs_reorder = list(category.keys()) != target_field_order
                needs_icon = target_icon and category.get('icon') != target_icon
                
                if needs_reorder or needs_icon:
                    # Reorder fields and add icon
                    ordered_category = reorder_category_fields(category, target_field_order, target_icon)
                    new_data.append(dict(ordered_category))
                    modified_count += 1
                    
                    changes = []
                    if needs_icon:
                        changes.append(f"icon: {target_icon}")
                    if needs_reorder:
                        changes.append("reordered fields")
                    
                    print(f"  [{i}] Modified {category.get('title', 'Unknown')}: {', '.join(changes)}")
                else:
                    new_data.append(category)
            else:
                new_data.append(category)
        
        # Write back to file if modifications were made
        if modified_count > 0:
            with open(target_file, 'w', encoding='utf-8') as f:
                json.dump(new_data, f, ensure_ascii=False, indent=2)
            print(f"✅ Updated {target_file}: {modified_count} categories modified")
        else:
            print(f"✅ {target_file}: No changes needed")
        
        return modified_count
        
    except Exception as e:
        print(f"❌ Error processing {target_file}: {str(e)}")
        return 0

def main():
    """Main function to sync structure across all language files"""
    script_dir = Path(__file__).parent
    source_file = script_dir / 'index.json'
    
    if not source_file.exists():
        print("❌ Source file index.json not found!")
        return
    
    print("Extracting structure (field order + icons) from index.json...")
    structures = get_category_structure(source_file)
    
    if not structures:
        print("❌ No data found in source file!")
        return
    
    icons_count = sum(1 for s in structures if s['icon'])
    print(f"Found {icons_count} icons across {len(structures)} categories")
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
    
    # Sync structure to each target file
    total_modified = 0
    
    for file_path in target_files:
        print(f"Processing {os.path.basename(file_path)}...")
        modified = sync_structure_by_index(file_path, structures)
        total_modified += modified
        print()
    
    # Summary
    print("=" * 50)
    print("SUMMARY:")
    print(f"📁 Files processed: {len(target_files)}")
    print(f"🔧 Total categories modified: {total_modified}")
    print(f"🎯 Icons available: {icons_count}")
    print("=" * 50)

if __name__ == "__main__":
    main()
