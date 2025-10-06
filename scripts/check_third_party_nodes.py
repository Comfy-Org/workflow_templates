#!/usr/bin/env python3
"""
Check if ComfyUI workflow templates use third-party nodes.

For official templates, we want users to be able to open and use them directly
without needing to install any third-party custom nodes or extensions. 
Only nodes with "cnr_id": "comfy-core" are allowed to ensure templates work
out-of-the-box with a standard ComfyUI installation.

This script supports a whitelist configuration to ignore specific custom nodes.
"""

import json
import os
import sys
from typing import Dict, List, Set

def load_whitelist_config(whitelist_path: str = None) -> Dict:
    """Load whitelist configuration from JSON file"""
    if whitelist_path is None:
        # Default whitelist path relative to script location
        script_dir = os.path.dirname(os.path.abspath(__file__))
        whitelist_path = os.path.join(script_dir, 'whitelist.json')
    
    if not os.path.exists(whitelist_path):
        print(f"Warning: Whitelist file not found at {whitelist_path}, using default whitelist")
        return {
            "whitelist": {
                "cnr_ids": ["comfy-core"],
                "node_types": [],
                "custom_nodes": []
            }
        }
    
    try:
        with open(whitelist_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError, UnicodeDecodeError) as e:
        print(f"Error loading whitelist config: {e}")
        return {
            "whitelist": {
                "cnr_ids": ["comfy-core"],
                "node_types": [],
                "custom_nodes": []
            }
        }

def is_node_whitelisted(node: Dict, whitelist_config: Dict) -> bool:
    """Check if a node is whitelisted"""
    whitelist = whitelist_config.get('whitelist', {})
    
    node_type = node.get('type', '')
    properties = node.get('properties', {})
    cnr_id = properties.get('cnr_id', '')
    
    # Check cnr_id whitelist
    if cnr_id in whitelist.get('cnr_ids', []):
        return True
    
    # Check node_type whitelist
    if node_type in whitelist.get('node_types', []):
        return True
    
    # Check custom_nodes whitelist
    for custom_node in whitelist.get('custom_nodes', []):
        if custom_node.get('cnr_id') == cnr_id:
            return True
    
    return False

def check_template_for_third_party_nodes(file_path: str, whitelist_config: Dict = None) -> Dict:
    """Check a single template file for third-party nodes"""
    if whitelist_config is None:
        whitelist_config = load_whitelist_config()
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except (json.JSONDecodeError, FileNotFoundError, UnicodeDecodeError) as e:
        return {'error': str(e)}

    result = {
        'file': os.path.basename(file_path),
        'third_party_nodes': [],
        'whitelisted_nodes': [],
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

        # Check if node is whitelisted
        if is_node_whitelisted(node, whitelist_config):
            result['whitelisted_nodes'].append({
                'node_id': node_id,
                'node_type': node_type,
                'cnr_id': cnr_id
            })
            continue

        # If cnr_id exists and is not whitelisted, mark as third-party node
        if cnr_id and cnr_id != 'comfy-core':
            result['third_party_nodes'].append({
                'node_id': node_id,
                'node_type': node_type,
                'cnr_id': cnr_id
            })
            result['has_third_party_nodes'] = True

    return result

def check_all_templates(templates_dir: str, whitelist_config: Dict = None) -> Dict:
    """Check all template files"""
    if whitelist_config is None:
        whitelist_config = load_whitelist_config()
    
    results = {}
    statistics = {
        'total_files': 0,
        'files_with_third_party_nodes': 0,
        'files_with_errors': [],
        'third_party_cnr_ids': set(),
        'whitelisted_cnr_ids': set(),
        'total_third_party_nodes': 0,
        'total_whitelisted_nodes': 0
    }

    for filename in os.listdir(templates_dir):
        if filename.endswith('.json') and not filename.startswith('index.'):
            file_path = os.path.join(templates_dir, filename)
            statistics['total_files'] += 1

            result = check_template_for_third_party_nodes(file_path, whitelist_config)
            results[filename] = result

            if 'error' in result:
                statistics['files_with_errors'].append(filename)
                continue

            # Count whitelisted nodes
            statistics['total_whitelisted_nodes'] += len(result['whitelisted_nodes'])
            for node in result['whitelisted_nodes']:
                if node['cnr_id']:
                    statistics['whitelisted_cnr_ids'].add(node['cnr_id'])

            # Count third-party nodes
            if result['has_third_party_nodes']:
                statistics['files_with_third_party_nodes'] += 1
                statistics['total_third_party_nodes'] += len(result['third_party_nodes'])
                
                for node in result['third_party_nodes']:
                    statistics['third_party_cnr_ids'].add(node['cnr_id'])

    statistics['third_party_cnr_ids'] = list(statistics['third_party_cnr_ids'])
    statistics['whitelisted_cnr_ids'] = list(statistics['whitelisted_cnr_ids'])
    
    return results, statistics

def generate_report(results: Dict, statistics: Dict, whitelist_config: Dict = None) -> str:
    """Generate check report"""
    report = []
    report.append("# ComfyUI Template Third-Party Node Check Report\n")
    
    # Show whitelist information
    if whitelist_config:
        whitelist = whitelist_config.get('whitelist', {})
        report.append("## Whitelist Configuration")
        if whitelist.get('cnr_ids'):
            report.append(f"- Allowed cnr_ids: {', '.join(whitelist['cnr_ids'])}")
        if whitelist.get('node_types'):
            report.append(f"- Allowed node_types: {', '.join(whitelist['node_types'])}")
        if whitelist.get('custom_nodes'):
            report.append(f"- Custom whitelisted nodes: {len(whitelist['custom_nodes'])}")
        report.append("")
    
    report.append("## Summary")
    report.append(f"- Total files checked: {statistics['total_files']}")
    report.append(f"- Files with third-party nodes: {statistics['files_with_third_party_nodes']}")
    report.append(f"- Total third-party nodes: {statistics['total_third_party_nodes']}")
    report.append(f"- Total whitelisted nodes: {statistics['total_whitelisted_nodes']}")
    
    if statistics['files_with_errors']:
        report.append(f"- Files with parse errors: {len(statistics['files_with_errors'])}")

    if statistics['whitelisted_cnr_ids']:
        report.append(f"- Whitelisted cnr_ids found: {', '.join(statistics['whitelisted_cnr_ids'])}")

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
                report.append(f"- Whitelisted nodes: {len(result['whitelisted_nodes'])}")
                report.append("- Third-party node details:")
                for node in result['third_party_nodes']:
                    report.append(f"  - Node ID: {node['node_id']}, Type: {node['node_type']}, cnr_id: {node['cnr_id']}")
    else:
        report.append("\n## ✅ All templates use official or whitelisted nodes")

    return '\n'.join(report)

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Check ComfyUI workflow templates for third-party nodes')
    parser.add_argument('--templates-dir', default='./templates', 
                       help='Directory containing template files (default: ./templates)')
    parser.add_argument('--whitelist', 
                       help='Path to whitelist configuration file (default: ./scripts/whitelist.json)')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Show detailed information about whitelisted nodes')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.templates_dir):
        print(f"Error: Template directory {args.templates_dir} not found")
        sys.exit(1)

    # Load whitelist configuration
    whitelist_config = load_whitelist_config(args.whitelist)
    
    results, statistics = check_all_templates(args.templates_dir, whitelist_config)
    report = generate_report(results, statistics, whitelist_config)

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