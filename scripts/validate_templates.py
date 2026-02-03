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
    special_files = {
        'index.json', 'index.zh.json', 'index.zh-TW.json', 'index.ja.json',
        'index.ko.json', 'index.es.json', 'index.fr.json', 'index.ru.json',
        'index.tr.json', 'index.ar.json', 'index.pt-BR.json',  # Additional language files
        'index.schema.json', 'index_logo.json', 'fuse_options.json',  # Auxiliary files
        '.gitignore', 'README.md'
    }
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


def check_logo_references(index_data: List[Dict], templates_dir: Path) -> Tuple[bool, List[str]]:
    """Check that all logo provider references in templates exist in index_logo.json."""
    errors = []
    
    # Load logo index
    logo_index_path = templates_dir / 'index_logo.json'
    if not logo_index_path.exists():
        return True, []  # No logo index, skip validation
    
    try:
        logo_index = load_json(logo_index_path)
    except Exception as e:
        errors.append(f"Failed to load index_logo.json: {e}")
        return False, errors
    
    # index_logo.json should be a dict mapping provider names to logo paths
    if not isinstance(logo_index, dict):
        errors.append("index_logo.json should be a key-value object mapping provider names to logo paths")
        return False, errors
    
    # Check that all logo files referenced in index_logo.json exist
    for provider, logo_path in logo_index.items():
        full_path = templates_dir / logo_path
        if not full_path.exists():
            errors.append(f"Logo file not found for provider '{provider}': {logo_path}")
    
    # Check that all provider references in templates exist in logo index
    for category in index_data:
        for template in category.get('templates', []):
            logos = template.get('logos', [])
            template_name = template.get('name', 'unknown')
            
            for logo_info in logos:
                provider = logo_info.get('provider')
                if provider is None:
                    continue
                
                # Provider can be a string or array of strings
                providers = provider if isinstance(provider, list) else [provider]
                
                for p in providers:
                    if p not in logo_index:
                        errors.append(
                            f"Template '{template_name}' references unknown logo provider '{p}' "
                            f"(not found in index_logo.json)"
                        )
    
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
        # Process each scope (top-level and subgraphs) separately to avoid node ID conflicts
        def validate_nodes_scope(nodes: List[Dict], scope_name: str = ""):
            """Validate nodes within a single scope (top-level or a specific subgraph)."""
            widget_values_by_node: Dict[str, List[str]] = {}
            node_models: List[Tuple[str, str, str]] = []  # (node_id, node_type, model_name)

            for node in nodes:
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
                    scope_info = f" in {scope_name}" if scope_name else ""
                    errors.append(
                        f"ERROR: {template_name}.json{scope_info} - Model '{model_name}' in node {node_id} ({node_type}) properties but not in widget_values"
                    )
                    errors.append(f"  → Widget values: {node_widget_values}")

        # Validate top-level nodes
        if isinstance(template_data.get('nodes'), list):
            validate_nodes_scope(template_data['nodes'], "top-level")

        # Validate each subgraph separately
        definitions = template_data.get('definitions') or {}
        subgraphs = definitions.get('subgraphs') or []
        for idx, sg in enumerate(subgraphs):
            if isinstance(sg, dict):
                sg_id = sg.get('id', f'subgraph-{idx}')
                sg_nodes = sg.get('nodes') or []
                if sg_nodes:
                    validate_nodes_scope(sg_nodes, f"subgraph {sg_id}")
    
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
    
    # Find all index*.json files (excluding schema and logo index)
    index_files = []
    for file_path in templates_dir.glob('index*.json'):
        if file_path.name not in ('index.schema.json', 'index_logo.json'):
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
    
    # Run validations
    print("\n1️⃣  Validating all index files against JSON schema...")
    schema_all_valid = True
    for index_file in index_files:
        print(f"   Validating {index_file.name}...")
        try:
            index_data = load_json(index_file)
            valid, errors = validate_schema(index_data, schema_path)
            if valid:
                print(f"     ✅ {index_file.name} schema validation passed")
            else:
                print(f"     ❌ {index_file.name} schema validation failed")
                schema_all_valid = False
                # Prefix errors with filename for clarity
                prefixed_errors = [f"{index_file.name}: {error}" for error in errors]
                all_errors.extend(prefixed_errors)
        except Exception as e:
            print(f"     ❌ Error loading {index_file.name}: {e}")
            all_errors.append(f"{index_file.name}: Failed to load - {e}")
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
    
    print("\n6️⃣  Checking logo references...")
    valid, errors = check_logo_references(main_index_data, templates_dir)
    if valid:
        print("   ✅ All logo provider references are valid")
    else:
        print("   ❌ Invalid logo references found")
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