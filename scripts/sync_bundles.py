#!/usr/bin/env python3
"""
Sync manifest and bundle package assets for the ComfyUI workflow templates.

Reads `bundles.json` to determine which templates belong to each media package,
hashes every workflow/asset, writes the consolidated manifest into the core
package, and mirrors assets into the bundle package directories. A copy of the
manifest is saved to `prd/phase1-manifest-sample.json` for review.
"""

import argparse
import hashlib
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEMPLATES_DIR = ROOT / "templates"
CORE_MANIFEST = (
    ROOT
    / "packages"
    / "core"
    / "src"
    / "comfyui_workflow_templates_core"
    / "manifest.json"
)
SAMPLE_MANIFEST = ROOT / "prd" / "phase1-manifest-sample.json"

BUNDLE_TARGETS = {
    "media-api": ROOT
    / "packages"
    / "media_api"
    / "src"
    / "comfyui_workflow_templates_media_api"
    / "templates",
    "media-video": ROOT
    / "packages"
    / "media_video"
    / "src"
    / "comfyui_workflow_templates_media_video"
    / "templates",
    "media-image": ROOT
    / "packages"
    / "media_image"
    / "src"
    / "comfyui_workflow_templates_media_image"
    / "templates",
    "media-other": ROOT
    / "packages"
    / "media_other"
    / "src"
    / "comfyui_workflow_templates_media_other"
    / "templates",
}
BUNDLES_CONFIG = ROOT / "bundles.json"

def sha256_for_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def load_template_data(template_id: str):
    json_path = TEMPLATES_DIR / f"{template_id}.json"
    try:
        with json_path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:
        raise SystemExit(f"Failed to parse template JSON '{json_path}': {exc}")


def load_bundles_config() -> dict:
    if not BUNDLES_CONFIG.exists():
        raise SystemExit(f"Bundle configuration not found: {BUNDLES_CONFIG}")
    with BUNDLES_CONFIG.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        raise SystemExit("`bundles.json` must map bundle names to template id lists.")

    valid_bundles = set(BUNDLE_TARGETS.keys())
    unknown_bundles = set(data.keys()) - valid_bundles
    if unknown_bundles:
        raise SystemExit(
            "Unknown bundle(s) in bundles.json: " + ", ".join(sorted(unknown_bundles))
        )

    normalized = {}
    seen = set()
    for bundle, entries in data.items():
        if not isinstance(entries, list):
            raise SystemExit(f"Bundle '{bundle}' must contain a list of template ids.")
        normalized[bundle] = []
        for template_id in sorted(entries):
            if not isinstance(template_id, str):
                raise SystemExit(
                    f"Template id '{template_id}' under bundle '{bundle}' must be a string."
                )
            if template_id in seen:
                raise SystemExit(
                    f"Template '{template_id}' assigned more than once in bundles.json."
                )
            seen.add(template_id)
            normalized[bundle].append(template_id)
    return normalized


def build_manifest():
    bundle_map = load_bundles_config()

    declared_templates = {tpl for templates in bundle_map.values() for tpl in templates}
    on_disk_templates = {
        entry.name[:-5] for entry in TEMPLATES_DIR.iterdir() if entry.name.endswith(".json")
    }

    missing_from_manifest = sorted(on_disk_templates - declared_templates)
    if missing_from_manifest:
        raise SystemExit(
            "bundles.json is missing template assignments for: "
            + ", ".join(missing_from_manifest)
        )

    missing_on_disk = sorted(declared_templates - on_disk_templates)
    if missing_on_disk:
        raise SystemExit(
            "bundles.json references templates that do not exist: "
            + ", ".join(missing_on_disk)
        )

    templates = []
    for bundle, template_ids in bundle_map.items():
        for template_id in template_ids:
            _ = load_template_data(template_id)  # ensure JSON is readable
            assets = []
            json_name = f"{template_id}.json"
            json_path = TEMPLATES_DIR / json_name
            if json_path.exists():
                assets.append(
                    {
                        "filename": json_name,
                        "sha256": sha256_for_file(json_path),
                    }
                )
            media_patterns = [
                f"{template_id}*.webp",
                f"{template_id}*.png",
                f"{template_id}*.jpg",
                f"{template_id}*.jpeg",
                f"{template_id}*.gif",
                f"{template_id}*.mp4",
                f"{template_id}*.webm",
                f"{template_id}*.mp3",
                f"{template_id}*.wav",
                f"{template_id}*.ogg",
                f"{template_id}*.flac",
                f"{template_id}*.m4a",
            ]
            seen = set()
            for pattern in media_patterns:
                for asset_path in sorted(TEMPLATES_DIR.glob(pattern)):
                    if asset_path.name in seen:
                        continue
                    seen.add(asset_path.name)
                    assets.append(
                        {
                            "filename": asset_path.name,
                            "sha256": sha256_for_file(asset_path),
                        }
                    )
            templates.append(
                {
                    "id": template_id,
                    "bundle": bundle,
                    "version": "0.0.0",  # placeholder for bundle version
                    "assets": assets,
                    "cdn": {"path": f"{bundle}/{template_id}/"},
                }
            )

    manifest = {
        "manifest_version": 1,
        "bundles": {
            "media-api": {"version": "0.0.0"},
            "media-video": {"version": "0.0.0"},
            "media-image": {"version": "0.0.0"},
            "media-other": {"version": "0.0.0"},
        },
        "templates": templates,
    }
    return manifest


def sync_bundle_directories(manifest: dict, dry_run: bool = False) -> None:
    if dry_run:
        return

    for target in BUNDLE_TARGETS.values():
        if target.exists():
            shutil.rmtree(target)
        target.mkdir(parents=True, exist_ok=True)

    for template in manifest["templates"]:
        bundle = template["bundle"]
        target_root = BUNDLE_TARGETS[bundle]
        for asset in template["assets"]:
            src = TEMPLATES_DIR / asset["filename"]
            if not src.exists():
                # Some optional assets (e.g., preview) may not exist; skip silently.
                continue
            shutil.copy2(src, target_root / asset["filename"])


def write_manifest(manifest: dict, dry_run: bool = False) -> None:
    payload = json.dumps(manifest, indent=2)
    SAMPLE_MANIFEST.write_text(payload)
    if dry_run:
        return
    CORE_MANIFEST.write_text(payload)


def main():
    parser = argparse.ArgumentParser(description="Generate manifest and sync media bundles.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only regenerate sample manifest (no copying into package directories).",
    )
    args = parser.parse_args()

    if not TEMPLATES_DIR.exists():
        raise SystemExit(f"Templates directory not found: {TEMPLATES_DIR}")
    manifest = build_manifest()
    write_manifest(manifest, dry_run=args.dry_run)
    sync_bundle_directories(manifest, dry_run=args.dry_run)
    target = CORE_MANIFEST if not args.dry_run else SAMPLE_MANIFEST
    print(f"Wrote manifest to {target}")
    if not args.dry_run:
        print("Synced media assets into package directories.")


if __name__ == "__main__":
    main()
