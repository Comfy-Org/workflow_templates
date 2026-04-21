#!/usr/bin/env python3
"""
Validate subgraph blueprints.

This script validates:
1. JSON syntax for all blueprint files
2. index.json against the schema
3. Blueprint structure (definitions.subgraphs present with required fields)
4. blueprints_bundles.json consistency with files on disk
"""

import argparse
import json
import sys
from pathlib import Path

try:
    import jsonschema
    HAS_JSONSCHEMA = True
except ImportError:
    HAS_JSONSCHEMA = False

ROOT = Path(__file__).resolve().parents[1]
BLUEPRINTS_DIR = ROOT / "blueprints"
BUNDLES_CONFIG = ROOT / "blueprints_bundles.json"


def validate_json_syntax() -> list[str]:
    """Check that all blueprint JSON files have valid syntax."""
    errors = []
    for bp_file in sorted(BLUEPRINTS_DIR.glob("*.json")):
        try:
            with bp_file.open() as f:
                json.load(f)
        except json.JSONDecodeError as e:
            errors.append(f"{bp_file.name}: Invalid JSON - {e}")
    return errors


def validate_index_schema() -> list[str]:
    """Validate index.json against the schema."""
    if not HAS_JSONSCHEMA:
        print("Warning: jsonschema not installed, skipping schema validation")
        return []

    errors = []
    schema_path = BLUEPRINTS_DIR / "index.schema.json"
    index_path = BLUEPRINTS_DIR / "index.json"

    if not schema_path.exists():
        errors.append("index.schema.json not found")
        return errors
    if not index_path.exists():
        errors.append("index.json not found")
        return errors

    try:
        with schema_path.open() as f:
            schema = json.load(f)
        with index_path.open() as f:
            index = json.load(f)
        jsonschema.validate(index, schema)
    except jsonschema.ValidationError as e:
        errors.append(f"Schema validation failed: {e.message}")
    except json.JSONDecodeError as e:
        errors.append(f"JSON parse error: {e}")

    return errors


def validate_blueprint_structure() -> list[str]:
    """Check that each blueprint has the required structure."""
    errors = []

    for bp_file in sorted(BLUEPRINTS_DIR.glob("*.json")):
        if bp_file.name.startswith("index"):
            continue

        try:
            with bp_file.open() as f:
                data = json.load(f)

            if "definitions" not in data:
                errors.append(f'{bp_file.name}: Missing "definitions" key')
                continue

            subgraphs = data.get("definitions", {}).get("subgraphs", [])
            if not subgraphs:
                errors.append(f'{bp_file.name}: Missing "definitions.subgraphs" array')
                continue

            sg = subgraphs[0]
            if "name" not in sg:
                errors.append(f"{bp_file.name}: Missing subgraph name")
            if "inputs" not in sg:
                errors.append(f"{bp_file.name}: Missing subgraph inputs")
            if "outputs" not in sg:
                errors.append(f"{bp_file.name}: Missing subgraph outputs")
            if "nodes" not in sg:
                errors.append(f"{bp_file.name}: Missing subgraph nodes")

        except json.JSONDecodeError:
            pass  # Already caught in syntax check

    return errors


def validate_bundles_consistency() -> list[str]:
    """Check that blueprints_bundles.json matches files on disk."""
    errors = []

    if not BUNDLES_CONFIG.exists():
        errors.append("blueprints_bundles.json not found")
        return errors

    try:
        with BUNDLES_CONFIG.open() as f:
            bundles = json.load(f)
    except json.JSONDecodeError as e:
        errors.append(f"blueprints_bundles.json: Invalid JSON - {e}")
        return errors

    blueprint_ids = set(bundles.get("blueprints", []))

    on_disk = {
        p.stem
        for p in BLUEPRINTS_DIR.glob("*.json")
        if not p.name.startswith("index")
    }

    missing_from_bundles = on_disk - blueprint_ids
    missing_on_disk = blueprint_ids - on_disk

    if missing_from_bundles:
        errors.append(f"Blueprints not in bundles.json: {sorted(missing_from_bundles)}")
    if missing_on_disk:
        errors.append(f"Bundles.json references missing files: {sorted(missing_on_disk)}")

    return errors


def main():
    parser = argparse.ArgumentParser(description="Validate subgraph blueprints")
    parser.parse_args()

    all_errors = []

    print("Checking JSON syntax...")
    errors = validate_json_syntax()
    if errors:
        all_errors.extend(errors)
        print(f"  ❌ {len(errors)} syntax error(s)")
    else:
        print("  ✅ All JSON files have valid syntax")

    print("Validating index.json against schema...")
    errors = validate_index_schema()
    if errors:
        all_errors.extend(errors)
        print(f"  ❌ {len(errors)} schema error(s)")
    else:
        print("  ✅ index.json validates against schema")

    print("Validating blueprint structure...")
    errors = validate_blueprint_structure()
    if errors:
        all_errors.extend(errors)
        print(f"  ❌ {len(errors)} structure error(s)")
    else:
        print("  ✅ All blueprints have valid structure")

    print("Checking blueprints_bundles.json consistency...")
    errors = validate_bundles_consistency()
    if errors:
        all_errors.extend(errors)
        print(f"  ❌ {len(errors)} consistency error(s)")
    else:
        print("  ✅ blueprints_bundles.json is consistent")

    if all_errors:
        print("\n❌ Validation failed with errors:")
        for err in all_errors:
            print(f"  - {err}")
        print("\nRun: python scripts/import_blueprints.py")
        sys.exit(1)
    else:
        print("\n✅ All validations passed")
        sys.exit(0)


if __name__ == "__main__":
    main()
