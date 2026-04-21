#!/usr/bin/env python3
"""
Validate that manifest.json entries match actual template files
"""
import json
import hashlib
import os
import sys
from pathlib import Path

def sha256_file(filepath):
    """Calculate SHA256 hash of a file"""
    hash_sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_sha256.update(chunk)
    return hash_sha256.hexdigest()

def validate_manifests():
    """Validate all manifest entries against actual files"""
    root_dir = Path(__file__).parent.parent
    manifest_path = root_dir / "packages/core/src/comfyui_workflow_templates_core/manifest.json"
    templates_dir = root_dir / "templates"
    
    errors = []
    warnings = []
    
    # Load manifest
    with open(manifest_path) as f:
        manifest_data = json.load(f)
    
    # Get templates array
    templates = manifest_data.get("templates", [])
    
    # Track which template files we've seen in manifest
    manifest_files = set()
    
    # Check each manifest entry
    for entry in templates:
        template_id = entry["id"]
        
        for asset in entry.get("assets", []):
            filename = asset["filename"]
            expected_sha = asset["sha256"]
            
            # Track this file
            manifest_files.add(filename)
            
            # Check if file exists
            file_path = templates_dir / filename
            if not file_path.exists():
                errors.append(f"❌ Template '{template_id}': File '{filename}' referenced in manifest but not found")
                continue
            
            # Check SHA256 matches
            actual_sha = sha256_file(file_path)
            if actual_sha != expected_sha:
                errors.append(f"❌ Template '{template_id}': SHA256 mismatch for '{filename}'")
                errors.append(f"   Expected: {expected_sha}")
                errors.append(f"   Actual:   {actual_sha}")
    
    # Check for template files not in manifest
    for file_path in templates_dir.glob("*.json"):
        if file_path.name not in manifest_files:
            warnings.append(f"⚠️  Template file '{file_path.name}' exists but not referenced in manifest")
    
    # Report results
    print("🔍 Manifest Validation Results")
    print("=" * 50)
    
    if not errors and not warnings:
        print("✅ All manifest entries are valid!")
        return True
    
    if warnings:
        print("\n📋 Warnings:")
        for warning in warnings:
            print(f"  {warning}")
    
    if errors:
        print("\n💥 Errors:")
        for error in errors:
            print(f"  {error}")
        print(f"\n❌ Found {len(errors)} error(s)")
        return False
    
    print(f"\n✅ No errors found ({len(warnings)} warning(s))")
    return True

if __name__ == "__main__":
    success = validate_manifests()
    sys.exit(0 if success else 1)