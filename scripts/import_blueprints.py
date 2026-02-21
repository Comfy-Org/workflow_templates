#!/usr/bin/env python3
"""
Import blueprints from external sources and normalize them.

This script:
0. (Optional) Copy blueprint JSONs from another directory via --source
0.5. Sanitize subgraph names: strip local- / local_ from definitions.subgraphs[0].name
     (filenames keep local_ prefix; only the JSON content is updated)
1. Renames blueprint files to use underscores instead of spaces/special chars
2. Extracts metadata from blueprint JSON to generate index.json
3. Updates blueprints_bundles.json with all blueprint IDs
"""

import argparse
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BLUEPRINTS_DIR = ROOT / "blueprints"
BUNDLES_CONFIG = ROOT / "blueprints_bundles.json"


def normalize_filename(name: str) -> str:
    """Convert a human-readable name to a valid filename."""
    # Remove .json extension if present
    if name.endswith(".json"):
        name = name[:-5]
    # Replace spaces, parentheses, dots with underscores
    normalized = re.sub(r"[\s\(\)\.\-]+", "_", name)
    # Remove leading/trailing underscores
    normalized = normalized.strip("_")
    # Convert to lowercase
    normalized = normalized.lower()
    # Collapse multiple underscores
    normalized = re.sub(r"_+", "_", normalized)
    return normalized


def strip_local_prefix(name: str) -> str:
    """Remove local- or local_ prefix from subgraph/display names."""
    if not name:
        return name
    for prefix in ("local-", "local_"):
        if name.startswith(prefix):
            return name[len(prefix) :].strip()
    return name


def extract_metadata(blueprint_data: dict) -> dict:
    """Extract metadata from a blueprint JSON."""
    subgraphs = blueprint_data.get("definitions", {}).get("subgraphs", [])
    if not subgraphs:
        return {}
    
    subgraph = subgraphs[0]
    raw_name = subgraph.get("name", "Unknown")
    name = strip_local_prefix(raw_name)
    
    # Extract inputs
    inputs = []
    for inp in subgraph.get("inputs", []):
        inputs.append({
            "name": inp.get("name", ""),
            "type": inp.get("type", ""),
        })
    
    # Extract outputs
    outputs = []
    for out in subgraph.get("outputs", []):
        outputs.append({
            "name": out.get("name", ""),
            "type": out.get("type", ""),
        })
    
    # Determine media type from outputs
    output_types = [o["type"] for o in outputs]
    if "IMAGE" in output_types:
        media_type = "image"
    elif "VIDEO" in output_types or "LATENT" in output_types:
        # Many video blueprints output latents
        if "video" in name.lower():
            media_type = "video"
        else:
            media_type = "image"
    elif "AUDIO" in output_types:
        media_type = "audio"
    else:
        media_type = "image"
    
    # Determine category from name
    name_lower = name.lower()
    if "text to image" in name_lower:
        category = "Text to Image"
    elif "image edit" in name_lower:
        category = "Image Editing"
    elif "text to video" in name_lower:
        category = "Text to Video"
    elif "image to video" in name_lower or "i2v" in name_lower:
        category = "Image to Video"
    elif "controlnet" in name_lower or "control" in name_lower:
        category = "ControlNet"
    elif "inpaint" in name_lower:
        category = "Inpainting"
    elif "outpaint" in name_lower:
        category = "Outpainting"
    elif "video" in name_lower:
        category = "Video"
    elif "audio" in name_lower:
        category = "Audio"
    elif "layer" in name_lower:
        category = "Layers"
    elif "depth" in name_lower:
        category = "Depth"
    elif "reference" in name_lower:
        category = "Reference"
    else:
        category = "Other"
    
    # Extract model info from nodes
    models = []
    for node in subgraph.get("nodes", []):
        node_models = node.get("properties", {}).get("models", [])
        for m in node_models:
            model_name = m.get("name", "")
            if model_name and model_name not in models:
                models.append(model_name)
    
    return {
        "title": name,
        "description": f"{name} blueprint",
        "category": category,
        "mediaType": media_type,
        "mediaSubtype": "webp",
        "inputs": inputs,
        "outputs": outputs,
        "models": models[:5],  # Limit to first 5 models
    }


def sanitize_subgraph_names():
    """
    Rewrite blueprint JSONs: remove local- / local_ prefix from
    definitions.subgraphs[0].name so the subgraph displays the same name
    as the cloud version (files keep their local_ filename).
    Returns count of files modified.
    """
    count = 0
    for path in sorted(BLUEPRINTS_DIR.glob("*.json")):
        if path.name.startswith("index"):
            continue
        try:
            with path.open("r", encoding="utf-8") as f:
                data = json.load(f)
        except json.JSONDecodeError as e:
            print(f"Warning: Could not parse {path}: {e}")
            continue
        subgraphs = data.get("definitions", {}).get("subgraphs", [])
        if not subgraphs:
            continue
        subgraph = subgraphs[0]
        raw_name = subgraph.get("name", "")
        new_name = strip_local_prefix(raw_name)
        if new_name != raw_name:
            subgraph["name"] = new_name
            with path.open("w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            print(f"Sanitized subgraph name in: {path.name}")
            count += 1
    return count


def copy_from_source(source_dir: Path) -> int:
    """
    Copy blueprint JSON files from source_dir into BLUEPRINTS_DIR (skip index*).
    Existing files with the same name are overwritten (replace in place).
    Returns count copied.
    """
    source_dir = source_dir.resolve()
    if not source_dir.is_dir():
        raise SystemExit(f"Source directory not found: {source_dir}")
    BLUEPRINTS_DIR.mkdir(parents=True, exist_ok=True)
    count = 0
    for path in sorted(source_dir.glob("*.json")):
        if path.name.startswith("index"):
            continue
        dest = BLUEPRINTS_DIR / path.name
        existed = dest.exists()
        shutil.copy2(path, dest)
        print(f"{'Replaced' if existed else 'Copied'}: {path.name}")
        count += 1
    return count


def rename_blueprints():
    """
    Rename blueprint files to normalized names (lowercase, underscores).
    If the normalized target already exists, replace it (so imported content wins).
    """
    renames = {}
    
    for path in sorted(BLUEPRINTS_DIR.glob("*.json")):
        if path.name.startswith("index"):
            continue
        
        old_name = path.stem
        new_name = normalize_filename(old_name)
        
        if old_name != new_name:
            new_path = path.parent / f"{new_name}.json"
            if new_path.exists() and new_path != path:
                new_path.unlink()  # replace existing with the file we're renaming
                print(f"Replaced: {path.name} -> {new_name}.json")
            else:
                print(f"Renaming: {path.name} -> {new_name}.json")
            path.rename(new_path)
            renames[old_name] = new_name
    
    return renames


def generate_index():
    """Generate index.json from blueprint files."""
    blueprints_by_category = {}
    
    for path in sorted(BLUEPRINTS_DIR.glob("*.json")):
        if path.name.startswith("index"):
            continue
        
        try:
            with path.open("r", encoding="utf-8") as f:
                data = json.load(f)
        except json.JSONDecodeError as e:
            print(f"Warning: Could not parse {path}: {e}")
            continue
        
        metadata = extract_metadata(data)
        if not metadata:
            print(f"Warning: No subgraph definition in {path}")
            continue
        
        blueprint_id = path.stem
        category = metadata.pop("category", "Other")
        
        entry = {
            "name": blueprint_id,
            **metadata,
        }
        
        if category not in blueprints_by_category:
            blueprints_by_category[category] = []
        blueprints_by_category[category].append(entry)
    
    # Build index structure
    index = []
    category_order = [
        "Text to Image",
        "Image Editing",
        "Inpainting",
        "Outpainting",
        "ControlNet",
        "Reference",
        "Layers",
        "Depth",
        "Text to Video",
        "Image to Video",
        "Video",
        "Audio",
        "Other",
    ]
    
    for category in category_order:
        if category not in blueprints_by_category:
            continue
        index.append({
            "moduleName": "default",
            "title": category,
            "blueprints": blueprints_by_category[category],
        })
    
    # Add any remaining categories
    for category, blueprints in blueprints_by_category.items():
        if category not in category_order:
            index.append({
                "moduleName": "default",
                "title": category,
                "blueprints": blueprints,
            })
    
    return index


def generate_bundles():
    """Generate blueprints_bundles.json from blueprint files."""
    blueprint_ids = []
    
    for path in sorted(BLUEPRINTS_DIR.glob("*.json")):
        if path.name.startswith("index"):
            continue
        blueprint_ids.append(path.stem)
    
    return {"blueprints": blueprint_ids}


def main():
    parser = argparse.ArgumentParser(
        description="Import blueprints: optionally copy from another dir, then normalize and generate index/bundles."
    )
    parser.add_argument(
        "--source",
        "-s",
        type=Path,
        default=None,
        metavar="DIR",
        help="Copy blueprint JSONs from this directory into blueprints/ before renaming and generating index",
    )
    args = parser.parse_args()

    print("=== Importing Blueprints ===\n")

    if args.source is not None:
        print("Step 0: Copying from source directory...")
        n = copy_from_source(args.source)
        print(f"Copied {n} file(s)\n")

    # Step 0.5: Sanitize subgraph names (strip local- prefix from JSON content)
    print("Step 0.5: Sanitizing subgraph names in JSON...")
    sanitized = sanitize_subgraph_names()
    print(f"Sanitized {sanitized} file(s)\n")

    # Step 1: Rename files
    print("Step 1: Renaming blueprint files...")
    renames = rename_blueprints()
    print(f"Renamed {len(renames)} files\n")

    # Step 2: Generate index.json
    print("Step 2: Generating index.json...")
    index = generate_index()
    index_path = BLUEPRINTS_DIR / "index.json"
    with index_path.open("w", encoding="utf-8") as f:
        json.dump(index, f, indent=2)
    total_blueprints = sum(len(cat["blueprints"]) for cat in index)
    print(f"Generated index with {len(index)} categories, {total_blueprints} blueprints\n")
    
    # Step 3: Generate blueprints_bundles.json
    print("Step 3: Generating blueprints_bundles.json...")
    bundles = generate_bundles()
    with BUNDLES_CONFIG.open("w", encoding="utf-8") as f:
        json.dump(bundles, f, indent=2)
    print(f"Generated bundles with {len(bundles['blueprints'])} blueprints\n")
    
    print("=== Import Complete ===")
    print(f"\nNext steps:")
    print(f"  1. Review blueprints/index.json")
    print(f"  2. Run: python scripts/sync_blueprints.py")


if __name__ == "__main__":
    main()
