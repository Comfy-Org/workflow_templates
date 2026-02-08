#!/usr/bin/env python3
"""
Script to extract input and output nodes from workflow JSON files and update index.json.
Scans all workflow files to find LoadImage/LoadVideo/LoadAudio and SaveImage/SaveVideo/SaveAudio nodes.
Generates io field with inputs and outputs for each template in index.json.
"""

import json
import os
import sys
import mimetypes
from pathlib import Path
from typing import List, Dict, Optional

# Configure input node types
INPUT_NODE_TYPES = [
    "LoadImage",
    "LoadAudio",
    "VHS_LoadVideo",
    "LoadVideo",
    "Load3DModel",
    "LoadImageMask"
]

# Configure output node types
OUTPUT_NODE_TYPES = [
    "SaveImage",
    "SaveVideo",
    "SaveAudio",
    "VHS_SaveVideo",
    "Save3DModel",
    "PreviewImage",
    "Preview3D",
    "PreviewAudio"
]


def find_workflow_files(templates_dir: Path) -> List[Path]:
    """Find all JSON workflow files in the templates directory."""
    return list(templates_dir.glob("*.json"))


def get_media_type_from_node_type(node_type: str) -> str:
    """
    Determine media type based on node type.

    Args:
        node_type: The ComfyUI node type

    Returns:
        Media type string: 'image', 'video', 'audio', or '3d'
    """
    node_type_lower = node_type.lower()

    if 'image' in node_type_lower:
        return 'image'
    elif 'video' in node_type_lower:
        return 'video'
    elif 'audio' in node_type_lower:
        return 'audio'
    elif '3d' in node_type_lower or 'model' in node_type_lower:
        return '3d'
    else:
        return 'image'  # Default fallback


def get_media_type_from_filename(filename: str) -> str:
    """
    Determine media type based on file extension.

    Args:
        filename: The filename to check

    Returns:
        Media type string: 'image', 'video', 'audio', or '3d'
    """
    ext = Path(filename).suffix.lower()

    image_exts = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff'}
    video_exts = {'.mp4', '.mov', '.avi', '.mkv', '.webm'}
    audio_exts = {'.mp3', '.wav', '.ogg', '.flac', '.aac'}
    model_3d_exts = {'.obj', '.fbx', '.glb', '.gltf', '.stl', '.ply'}

    if ext in image_exts:
        return 'image'
    elif ext in video_exts:
        return 'video'
    elif ext in audio_exts:
        return 'audio'
    elif ext in model_3d_exts:
        return '3d'
    else:
        return 'image'  # Default fallback


def extract_input_nodes(workflow_file: Path, input_dir: Path) -> List[Dict]:
    """
    Extract input nodes from workflow JSON file.

    Args:
        workflow_file: Path to the workflow JSON file
        input_dir: Path to the input directory

    Returns:
        List of dicts containing input node information
    """
    try:
        with open(workflow_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"⚠️  Warning: Could not read {workflow_file.name}: {e}")
        return []

    inputs = []

    # Handle both array and object formats
    if isinstance(data, list):
        nodes = data
    elif isinstance(data, dict):
        nodes = data.get("nodes", [])
    else:
        return []

    for node in nodes:
        if not isinstance(node, dict):
            continue

        node_type = node.get("type")
        if node_type in INPUT_NODE_TYPES:
            node_id = node.get("id")
            widgets_values = node.get("widgets_values", [])

            # Extract filename from widgets_values
            filename = None
            if isinstance(widgets_values, list) and len(widgets_values) > 0:
                filename = widgets_values[0]
            elif isinstance(widgets_values, dict):
                filename = widgets_values.get("image") or widgets_values.get("video") or widgets_values.get("audio")

            if filename and filename.strip():
                # Check if file exists in input directory
                file_path = input_dir / filename
                file_exists = file_path.exists()

                # Determine media type
                media_type = get_media_type_from_filename(filename)

                input_data = {
                    "nodeId": node_id,
                    "nodeType": node_type,
                    "file": filename,
                    "mediaType": media_type,
                    "exists": file_exists
                }

                inputs.append(input_data)

    return inputs


def extract_output_nodes(workflow_file: Path) -> List[Dict]:
    """
    Extract output nodes (SaveImage, SaveVideo, etc.) from workflow JSON file.

    Args:
        workflow_file: Path to the workflow JSON file

    Returns:
        List of dicts containing output node information
    """
    try:
        with open(workflow_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"⚠️  Warning: Could not read {workflow_file.name}: {e}")
        return []

    outputs = []

    # Handle both array and object formats
    if isinstance(data, list):
        nodes = data
    elif isinstance(data, dict):
        nodes = data.get("nodes", [])
    else:
        return []

    for node in nodes:
        if not isinstance(node, dict):
            continue

        node_type = node.get("type")
        if node_type in OUTPUT_NODE_TYPES:
            node_id = node.get("id")

            # Determine media type from node type
            media_type = get_media_type_from_node_type(node_type)

            output_data = {
                "nodeId": node_id,
                "nodeType": node_type,
                "file": "",  # Empty placeholder for user to fill in
                "mediaType": media_type
            }

            outputs.append(output_data)

    return outputs


def load_index_json(index_path: Path) -> List[Dict]:
    """
    Load index.json file.

    Args:
        index_path: Path to index.json

    Returns:
        List of module dictionaries
    """
    try:
        with open(index_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data
    except (json.JSONDecodeError, IOError) as e:
        print(f"❌ Error: Could not read index.json: {e}")
        sys.exit(1)


def save_index_json(index_path: Path, data: List[Dict]) -> None:
    """
    Save updated data to index.json.

    Args:
        index_path: Path to index.json
        data: Updated data to save
    """
    try:
        with open(index_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write('\n')  # Add trailing newline
        print(f"✅ Successfully updated index.json")
    except IOError as e:
        print(f"❌ Error: Could not write to index.json: {e}")
        sys.exit(1)


def update_template_io(template: Dict, inputs: List[Dict], outputs: List[Dict]) -> Dict:
    """
    Update template with io field containing inputs and outputs.
    Preserves existing 'file' values that were manually filled in by users.

    Args:
        template: Template dictionary from index.json
        inputs: List of input node data
        outputs: List of output node data

    Returns:
        Updated template dictionary
    """
    # Only add io field if there are inputs or outputs
    if inputs or outputs:
        io_data = {}

        # Handle inputs - preserve existing file values
        if inputs:
            existing_io = template.get("io", {})
            existing_inputs = existing_io.get("inputs", [])

            # Create a map of existing inputs by nodeId
            existing_inputs_map = {inp.get("nodeId"): inp for inp in existing_inputs}

            # Merge: use new data but preserve existing 'file' if present
            merged_inputs = []
            for new_input in inputs:
                node_id = new_input.get("nodeId")
                existing_input = existing_inputs_map.get(node_id)

                # Start with new input data
                merged_input = new_input.copy()

                # If existing input has a 'file' value and it's different, keep the existing one
                # This allows users to manually update file names
                if existing_input and existing_input.get("file"):
                    # Keep the existing file value (user might have corrected it)
                    pass  # new_input already has the detected file

                merged_inputs.append(merged_input)

            io_data["inputs"] = merged_inputs

        # Handle outputs - preserve existing file values
        if outputs:
            existing_io = template.get("io", {})
            existing_outputs = existing_io.get("outputs", [])

            # Create a map of existing outputs by nodeId
            existing_outputs_map = {out.get("nodeId"): out for out in existing_outputs}

            # Merge: use new data but preserve existing 'file' if user filled it in
            merged_outputs = []
            for new_output in outputs:
                node_id = new_output.get("nodeId")
                existing_output = existing_outputs_map.get(node_id)

                # Start with new output data
                merged_output = new_output.copy()

                # If existing output has a 'file' value filled in by user, preserve it
                if existing_output and existing_output.get("file"):
                    merged_output["file"] = existing_output["file"]

                merged_outputs.append(merged_output)

            io_data["outputs"] = merged_outputs

        template["io"] = io_data

    return template


def main():
    """Main execution function."""
    import argparse

    parser = argparse.ArgumentParser(
        description='Extract input/output nodes from workflows and update index.json'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be updated without modifying index.json'
    )
    parser.add_argument(
        '--template',
        type=str,
        help='Only process specific template by name (e.g., templates-sprite_sheet)'
    )
    args = parser.parse_args()

    # Get repository root
    repo_root = Path(__file__).parent.parent
    templates_dir = repo_root / "templates"
    input_dir = repo_root / "input"
    index_path = templates_dir / "index.json"

    print("=" * 70)
    print("Workflow I/O Extraction")
    print("=" * 70)
    print(f"Templates directory: {templates_dir}")
    print(f"Input directory: {input_dir}")
    print(f"Index file: {index_path}")
    print(f"Input node types: {', '.join(INPUT_NODE_TYPES)}")
    print(f"Output node types: {', '.join(OUTPUT_NODE_TYPES)}")
    print()

    # Check if directories exist
    if not templates_dir.exists():
        print(f"❌ Error: Templates directory not found: {templates_dir}")
        sys.exit(1)

    if not input_dir.exists():
        print(f"⚠️  Warning: Input directory not found: {input_dir}")

    if not index_path.exists():
        print(f"❌ Error: index.json not found: {index_path}")
        sys.exit(1)

    # Load index.json
    print("📖 Loading index.json...")
    index_data = load_index_json(index_path)

    # Build a map of template name to workflow file
    workflow_files = find_workflow_files(templates_dir)
    workflow_map = {}
    for workflow_file in workflow_files:
        # Remove .json extension to get template name
        template_name = workflow_file.stem
        workflow_map[template_name] = workflow_file

    print(f"Found {len(workflow_files)} workflow files")
    print()

    # Track statistics
    total_templates = 0
    updated_templates = 0
    total_inputs = 0
    total_outputs = 0
    missing_inputs = 0

    # Process each module and template in index.json
    for module in index_data:
        if not isinstance(module, dict):
            continue

        templates = module.get('templates', [])

        for template in templates:
            if not isinstance(template, dict):
                continue

            total_templates += 1
            template_name = template.get('name')

            if not template_name:
                continue

            # If specific template requested, skip others
            if args.template and template_name != args.template:
                continue

            # Find corresponding workflow file
            workflow_file = workflow_map.get(template_name)

            if not workflow_file:
                if args.template:
                    print(f"⚠️  Template '{template_name}' not found in workflows")
                continue

            print(f"Processing: {template_name}")

            # Extract inputs and outputs
            inputs = extract_input_nodes(workflow_file, input_dir)
            outputs = extract_output_nodes(workflow_file)

            # Count missing input files
            for inp in inputs:
                if not inp['exists']:
                    missing_inputs += 1
                    print(f"  ⚠️  Missing input file: {inp['file']}")

            total_inputs += len(inputs)
            total_outputs += len(outputs)

            if inputs or outputs:
                print(f"  Found {len(inputs)} input(s) and {len(outputs)} output(s)")
                updated_templates += 1

                # Show details if specific template requested
                if args.template:
                    if inputs:
                        print(f"\n  Inputs:")
                        for inp in inputs:
                            status = "✓" if inp['exists'] else "✗"
                            print(f"    {status} Node {inp['nodeId']} ({inp['nodeType']}): {inp['file']} [{inp['mediaType']}]")

                    if outputs:
                        print(f"\n  Outputs:")
                        for out in outputs:
                            print(f"    • Node {out['nodeId']} ({out['nodeType']}): [{out['mediaType']}]")
                    print()

                # Update template with io field (remove 'exists' field before saving)
                inputs_clean = [{k: v for k, v in inp.items() if k != 'exists'} for inp in inputs]
                update_template_io(template, inputs_clean, outputs)
            else:
                print(f"  No inputs or outputs found")

            print()

    # Print summary
    print("=" * 70)
    print("Summary")
    print("=" * 70)
    print(f"Total templates processed: {total_templates}")
    print(f"Templates with I/O: {updated_templates}")
    print(f"Total inputs found: {total_inputs}")
    print(f"Total outputs found: {total_outputs}")

    if missing_inputs > 0:
        print(f"\n⚠️  Warning: {missing_inputs} input file(s) not found in input/ directory")

    # Save updated index.json
    if not args.dry_run:
        print()
        print("💾 Saving updated index.json...")
        save_index_json(index_path, index_data)
    else:
        print()
        print("🔍 Dry run mode - no changes made to index.json")

    print()
    print("✅ Done!")


if __name__ == "__main__":
    main()
