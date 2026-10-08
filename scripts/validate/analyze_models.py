#!/usr/bin/env python3
"""
Analyze model file names and properties.models structure in ComfyUI workflow templates.
"""

import json
import os
import re
import sys
from collections import defaultdict
from typing import Dict, List, Set, Tuple

_lib_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib")
if _lib_dir not in sys.path:
    sys.path.insert(0, _lib_dir)

from paths import WHITELIST_FILE  # noqa: E402


def load_whitelist_config(whitelist_path: str = None) -> Dict:
    """Load whitelist configuration for model link checks.

    Structure example:
    {
      "whitelist": {
        "model_check_ignore_node_types": ["MarkdownNote", "Note"]
      }
    }
    """
    if whitelist_path is None:
        whitelist_path = str(WHITELIST_FILE)

    if not os.path.exists(whitelist_path):
        # Fallback to empty whitelist if file missing
        return {"whitelist": {"model_check_ignore_node_types": []}}

    try:
        with open(whitelist_path, 'r', encoding='utf-8') as f:
            cfg = json.load(f)
            wl = cfg.get('whitelist', {})
            if 'model_check_ignore_node_types' not in wl:
                wl['model_check_ignore_node_types'] = []
            cfg['whitelist'] = wl
            return cfg
    except (json.JSONDecodeError, FileNotFoundError, UnicodeDecodeError):
        return {"whitelist": {"model_check_ignore_node_types": []}}

def is_node_ignored_for_model_check(node_type: str, whitelist_config: Dict) -> bool:
    """Return True if the node type should skip model link validation."""
    wl = (whitelist_config or {}).get('whitelist', {})
    ignore_types = set(wl.get('model_check_ignore_node_types', []))
    # Case-insensitive match for convenience
    return node_type in ignore_types or node_type.lower() in {t.lower() for t in ignore_types}


def is_subgraph_node(node_type: str) -> bool:
    """Check if a node type indicates a subgraph node (UUID/GUID format)."""
    # Subgraph nodes have type as UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    return bool(re.match(uuid_pattern, node_type, re.IGNORECASE))


# Socket types that are graph connections, not widget values on a subgraph instance.
_NON_WIDGET_SLOT_TYPES = frozenset({
    'IMAGE', 'IMAGE_PATH', 'MASK', 'LATENT', 'MODEL', 'CLIP', 'VAE',
    'CONDITIONING', 'AUDIO', 'VIDEO', 'NOISE', 'GUIDER', 'SAMPLER', 'SIGMAS',
    'CONTROL_NET', 'UPSCALE_MODEL', 'STYLE_MODEL', 'CLIP_VISION',
    'CLIP_VISION_OUTPUT', 'GLIGEN', 'PHOTOMAKER', 'MESH', 'VOXEL', 'HOOKS',
    'TIMESTEPS_RANGE',
})


def collect_subgraph_defs(obj, out=None) -> Dict:
    """Index subgraph definitions by id, including nested definitions."""
    if out is None:
        out = {}
    if not isinstance(obj, dict):
        return out

    definitions = obj.get('definitions') or {}
    subgraphs = definitions.get('subgraphs') or []
    if isinstance(subgraphs, list):
        for sg in subgraphs:
            if isinstance(sg, dict) and sg.get('id'):
                out[str(sg['id'])] = sg
                collect_subgraph_defs(sg, out)

    for node in obj.get('nodes') or []:
        if isinstance(node, dict):
            collect_subgraph_defs(node, out)
    return out


def iter_scoped_nodes(data: Dict):
    """Yield (scope, node) for top-level nodes and nodes inside subgraph defs."""
    for node in data.get('nodes') or []:
        if isinstance(node, dict):
            yield 'top-level', node
    for sg_id, sg in collect_subgraph_defs(data).items():
        for node in sg.get('nodes') or []:
            if isinstance(node, dict):
                yield f'subgraph {sg_id}', node


def safetensors_from_widgets(widgets_values) -> List[str]:
    files = []
    if isinstance(widgets_values, dict):
        values = widgets_values.values()
    elif isinstance(widgets_values, list):
        values = widgets_values
    else:
        return files
    for value in values:
        if isinstance(value, str) and '.safetensors' in value and value.strip():
            files.append(value)
    return files


def model_entries(properties) -> List[Dict]:
    if not isinstance(properties, dict):
        return []
    models = properties.get('models') or []
    if not isinstance(models, list):
        return []
    return [m for m in models if isinstance(m, dict) and m.get('name')]


def model_names_with_url(models: List[Dict]) -> Set[str]:
    return {
        m['name'] for m in models
        if m.get('name') and isinstance(m.get('url'), str) and m.get('url').strip()
    }


def widget_slot_inputs(subgraph: Dict) -> List[Dict]:
    slots = []
    for inp in subgraph.get('inputs') or []:
        if not isinstance(inp, dict):
            continue
        slot_type = str(inp.get('type') or '')
        if slot_type in _NON_WIDGET_SLOT_TYPES:
            continue
        slots.append(inp)
    return slots


def instance_widget_pairs(instance: Dict, subgraph: Dict) -> List[Tuple[Dict, object]]:
    """Pair subgraph widget inputs with the instance widgets_values."""
    widgets = instance.get('widgets_values', [])
    slots = widget_slot_inputs(subgraph)
    if isinstance(widgets, dict):
        pairs = []
        used = set()
        for slot in slots:
            name = slot.get('name')
            if name in widgets:
                pairs.append((slot, widgets[name]))
                used.add(name)
        for name, value in widgets.items():
            if name not in used:
                pairs.append((None, value))
        return pairs
    if isinstance(widgets, list) and len(widgets) == len(slots):
        return list(zip(slots, widgets))
    if isinstance(widgets, list):
        return [(None, value) for value in widgets]
    return []


def find_inner_node_for_input(subgraph: Dict, input_def: Dict):
    if not input_def:
        return None
    link_ids = input_def.get('linkIds') or []
    link_set = set(link_ids)
    if not link_set:
        return None
    for node in subgraph.get('nodes') or []:
        if not isinstance(node, dict):
            continue
        for inp in node.get('inputs') or []:
            if isinstance(inp, dict) and inp.get('link') in link_set:
                return node
    return None


def collect_definition_model_entries(sg_id: str, defs: Dict, seen=None) -> List[Dict]:
    if seen is None:
        seen = set()
    if sg_id in seen:
        return []
    seen.add(sg_id)
    sg = defs.get(sg_id)
    if not sg:
        return []
    entries = []
    for node in sg.get('nodes') or []:
        if not isinstance(node, dict):
            continue
        entries.extend(model_entries(node.get('properties') or {}))
        node_type = node.get('type') or ''
        if is_subgraph_node(node_type):
            entries.extend(collect_definition_model_entries(str(node_type), defs, seen))
    return entries


def analyze_json_file(file_path: str, whitelist_config: Dict = None) -> Dict:
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
            'markdown_link_errors': [],
            'subgraph_missing_urls': [],
            'subgraph_stale_definition': [],
        }
    }

    # Check for markdown safetensors links in all string fields
    def extract_url_with_balanced_parens(text: str, start_pos: int) -> Tuple[str, int]:
        """Extract URL handling balanced parentheses."""
        depth = 1
        pos = start_pos
        while pos < len(text) and depth > 0:
            char = text[pos]
            if char == '(':
                depth += 1
            elif char == ')':
                depth -= 1
                if depth == 0:
                    break
            elif char in ' \t\n\r':
                break
            pos += 1
        return text[start_pos:pos], pos

    def find_markdown_links(obj):
        if isinstance(obj, dict):
            for v in obj.values():
                find_markdown_links(v)
        elif isinstance(obj, list):
            for v in obj:
                find_markdown_links(v)
        elif isinstance(obj, str):
            # Markdown link: [filename.safetensors](url) with balanced parentheses
            pattern = r'\[([^\]]+?\.safetensors)\]\('
            for match in re.finditer(pattern, obj):
                text_name = match.group(1)
                start_pos = match.end()
                url, _ = extract_url_with_balanced_parens(obj, start_pos)
                result['markdown_links'].append({
                    'text': text_name,
                    'url': url
                })
    find_markdown_links(data)

    if not isinstance(data, dict):
        return result

    # Analyze nodes (top-level and inside subgraph definitions)
    for scope, node in iter_scoped_nodes(data):
        node_type = node.get('type', '')
        node_id = node.get('id', '')
        widgets_values = node.get('widgets_values', [])
        properties = node.get('properties', {})

        # Model loader node (but not subgraph instances)
        if any(keyword in node_type.lower() for keyword in ['loader', 'checkpoint']) and not is_subgraph_node(node_type):
            result['model_loaders'].append({
                'id': node_id,
                'type': node_type,
                'scope': scope,
                'widgets_values': widgets_values,
                'properties': properties
            })

        safetensors_files = safetensors_from_widgets(widgets_values)

        if safetensors_files:
            result['safetensors_widgets'].append({
                'id': node_id,
                'type': node_type,
                'scope': scope,
                'safetensors_files': safetensors_files,
                'widgets_values': widgets_values,
                'properties': properties
            })

        if isinstance(properties, dict) and 'models' in properties:
            result['properties_models'].append({
                'id': node_id,
                'type': node_type,
                'scope': scope,
                'models': properties['models'],
                'widgets_values': widgets_values
            })
            result['analysis']['has_properties_models'] = True

    # Root-level models array
    if 'models' in data:
        result['root_models'] = data['models']

    analyze_matching(result, whitelist_config)
    analyze_subgraph_instances(data, result, whitelist_config)
    analyze_markdown_links(result)

    return result

def analyze_markdown_links(result: Dict):
    """Check if markdown safetensors links are consistent (text matches filename in URL).

    Whitelisted URLs (skipped from validation):
    - Civitai URLs: Use model IDs instead of filenames in paths

    Special handling:
    - HuggingFace URLs: Accept both /resolve/ and /blob/ paths as valid
    """
    # Whitelist patterns for URLs that don't need filename validation
    whitelist_patterns = [
        r'civitai\.com',  # Civitai uses model IDs, not filenames
    ]

    for link in result['markdown_links']:
        text_name = link['text']
        url = link['url']

        # Skip validation for whitelisted URLs
        if any(re.search(pattern, url, re.IGNORECASE) for pattern in whitelist_patterns):
            continue

        # Special handling for HuggingFace URLs - accept both /resolve/ and /blob/ paths
        if re.search(r'huggingface\.co', url, re.IGNORECASE):
            # Match HuggingFace patterns: /resolve/branch/[...paths.../]filename.safetensors or /blob/branch/[...paths.../]filename.safetensors
            # Extract the final filename from any depth of subdirectories (or no subdirectories)
            m = re.search(r'/(?:resolve|blob)/[^/]+/(?:.+/)?([^/?]+\.safetensors)(?:[?]|$)', url)
            if m:
                url_name = m.group(1)
                # Check if text_name is also a URL (text contains full URL instead of just filename)
                text_is_url = text_name.startswith('http://') or text_name.startswith('https://')
                if text_is_url:
                    # Extract filename from text URL as well
                    text_match = re.search(r'/(?:resolve|blob)/[^/]+/(?:.+/)?([^/?]+\.safetensors)(?:[?]|$)', text_name)
                    if text_match:
                        text_filename = text_match.group(1)
                        if text_filename != url_name:
                            result['analysis']['markdown_link_errors'].append({
                                'text': text_name,
                                'url': url,
                                'url_name': url_name
                            })
                    # If text is a URL but we can't extract filename, report error
                    elif text_name != url:
                        result['analysis']['markdown_link_errors'].append({
                            'text': text_name,
                            'url': url,
                            'url_name': url_name
                        })
                elif text_name != url_name:
                    result['analysis']['markdown_link_errors'].append({
                        'text': text_name,
                        'url': url,
                        'url_name': url_name
                    })
            else:
                # Check if this is just a repository link without a file path
                # Repository links like https://huggingface.co/org/model-name should be skipped
                if not re.search(r'/(?:resolve|blob)/', url):
                    # Skip validation for repository-only links
                    continue
                result['analysis']['markdown_link_errors'].append({
                    'text': text_name,
                    'url': url,
                    'url_name': None
                })
        else:
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

def analyze_matching(result: Dict, whitelist_config: Dict = None):
    """Check widgets_values vs properties.models on the same node.

    Subgraph instances (UUID type) are handled by analyze_subgraph_instances.
    """
    for safetensors_node in result['safetensors_widgets']:
        node_id = safetensors_node['id']
        node_type = safetensors_node['type']
        safetensors_files = safetensors_node['safetensors_files']
        properties = safetensors_node['properties']
        scope = safetensors_node.get('scope', '')

        if node_type.lower() in ['markdownnote', 'note']:
            continue
        if is_node_ignored_for_model_check(node_type, whitelist_config or {}):
            continue
        if is_subgraph_node(node_type):
            continue

        properties_models = properties.get('models', []) if isinstance(properties, dict) else []
        in_subgraph_def = isinstance(scope, str) and scope.startswith('subgraph ')

        if properties_models:
            widget_model_names = set(safetensors_files)
            property_model_names = set(model.get('name', '') for model in properties_models)

            matched = widget_model_names.intersection(property_model_names)
            missing_in_properties = widget_model_names - property_model_names
            extra_in_properties = property_model_names - widget_model_names

            result['analysis']['widgets_models_match'].append({
                'node_id': node_id,
                'node_type': node_type,
                'scope': scope,
                'matched': list(matched),
                'missing_in_properties': list(missing_in_properties),
                'extra_in_properties': list(extra_in_properties)
            })
        elif not in_subgraph_def:
            # Inner loaders without metadata are covered by subgraph instance checks.
            result['analysis']['missing_properties'].append({
                'node_id': node_id,
                'node_type': node_type,
                'scope': scope,
                'safetensors_files': safetensors_files
            })


def analyze_subgraph_instances(data: Dict, result: Dict, whitelist_config: Dict = None):
    """Require subgraph instance models to have download URLs that match the definition.

    1. Every .safetensors on a subgraph instance must appear in properties.models
       (on the instance or inside that subgraph definition) with a URL.
    2. The inner loader that the exposed widget feeds must document that same
       model, unless the instance itself carries the download entry (multi-instance).
    """
    defs = collect_subgraph_defs(data)
    if not defs:
        return

    for scope, instance in iter_scoped_nodes(data):
        node_type = instance.get('type') or ''
        if not is_subgraph_node(node_type):
            continue
        if is_node_ignored_for_model_check(node_type, whitelist_config or {}):
            continue

        instance_id = instance.get('id', 'unknown')
        instance_models = safetensors_from_widgets(instance.get('widgets_values'))
        if not instance_models:
            continue

        instance_entries = model_entries(instance.get('properties') or {})
        instance_named = model_names_with_url(instance_entries)
        definition_entries = collect_definition_model_entries(str(node_type), defs)
        catalog = instance_named | model_names_with_url(definition_entries)
        subgraph = defs.get(str(node_type))

        ignored_instance_models = set()
        if subgraph:
            for slot, value in instance_widget_pairs(instance, subgraph):
                if not isinstance(value, str) or '.safetensors' not in value or not value.strip():
                    continue
                inner = find_inner_node_for_input(subgraph, slot)
                if inner is None:
                    continue
                inner_type = inner.get('type') or ''
                if is_node_ignored_for_model_check(inner_type, whitelist_config or {}):
                    ignored_instance_models.add(value)
                    continue
                inner_names = {m.get('name') for m in model_entries(inner.get('properties') or {})}
                if value in inner_names or value in instance_named:
                    continue
                result['analysis']['subgraph_stale_definition'].append({
                    'node_id': instance_id,
                    'node_type': node_type,
                    'scope': scope,
                    'inner_node_id': inner.get('id', 'unknown'),
                    'inner_node_type': inner_type,
                    'instance_model': value,
                    'definition_models': sorted(n for n in inner_names if n),
                })

        missing = [
            name for name in instance_models
            if name not in catalog and name not in ignored_instance_models
        ]
        if missing:
            result['analysis']['subgraph_missing_urls'].append({
                'node_id': instance_id,
                'node_type': node_type,
                'scope': scope,
                'models': missing,
            })

def analyze_all_templates(templates_dir: str, whitelist_config: Dict = None) -> Tuple[Dict, Dict]:
    """Analyze all template files in the given directory."""
    results = {}
    statistics = {
        'total_files': 0,
        'files_with_safetensors': 0,
        'files_with_properties_models': 0,
        'node_types': defaultdict(int),
        'model_loader_types': defaultdict(int),
        'subgraph_node_types': defaultdict(int),
        'total_safetensors_files': set(),
        'files_with_errors': [],
        'markdown_link_errors': 0,
        'model_link_errors': 0
    }

    for filename in os.listdir(templates_dir):
        if filename.endswith('.json') and not filename.startswith('index.'):
            file_path = os.path.join(templates_dir, filename)
            statistics['total_files'] += 1

            result = analyze_json_file(file_path, whitelist_config)
            results[filename] = result

            if 'error' in result:
                statistics['files_with_errors'].append(filename)
                continue

            if result['safetensors_widgets']:
                statistics['files_with_safetensors'] += 1

            if result['analysis']['has_properties_models']:
                statistics['files_with_properties_models'] += 1

            for node in result['safetensors_widgets']:
                node_type = node['type']
                if is_subgraph_node(node_type):
                    statistics['subgraph_node_types'][node_type] += 1
                else:
                    statistics['node_types'][node_type] += 1
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
            statistics['model_link_errors'] += len(result['analysis']['subgraph_missing_urls'])
            statistics['model_link_errors'] += len(result['analysis']['subgraph_stale_definition'])

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
    
    if statistics['subgraph_node_types']:
        report.append("\n## Subgraph instances with .safetensors")
        for node_type, count in sorted(statistics['subgraph_node_types'].items(), key=lambda x: x[1], reverse=True):
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
                scope = f" [{match['scope']}]" if match.get('scope') else ''
                report.append(
                    f"\n### {filename} - Node {match['node_id']} ({match['node_type']}){scope} model link mismatch:"
                )
                if match['missing_in_properties']:
                    report.append(f"  - In widgets_values but missing in properties.models: {match['missing_in_properties']}")
                if match['extra_in_properties']:
                    report.append(f"  - In properties.models but missing in widgets_values: {match['extra_in_properties']}")
        for miss in result['analysis']['missing_properties']:
            scope = f" [{miss['scope']}]" if miss.get('scope') else ''
            report.append(
                f"\n### {filename} - Node {miss['node_id']} ({miss['node_type']}){scope} "
                f"missing properties.models for: {miss['safetensors_files']}"
            )
        for miss in result['analysis']['subgraph_missing_urls']:
            scope = f" [{miss['scope']}]" if miss.get('scope') else ''
            report.append(
                f"\n### {filename} - Subgraph instance {miss['node_id']} ({miss['node_type']}){scope} "
                f"has no download URL for: {miss['models']}"
            )
        for stale in result['analysis']['subgraph_stale_definition']:
            scope = f" [{stale['scope']}]" if stale.get('scope') else ''
            report.append(
                f"\n### {filename} - Subgraph instance {stale['node_id']} ({stale['node_type']}){scope} "
                f"uses '{stale['instance_model']}' but inner node {stale['inner_node_id']} "
                f"({stale['inner_node_type']}) documents: {stale['definition_models'] or '[]'}"
            )
    return '\n'.join(report)

def main():
    import argparse

    parser = argparse.ArgumentParser(description='Analyze model references in ComfyUI templates')
    parser.add_argument('--templates-dir', default='./templates', help='Templates directory (default: ./templates)')
    parser.add_argument('--whitelist', help=f'Path to whitelist configuration JSON (default: {WHITELIST_FILE})')
    parser.add_argument('--report', default='./model_analysis_report.md', help='Output report path')
    args = parser.parse_args()

    whitelist_config = load_whitelist_config(args.whitelist)

    results, statistics = analyze_all_templates(args.templates_dir, whitelist_config)
    report = generate_report(results, statistics)

    with open(args.report, 'w', encoding='utf-8') as f:
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
