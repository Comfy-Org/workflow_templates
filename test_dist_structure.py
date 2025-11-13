#!/usr/bin/env python3
"""
Test that dist/ structure works with validation logic.
Simulates what the frontend would do: read index.json and construct file paths.
"""

import json
import os
from pathlib import Path

def test_dist_structure():
    dist_dir = Path('dist')
    index_path = dist_dir / 'index.json'

    print("🧪 Testing dist/ structure compatibility...\n")

    # Load index.json
    with open(index_path) as f:
        index_data = json.load(f)

    errors = []
    successes = []

    # Test each template
    for category in index_data:
        if 'templates' not in category:
            continue

        for template in category['templates']:
            name = template['name']
            media_type = template.get('mediaType', 'image')
            media_subtype = template.get('mediaSubtype', 'webp')

            # Construct expected file paths (same logic as frontend)
            workflow_file = dist_dir / f"{name}.json"

            # Thumbnails can be -1, -2, etc.
            thumbnail_file = dist_dir / f"{name}-1.{media_subtype}"

            # Check workflow exists
            if not workflow_file.exists():
                errors.append(f"❌ Missing workflow: {workflow_file}")
            else:
                successes.append(f"✅ Found workflow: {name}.json")

            # Check thumbnail exists (if expected)
            if media_type in ['image', 'video']:
                if not thumbnail_file.exists():
                    errors.append(f"❌ Missing thumbnail: {thumbnail_file}")
                else:
                    successes.append(f"✅ Found thumbnail: {name}-1.{media_subtype}")

    # Print results
    print(f"✅ Successful checks: {len(successes)}")
    print(f"❌ Errors: {len(errors)}\n")

    if errors:
        print("Errors found:")
        for error in errors[:10]:  # Show first 10
            print(f"  {error}")
        if len(errors) > 10:
            print(f"  ... and {len(errors) - 10} more")
        return False
    else:
        print("🎉 All files found! Frontend would be able to load all templates.")
        return True

if __name__ == '__main__':
    success = test_dist_structure()
    exit(0 if success else 1)
