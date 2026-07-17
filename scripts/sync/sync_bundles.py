#!/usr/bin/env python3
"""
Sync manifest and bundle package assets for the ComfyUI workflow templates.

Reads `bundles.json` to determine which templates belong to each media package,
hashes every workflow/asset, writes the consolidated manifest into the core
package, and mirrors assets into the bundle package directories. A copy of the
manifest is saved to `prd/phase1-manifest-sample.json` for review.

Cloud-only filtering
--------------------
Templates whose ``includeOnDistributions`` list contains only cloud-specific
values (currently "cloud") are excluded from pip packages because local users
cannot run them.  During ``sync_bundle_directories`` the index JSON files are
rewritten on the fly with those entries removed, and the matching workflow
JSON / thumbnail assets are skipped entirely.
"""

import argparse
import hashlib
import json
import shutil
from pathlib import Path
from typing import Optional

# Distribution values that are considered "local" (non-cloud).
# A template is cloud-only when its includeOnDistributions is non-empty
# and contains none of these values.
LOCAL_DISTRIBUTIONS = {"local", "desktop", "mac", "windows"}

ROOT = Path(__file__).resolve().parents[2]
TEMPLATES_DIR = ROOT / "templates"
VERSION_POLICY_FILE = ROOT / "scripts" / "data" / "version_policy.json"
CORE_MANIFEST = (
    ROOT
    / "packages"
    / "core"
    / "src"
    / "comfyui_workflow_templates_core"
    / "manifest.json"
)
SAMPLE_MANIFEST = ROOT / "prd" / "phase1-manifest-sample.json"

JSON_TARGET = (
    ROOT
    / "packages"
    / "json"
    / "src"
    / "comfyui_workflow_templates_json"
    / "templates"
)

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
    "media-assets-01": ROOT
    / "packages"
    / "media_assets_01"
    / "src"
    / "comfyui_workflow_templates_media_assets_01"
    / "templates",
}
BUNDLES_CONFIG = ROOT / "bundles.json"


def media_file_belongs_to_template(filename: str, template_id: str) -> bool:
    """Return True when a media asset filename belongs to exactly this template.

    Prevents prefix collisions such as assigning ``image_krea2_turbo_t2i_int8-1.webp``
    to template ``image_krea2_turbo_t2i`` (``{template_id}*.webp`` glob is too broad).
    """
    stem = Path(filename).stem
    if stem == template_id:
        return True
    return stem.startswith(f"{template_id}-")


def get_pip_excluded_template_names() -> frozenset[str]:
    """Return the set of template names that must be excluded from pip packages.

    Two categories are excluded:

    1. **Cloud-only**: ``includeOnDistributions`` is non-empty and contains no
       local-distribution values — these templates cannot run locally.
    2. **Requires custom nodes**: ``requiresCustomNodes`` is non-empty — pip
       package users have no mechanism to install custom nodes automatically,
       so these templates would be broken out of the box.
    """
    index_path = TEMPLATES_DIR / "index.json"
    with index_path.open("r", encoding="utf-8") as f:
        categories = json.load(f)

    excluded: set[str] = set()
    for category in categories:
        for tmpl in category.get("templates", []):
            distributions = tmpl.get("includeOnDistributions", [])
            if distributions and not any(d in LOCAL_DISTRIBUTIONS for d in distributions):
                excluded.add(tmpl["name"])
            elif tmpl.get("requiresCustomNodes"):
                excluded.add(tmpl["name"])
    return frozenset(excluded)


def filter_index_for_pip(raw_json: bytes, excluded_names: frozenset[str]) -> bytes:
    """Return a rewritten index JSON with excluded templates removed.

    Works for both the primary ``index.json`` and every locale variant
    (``index.{locale}.json``), which share the same list-of-categories shape.
    """
    categories = json.loads(raw_json)
    filtered = []
    for category in categories:
        templates = [
            t for t in category.get("templates", [])
            if t.get("name") not in excluded_names
        ]
        if templates:
            filtered.append({**category, "templates": templates})
    return json.dumps(filtered, indent=2, ensure_ascii=False).encode("utf-8")


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


def load_logo_bundle_config() -> tuple[set[str], str]:
    """Return (frozen logo relative paths, additive target bundle) from version policy.

    Logos listed in ``frozen_logo_assets`` stay with ``index_logo``'s bundle
    (media-other). Any other file under ``templates/logo/`` ships via the
    additive/active asset bundle so new provider logos do not require a policy
    list update.
    """
    if not VERSION_POLICY_FILE.exists():
        return set(), "media-assets-01"
    with VERSION_POLICY_FILE.open("r", encoding="utf-8") as f:
        policy = json.load(f)
    frozen_logos = {str(path) for path in policy.get("frozen_logo_assets", [])}
    # Back-compat: older policy listed additive logos explicitly.
    if not frozen_logos and policy.get("additive_logo_assets"):
        additive = {str(path) for path in policy.get("additive_logo_assets", [])}
        logo_dir = TEMPLATES_DIR / "logo"
        if logo_dir.is_dir():
            frozen_logos = {
                f"logo/{p.name}"
                for p in logo_dir.iterdir()
                if p.is_file() and not p.name.startswith(".")
            } - additive
    bundle = str(
        policy.get("additive_logo_bundle")
        or policy.get("recommended_asset_bundle")
        or "media-assets-01"
    )
    if bundle not in BUNDLE_TARGETS:
        raise SystemExit(f"Unknown additive_logo_bundle in version policy: {bundle}")
    return frozen_logos, bundle


def build_manifest(filter_pip: bool = True, excluded_names: Optional[frozenset] = None):
    bundle_map = load_bundles_config()
    frozen_logos, additive_logo_bundle = load_logo_bundle_config()
    if excluded_names is None:
        excluded_names = get_pip_excluded_template_names() if filter_pip else frozenset()

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
            if template_id in excluded_names:
                continue
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
                    if not media_file_belongs_to_template(asset_path.name, template_id):
                        continue
                    seen.add(asset_path.name)
                    assets.append(
                        {
                            "filename": asset_path.name,
                            "sha256": sha256_for_file(asset_path),
                        }
                    )
            
            # Special case for index_logo which uses assets in templates/logo/ folder
            if template_id == "index_logo":
                logo_dir = TEMPLATES_DIR / "logo"
                if logo_dir.is_dir():
                    for logo_file in sorted(logo_dir.glob("*")):
                        if logo_file.is_file() and not logo_file.name.startswith("."):
                            rel_name = f"logo/{logo_file.name}"
                            asset_entry = {
                                "filename": rel_name,
                                "sha256": sha256_for_file(logo_file),
                            }
                            # New logos (not in the frozen inventory) ship via the
                            # active assets package so media-other stays frozen.
                            if rel_name not in frozen_logos:
                                asset_entry["bundle"] = additive_logo_bundle
                            assets.append(asset_entry)
            
            templates.append(
                {
                    "id": template_id,
                    "bundle": bundle,
                    "version": "0.0.0",  # placeholder for bundle version
                    "assets": assets,
                    "cdn": {"path": f"{bundle}/{template_id}/"},
                }
            )

    missing_frozen = sorted(
        path
        for path in frozen_logos
        if not (TEMPLATES_DIR / path).is_file()
    )
    if missing_frozen:
        raise SystemExit(
            "frozen_logo_assets missing from templates/logo/: "
            + ", ".join(missing_frozen)
        )

    manifest = {
        "manifest_version": 1,
        "bundles": {
            "media-api": {"version": "0.0.0"},
            "media-video": {"version": "0.0.0"},
            "media-image": {"version": "0.0.0"},
            "media-other": {"version": "0.0.0"},
            "media-assets-01": {"version": "0.0.0"},
        },
        "templates": templates,
    }
    return manifest


def sync_bundle_directories(
    manifest: dict,
    dry_run: bool = False,
    filter_pip: bool = True,
    excluded_names: Optional[frozenset] = None,
) -> None:
    if dry_run:
        return

    # The manifest passed in is already filtered by build_manifest(filter_pip=...).
    # We still need excluded_names here to rewrite the index JSON files on disk.
    if excluded_names is None:
        if filter_pip:
            excluded_names = get_pip_excluded_template_names()
        else:
            excluded_names = frozenset()
    if not filter_pip:
        print("--no-filter: pip exclusion disabled, syncing all templates")

    # Discover index data files dynamically from the templates directory.
    # These are filtered rather than copied verbatim.
    # "index.schema.json" is intentionally excluded — it's a JSON Schema, not template data.
    index_data_filenames: set[str] = {"index.json"}
    for p in TEMPLATES_DIR.glob("index.*.json"):
        if p.name != "index.schema.json":
            index_data_filenames.add(p.name)

    if JSON_TARGET.exists():
        shutil.rmtree(JSON_TARGET)
    JSON_TARGET.mkdir(parents=True, exist_ok=True)

    for target in BUNDLE_TARGETS.values():
        if target.exists():
            shutil.rmtree(target)
        target.mkdir(parents=True, exist_ok=True)

    for template in manifest["templates"]:
        default_bundle = template["bundle"]

        for asset in template["assets"]:
            src = TEMPLATES_DIR / asset["filename"]
            if not src.exists():
                # Some optional assets (e.g., preview) may not exist; skip silently.
                continue

            filename = asset["filename"]
            if filename.endswith(".json"):
                dest = JSON_TARGET / Path(filename).name
                dest.parent.mkdir(parents=True, exist_ok=True)
                if Path(filename).name in index_data_filenames:
                    dest.write_bytes(filter_index_for_pip(src.read_bytes(), excluded_names))
                else:
                    shutil.copy2(src, dest)
                continue

            asset_bundle = asset.get("bundle") or default_bundle
            target_root = BUNDLE_TARGETS[asset_bundle]
            dest = target_root / filename
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dest)


def write_manifest(manifest: dict, dry_run: bool = False) -> None:
    payload = json.dumps(manifest, indent=2)
    SAMPLE_MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    SAMPLE_MANIFEST.write_text(payload)
    if dry_run:
        return
    CORE_MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    CORE_MANIFEST.write_text(payload)


def main():
    parser = argparse.ArgumentParser(description="Generate manifest and sync media bundles.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only regenerate sample manifest (no copying into package directories).",
    )
    parser.add_argument(
        "--no-filter",
        action="store_true",
        help=(
            "Disable pip exclusion filter — sync ALL templates including cloud-only and "
            "requiresCustomNodes ones. Use this to revert the filtering behaviour temporarily."
        ),
    )
    args = parser.parse_args()

    if not TEMPLATES_DIR.exists():
        raise SystemExit(f"Templates directory not found: {TEMPLATES_DIR}")
    filter_pip = not args.no_filter
    excluded_names = get_pip_excluded_template_names() if filter_pip else frozenset()
    manifest = build_manifest(filter_pip=filter_pip, excluded_names=excluded_names)
    write_manifest(manifest, dry_run=args.dry_run)
    sync_bundle_directories(
        manifest, dry_run=args.dry_run, filter_pip=filter_pip, excluded_names=excluded_names
    )
    target = CORE_MANIFEST if not args.dry_run else SAMPLE_MANIFEST
    print(f"Wrote manifest to {target}")
    if not args.dry_run:
        print("Synced JSON into json package and media assets into bundle directories.")


if __name__ == "__main__":
    main()
