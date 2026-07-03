"""Shared helpers for frozen legacy media package policy."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

BUNDLE_PACKAGE_MAP: dict[str, str] = {
    "media-api": "media_api",
    "media-video": "media_video",
    "media-image": "media_image",
    "media-other": "media_other",
    "media-assets-01": "media_assets_01",
}

MEDIA_ASSET_EXTENSIONS = {
    ".webp",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".mp4",
    ".webm",
    ".mp3",
    ".wav",
    ".ogg",
    ".flac",
    ".m4a",
}

_THUMBNAIL_SUFFIX = re.compile(r"-\d+$")


def load_version_policy(policy_file: Path) -> dict[str, Any]:
    if not policy_file.exists():
        return {}
    return json.loads(policy_file.read_text(encoding="utf-8"))


def load_bundles(bundles_file: Path) -> dict[str, list[str]]:
    if not bundles_file.exists():
        return {}
    return json.loads(bundles_file.read_text(encoding="utf-8"))


def get_frozen_packages(policy: dict[str, Any]) -> set[str]:
    return set(policy.get("frozen_packages", []))


def get_frozen_bundle_map(policy: dict[str, Any]) -> dict[str, str]:
    """Map bundle id (e.g. media-api) -> package id (e.g. media_api)."""
    explicit = policy.get("frozen_bundles")
    if isinstance(explicit, dict) and explicit:
        return {str(bundle): str(pkg) for bundle, pkg in explicit.items()}
    frozen = get_frozen_packages(policy)
    return {bundle: pkg for bundle, pkg in BUNDLE_PACKAGE_MAP.items() if pkg in frozen}


def get_pinned_package_versions(pyproject_file: Path, package_ids: set[str]) -> dict[str, str]:
    if not pyproject_file.exists() or not package_ids:
        return {}
    text = pyproject_file.read_text(encoding="utf-8")
    versions: dict[str, str] = {}
    for pkg in sorted(package_ids):
        pip_name = f"comfyui-workflow-templates-{pkg.replace('_', '-')}"
        match = re.search(rf'"{re.escape(pip_name)}==([0-9.]+)"', text)
        if match:
            versions[pkg] = match.group(1)
    return versions


def build_frozen_bundle_inventory(
    bundles: dict[str, list[str]],
    policy: dict[str, Any],
    pyproject_file: Path,
) -> dict[str, Any]:
    frozen_bundles = get_frozen_bundle_map(policy)
    frozen_packages = set(frozen_bundles.values())
    pinned = get_pinned_package_versions(pyproject_file, frozen_packages)
    inventory_bundles: dict[str, Any] = {}
    for bundle_name in sorted(frozen_bundles):
        pkg = frozen_bundles[bundle_name]
        inventory_bundles[bundle_name] = {
            "package": pkg,
            "pinned_version": pinned.get(pkg),
            "templates": sorted(bundles.get(bundle_name, [])),
        }
    return {
        "source": "bundles.json",
        "description": (
            "Templates assigned to frozen legacy media bundles. "
            "Regenerate after bundles.json changes: python scripts/sync/sync_frozen_inventory.py"
        ),
        "bundles": inventory_bundles,
    }


def load_frozen_bundle_inventory(inventory_file: Path) -> dict[str, Any]:
    if not inventory_file.exists():
        return {"bundles": {}}
    return json.loads(inventory_file.read_text(encoding="utf-8"))


def frozen_template_membership(inventory: dict[str, Any]) -> dict[str, str]:
    """Map template id -> frozen bundle name."""
    mapping: dict[str, str] = {}
    for bundle_name, entry in inventory.get("bundles", {}).items():
        for template_id in entry.get("templates", []):
            mapping[template_id] = bundle_name
    return mapping


def template_id_from_asset_path(file_path: str, bundles: dict[str, list[str]] | None = None) -> str:
    name = Path(file_path).name
    if name.endswith(".json"):
        return Path(name).stem

    stem = Path(name).stem
    candidate = _THUMBNAIL_SUFFIX.sub("", stem)
    if bundles:
        all_ids = {tid for ids in bundles.values() for tid in ids}
        if candidate in all_ids:
            return candidate
        if stem in all_ids:
            return stem
    return candidate


def is_workflow_template_path(file_path: str) -> bool:
    return (
        file_path.startswith("templates/")
        and file_path.endswith(".json")
        and not file_path.startswith("templates/index")
    )


def is_media_template_asset_path(file_path: str) -> bool:
    if not file_path.startswith("templates/"):
        return False
    if file_path.startswith("templates/index"):
        return False
    suffix = Path(file_path).suffix.lower()
    return suffix in MEDIA_ASSET_EXTENSIONS or file_path.startswith("templates/logo/")
