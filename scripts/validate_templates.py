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
    special_files = {'index.json', 'index.zh.json', 'index.zh-TW.json', 'index.ja.json', 'index.ko.json', 'index.es.json', 'index.fr.json', 'index.ru.json', 'index.schema.json', '.gitignore', 'README.md'}
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


def find_model_loader_nodes(template_data: Dict, models: List[Dict]) -> List[Tuple[str, str, str]]:
    """Find nodes that use models from the models array in their widget values."""
    model_nodes = []
    model_names = {model.get('name', '') for model in models}
    
    # Look in the nodes array
    nodes = template_data.get('nodes', [])
    for node in nodes:
        if isinstance(node, dict):
            node_id = str(node.get('id', 'unknown'))
            node_type = node.get('type', 'unknown')
            widgets_values = node.get('widgets_values', [])
            
            # Check if any widget value matches a model name
            for widget_value in widgets_values:
                if isinstance(widget_value, str) and widget_value in model_names:
                    model_nodes.append((node_id, node_type, widget_value))
    
    return model_nodes


def check_model_metadata_format(index_data: List[Dict], templates_dir: Path) -> Tuple[bool, List[str]]:
    """Check for top-level models arrays and validate node property models have corresponding widget values."""
    errors = []
    
    # Get all template names from index
    template_names = set()
    for category in index_data:
        for template in category.get('templates', []):
            template_names.add(template.get('name', ''))
    
    # Check each template file
    for template_name in template_names:
        template_file = templates_dir / f"{template_name}.json"
        if not template_file.exists():
            continue
            
        try:
            with open(template_file, 'r', encoding='utf-8') as f:
                template_data = json.load(f)
        except Exception as e:
            errors.append(f"Error reading {template_name}.json: {e}")
            continue
        
        # Check if template has top-level models array
        if 'models' in template_data and isinstance(template_data['models'], list):
            models = template_data['models']
            if models:  # Only report if there are actually models
                errors.append(f"FAIL: {template_name}.json has {len(models)} models in top-level 'models' array")
                
                # Try to suggest where models should be placed
                model_nodes = find_model_loader_nodes(template_data, models)
                
                if model_nodes:
                    errors.append(f"  → Suggestion: Move models to node properties for these model loader nodes:")
                    for node_id, node_type, model_name in model_nodes:
                        errors.append(f"    - Node {node_id} ({node_type}) uses model: {model_name}")
                else:
                    errors.append(f"  → No nodes found that use these models in their widget values")
                
                # List the models found
                errors.append(f"  → Top-level models found:")
                for model in models:
                    name = model.get('name', 'unknown')
                    directory = model.get('directory', 'unknown')
                    errors.append(f"    - {name} (directory: {directory})")
        
        # NEW: Validate that models in node properties have corresponding widget values
        nodes = template_data.get('nodes', [])
        widget_values_by_node = {}
        node_models = []
        
        # Collect widget values and models from each node
        for node in nodes:
            if isinstance(node, dict):
                node_id = str(node.get('id', 'unknown'))
                widgets_values = node.get('widgets_values', [])
                widget_values_by_node[node_id] = [
                    v for v in widgets_values if isinstance(v, str)
                ]
                
                properties = node.get('properties', {})
                if isinstance(properties, dict) and 'models' in properties:
                    models_list = properties['models']
                    if isinstance(models_list, list):
                        for model in models_list:
                            if isinstance(model, dict):
                                model_name = model.get('name', '')
                                if model_name:
                                    node_models.append((node_id, node.get('type', 'unknown'), model_name))
        
        # Validate each model has corresponding widget value
        for node_id, node_type, model_name in node_models:
            node_widget_values = widget_values_by_node.get(node_id, [])
            if model_name not in node_widget_values:
                errors.append(f"ERROR: {template_name}.json - Model '{model_name}' in node {node_id} ({node_type}) properties but not in widget_values")
                errors.append(f"  → Widget values: {node_widget_values}")
    
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
    
    print("\n5️⃣  Checking model metadata format...")
    valid, errors = check_model_metadata_format(index_data, templates_dir)
    if valid:
        print("   ✅ All templates use correct model metadata format")
    else:
        print("   ❌ Templates using deprecated top-level models format found")
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