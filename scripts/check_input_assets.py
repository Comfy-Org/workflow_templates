#!/usr/bin/env python3
"""
Script to validate that input assets referenced in workflow JSON files exist in the inputs/ folder.
"""

import json
import os
import sys
from pathlib import Path
from typing import List, Dict, Tuple

# Configure supported node types that require input assets
# Add new node types to this list as they are discovered
ASSET_NODE_TYPES = [
    "LoadImage",
    "LoadAudio", 
    "LoadVideo"
]


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
        nodes = data
    elif isinstance(data, dict):
        nodes = data.get("nodes", [])
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
            if widgets_values and len(widgets_values) > 0:
                asset_filename = widgets_values[0]
                if asset_filename:  # Skip empty strings
                    assets.append({
                        "node_id": node.get("id"),
                        "node_type": node_type,
                        "filename": asset_filename,
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
        asset_path = inputs_dir / asset["filename"]
        if asset_path.exists():
            asset["path"] = str(asset_path)
            valid.append(asset)
        else:
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
    else:
        report.append(f"\n## ✅ Validation Passed\n")
        report.append(f"All {len(valid_assets)} referenced asset(s) are present in the `input/` folder.\n")
    
    # Missing assets details
    if missing_assets:
        report.append("\n## Missing Assets\n")
        report.append("The following assets are referenced in workflow files but not found in `input/`:\n\n")
        report.append("| Workflow File | Node Type | Asset Filename |\n")
        report.append("|---------------|-----------|----------------|\n")
        
        for asset in sorted(missing_assets, key=lambda x: (x["workflow"], x["filename"])):
            report.append(f"| `{asset['workflow']}` | `{asset['node_type']}` | `{asset['filename']}` |\n")
        
        report.append("\n**Action Required:** Please add the missing files to the `input/` directory.\n")
    
    # Valid assets summary
    if valid_assets:
        report.append("\n## Valid Assets\n")
        report.append(f"{len(valid_assets)} asset(s) successfully validated:\n\n")
        report.append("| Workflow File | Node Type | Asset Filename |\n")
        report.append("|---------------|-----------|----------------|\n")
        
        for asset in sorted(valid_assets, key=lambda x: (x["workflow"], x["filename"])):
            report.append(f"| `{asset['workflow']}` | `{asset['node_type']}` | `{asset['filename']}` |\n")
    
    return "".join(report)


def main():
    """Main execution function."""
    # Get repository root
    repo_root = Path(__file__).parent.parent
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
    workflow_files = find_workflow_files(templates_dir)
    print(f"Found {len(workflow_files)} workflow files to check\n")
    
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
    
    # Set output for GitHub Actions
    if os.getenv('GITHUB_OUTPUT'):
        with open(os.getenv('GITHUB_OUTPUT'), 'a') as f:
            f.write(f"validation_passed={'true' if not missing_assets else 'false'}\n")
            f.write(f"missing_count={len(missing_assets)}\n")
            f.write(f"valid_count={len(valid_assets)}\n")
    
    # Exit with appropriate code
    if missing_assets:
        print(f"\n❌ Validation failed: {len(missing_assets)} missing asset(s)")
        sys.exit(1)
    else:
        print(f"\n✅ Validation passed: All {len(valid_assets)} asset(s) found")
        sys.exit(0)


if __name__ == "__main__":
    main()

