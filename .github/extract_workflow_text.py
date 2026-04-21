#!/usr/bin/env python3
"""
Extract text content from workflow JSON files for spellchecking.
Reads all workflow JSONs in a directory and outputs the combined text
from MarkdownNote and Note nodes to a single file.
"""
import argparse
import json
import sys
from pathlib import Path


def extract_notes_from_workflow(path: Path) -> list[str]:
    """Return text strings from MarkdownNote/Note nodes in a workflow JSON."""
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []

    nodes = []
    if isinstance(data, dict):
        if "nodes" in data:
            nodes = data["nodes"]
        elif "workflow" in data and "nodes" in data.get("workflow", {}):
            nodes = data["workflow"]["nodes"]
    elif isinstance(data, list):
        nodes = data

    texts = []
    for node in nodes:
        if not isinstance(node, dict):
            continue
        if node.get("type") not in ("MarkdownNote", "Note"):
            continue
        for value in node.get("widgets_values", []):
            if isinstance(value, str) and value.strip():
                texts.append(value.strip())

    return texts


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-dir", required=True, help="Directory containing workflow JSON files")
    parser.add_argument("--output-file", required=True, help="Output text file for spellchecking")
    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    if not input_dir.is_dir():
        print(f"Error: {input_dir} is not a directory", file=sys.stderr)
        sys.exit(1)

    workflow_files = [
        p for p in sorted(input_dir.glob("*.json"))
        if not p.name.startswith("index")
    ]

    all_texts: list[str] = []
    for wf_path in workflow_files:
        texts = extract_notes_from_workflow(wf_path)
        all_texts.extend(texts)

    output = Path(args.output_file)
    output.parent.mkdir(parents=True, exist_ok=True)

    if all_texts:
        output.write_text("\n\n---\n\n".join(all_texts), encoding="utf-8")
        print(f"Extracted {len(all_texts)} note(s) from {len(workflow_files)} workflow(s) → {output}")
    else:
        # Write a placeholder so pyspelling doesn't fail on a missing file
        output.write_text("", encoding="utf-8")
        print(f"No notes found in {len(workflow_files)} workflow(s); wrote empty file → {output}")


if __name__ == "__main__":
    main()
