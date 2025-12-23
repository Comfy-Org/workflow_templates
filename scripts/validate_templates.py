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


def validate_schema(index_data: List[Dict], schema_path: Path, file_name: str = "index.json") -> Tuple[bool, List[str]]:
    """Validate index.json against JSON schema with enhanced error reporting."""
    errors = []
    
    try:
        schema = load_json(schema_path)
        jsonschema.validate(instance=index_data, schema=schema)
        return True, []
    except jsonschema.ValidationError as e:
        # Enhanced error reporting for GitHub Actions
        path_str = ".".join(str(p) for p in e.path) if e.path else "root"
        error_msg = f"Schema validation error at {path_str}: {e.message}"
        
        # Try to find the specific template name if error is in a template
        if e.path and len(e.path) >= 3 and e.path[1] == "templates":
            try:
                category_idx = e.path[0]
                template_idx = e.path[2]
                template_name = index_data[category_idx]["templates"][template_idx].get("name", "unknown")
                error_msg = f"Template '{template_name}': {e.message}"
            except (IndexError, KeyError, TypeError):
                pass
        
        errors.append(error_msg)
        
        # Add validation context
        if hasattr(e, 'absolute_path'):
            errors.append(f"  Path: {'.'.join(str(p) for p in e.absolute_path)}")
        if hasattr(e, 'schema_path'):
            errors.append(f"  Schema rule: {'.'.join(str(p) for p in e.schema_path)}")
            
        return False, errors
    except Exception as e:
        errors.append(f"Unexpected error during schema validation: {str(e)}")
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


def iter_all_nodes(template_data: Dict) -> List[Dict]:
    """Return a flat list of all nodes, including those inside subgraphs.

    Some workflows place loader nodes inside definitions.subgraphs[].nodes.
    The validation must inspect both top-level nodes and subgraph nodes.
    """
    nodes: List[Dict] = []
    # Top-level nodes
    if isinstance(template_data.get('nodes'), list):
        nodes.extend([n for n in template_data['nodes'] if isinstance(n, dict)])

    # Subgraph nodes
    definitions = template_data.get('definitions') or {}
    subgraphs = definitions.get('subgraphs') or []
    for sg in subgraphs:
        if isinstance(sg, dict):
            sg_nodes = sg.get('nodes') or []
            nodes.extend([n for n in sg_nodes if isinstance(n, dict)])

    return nodes


def find_model_loader_nodes(nodes: List[Dict], models: List[Dict]) -> List[Tuple[str, str, str]]:
    """Find nodes that use models from the provided models array in their widget values."""
    model_nodes: List[Tuple[str, str, str]] = []
    model_names = {model.get('name', '') for model in models}

    for node in nodes:
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
    errors: List[str] = []
    
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
                all_nodes = iter_all_nodes(template_data)
                model_nodes = find_model_loader_nodes(all_nodes, models)
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
        # Validate that models in node properties have corresponding widget values
        all_nodes = iter_all_nodes(template_data)

        # Build widget values map for all nodes
        widget_values_by_node: Dict[str, List[str]] = {}
        node_models: List[Tuple[str, str, str]] = []  # (node_id, node_type, model_name)

        for node in all_nodes:
            node_id = str(node.get('id', 'unknown'))
            node_type = node.get('type', 'unknown')
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
                                node_models.append((node_id, node_type, model_name))

        # Validate each model has corresponding widget value
        for node_id, node_type, model_name in node_models:
            node_widget_values = widget_values_by_node.get(node_id, [])
            if model_name not in node_widget_values:
                errors.append(
                    f"ERROR: {template_name}.json - Model '{model_name}' in node {node_id} ({node_type}) properties but not in widget_values"
                )
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
    schema_path = templates_dir / 'index.schema.json'
    
    print("🔍 Validating ComfyUI Workflow Templates...")
    print(f"   Templates directory: {templates_dir}")
    
    # Check schema exists
    if not schema_path.exists():
        print(f"❌ Error: index.schema.json not found at {schema_path}")
        return 1
    
    # Find all index*.json files (excluding schema)
    index_files = []
    for file_path in templates_dir.glob('index*.json'):
        if file_path.name != 'index.schema.json':
            index_files.append(file_path)
    
    if not index_files:
        print(f"❌ Error: No index*.json files found in {templates_dir}")
        return 1
        
    print(f"   Found {len(index_files)} index files: {[f.name for f in index_files]}")
    
    # Use main index.json for file consistency checks (templates are the same across locales)
    main_index_path = templates_dir / 'index.json'
    if not main_index_path.exists():
        print(f"❌ Error: main index.json not found at {main_index_path}")
        return 1
    
    # Load main index.json for consistency checks
    try:
        main_index_data = load_json(main_index_path)
    except Exception as e:
        print(f"❌ Error loading main index.json: {e}")
        return 1
    
    all_errors = []
    all_warnings = []
    
    # Check for GitHub Actions environment
    is_github_actions = os.environ.get('GITHUB_ACTIONS') == 'true'
    
    # Run validations
    print("\n1️⃣  Validating all index files against JSON schema...")
    schema_all_valid = True
    for index_file in index_files:
        print(f"   Validating {index_file.name}...")
        try:
            index_data = load_json(index_file)
            valid, errors = validate_schema(index_data, schema_path, index_file.name)
            if valid:
                print(f"     ✅ {index_file.name} schema validation passed")
                # GitHub Actions annotation for success
                if is_github_actions:
                    print(f"::notice file=templates/{index_file.name}::Schema validation passed")
            else:
                print(f"     ❌ {index_file.name} schema validation failed")
                schema_all_valid = False
                # Enhanced GitHub Actions annotations
                for error in errors:
                    if is_github_actions:
                        print(f"::error file=templates/{index_file.name}::{error}")
                    all_errors.append(f"{index_file.name}: {error}")
        except Exception as e:
            print(f"     ❌ Error loading {index_file.name}: {e}")
            error_msg = f"Failed to load {index_file.name}: {e}"
            if is_github_actions:
                print(f"::error file=templates/{index_file.name}::{error_msg}")
            all_errors.append(error_msg)
            schema_all_valid = False
    
    if schema_all_valid:
        print("   ✅ All index files passed schema validation")
    else:
        print("   ❌ Some index files failed schema validation")
    
    print("\n2️⃣  Checking file consistency...")
    valid, errors, warnings = check_file_consistency(main_index_data, templates_dir)
    if valid and not warnings:
        print("   ✅ File consistency check passed")
    elif valid and warnings:
        print("   ⚠️  File consistency check passed with warnings")
    else:
        print("   ❌ File consistency check failed")
    all_errors.extend(errors)
    all_warnings.extend(warnings)
    
    print("\n3️⃣  Checking for duplicate names...")
    valid, errors = check_duplicate_names(main_index_data)
    if valid:
        print("   ✅ No duplicate names found")
    else:
        print("   ❌ Duplicate names found")
        all_errors.extend(errors)
    
    print("\n4️⃣  Checking required thumbnails...")
    valid, errors = check_required_thumbnails(main_index_data, templates_dir)
    if valid:
        print("   ✅ All templates have thumbnails")
    else:
        print("   ❌ Missing thumbnails")
        all_errors.extend(errors)
    
    print("\n5️⃣  Checking model metadata format...")
    valid, errors = check_model_metadata_format(main_index_data, templates_dir)
    if valid:
        print("   ✅ All templates use correct model metadata format")
    else:
        print("   ❌ Templates using deprecated top-level models format found")
        all_errors.extend(errors)
    
    # Print warnings with enhanced annotations
    if all_warnings:
        print(f"\nWarnings ({len(all_warnings)}):")
        for warning in all_warnings:
            print(f"  ⚠️  {warning}")
            # Enhanced GitHub Actions annotation with better categorization
            if is_github_actions:
                if "not referenced" in warning.lower():
                    print(f"::warning file=templates/index.json,title=Orphaned File::{warning}")
                elif "missing" in warning.lower():
                    print(f"::warning file=templates/index.json,title=Missing File::{warning}")
                else:
                    print(f"::warning file=templates/index.json::{warning}")
    
    # Summary with detailed GitHub Actions annotations
    print("\n" + "="*50)
    if all_errors:
        print(f"❌ Validation failed with {len(all_errors)} error(s):")
        
        # Categorize errors for better reporting
        schema_errors = [e for e in all_errors if "schema" in e.lower()]
        file_errors = [e for e in all_errors if "not found" in e.lower() or "missing" in e.lower()]
        other_errors = [e for e in all_errors if e not in schema_errors and e not in file_errors]
        
        if schema_errors:
            print(f"\n📋 Schema Errors ({len(schema_errors)}):")
            for error in schema_errors:
                print(f"   • {error}")
        
        if file_errors:
            print(f"\n📁 File Errors ({len(file_errors)}):")
            for error in file_errors:
                print(f"   • {error}")
        
        if other_errors:
            print(f"\n🔧 Other Errors ({len(other_errors)}):")
            for error in other_errors:
                print(f"   • {error}")
        
        # GitHub Actions summary annotation
        if is_github_actions:
            error_summary = f"Validation failed: {len(schema_errors)} schema, {len(file_errors)} file, {len(other_errors)} other errors"
            print(f"::error title=Validation Failed::{error_summary}")
        
        return 1
    else:
        success_msg = f"✅ All validations passed!"
        if all_warnings:
            success_msg = f"✅ All validations passed with {len(all_warnings)} warning(s)!"
        
        print(success_msg)
        
        # GitHub Actions success annotation
        if is_github_actions:
            files_validated = len(index_files)
            summary = f"Successfully validated {files_validated} index files"
            if all_warnings:
                summary += f" with {len(all_warnings)} warnings"
            print(f"::notice title=Validation Success::{summary}")
        
        return 0


if __name__ == "__main__":
    sys.exit(main())