#!/usr/bin/env python3
"""
Script to validate that input assets referenced in workflow JSON files exist in the inputs/ folder.
Also generates a JSON file for uploading assets to public storage.
"""

import json
import os
import sys
import mimetypes
import re
from pathlib import Path
from typing import List, Dict, Tuple, Optional

_lib_dir = Path(__file__).resolve().parent.parent / "lib"
if str(_lib_dir) not in sys.path:
    sys.path.insert(0, str(_lib_dir))

from changed_files import changed_template_files  # noqa: E402

# Configure supported node types that require input assets
# Add new node types to this list as they are discovered
ASSET_NODE_TYPES = [
    "LoadImage",
    "LoadAudio",
    "VHS_LoadVideo",
    "LoadVideo",
    "Load3D",
    "LoadImageMask",
    # Painter stores a painted-mask PNG in its first widget. Templates have
    # shipped references to files that never left the author's machine
    # (issue #1392), so the mask has to be validated like any other input.
    "Painter",
]

# Annotations the frontend appends to a widget value to say where the file
# lives: `photo.png [input]`, `painter-1.png [temp]`, `out.png [output]`.
# `[temp]` can never be satisfied: temp directories are not distributed.
_ANNOTATION_RE = re.compile(r"\s*\[(input|temp|output)\]\s*$", re.IGNORECASE)


def split_annotation(value: str) -> Tuple[str, str]:
    """Split `name [input]` into (`name`, `input`). No annotation returns ''."""
    match = _ANNOTATION_RE.search(value)
    if not match:
        return value.strip(), ""
    return value[: match.start()].strip(), match.group(1).lower()


def format_asset_filename(value: str) -> str:
    """Render the value as it appears in the workflow JSON, annotation included."""
    bare, annotation = split_annotation(value)
    return f"{bare} [{annotation}]" if annotation else bare



def find_workflow_files(templates_dir: Path) -> List[Path]:
    """Find all JSON workflow files in the templates directory."""
    return list(templates_dir.glob("*.json"))


def extract_asset_references(workflow_file: Path, node_types: List[str]) -> List[Dict]:
    """
    Extract asset references from workflow JSON file.
    
    Returns:
        List of dicts containing node info and referenced assets
    """
    try:
        with open(workflow_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"⚠️ Warning: Could not read {workflow_file.name}: {e}")
        return []
    
    assets = []
    
    # Handle both array and object formats
    if isinstance(data, list):
        nodes = list(data)
    elif isinstance(data, dict):
        nodes = list(data.get("nodes", []))
        # Loaders also live inside subgraph definitions: `image_moss_image_t2i_bboxes`
        # keeps its UNETLoader there, and templates keep their Painter masks there.
        for subgraph in (data.get("definitions") or {}).get("subgraphs") or []:
            if isinstance(subgraph, dict):
                nodes.extend(subgraph.get("nodes") or [])
    else:
        print(f"⚠️ Warning: Unexpected JSON format in {workflow_file.name}")
        return []
    
    for node in nodes:
        if not isinstance(node, dict):
            continue
            
        node_type = node.get("type")
        if node_type in node_types:
            widgets_values = node.get("widgets_values", [])
            # The first element in widgets_values is typically the filename
            # Handle both list and dict formats
            if widgets_values:
                asset_filename = None
                if isinstance(widgets_values, list) and len(widgets_values) > 0:
                    asset_filename = widgets_values[0]
                elif isinstance(widgets_values, dict):
                    # Try common keys for filename
                    asset_filename = widgets_values.get("image") or widgets_values.get("video") or widgets_values.get("audio")
                
                if asset_filename and isinstance(asset_filename, str):  # Skip empty strings and None
                    bare, annotation = split_annotation(asset_filename)
                    if bare:
                        assets.append({
                            "node_id": node.get("id"),
                            "node_type": node_type,
                            "filename": bare,
                            "annotation": annotation,
                            "raw": format_asset_filename(asset_filename),
                            "workflow": workflow_file.name
                        })
    
    return assets


def validate_assets(assets: List[Dict], inputs_dir: Path) -> Tuple[List[Dict], List[Dict]]:
    """
    Validate that asset files exist in the inputs directory.
    
    Returns:
        Tuple of (valid_assets, missing_assets)
    """
    valid = []
    missing = []
    
    for asset in assets:
        if asset.get("annotation") == "temp":
            # A `[temp]` value points into ComfyUI's temp directory, which only
            # exists on the machine that authored the template.
            asset["reason"] = "temp reference (never distributed)"
            missing.append(asset)
            continue

        asset_path = inputs_dir / asset["filename"]
        if asset_path.exists():
            asset["path"] = str(asset_path)
            valid.append(asset)
        else:
            asset["reason"] = "not in input/"
            missing.append(asset)
    
    return valid, missing


def generate_report(valid_assets: List[Dict], missing_assets: List[Dict], 
                   checked_files: int, node_types: List[str]) -> str:
    """Generate a markdown report of the validation results."""
    
    report = ["# Input Assets Validation Report\n"]
    report.append(f"**Checked Files:** {checked_files} workflow templates\n")
    report.append(f"**Node Types Checked:** {', '.join(f'`{nt}`' for nt in node_types)}\n")
    report.append(f"**Total Assets Found:** {len(valid_assets) + len(missing_assets)}\n")
    report.append("\n---\n")
    
    # Summary
    if missing_assets:
        report.append(f"\n## ❌ Validation Failed\n")
        report.append(f"**{len(missing_assets)} missing asset(s)** found that need to be added to the `input/` folder.\n")
        report.append(f"✅ **{len(valid_assets)} asset(s)** successfully validated.\n")
    else:
        report.append(f"\n## ✅ Validation Passed\n")
        report.append(f"All {len(valid_assets)} referenced asset(s) are present in the `input/` folder.\n")
    
    # Missing assets details - only show if there are missing assets
    if missing_assets:
        report.append("\n## Missing Assets\n")
        report.append("The following assets are referenced in workflow files but not found in `input/`:\n\n")
        report.append("| Workflow File | Node Type | Asset Filename | Reason |\n")
        report.append("|---------------|-----------|----------------|--------|\n")
        
        for asset in sorted(missing_assets, key=lambda x: (x["workflow"], x["filename"])):
            report.append(
                f"| `{asset['workflow']}` | `{asset['node_type']}` | "
                f"`{asset.get('raw') or asset['filename']}` | {asset.get('reason', 'not in input/')} |\n"
            )
        
        report.append("\n**Action Required:** add the file to `input/` and reference it as `name [input]`.\n")
        report.append("A `[temp]` reference can never be fixed by adding a file: temp files are not distributed. Clear the widget instead, or ship the file under `input/`.\n")
    
    # Valid assets summary - only show count, not full list (to keep report concise)
    # The full list is still available in the artifact if needed
    
    return "".join(report)


def parse_filename(filename: str, workflow_names: List[str] = None) -> Dict[str, str]:
    """
    Parse input filename to extract workflow name and description.
    Format: {workflow}_{description}.{ext}
    
    Args:
        filename: The filename to parse
        workflow_names: List of known workflow names from index.json
    
    Returns:
        Dict with 'workflow', 'description', and 'extension' keys
    """
    stem = Path(filename).stem
    ext = Path(filename).suffix.lstrip('.')
    
    workflow = None
    description = stem
    
    # If we have workflow names, try to match the longest one
    if workflow_names:
        # Sort by length descending to match longest first
        sorted_names = sorted(workflow_names, key=len, reverse=True)
        for name in sorted_names:
            if stem.startswith(name + '_'):
                workflow = name
                # Remove workflow name and the underscore
                description = stem[len(name) + 1:]
                break
            elif stem == name:
                # Exact match, no description
                workflow = name
                description = ''
                break
    
    # Fallback: if no match found, use first underscore split
    if workflow is None:
        parts = stem.split('_', 1)
        if len(parts) == 2:
            workflow = parts[0]
            description = parts[1]
        else:
            workflow = stem
            description = ''
    
    # Convert underscores to spaces for display
    description = description.replace('_', ' ')
    
    return {
        "workflow": workflow,
        "description": description,
        "extension": ext
    }


def get_mime_type(filename: str) -> str:
    """
    Get MIME type for a file based on its extension.

    Prefer a fixed map so macOS and Linux CI produce the same upload JSON
    (stdlib mimetypes disagrees on .glb / .flac and similar).
    """
    ext = Path(filename).suffix.lower()
    mime_map = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.mp4': 'video/mp4',
        '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo',
        '.webm': 'video/webm',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.flac': 'audio/flac',
        '.json': 'application/json',
        '.glb': 'model/gltf-binary',
        '.gltf': 'model/gltf+json',
    }
    if ext in mime_map:
        return mime_map[ext]

    mime_type, _ = mimetypes.guess_type(filename)
    return mime_type or 'application/octet-stream'


def get_media_type_tag(mime_type: str) -> str:
    """
    Get media type tag from MIME type.
    """
    if mime_type.startswith('image/'):
        return 'image'
    elif mime_type.startswith('video/'):
        return 'video'
    elif mime_type.startswith('audio/'):
        return 'audio'
    else:
        return 'file'


def load_index_json(index_path: Path) -> Dict[str, Dict]:
    """
    Load index.json and create a mapping of workflow names to their info.
    
    Returns:
        Dict mapping workflow name to template info
    """
    try:
        with open(index_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"⚠️ Warning: Could not read index.json: {e}")
        return {}
    
    workflow_map = {}
    for module in data:
        if not isinstance(module, dict):
            continue
        templates = module.get('templates', [])
        for template in templates:
            if isinstance(template, dict):
                name = template.get('name')
                title = template.get('title', name)
                if name:
                    workflow_map[name] = {
                        'title': title,
                        'description': template.get('description', ''),
                        'tags': template.get('tags', [])
                    }
    
    return workflow_map


def generate_upload_json(inputs_dir: Path, templates_dir: Path, 
                         base_url: str = "https://raw.githubusercontent.com/Comfy-Org/workflow_templates/refs/heads/main/input/") -> Dict:
    """
    Generate JSON file for uploading assets to public storage.
    
    Args:
        inputs_dir: Path to input directory
        templates_dir: Path to templates directory  
        base_url: Base URL for GitHub raw content
        
    Returns:
        Dict with assets list ready for JSON export
    """
    # Load workflow info from index.json
    index_path = templates_dir / "index.json"
    workflow_map = load_index_json(index_path)
    
    # Get list of all workflow names for better parsing
    workflow_names = list(workflow_map.keys())
    
    assets = []
    
    # Scan all files in input directory
    for file_path in sorted(inputs_dir.iterdir()):
        if file_path.is_file() and not file_path.name.startswith('.'):
            filename = file_path.name
            parsed = parse_filename(filename, workflow_names)
            mime_type = get_mime_type(filename)
            media_type = get_media_type_tag(mime_type)
            
            # Get workflow info if available
            workflow_name = parsed['workflow']
            workflow_info = workflow_map.get(workflow_name, {})
            
            # Generate display name
            # If workflow not found in index.json, use original filename
            if not workflow_info:
                # No workflow match found, use original filename
                display_name = filename
            else:
                # Workflow matched, generate descriptive name
                workflow_title = workflow_info.get('title', workflow_name)
                description = parsed['description'].title()
                if description:
                    display_name = f"{description} for {workflow_title}"
                else:
                    display_name = f"{media_type.title()} for {workflow_title}"
            
            # Generate tags - only input and media type
            tags = ['input', media_type]
            
            asset = {
                "file_path": f"input/{filename}",
                "url": f"{base_url}{filename}",
                "display_name": display_name,
                "tags": tags,
                "mime_type": mime_type
            }
            
            assets.append(asset)
    
    return {"assets": assets}


def main():
    """Main execution function."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Validate input assets and optionally generate upload JSON'
    )
    parser.add_argument(
        '--generate-upload-json',
        action='store_true',
        help='Generate workflow_template_input_files.json for asset upload'
    )
    parser.add_argument(
        '--base-url',
        default='https://raw.githubusercontent.com/Comfy-Org/workflow_templates/refs/heads/main/input/',
        help='Base URL for GitHub raw content (default: %(default)s)'
    )
    parser.add_argument(
        '--base-sha',
        help='only validate templates changed since this commit (CI: pull_request base)'
    )
    parser.add_argument(
        '--head-sha',
        help='head commit for --base-sha (defaults to HEAD)'
    )
    parser.add_argument(
        '--strict',
        action='store_true',
        help='fail on findings outside the change set too (full-tree gate)'
    )
    args = parser.parse_args()
    
    # Get repository root
    repo_root = Path(__file__).resolve().parents[2]
    templates_dir = repo_root / "templates"
    inputs_dir = repo_root / "input"
    
    print("=" * 60)
    print("Input Assets Validation")
    print("=" * 60)
    print(f"Templates directory: {templates_dir}")
    print(f"Inputs directory: {inputs_dir}")
    print(f"Checking node types: {', '.join(ASSET_NODE_TYPES)}")
    print()
    
    # Check if directories exist
    if not templates_dir.exists():
        print(f"❌ Error: Templates directory not found: {templates_dir}")
        sys.exit(1)
    
    if not inputs_dir.exists():
        print(f"⚠️ Warning: Input directory not found: {inputs_dir}")
        print("Creating input directory...")
        inputs_dir.mkdir(parents=True, exist_ok=True)
    
    # Find workflow files
    all_workflow_files = find_workflow_files(templates_dir)
    try:
        changed = changed_template_files(repo_root, "templates", args.base_sha, args.head_sha)
    except RuntimeError as exc:
        print(f"❌ {exc}")
        sys.exit(1)

    workflow_files = [
        f for f in all_workflow_files if changed is None or f.name in changed
    ]
    if changed is None:
        print(f"Found {len(workflow_files)} workflow files to check (whole tree)\n")
    else:
        print(f"Found {len(workflow_files)} changed workflow file(s) to check\n")
    
    # Extract all asset references
    all_assets = []
    for workflow_file in workflow_files:
        assets = extract_asset_references(workflow_file, ASSET_NODE_TYPES)
        all_assets.extend(assets)
    
    print(f"Found {len(all_assets)} asset references in workflows\n")
    
    # Validate assets
    valid_assets, missing_assets = validate_assets(all_assets, inputs_dir)
    
    # Generate and print report
    report = generate_report(valid_assets, missing_assets, len(workflow_files), ASSET_NODE_TYPES)
    print(report)
    
    # Save report to file for GitHub Actions
    report_file = repo_root / "asset_validation_report.md"
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(report)
    print(f"\n📄 Report saved to: {report_file}")
    
    # Generate upload JSON if requested
    if args.generate_upload_json:
        print("\n" + "=" * 60)
        print("Generating Upload JSON")
        print("=" * 60)
        
        upload_data = generate_upload_json(inputs_dir, templates_dir, args.base_url)
        upload_file = repo_root / "workflow_template_input_files.json"
        
        with open(upload_file, 'w', encoding='utf-8') as f:
            json.dump(upload_data, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Generated {len(upload_data['assets'])} asset entries")
        print(f"📄 Upload JSON saved to: {upload_file}")
        
        # Show sample entries
        if upload_data['assets']:
            print("\n📋 Sample entries:")
            for asset in upload_data['assets'][:3]:
                print(f"  - {asset['display_name']}")
                print(f"    File: {asset['file_path']}")
                print(f"    URL: {asset['url']}")
                print(f"    Tags: {', '.join(asset['tags'])}")
                print(f"    MIME: {asset['mime_type']}")
                print()
    
    # Set output for GitHub Actions
    if os.getenv('GITHUB_OUTPUT'):
        with open(os.getenv('GITHUB_OUTPUT'), 'a') as f:
            f.write(f"validation_passed={'true' if not missing_assets else 'false'}\n")
            f.write(f"missing_count={len(missing_assets)}\n")
            f.write(f"valid_count={len(valid_assets)}\n")
    
    # Exit with appropriate code
    # If generate-upload-json flag is used, don't fail on validation errors
    # JSON generation is independent of validation results
    if args.generate_upload_json:
        if missing_assets:
            print(f"\n⚠️ Validation warning: {len(missing_assets)} missing asset(s)")
            print("ℹ️ JSON file was generated for existing assets")
        else:
            print(f"\n✅ Validation passed: All {len(valid_assets)} asset(s) found")
        sys.exit(0)

    if not missing_assets:
        print(f"\n✅ Validation passed: All {len(valid_assets)} asset(s) found")
        sys.exit(0)

    if changed is not None:
        # Scoped run: every finding belongs to a template this change touches,
        # so it is actionable right here. Report the rest of the tree as context
        # so the debt stays visible without blocking unrelated work.
        all_assets = []
        for workflow_file in all_workflow_files:
            all_assets.extend(extract_asset_references(workflow_file, ASSET_NODE_TYPES))
        _, all_missing = validate_assets(all_assets, inputs_dir)
        elsewhere = len(all_missing) - len(missing_assets)
        if elsewhere > 0:
            print(
                f"\nℹ️ {elsewhere} pre-existing finding(s) outside this change set are "
                "not failing this run (full tree: --strict)."
            )
        print(f"\n❌ Validation failed: {len(missing_assets)} missing asset(s) in changed template(s)")
        sys.exit(1)

    if args.strict:
        print(f"\n❌ Validation failed: {len(missing_assets)} missing asset(s)")
        sys.exit(1)

    # Whole-tree runs on main are advisory by default: the tree already carries
    # findings that no gate looked for before (three Painter masks, see #1392),
    # and failing here would block every unrelated PR until they are fixed.
    print(
        f"\n⚠️ {len(missing_assets)} pre-existing missing asset(s) found "
        "(advisory; pass --strict to fail)"
    )
    sys.exit(0)



if __name__ == "__main__":
    main()

