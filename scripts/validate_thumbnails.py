#!/usr/bin/env python3
"""
Validate ComfyUI workflow template thumbnails.

For official templates, we want to ensure proper thumbnail configurations:
1. All templates should have at least one thumbnail file
2. Templates with thumbnailVariant "compareSlider" or "hoverDissolve" must have both -1 and -2 thumbnails
3. Thumbnail files should exist and be in the correct format

This ensures users get the expected visual experience when browsing templates.
"""

import json
import os
import sys
from typing import Dict, List, Set

def load_index_json(file_path: str) -> Dict:
    """Load and parse the index.json file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError, UnicodeDecodeError) as e:
        return {'error': str(e)}

def get_existing_thumbnails(templates_dir: str) -> Set[str]:
    """Get all existing thumbnail files in the templates directory"""
    thumbnail_files = set()
    try:
        for filename in os.listdir(templates_dir):
            # Look for thumbnail files (exclude .json files)
            if not filename.endswith('.json') and not filename.startswith('.'):
                thumbnail_files.add(filename)
    except OSError as e:
        print(f"Error reading templates directory: {e}")
    
    return thumbnail_files

def validate_thumbnails(index_data: List[Dict], templates_dir: str) -> Dict:
    """Validate thumbnail configurations for all templates"""
    results = {
        'total_templates': 0,
        'missing_thumbnails': [],
        'incomplete_dual_thumbnails': [],
        'orphaned_thumbnails': set(),
        'templates_with_errors': []
    }
    
    if 'error' in index_data:
        results['templates_with_errors'].append(f"Failed to load index.json: {index_data['error']}")
        return results
    
    # Get all existing thumbnail files
    existing_thumbnails = get_existing_thumbnails(templates_dir)
    expected_thumbnails = set()
    
    # Process all template categories
    for category in index_data:
        if 'templates' not in category:
            continue
            
        for template in category['templates']:
            template_name = template.get('name', '')
            if not template_name:
                continue
                
            results['total_templates'] += 1
            thumbnail_variant = template.get('thumbnailVariant', '')
            media_subtype = template.get('mediaSubtype', 'webp')
            
            # Check what thumbnails this template should have
            if thumbnail_variant in ['compareSlider', 'hoverDissolve']:
                # These variants require both -1 and -2 thumbnails
                thumb1 = f"{template_name}-1.{media_subtype}"
                thumb2 = f"{template_name}-2.{media_subtype}"
                expected_thumbnails.add(thumb1)
                expected_thumbnails.add(thumb2)
                
                missing = []
                if thumb1 not in existing_thumbnails:
                    missing.append(thumb1)
                if thumb2 not in existing_thumbnails:
                    missing.append(thumb2)
                    
                if missing:
                    results['incomplete_dual_thumbnails'].append({
                        'template': template_name,
                        'variant': thumbnail_variant,
                        'missing_files': missing,
                        'expected_files': [thumb1, thumb2]
                    })
            else:
                # Regular templates need at least one thumbnail
                thumb1 = f"{template_name}-1.{media_subtype}"
                expected_thumbnails.add(thumb1)
                
                if thumb1 not in existing_thumbnails:
                    results['missing_thumbnails'].append({
                        'template': template_name,
                        'expected_file': thumb1,
                        'media_subtype': media_subtype
                    })
    
    # Find orphaned thumbnails (files that don't correspond to any template)
    results['orphaned_thumbnails'] = existing_thumbnails - expected_thumbnails
    
    return results

def generate_report(results: Dict) -> str:
    """Generate validation report"""
    report = []
    report.append("# ComfyUI Template Thumbnail Validation Report\n")
    
    # Summary
    report.append("## Summary")
    report.append(f"- Total templates checked: {results['total_templates']}")
    report.append(f"- Templates with missing thumbnails: {len(results['missing_thumbnails'])}")
    report.append(f"- Templates with incomplete dual thumbnails: {len(results['incomplete_dual_thumbnails'])}")
    report.append(f"- Orphaned thumbnail files: {len(results['orphaned_thumbnails'])}")
    
    if results['templates_with_errors']:
        report.append(f"- Configuration errors: {len(results['templates_with_errors'])}")
    
    # Detailed issues
    has_issues = False
    
    if results['templates_with_errors']:
        has_issues = True
        report.append("\n## ❌ Configuration Errors")
        for error in results['templates_with_errors']:
            report.append(f"- {error}")
    
    if results['missing_thumbnails']:
        has_issues = True
        report.append("\n## ❌ Missing Thumbnails")
        report.append("The following templates are missing their thumbnail files:")
        for missing in results['missing_thumbnails']:
            report.append(f"- **{missing['template']}**: Missing `{missing['expected_file']}`")
    
    if results['incomplete_dual_thumbnails']:
        has_issues = True
        report.append("\n## ❌ Incomplete Dual Thumbnails")
        report.append("Templates with compareSlider or hoverDissolve variants require both -1 and -2 thumbnails:")
        for incomplete in results['incomplete_dual_thumbnails']:
            report.append(f"- **{incomplete['template']}** ({incomplete['variant']}):")
            report.append(f"  - Expected: {', '.join(incomplete['expected_files'])}")
            report.append(f"  - Missing: {', '.join(incomplete['missing_files'])}")
    
    if results['orphaned_thumbnails']:
        has_issues = True
        report.append("\n## ⚠️ Orphaned Thumbnail Files")
        report.append("The following thumbnail files don't correspond to any template:")
        for orphan in sorted(results['orphaned_thumbnails']):
            report.append(f"- `{orphan}`")
    
    if not has_issues:
        report.append("\n## ✅ All Thumbnail Validations Passed")
        report.append("All templates have the correct thumbnail files configured.")
    
    return '\n'.join(report)

def main():
    templates_dir = './templates'
    index_file = os.path.join(templates_dir, 'index.json')
    
    if not os.path.exists(templates_dir):
        print(f"Error: Templates directory {templates_dir} not found")
        return 1
    
    if not os.path.exists(index_file):
        print(f"Error: Index file {index_file} not found")
        return 1
    
    # Load index.json
    index_data = load_index_json(index_file)
    
    # Validate thumbnails
    results = validate_thumbnails(index_data, templates_dir)
    
    # Generate and print report
    report = generate_report(results)
    print(report)
    
    # Return error code if issues found
    has_errors = (
        len(results['missing_thumbnails']) > 0 or
        len(results['incomplete_dual_thumbnails']) > 0 or
        len(results['templates_with_errors']) > 0
    )
    
    if has_errors:
        print("\n❌ Thumbnail validation failed")
        return 1
    else:
        print("\n✅ All thumbnail validations passed")
        return 0

if __name__ == "__main__":
    sys.exit(main())