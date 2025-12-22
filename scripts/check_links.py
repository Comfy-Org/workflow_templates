#!/usr/bin/env python3
"""
Extract and check links from ComfyUI workflow JSON files.

This script extracts URLs from:
1. properties.models[].url fields (model download links)
2. MarkdownNote and Note node widgets_values (documentation links)
"""

import json
import re
import sys
from pathlib import Path
from typing import Set, List, Dict, Tuple, Optional


def extract_url_with_balanced_parens(text: str, start_pos: int) -> Tuple[str, int]:
    """
    Extract URL from text starting at start_pos, handling balanced parentheses.
    
    Returns:
        Tuple of (url, end_position)
    """
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
            # Stop at whitespace
            break
        pos += 1
    
    return text[start_pos:pos], pos


def extract_urls_from_markdown(text: str) -> Set[str]:
    """Extract URLs from markdown text, handling parentheses in URLs."""
    urls = set()
    extracted_ranges = []  # Track ranges that have been extracted as markdown links

    # Find markdown links: [text](url) with balanced parentheses
    # Use a more careful approach to handle URLs with parentheses
    pattern = r'\[([^\]]+)\]\('
    for match in re.finditer(pattern, text):
        start_pos = match.end()
        url, end_pos = extract_url_with_balanced_parens(text, start_pos)
        
        if url.startswith('http'):
            # Clean up URL (remove trailing punctuation, but preserve balanced parens)
            url = url.rstrip('.,;:!?')
            urls.add(url)
            extracted_ranges.append((match.start(), end_pos + 1))  # +1 for closing )

    # Plain URLs (but not those already in markdown links)
    # Build text without markdown links to avoid duplicates
    text_without_markdown = text
    for start, end in sorted(extracted_ranges, reverse=True):
        text_without_markdown = text_without_markdown[:start] + text_without_markdown[end:]
    
    # Match plain URLs - allow parentheses but try to balance them
    plain_url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
    for match in re.finditer(plain_url_pattern, text_without_markdown):
        url = match.group()
        # Try to balance parentheses in plain URLs
        open_parens = url.count('(')
        close_parens = url.count(')')
        # If more closing parens, trim from the end
        while close_parens > open_parens and url.endswith(')'):
            url = url[:-1]
            close_parens -= 1
        url = url.rstrip('.,;:!?')
        if url:
            urls.add(url)

    return urls


def extract_links_from_workflow(file_path: Path) -> Dict[str, List[Tuple[str, str]]]:
    """
    Extract all links from a workflow JSON file.

    Returns:
        Dict with keys 'model_urls' and 'markdown_urls', each containing
        list of tuples (url, context)
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error reading {file_path}: {e}", file=sys.stderr)
        return {'model_urls': [], 'markdown_urls': []}

    model_urls = []
    markdown_urls = []

    # Handle both dict and list formats
    # Some files like index.json are lists, workflow files are dicts
    if isinstance(data, list):
        # Skip index files (they don't contain workflow data)
        return {'model_urls': [], 'markdown_urls': []}

    # Extract from nodes
    nodes = data.get('nodes', [])
    for node in nodes:
        node_type = node.get('type', '')
        node_id = node.get('id', 'unknown')

        # Extract model URLs from properties.models[].url
        properties = node.get('properties', {})
        models = properties.get('models', [])
        for model in models:
            if isinstance(model, dict) and 'url' in model:
                url = model['url']
                model_name = model.get('name', 'unknown')
                context = f"Node {node_id} ({node_type}), model: {model_name}"
                model_urls.append((url, context))

        # Extract URLs from MarkdownNote and Note widgets
        if node_type in ['MarkdownNote', 'Note']:
            widgets_values = node.get('widgets_values', [])
            for widget_value in widgets_values:
                if isinstance(widget_value, str):
                    urls = extract_urls_from_markdown(widget_value)
                    for url in urls:
                        context = f"Node {node_id} ({node_type})"
                        markdown_urls.append((url, context))

    return {
        'model_urls': model_urls,
        'markdown_urls': markdown_urls
    }


def load_whitelist_skip_urls() -> Set[str]:
    """Load skip_urls from whitelist.json."""
    whitelist_path = Path('scripts/whitelist.json')
    skip_urls = set()
    
    try:
        with open(whitelist_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            whitelist = data.get('whitelist', {})
            skip_urls_list = whitelist.get('skip_urls', [])
            skip_urls = set(skip_urls_list)
            if skip_urls:
                print(f"Loaded {len(skip_urls)} URLs from whitelist skip_urls", file=sys.stderr)
    except FileNotFoundError:
        print(f"Warning: {whitelist_path} not found, skipping URL whitelist", file=sys.stderr)
    except Exception as e:
        print(f"Warning: Error loading whitelist: {e}", file=sys.stderr)
    
    return skip_urls


def should_skip_url(url: str, skip_urls: Set[str]) -> bool:
    """Check if URL should be skipped based on whitelist."""
    # Exact match
    if url in skip_urls:
        return True
    
    # Pattern match (support for partial URLs or regex patterns)
    for skip_pattern in skip_urls:
        # If pattern contains regex special chars, try regex match
        if any(char in skip_pattern for char in ['*', '?', '^', '$', '[', ']', '(', ')', '{', '}', '|', '+', '.']):
            try:
                if re.search(skip_pattern, url):
                    return True
            except re.error:
                # If regex fails, fall back to substring match
                if skip_pattern in url:
                    return True
        else:
            # Simple substring match
            if skip_pattern in url:
                return True
    
    return False


def extract_all_links(filter_skip_urls: bool = False) -> Dict[str, Dict[str, List[Tuple[str, str]]]]:
    """
    Extract all links from all workflow JSON files.

    Args:
        filter_skip_urls: If True, filter out URLs in whitelist skip_urls

    Returns:
        Dict mapping file paths to extracted links
    """
    templates_dir = Path('templates')
    all_links = {}
    skip_urls = load_whitelist_skip_urls() if filter_skip_urls else set()

    if not templates_dir.exists():
        print(f"Error: {templates_dir} directory not found", file=sys.stderr)
        return all_links

    json_files = list(templates_dir.glob('*.json'))
    print(f"Scanning {len(json_files)} workflow files...", file=sys.stderr)

    for json_file in json_files:
        links = extract_links_from_workflow(json_file)
        
        # Filter out skipped URLs if requested
        if filter_skip_urls and skip_urls:
            filtered_model_urls = [
                (url, context) for url, context in links['model_urls']
                if not should_skip_url(url, skip_urls)
            ]
            filtered_markdown_urls = [
                (url, context) for url, context in links['markdown_urls']
                if not should_skip_url(url, skip_urls)
            ]
            links['model_urls'] = filtered_model_urls
            links['markdown_urls'] = filtered_markdown_urls
        
        if links['model_urls'] or links['markdown_urls']:
            all_links[str(json_file)] = links

    return all_links


def command_extract():
    """Extract links and save to files for lychee to check."""
    skip_urls = load_whitelist_skip_urls()
    all_links = extract_all_links(filter_skip_urls=True)

    # Collect all unique URLs (already filtered by extract_all_links)
    all_urls = set()
    url_sources = {}  # Map URL to list of sources

    for file_path, links in all_links.items():
        for url, context in links['model_urls'] + links['markdown_urls']:
            all_urls.add(url)
            if url not in url_sources:
                url_sources[url] = []
            url_sources[url].append(f"{file_path}: {context}")

    if skip_urls:
        print(f"\nSkipped URLs from whitelist skip_urls: {len(skip_urls)} patterns", file=sys.stderr)
    print(f"\nFound {len(all_urls)} unique URLs across {len(all_links)} files")

    # Save URLs to file for lychee
    with open('links_to_check.txt', 'w', encoding='utf-8') as f:
        for url in sorted(all_urls):
            f.write(f"{url}\n")

    print(f"Saved {len(all_urls)} URLs to links_to_check.txt")

    # Save detailed mapping
    with open('link_sources.json', 'w', encoding='utf-8') as f:
        json.dump(url_sources, f, indent=2)

    print("Saved link sources to link_sources.json")

    # Print summary
    total_model_urls = sum(len(links['model_urls']) for links in all_links.values())
    total_markdown_urls = sum(len(links['markdown_urls']) for links in all_links.values())

    print(f"\nSummary:")
    print(f"  Model URLs: {total_model_urls}")
    print(f"  Markdown URLs: {total_markdown_urls}")
    print(f"  Unique URLs: {len(all_urls)}")


def command_report():
    """Generate a detailed report showing which files contain which links."""
    all_links = extract_all_links(filter_skip_urls=True)

    print("\n" + "="*80)
    print("LINK EXTRACTION REPORT")
    print("="*80)

    for file_path, links in sorted(all_links.items()):
        print(f"\n📄 {file_path}")

        if links['model_urls']:
            print(f"  Model URLs ({len(links['model_urls'])}):")
            for url, context in links['model_urls']:
                print(f"    - {url}")
                print(f"      ({context})")

        if links['markdown_urls']:
            print(f"  Markdown URLs ({len(links['markdown_urls'])}):")
            for url, context in links['markdown_urls']:
                print(f"    - {url}")
                print(f"      ({context})")


def command_report_excluded():
    """Generate a report of links that match exclusion patterns."""
    import subprocess

    # Load skip URLs from whitelist
    skip_urls = load_whitelist_skip_urls()
    
    # Load exclusion patterns from .lycheeignore
    exclusion_patterns = []
    try:
        with open('.lycheeignore', 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    exclusion_patterns.append(line)
    except FileNotFoundError:
        pass  # .lycheeignore is optional

    # Get all unique URLs (before filtering)
    templates_dir = Path('templates')
    all_urls = set()
    url_sources = {}
    skipped_urls = set()

    if templates_dir.exists():
        json_files = list(templates_dir.glob('*.json'))
        for json_file in json_files:
            links = extract_links_from_workflow(json_file)
            for url, context in links['model_urls'] + links['markdown_urls']:
                all_urls.add(url)
                if url not in url_sources:
                    url_sources[url] = []
                url_sources[url].append(f"{json_file}: {context}")
                
                # Check if URL should be skipped
                if should_skip_url(url, skip_urls):
                    skipped_urls.add(url)

    # Print whitelist skipped URLs report
    if skipped_urls:
        print(f"\n### ✅ Whitelist Skipped URLs ({len(skipped_urls)} URLs)")
        print("\nThese URLs are excluded from checking via whitelist.json skip_urls:")
        print()
        for url in sorted(skipped_urls):
            sources = url_sources.get(url, [])
            print(f"  - {url}")
            for source in sources[:3]:  # Show first 3 sources
                print(f"    ({source})")
            if len(sources) > 3:
                print(f"    ... and {len(sources) - 3} more sources")
        print()

    # Check each URL against exclusion patterns
    excluded_urls = []
    for url in sorted(all_urls):
        # Skip if already in whitelist skip_urls
        if url in skipped_urls:
            continue
            
        for pattern in exclusion_patterns:
            # Simple regex match
            if re.search(pattern, url):
                excluded_urls.append(url)
                break

    # Print report
    print(f"\n### 👻 Excluded Links ({len(excluded_urls)} links)")
    print("\nThese links are intentionally excluded from checking and may require authentication or have known issues:")
    print()

    # Group by pattern category
    categories = {
        'black-forest-labs': [],
        'stabilityai/stable-diffusion-3.5-controlnets': [],
        'Chroma-LoRA-Experiments': [],
        'civitai': [],
        'social': [],
        'other': []
    }

    for url in excluded_urls:
        if 'black-forest-labs' in url:
            categories['black-forest-labs'].append(url)
        elif 'stable-diffusion-3.5-controlnets' in url:
            categories['stabilityai/stable-diffusion-3.5-controlnets'].append(url)
        elif 'Chroma-LoRA-Experiments' in url:
            categories['Chroma-LoRA-Experiments'].append(url)
        elif 'civitai.com' in url:
            categories['civitai'].append(url)
        elif any(x in url for x in ['linkedin', 'facebook', 'twitter', 'x.com']):
            categories['social'].append(url)
        else:
            categories['other'].append(url)

    # Print by category
    if categories['black-forest-labs']:
        print("**Black Forest Labs models** (require license agreement):")
        for url in categories['black-forest-labs']:
            print(f"  - {url}")
        print()

    if categories['stabilityai/stable-diffusion-3.5-controlnets']:
        print("**Stability AI SD3.5 ControlNets** (require license agreement):")
        for url in categories['stabilityai/stable-diffusion-3.5-controlnets']:
            print(f"  - {url}")
        print()

    if categories['Chroma-LoRA-Experiments']:
        print("**Community experiments** (may be private):")
        for url in categories['Chroma-LoRA-Experiments']:
            print(f"  - {url}")
        print()

    if categories['civitai']:
        print("**Civitai API downloads** (anti-bot protection):")
        for url in categories['civitai']:
            print(f"  - {url}")
        print()

    if categories['social']:
        print("**Social media** (often block bots):")
        for url in categories['social']:
            print(f"  - {url}")
        print()

    if categories['other']:
        print("**Other excluded links:**")
        for url in categories['other']:
            print(f"  - {url}")
        print()


def main():
    if len(sys.argv) < 2:
        print("Usage: check_links.py [extract|report|report-excluded]")
        print("  extract         - Extract all links and save to files")
        print("  report          - Generate detailed report of all links")
        print("  report-excluded - Generate report of excluded links")
        sys.exit(1)

    command = sys.argv[1]

    if command == 'extract':
        command_extract()
    elif command == 'report':
        command_report()
    elif command == 'report-excluded':
        command_report_excluded()
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == '__main__':
    main()
