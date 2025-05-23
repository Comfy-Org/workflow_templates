#!/usr/bin/env python3
"""
Validate workflow templates index.json against schema and check file consistency.
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Set, Tuple

try:
    import jsonschema
except ImportError:
    print("Error: jsonschema package not installed. Run: pip install jsonschema")
    sys.exit(1)


def load_json(file_path: Path) -> Dict:
    """Load JSON file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def validate_schema(index_data: List[Dict], schema_path: Path) -> Tuple[bool, List[str]]:
    """Validate index.json against JSON schema."""
    errors = []
    
    try:
        schema = load_json(schema_path)
        jsonschema.validate(instance=index_data, schema=schema)
        return True, []
    except jsonschema.ValidationError as e:
        errors.append(f"Schema validation error: {e.message}")
        if e.path:
            errors.append(f"  at path: {'.'.join(str(p) for p in e.path)}")
        return False, errors
    except Exception as e:
        errors.append(f"Unexpected error during validation: {str(e)}")
        return False, errors


def check_file_consistency(index_data: List[Dict], templates_dir: Path) -> Tuple[bool, List[str], List[str]]:
    """Check that all referenced files exist and all files are referenced."""
    errors = []
    warnings = []
    
    # Collect all referenced workflow and thumbnail files
    referenced_workflows = set()
    referenced_thumbnails = set()
    
    for category in index_data:
        for template in category.get('templates', []):
            name = template.get('name', '')
            if not name:
                errors.append(f"Template in category '{category.get('title')}' missing name")
                continue
                
            # Workflow file
            workflow_file = f"{name}.json"
            referenced_workflows.add(workflow_file)
            
            # Thumbnail files (support multiple thumbnails)
            media_subtype = template.get('mediaSubtype', '')
            if media_subtype:
                # Check for numbered thumbnails
                for i in range(1, 10):  # Support up to 9 thumbnails
                    thumbnail = f"{name}-{i}.{media_subtype}"
                    thumbnail_path = templates_dir / thumbnail
                    if thumbnail_path.exists():
                        referenced_thumbnails.add(thumbnail)
    
    # Check all referenced workflow files exist
    for workflow in referenced_workflows:
        workflow_path = templates_dir / workflow
        if not workflow_path.exists():
            errors.append(f"Referenced workflow file not found: {workflow}")
    
    # Check all referenced thumbnail files exist
    for thumbnail in referenced_thumbnails:
        thumbnail_path = templates_dir / thumbnail
        if not thumbnail_path.exists():
            errors.append(f"Referenced thumbnail file not found: {thumbnail}")
    
    # Find orphaned files (files that exist but aren't referenced)
    all_files = set(f.name for f in templates_dir.iterdir() if f.is_file())
    
    # Exclude special files
    special_files = {'index.json', 'index.schema.json', '.gitignore', 'README.md'}
    all_files -= special_files
    
    # Separate workflow and media files
    workflow_files = {f for f in all_files if f.endswith('.json')}
    media_files = all_files - workflow_files
    
    # Check for orphaned workflows
    orphaned_workflows = workflow_files - referenced_workflows
    for orphan in orphaned_workflows:
        warnings.append(f"Workflow file not referenced in index.json: {orphan}")
    
    # Check for orphaned media files
    # For media files, we need to check if they match the pattern name-N.ext
    potential_orphans = []
    for media_file in media_files:
        # Check if it matches any referenced template name pattern
        is_referenced = False
        for template_name in [w.replace('.json', '') for w in referenced_workflows]:
            if media_file.startswith(f"{template_name}-") and media_file[len(template_name)+1:].split('.')[0].isdigit():
                is_referenced = True
                break
        
        if not is_referenced:
            potential_orphans.append(media_file)
    
    for orphan in potential_orphans:
        warnings.append(f"Media file not referenced in index.json: {orphan}")
    
    return len(errors) == 0, errors, warnings


def check_duplicate_names(index_data: List[Dict]) -> Tuple[bool, List[str]]:
    """Check for duplicate template names across categories."""
    errors = []
    seen_names = {}
    
    for category in index_data:
        category_title = category.get('title', 'Unknown')
        for template in category.get('templates', []):
            name = template.get('name', '')
            if name in seen_names:
                errors.append(
                    f"Duplicate template name '{name}' found in categories "
                    f"'{seen_names[name]}' and '{category_title}'"
                )
            else:
                seen_names[name] = category_title
    
    return len(errors) == 0, errors


def check_required_thumbnails(index_data: List[Dict], templates_dir: Path) -> Tuple[bool, List[str]]:
    """Check that each template has at least one thumbnail."""
    errors = []
    
    for category in index_data:
        for template in category.get('templates', []):
            name = template.get('name', '')
            media_subtype = template.get('mediaSubtype', '')
            
            if not name or not media_subtype:
                continue
            
            # Check for at least one thumbnail
            thumbnail_1 = templates_dir / f"{name}-1.{media_subtype}"
            if not thumbnail_1.exists():
                errors.append(f"Missing required thumbnail: {name}-1.{media_subtype}")
    
    return len(errors) == 0, errors


def main():
    """Main validation function."""
    # Check for GitHub Actions environment
    is_github_actions = os.environ.get('GITHUB_ACTIONS') == 'true'
    
    # Determine paths
    script_dir = Path(__file__).parent
    repo_root = script_dir.parent
    templates_dir = repo_root / 'templates'
    index_path = templates_dir / 'index.json'
    schema_path = templates_dir / 'index.schema.json'
    
    print("🔍 Validating ComfyUI Workflow Templates...")
    print(f"   Templates directory: {templates_dir}")
    
    # Check required files exist
    if not index_path.exists():
        print(f"❌ Error: index.json not found at {index_path}")
        return 1
    
    if not schema_path.exists():
        print(f"❌ Error: index.schema.json not found at {schema_path}")
        return 1
    
    # Load index.json
    try:
        index_data = load_json(index_path)
    except Exception as e:
        print(f"❌ Error loading index.json: {e}")
        return 1
    
    all_errors = []
    all_warnings = []
    
    # Run validations
    print("\n1️⃣  Validating against JSON schema...")
    valid, errors = validate_schema(index_data, schema_path)
    if valid:
        print("   ✅ Schema validation passed")
    else:
        print("   ❌ Schema validation failed")
        all_errors.extend(errors)
    
    print("\n2️⃣  Checking file consistency...")
    valid, errors, warnings = check_file_consistency(index_data, templates_dir)
    if valid and not warnings:
        print("   ✅ File consistency check passed")
    elif valid and warnings:
        print("   ⚠️  File consistency check passed with warnings")
    else:
        print("   ❌ File consistency check failed")
    all_errors.extend(errors)
    all_warnings.extend(warnings)
    
    print("\n3️⃣  Checking for duplicate names...")
    valid, errors = check_duplicate_names(index_data)
    if valid:
        print("   ✅ No duplicate names found")
    else:
        print("   ❌ Duplicate names found")
        all_errors.extend(errors)
    
    print("\n4️⃣  Checking required thumbnails...")
    valid, errors = check_required_thumbnails(index_data, templates_dir)
    if valid:
        print("   ✅ All templates have thumbnails")
    else:
        print("   ❌ Missing thumbnails")
        all_errors.extend(errors)
    
    # Print warnings
    if all_warnings:
        print("\nWarnings:")
        for warning in all_warnings:
            print(f"  ⚠️  {warning}")
            # GitHub Actions annotation
            if is_github_actions:
                print(f"::warning file=templates/index.json::{warning}")
    
    # Summary
    print("\n" + "="*50)
    if all_errors:
        print(f"❌ Validation failed with {len(all_errors)} error(s):\n")
        for error in all_errors:
            print(f"   • {error}")
            # GitHub Actions annotation for errors
            if is_github_actions:
                print(f"::error file=templates/index.json::{error}")
        return 1
    else:
        if all_warnings:
            print(f"✅ All validations passed with {len(all_warnings)} warning(s)!")
        else:
            print("✅ All validations passed!")
        return 0


if __name__ == "__main__":
    sys.exit(main())