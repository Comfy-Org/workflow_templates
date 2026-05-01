#!/usr/bin/env python3
"""
Extract text content from workflow JSON files for spellchecking.
Reads all workflow JSONs in a directory and outputs the combined text
from MarkdownNote and Note nodes to a single file.

With --index, extracts English title/description/tag fields from index.json instead.
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


def extract_index_english_text(index_path: Path) -> list[str]:
    """Extract English title, description, and tag strings from index.json."""
    try:
        data = json.loads(index_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []

    texts = []
    for category in data:
        if not isinstance(category, dict):
            continue
        for template in category.get("templates", []):
            if not isinstance(template, dict):
                continue
            for field in ("title", "description"):
                value = template.get(field, "")
                if isinstance(value, str) and value.strip():
                    texts.append(value.strip())
            for tag in template.get("tags", []):
                if isinstance(tag, str) and tag.strip():
                    texts.append(tag.strip())
    return texts


def build_token_source_map(file_texts: list[tuple[str, list[str]]]) -> dict[str, list[str]]:
    """Return {lowercase_token: [filename, ...]} for every word in every text block."""
    import re
    token_map: dict[str, list[str]] = {}
    for filename, texts in file_texts:
        seen: set[str] = set()
        for text in texts:
            for token in re.findall(r"[A-Za-z']+", text):
                t = token.lower()
                if t not in seen:
                    seen.add(t)
                    token_map.setdefault(t, [])
                    if filename not in token_map[t]:
                        token_map[t].append(filename)
    return token_map


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-dir", required=True, help="Directory containing workflow JSON files (also used to find index.json with --index)")
    parser.add_argument("--output-file", required=True, help="Output text file for spellchecking")
    parser.add_argument("--source-map", help="Optional path to write a JSON token→[filename] map for error attribution")
    parser.add_argument("--files", nargs="*", help="Specific files to extract (relative or absolute paths); if omitted, all JSONs in --input-dir are used")
    parser.add_argument("--index", action="store_true", help="Extract English text from index.json instead of workflow note nodes")
    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    output = Path(args.output_file)
    output.parent.mkdir(parents=True, exist_ok=True)

    if args.index:
        index_path = input_dir / "index.json"
        if not index_path.exists():
            print(f"Error: {index_path} not found", file=sys.stderr)
            sys.exit(1)
        all_texts = extract_index_english_text(index_path)
        if all_texts:
            output.write_text("\n".join(all_texts), encoding="utf-8")
            print(f"Extracted {len(all_texts)} text field(s) from {index_path} → {output}")
        else:
            output.write_text("", encoding="utf-8")
            print(f"No text found in {index_path}; wrote empty file → {output}")
        if args.source_map:
            token_map = build_token_source_map([("index.json", all_texts)])
            Path(args.source_map).write_text(json.dumps(token_map), encoding="utf-8")
        return

    if not input_dir.is_dir():
        print(f"Error: {input_dir} is not a directory", file=sys.stderr)
        sys.exit(1)

    if args.files:
        workflow_files = sorted(Path(f) for f in args.files if not Path(f).name.startswith("index"))
    else:
        workflow_files = [
            p for p in sorted(input_dir.glob("*.json"))
            if not p.name.startswith("index")
        ]

    file_texts: list[tuple[str, list[str]]] = []
    all_texts: list[str] = []
    for wf_path in workflow_files:
        texts = extract_notes_from_workflow(wf_path)
        if texts:
            file_texts.append((wf_path.name, texts))
            all_texts.extend(texts)

    if all_texts:
        output.write_text("\n\n---\n\n".join(all_texts), encoding="utf-8")
        print(f"Extracted {len(all_texts)} note(s) from {len(workflow_files)} workflow(s) → {output}")
    else:
        output.write_text("", encoding="utf-8")
        print(f"No notes found in {len(workflow_files)} workflow(s); wrote empty file → {output}")

    if args.source_map:
        token_map = build_token_source_map(file_texts)
        Path(args.source_map).write_text(json.dumps(token_map), encoding="utf-8")


if __name__ == "__main__":
    main()
