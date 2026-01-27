#!/usr/bin/env python3
"""
Sync manifest and package assets for ComfyUI subgraph blueprints.

Reads `blueprints_bundles.json` to determine which blueprints to include,
hashes every blueprint/asset, writes the consolidated manifest into the core
package, and mirrors assets into the blueprints package directory.
"""

import argparse
import hashlib
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BLUEPRINTS_DIR = ROOT / "blueprints"
CORE_MANIFEST = (
    ROOT
    / "packages"
    / "core"
    / "src"
    / "comfyui_workflow_templates_core"
    / "blueprints_manifest.json"
)

BUNDLE_TARGET = (
    ROOT
    / "packages"
    / "blueprints"
    / "src"
    / "comfyui_subgraph_blueprints"
    / "blueprints"
)

BUNDLES_CONFIG = ROOT / "blueprints_bundles.json"


def sha256_for_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def load_blueprint_data(blueprint_id: str):
    json_path = BLUEPRINTS_DIR / f"{blueprint_id}.json"
    try:
        with json_path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:
        raise SystemExit(f"Failed to parse blueprint JSON '{json_path}': {exc}")


def load_bundles_config() -> dict:
    if not BUNDLES_CONFIG.exists():
        raise SystemExit(f"Bundle configuration not found: {BUNDLES_CONFIG}")
    with BUNDLES_CONFIG.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        raise SystemExit("`blueprints_bundles.json` must be a dict with 'blueprints' key.")

    if "blueprints" not in data:
        raise SystemExit("`blueprints_bundles.json` must contain a 'blueprints' key.")

    entries = data["blueprints"]
    if not isinstance(entries, list):
        raise SystemExit("'blueprints' must be a list of blueprint ids.")

    seen = set()
    normalized = []
    for blueprint_id in sorted(entries):
        if not isinstance(blueprint_id, str):
            raise SystemExit(f"Blueprint id '{blueprint_id}' must be a string.")
        if blueprint_id in seen:
            raise SystemExit(f"Blueprint '{blueprint_id}' listed more than once.")
        seen.add(blueprint_id)
        normalized.append(blueprint_id)

    return {"blueprints": normalized}


def build_manifest():
    bundle_map = load_bundles_config()
    blueprint_ids = bundle_map["blueprints"]

    declared_blueprints = set(blueprint_ids)
    on_disk_blueprints = {
        entry.name[:-5]
        for entry in BLUEPRINTS_DIR.iterdir()
        if entry.name.endswith(".json") and not entry.name.startswith("index")
    }

    missing_from_manifest = sorted(on_disk_blueprints - declared_blueprints)
    if missing_from_manifest:
        raise SystemExit(
            "blueprints_bundles.json is missing blueprint assignments for: "
            + ", ".join(missing_from_manifest)
        )

    missing_on_disk = sorted(declared_blueprints - on_disk_blueprints)
    if missing_on_disk:
        raise SystemExit(
            "blueprints_bundles.json references blueprints that do not exist: "
            + ", ".join(missing_on_disk)
        )

    blueprints = []
    for blueprint_id in blueprint_ids:
        _ = load_blueprint_data(blueprint_id)  # ensure JSON is readable
        assets = []
        json_name = f"{blueprint_id}.json"
        json_path = BLUEPRINTS_DIR / json_name
        if json_path.exists():
            assets.append(
                {
                    "filename": json_name,
                    "sha256": sha256_for_file(json_path),
                }
            )
        media_patterns = [
            f"{blueprint_id}*.webp",
            f"{blueprint_id}*.png",
            f"{blueprint_id}*.jpg",
            f"{blueprint_id}*.jpeg",
            f"{blueprint_id}*.gif",
        ]
        seen = set()
        for pattern in media_patterns:
            for asset_path in sorted(BLUEPRINTS_DIR.glob(pattern)):
                if asset_path.name in seen:
                    continue
                seen.add(asset_path.name)
                assets.append(
                    {
                        "filename": asset_path.name,
                        "sha256": sha256_for_file(asset_path),
                    }
                )
        blueprints.append(
            {
                "id": blueprint_id,
                "bundle": "blueprints",
                "version": "0.0.0",
                "assets": assets,
            }
        )

    manifest = {
        "manifest_version": 1,
        "bundles": {
            "blueprints": {"version": "0.0.0"},
        },
        "blueprints": blueprints,
    }
    return manifest


def sync_bundle_directory(manifest: dict, dry_run: bool = False) -> None:
    if dry_run:
        return

    if BUNDLE_TARGET.exists():
        shutil.rmtree(BUNDLE_TARGET)
    BUNDLE_TARGET.mkdir(parents=True, exist_ok=True)

    for blueprint in manifest["blueprints"]:
        for asset in blueprint["assets"]:
            src = BLUEPRINTS_DIR / asset["filename"]
            if not src.exists():
                continue
            shutil.copy2(src, BUNDLE_TARGET / asset["filename"])


def write_manifest(manifest: dict, dry_run: bool = False) -> None:
    payload = json.dumps(manifest, indent=2)
    if dry_run:
        print("Dry run - manifest would be:")
        print(payload[:500] + "..." if len(payload) > 500 else payload)
        return
    CORE_MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    CORE_MANIFEST.write_text(payload)


def main():
    parser = argparse.ArgumentParser(
        description="Generate manifest and sync blueprints package."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only show what would be done without making changes.",
    )
    args = parser.parse_args()

    if not BLUEPRINTS_DIR.exists():
        raise SystemExit(f"Blueprints directory not found: {BLUEPRINTS_DIR}")
    manifest = build_manifest()
    write_manifest(manifest, dry_run=args.dry_run)
    sync_bundle_directory(manifest, dry_run=args.dry_run)
    if not args.dry_run:
        print(f"Wrote manifest to {CORE_MANIFEST}")
        print("Synced blueprint assets into package directory.")
    else:
        print("Dry run complete.")


if __name__ == "__main__":
    main()
