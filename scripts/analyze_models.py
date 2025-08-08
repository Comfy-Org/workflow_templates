#!/usr/bin/env python3
"""
Analyze model file names and properties.models structure in ComfyUI workflow templates.
"""

import json
import os
import re
import sys
from typing import Dict, List, Set, Tuple
from collections import defaultdict


def analyze_json_file(file_path: str) -> Dict:
    """Analyze a single JSON file, extract model-related information and markdown safetensors links."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except (json.JSONDecodeError, FileNotFoundError, UnicodeDecodeError) as e:
        return {'error': str(e)}

    result = {
        'file': os.path.basename(file_path),
        'model_loaders': [],
        'safetensors_widgets': [],
        'properties_models': [],
        'markdown_links': [],
        'analysis': {
            'has_properties_models': False,
            'widgets_models_match': [],
            'missing_properties': [],
            'inconsistent_entries': [],
            'markdown_link_errors': []
        }
    }

    # Check for markdown safetensors links in all string fields
    def find_markdown_links(obj):
        if isinstance(obj, dict):
            for v in obj.values():
                find_markdown_links(v)
        elif isinstance(obj, list):
            for v in obj:
                find_markdown_links(v)
        elif isinstance(obj, str):
            # Markdown link: [filename.safetensors](url)
            for match in re.finditer(r'\[([^\]]+?\.safetensors)]\(([^)]+)\)', obj):
                result['markdown_links'].append({
                    'text': match.group(1),
                    'url': match.group(2)
                })
    find_markdown_links(data)

    # Analyze nodes
    nodes = data.get('nodes', [])
    for node in nodes:
        node_type = node.get('type', '')
        node_id = node.get('id', '')
        widgets_values = node.get('widgets_values', [])
        properties = node.get('properties', {})

        # Model loader node
        if any(keyword in node_type.lower() for keyword in ['loader', 'checkpoint']):
            result['model_loaders'].append({
                'id': node_id,
                'type': node_type,
                'widgets_values': widgets_values,
                'properties': properties
            })

        # widgets_values with .safetensors
        safetensors_files = []
        for widget_value in widgets_values:
            if isinstance(widget_value, str) and '.safetensors' in widget_value:
                safetensors_files.append(widget_value)

        if safetensors_files:
            result['safetensors_widgets'].append({
                'id': node_id,
                'type': node_type,
                'safetensors_files': safetensors_files,
                'widgets_values': widgets_values,
                'properties': properties
            })

        # properties.models array
        if 'models' in properties:
            result['properties_models'].append({
                'id': node_id,
                'type': node_type,
                'models': properties['models'],
                'widgets_values': widgets_values
            })
            result['analysis']['has_properties_models'] = True

    # Root-level models array
    if 'models' in data:
        result['root_models'] = data['models']

    # Analyze matching
    analyze_matching(result)
    # Analyze markdown links
    analyze_markdown_links(result)

    return result

def analyze_markdown_links(result: Dict):
    """Check if markdown safetensors links are consistent (text matches filename in URL)."""
    for link in result['markdown_links']:
        text_name = link['text']
        url = link['url']
        # Extract filename from URL path (ignore query string)
        m = re.search(r'/([^/?]+\.safetensors)(?:[?]|$)', url)
        if m:
            url_name = m.group(1)
            if text_name != url_name:
                result['analysis']['markdown_link_errors'].append({
                    'text': text_name,
                    'url': url,
                    'url_name': url_name
                })
        else:
            result['analysis']['markdown_link_errors'].append({
                'text': text_name,
                'url': url,
                'url_name': None
            })

def analyze_matching(result: Dict):
    """Check widgets_values and properties.models matching, skip MarkdownNote/Note nodes for properties.models check."""
    for safetensors_node in result['safetensors_widgets']:
        node_id = safetensors_node['id']
        node_type = safetensors_node['type']
        safetensors_files = safetensors_node['safetensors_files']
        properties = safetensors_node['properties']

        # Skip properties.models check for MarkdownNote/Note nodes
        if node_type.lower() in ['markdownnote', 'note']:
            continue

        properties_models = properties.get('models', [])

        if properties_models:
            widget_model_names = set(safetensors_files)
            property_model_names = set(model.get('name', '') for model in properties_models)

            matched = widget_model_names.intersection(property_model_names)
            missing_in_properties = widget_model_names - property_model_names
            extra_in_properties = property_model_names - widget_model_names

            result['analysis']['widgets_models_match'].append({
                'node_id': node_id,
                'node_type': node_type,
                'matched': list(matched),
                'missing_in_properties': list(missing_in_properties),
                'extra_in_properties': list(extra_in_properties)
            })
        else:
            result['analysis']['missing_properties'].append({
                'node_id': node_id,
                'node_type': node_type,
                'safetensors_files': safetensors_files
            })

def analyze_all_templates(templates_dir: str) -> Tuple[Dict, Dict]:
    """Analyze all template files in the given directory."""
    results = {}
    statistics = {
        'total_files': 0,
        'files_with_safetensors': 0,
        'files_with_properties_models': 0,
        'node_types': defaultdict(int),
        'model_loader_types': defaultdict(int),
        'total_safetensors_files': set(),
        'files_with_errors': [],
        'markdown_link_errors': 0,
        'model_link_errors': 0
    }

    for filename in os.listdir(templates_dir):
        if filename.endswith('.json') and not filename.startswith('index.'):
            file_path = os.path.join(templates_dir, filename)
            statistics['total_files'] += 1

            result = analyze_json_file(file_path)
            results[filename] = result

            if 'error' in result:
                statistics['files_with_errors'].append(filename)
                continue

            if result['safetensors_widgets']:
                statistics['files_with_safetensors'] += 1

            if result['analysis']['has_properties_models']:
                statistics['files_with_properties_models'] += 1

            for node in result['safetensors_widgets']:
                statistics['node_types'][node['type']] += 1
                for sf in node['safetensors_files']:
                    statistics['total_safetensors_files'].add(sf)

            for loader in result['model_loaders']:
                statistics['model_loader_types'][loader['type']] += 1

            if result['analysis']['markdown_link_errors']:
                statistics['markdown_link_errors'] += len(result['analysis']['markdown_link_errors'])
            for match in result['analysis']['widgets_models_match']:
                if match['missing_in_properties'] or match['extra_in_properties']:
                    statistics['model_link_errors'] += 1
            statistics['model_link_errors'] += len(result['analysis']['missing_properties'])

    statistics['total_safetensors_files'] = list(statistics['total_safetensors_files'])

    return results, statistics

def generate_report(results: Dict, statistics: Dict) -> str:
    """Generate an analysis report in English."""
    report = []
    report.append("# ComfyUI Template Model Analysis Report\n")
    report.append("## Summary")
    report.append(f"- Total files analyzed: {statistics['total_files']}")
    report.append(f"- Files with .safetensors: {statistics['files_with_safetensors']}")
    report.append(f"- Files with properties.models: {statistics['files_with_properties_models']}")
    report.append(f"- Unique .safetensors files found: {len(statistics['total_safetensors_files'])}")
    if statistics['files_with_errors']:
        report.append(f"- Files with parse errors: {len(statistics['files_with_errors'])}")
    report.append(f"- Markdown safetensors link errors: {statistics['markdown_link_errors']}")
    report.append(f"- Model link errors: {statistics['model_link_errors']}")

    report.append("\n## Model Loader Node Types")
    for node_type, count in sorted(statistics['model_loader_types'].items(), key=lambda x: x[1], reverse=True):
        report.append(f"- {node_type}: {count}")

    report.append("\n## Node Types with .safetensors")
    for node_type, count in sorted(statistics['node_types'].items(), key=lambda x: x[1], reverse=True):
        report.append(f"- {node_type}: {count}")

    report.append("\n## Details")
    for filename, result in results.items():
        if 'error' in result:
            report.append(f"\n### {filename} - ERROR: {result['error']}")
            continue
        # Markdown link errors
        if result['analysis']['markdown_link_errors']:
            report.append(f"\n### {filename} - Markdown safetensors link errors:")
            for err in result['analysis']['markdown_link_errors']:
                report.append(f"  - Text: {err['text']} | URL: {err['url']} | URL filename: {err['url_name']}")
        # Model link errors
        for match in result['analysis']['widgets_models_match']:
            if match['missing_in_properties'] or match['extra_in_properties']:
                report.append(f"\n### {filename} - Node {match['node_id']} ({match['node_type']}) model link mismatch:")
                if match['missing_in_properties']:
                    report.append(f"  - In widgets_values but missing in properties.models: {match['missing_in_properties']}")
                if match['extra_in_properties']:
                    report.append(f"  - In properties.models but missing in widgets_values: {match['extra_in_properties']}")
        for miss in result['analysis']['missing_properties']:
            report.append(f"\n### {filename} - Node {miss['node_id']} ({miss['node_type']}) missing properties.models for: {miss['safetensors_files']}")
    return '\n'.join(report)

def main():
    templates_dir = './templates'
    report_path = './model_analysis_report.md'

    results, statistics = analyze_all_templates(templates_dir)
    report = generate_report(results, statistics)

    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report)

    print(report)

    # If any error found, exit 1 for CI
    if statistics['files_with_errors'] or statistics['markdown_link_errors'] or statistics['model_link_errors']:
        print("\n[FAIL] Some checks failed. See report above.")
        sys.exit(1)
    else:
        print("\n[SUCCESS] All checks passed.")
        sys.exit(0)

if __name__ == "__main__":
    main()
