#!/usr/bin/env python3
"""
Calculate total model sizes for ComfyUI workflow templates and update index.json.

This script:
1. Reads the index.json file to get all template names
2. For each template, extracts model URLs from the properties.models array
3. Fetches model sizes from Hugging Face repositories
4. Calculates total size after deduplication
5. Updates the index.json with a new "size" field for each template
"""

import json
import os
import sys
import urllib.request
import urllib.error
import time
from typing import Dict, List, Set, Tuple, Optional
from urllib.parse import unquote
import re

class IndexModelSizeCalculator:
    def __init__(self, templates_dir: str):
        self.templates_dir = templates_dir
        self.index_path = os.path.join(templates_dir, "index.json")
        self.model_size_cache: Dict[str, float] = {}
        
        # Set up urllib with user agent
        self.opener = urllib.request.build_opener()
        self.opener.addheaders = [('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')]

    def parse_huggingface_url(self, url: str) -> Tuple[str, str, str]:
        """Parse Hugging Face URL to extract repo, branch, and filename."""
        # Remove query parameters (like ?download=true)
        url_without_params = url.split('?')[0]
        
        pattern = r'https://huggingface\.co/([^/]+/[^/]+)/resolve/([^/]+)/(.+)'
        match = re.match(pattern, url_without_params)
        
        if not match:
            raise ValueError(f"Invalid Hugging Face URL format: {url}")
            
        repo_id = match.group(1)
        branch = match.group(2)
        file_path = unquote(match.group(3))
        
        return repo_id, branch, file_path

    def get_file_size_direct(self, repo_id: str, branch: str, file_path: str) -> float:
        """Get file size using direct API call to the specific path."""
        
        # Try to get the parent directory first, then look for the file
        path_parts = file_path.split('/')
        
        if len(path_parts) > 1:
            # Try getting the parent directory
            parent_path = '/'.join(path_parts[:-1])
            filename = path_parts[-1]
            
            api_url = f"https://huggingface.co/api/models/{repo_id}/tree/{branch}/{parent_path}"
        else:
            # File is in root
            api_url = f"https://huggingface.co/api/models/{repo_id}/tree/{branch}"
            filename = file_path
        
        try:
            request = urllib.request.Request(api_url)
            with self.opener.open(request, timeout=30) as response:
                data = json.loads(response.read().decode('utf-8'))
            
            # Look for the file in the response
            for item in data:
                item_path = item.get('path', '')
                # Extract just the filename from the full path
                item_filename = item_path.split('/')[-1] if '/' in item_path else item_path
                
                if item_filename == filename and item.get('type') == 'file':
                    size_bytes = item.get('size', 0)
                    size_gb = size_bytes / (1024 ** 3)
                    return size_gb
            
            return 0.0
            
        except Exception as e:
            print(f"    Error fetching from {api_url}: {e}")
            return 0.0

    def get_file_size_from_huggingface(self, url: str) -> float:
        """Get file size from Hugging Face repository in GB."""
        if url in self.model_size_cache:
            return self.model_size_cache[url]
            
        try:
            repo_id, branch, file_path = self.parse_huggingface_url(url)
            print(f"  Fetching: {repo_id}/{file_path}")
            
            size = self.get_file_size_direct(repo_id, branch, file_path)
            
            # Cache the result
            self.model_size_cache[url] = size
            
            if size > 0:
                print(f"    Size: {size:.2f} GB")
            else:
                print(f"    Warning: Could not get size")
            
            # Add delay to avoid rate limiting
            time.sleep(0.5)
            return size
            
        except Exception as e:
            print(f"  Error processing {url}: {e}")
            return 0.0

    def load_index(self) -> List[Dict]:
        """Load the index.json file."""
        try:
            with open(self.index_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"Error: {self.index_path} not found")
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON in {self.index_path}: {e}")
            sys.exit(1)

    def save_index(self, index_data: List[Dict]):
        """Save the updated index.json file."""
        try:
            with open(self.index_path, 'w', encoding='utf-8') as f:
                json.dump(index_data, f, indent=2, ensure_ascii=False)
            print(f"✓ Updated index.json")
        except Exception as e:
            print(f"Error saving index.json: {e}")

    def load_template(self, template_name: str) -> Dict:
        """Load a single template file."""
        template_path = os.path.join(self.templates_dir, f"{template_name}.json")
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"    Warning: Template file {template_path} not found")
            return {}
        except json.JSONDecodeError as e:
            print(f"    Warning: Invalid JSON in {template_path}: {e}")
            return {}

    def extract_model_urls(self, template_data: Dict) -> Set[str]:
        """Extract model URLs from template data."""
        urls = set()
        
        if 'nodes' not in template_data:
            return urls
            
        for node in template_data['nodes']:
            if 'properties' in node and 'models' in node['properties']:
                for model in node['properties']['models']:
                    if isinstance(model, dict) and 'url' in model:
                        urls.add(model['url'])
        
        return urls

    def calculate_template_size(self, template_name: str) -> float:
        """Calculate total model size for a template."""
        print(f"Processing template: {template_name}")
        
        # Skip API templates (they don't have local models to download)
        if template_name.startswith('api_'):
            print(f"  ⚠️ Skipping API template - no local models to calculate")
            return -1.0  # Use -1 to indicate this should be skipped entirely
        
        template_data = self.load_template(template_name)
        if not template_data:
            return 0.0
            
        model_urls = self.extract_model_urls(template_data)
        
        if not model_urls:
            print(f"  No model URLs found")
            return 0.0
        
        print(f"  Found {len(model_urls)} unique model URLs")
        
        total_size = 0.0
        for url in model_urls:
            size = self.get_file_size_from_huggingface(url)
            total_size += size
            
        print(f"  Total size: {total_size:.2f} GB")
        return total_size

    def update_template_size_in_index(self, index_data: List[Dict], template_name: str, size_gb: float) -> bool:
        """Update the size for a specific template in the index data."""
        updated = False
        
        # Skip adding size field if size is 0 or -1 (API templates)
        if size_gb == 0:
            print(f"  ⚠️ Skipping {template_name} - size is 0 GB (no helpful information)")
            return False
        elif size_gb == -1:
            print(f"  ⚠️ Skipping {template_name} - API template (no size calculation needed)")
            return False
        
        for category in index_data:
            if 'templates' in category:
                for template in category['templates']:
                    if template.get('name') == template_name:
                        template['size'] = round(size_gb, 2)
                        print(f"  ✓ Updated {template_name} in index with size: {size_gb:.2f} GB")
                        updated = True
                        break
            if updated:
                break
        
        if not updated:
            print(f"  Warning: Could not find template {template_name} in index.json")
        
        return updated

    def run(self, limit: Optional[int] = None):
        """Main execution function."""
        print("=" * 80)
        print("ComfyUI Template Model Size Calculator (Index Update)")
        print("=" * 80)
        print(f"Templates directory: {self.templates_dir}")
        
        # Load index
        index_data = self.load_index()
        
        # Extract all template names from index
        template_names = []
        for category in index_data:
            if 'templates' in category:
                for template in category['templates']:
                    if 'name' in template:
                        template_names.append(template['name'])
        
        if limit:
            template_names = template_names[:limit]
            print(f"LIMITED TO FIRST {limit} TEMPLATES FOR TESTING")
        
        print(f"Found {len(template_names)} templates to process")
        print("=" * 80)
        
        # Process each template
        total_processed = 0
        total_size = 0.0
        updated_count = 0
        
        for i, template_name in enumerate(template_names, 1):
            print(f"\n[{i}/{len(template_names)}] {template_name}")
            
            try:
                size = self.calculate_template_size(template_name)
                if size >= 0:  # Even 0 size is valid (templates without HF models), -1 means skip
                    if self.update_template_size_in_index(index_data, template_name, size):
                        updated_count += 1
                    if size > 0:
                        total_size += size
                elif size == -1:
                    # API template was skipped - this is expected
                    pass
                total_processed += 1
                
            except KeyboardInterrupt:
                print("\n⚠️  Operation cancelled by user")
                break
            except Exception as e:
                print(f"  Error processing {template_name}: {e}")
                continue
        
        # Save the updated index
        if updated_count > 0:
            self.save_index(index_data)
        
        print("\n" + "=" * 80)
        print("SUMMARY")
        print("=" * 80)
        print(f"Processed: {total_processed}/{len(template_names)} templates")
        print(f"Updated in index: {updated_count}")
        print(f"Total size across all templates: {total_size:.2f} GB")
        print(f"Unique models cached: {len(self.model_size_cache)}")
        
        if self.model_size_cache:
            cache_total = sum(self.model_size_cache.values())
            print(f"Cache summary:")
            print(f"  Total unique model size: {cache_total:.2f} GB")
            print(f"  Average model size: {cache_total / len(self.model_size_cache):.2f} GB")
        
        print("✅ Done! Index has been updated with size information.")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Calculate model sizes and update index.json")
    parser.add_argument("templates_dir", nargs='?', default=None,
                       help="Path to templates directory (default: templates/)")
    parser.add_argument("--limit", type=int, default=None,
                       help="Limit number of templates to process (for testing)")
    
    args = parser.parse_args()
    
    if args.templates_dir:
        templates_dir = args.templates_dir
    else:
        # Default to templates directory relative to script location
        script_dir = os.path.dirname(os.path.abspath(__file__))
        templates_dir = os.path.join(os.path.dirname(script_dir), "templates")
    
    if not os.path.exists(templates_dir):
        print(f"Error: Templates directory not found: {templates_dir}")
        sys.exit(1)
    
    calculator = IndexModelSizeCalculator(templates_dir)
    calculator.run(limit=args.limit)

if __name__ == "__main__":
    main()