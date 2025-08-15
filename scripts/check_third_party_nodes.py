#!/usr/bin/env python3
"""
Check if ComfyUI workflow templates use third-party nodes.

For official templates, we want users to be able to open and use them directly
without needing to install any third-party custom nodes or extensions. 
Only nodes with "cnr_id": "comfy-core" are allowed to ensure templates work
out-of-the-box with a standard ComfyUI installation.
"""

import json
import os
import sys
from typing import Dict

def check_template_for_third_party_nodes(file_path: str) -> Dict:
    """Check a single template file for third-party nodes"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except (json.JSONDecodeError, FileNotFoundError, UnicodeDecodeError) as e:
        return {'error': str(e)}

    result = {
        'file': os.path.basename(file_path),
        'third_party_nodes': [],
        'total_nodes': 0,
        'has_third_party_nodes': False
    }

    nodes = data.get('nodes', [])
    result['total_nodes'] = len(nodes)

    for node in nodes:
        node_id = node.get('id', '')
        node_type = node.get('type', '')
        properties = node.get('properties', {})
        cnr_id = properties.get('cnr_id', '')

        # If cnr_id exists and is not "comfy-core", mark as third-party node
        if cnr_id and cnr_id != 'comfy-core':
            result['third_party_nodes'].append({
                'node_id': node_id,
                'node_type': node_type,
                'cnr_id': cnr_id
            })
            result['has_third_party_nodes'] = True

    return result

def check_all_templates(templates_dir: str) -> Dict:
    """Check all template files"""
    results = {}
    statistics = {
        'total_files': 0,
        'files_with_third_party_nodes': 0,
        'files_with_errors': [],
        'third_party_cnr_ids': set(),
        'total_third_party_nodes': 0
    }

    for filename in os.listdir(templates_dir):
        if filename.endswith('.json') and not filename.startswith('index.'):
            file_path = os.path.join(templates_dir, filename)
            statistics['total_files'] += 1

            result = check_template_for_third_party_nodes(file_path)
            results[filename] = result

            if 'error' in result:
                statistics['files_with_errors'].append(filename)
                continue

            if result['has_third_party_nodes']:
                statistics['files_with_third_party_nodes'] += 1
                statistics['total_third_party_nodes'] += len(result['third_party_nodes'])
                
                for node in result['third_party_nodes']:
                    statistics['third_party_cnr_ids'].add(node['cnr_id'])

    statistics['third_party_cnr_ids'] = list(statistics['third_party_cnr_ids'])
    
    return results, statistics

def generate_report(results: Dict, statistics: Dict) -> str:
    """Generate check report"""
    report = []
    report.append("# ComfyUI Template Third-Party Node Check Report\n")
    report.append("## Summary")
    report.append(f"- Total files checked: {statistics['total_files']}")
    report.append(f"- Files with third-party nodes: {statistics['files_with_third_party_nodes']}")
    report.append(f"- Total third-party nodes: {statistics['total_third_party_nodes']}")
    
    if statistics['files_with_errors']:
        report.append(f"- Files with parse errors: {len(statistics['files_with_errors'])}")

    if statistics['third_party_cnr_ids']:
        report.append(f"- Found third-party cnr_ids: {', '.join(statistics['third_party_cnr_ids'])}")

    if statistics['files_with_third_party_nodes'] > 0:
        report.append("\n## ❌ Third-Party Nodes Found")
        for filename, result in results.items():
            if 'error' in result:
                report.append(f"\n### {filename} - Error: {result['error']}")
                continue
                
            if result['has_third_party_nodes']:
                report.append(f"\n### {filename}")
                report.append(f"- Total nodes: {result['total_nodes']}")
                report.append(f"- Third-party nodes: {len(result['third_party_nodes'])}")
                report.append("- Third-party node details:")
                for node in result['third_party_nodes']:
                    report.append(f"  - Node ID: {node['node_id']}, Type: {node['node_type']}, cnr_id: {node['cnr_id']}")
    else:
        report.append("\n## ✅ All templates use official nodes")

    return '\n'.join(report)

def main():
    templates_dir = './templates'
    
    if not os.path.exists(templates_dir):
        print(f"Error: Template directory {templates_dir} not found")
        sys.exit(1)

    results, statistics = check_all_templates(templates_dir)
    report = generate_report(results, statistics)

    print(report)

    # Return error code if any third-party nodes or errors found
    if (statistics['files_with_third_party_nodes'] > 0 or 
        len(statistics['files_with_errors']) > 0):
        print("\n❌ Third-party nodes found or parse errors")
        return 1
    else:
        print("\n✅ All checks passed")
        return 0

if __name__ == "__main__":
    sys.exit(main())