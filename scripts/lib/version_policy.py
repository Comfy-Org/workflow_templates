"""Shared helpers for frozen package and archived template policy."""

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


def get_frozen_packages(policy: dict[str, Any]) -> set[str]:
    return set(policy.get("frozen_packages", []))


def get_frozen_bundle_map(policy: dict[str, Any]) -> dict[str, str]:
    """Map bundle id (e.g. media-api) -> package id (e.g. media_api)."""
    explicit = policy.get("frozen_bundles")
    if isinstance(explicit, dict) and explicit:
        return {str(bundle): str(pkg) for bundle, pkg in explicit.items()}
    frozen = get_frozen_packages(policy)
    return {bundle: pkg for bundle, pkg in BUNDLE_PACKAGE_MAP.items() if pkg in frozen}


def archived_index_path(policy: dict[str, Any], repo_root: Path) -> Path:
    rel = policy.get("archived_templates_index", "archived/index.json")
    return repo_root / rel


def load_archived_template_names(archived_index_file: Path) -> list[str]:
    if not archived_index_file.exists():
        return []
    data = json.loads(archived_index_file.read_text(encoding="utf-8"))
    names: list[str] = []
    for category in data:
        for template in category.get("templates", []):
            name = template.get("name")
            if name:
                names.append(name)
    return sorted(names)


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


def is_media_template_asset_path(file_path: str) -> bool:
    if not file_path.startswith("templates/"):
        return False
    if file_path.startswith("templates/index"):
        return False
    suffix = Path(file_path).suffix.lower()
    return suffix in MEDIA_ASSET_EXTENSIONS or file_path.startswith("templates/logo/")
