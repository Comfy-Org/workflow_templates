#!/usr/bin/env python3
"""
Import blueprints from external sources and normalize them.

This script:
1. Renames blueprint files to use underscores instead of spaces/special chars
2. Extracts metadata from blueprint JSON to generate index.json
3. Updates blueprints_bundles.json with all blueprint IDs
"""

import json
import re
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


def extract_metadata(blueprint_data: dict) -> dict:
    """Extract metadata from a blueprint JSON."""
    subgraphs = blueprint_data.get("definitions", {}).get("subgraphs", [])
    if not subgraphs:
        return {}
    
    subgraph = subgraphs[0]
    name = subgraph.get("name", "Unknown")
    
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


def rename_blueprints():
    """Rename blueprint files to use normalized names."""
    renames = {}
    
    for path in BLUEPRINTS_DIR.glob("*.json"):
        if path.name.startswith("index"):
            continue
        
        old_name = path.stem
        new_name = normalize_filename(old_name)
        
        if old_name != new_name:
            new_path = path.parent / f"{new_name}.json"
            if new_path.exists() and new_path != path:
                print(f"Warning: {new_path} already exists, skipping rename of {path}")
                continue
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
    print("=== Importing Blueprints ===\n")
    
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
