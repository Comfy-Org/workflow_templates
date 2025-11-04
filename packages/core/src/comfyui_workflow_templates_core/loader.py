"""
Manifest loader and asset resolution helpers.

The manifest is generated during the build step and embedded as package
data in `comfyui_workflow_templates_core`. Each media bundle exposes its
assets under a namespace package (e.g., `comfyui_workflow_templates_media_api`).
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from importlib import resources
from typing import Dict, Iterable, Iterator, List, Tuple

MANIFEST_RESOURCE = "manifest.json"

BUNDLE_PACKAGE_MAP = {
    "media-api": "comfyui_workflow_templates_media_api",
    "media-video": "comfyui_workflow_templates_media_video",
    "media-image": "comfyui_workflow_templates_media_image",
    "media-other": "comfyui_workflow_templates_media_other",
}


@dataclass(frozen=True)
class TemplateAsset:
    filename: str
    sha256: str


@dataclass(frozen=True)
class TemplateEntry:
    template_id: str
    bundle: str
    version: str
    assets: List[TemplateAsset]


@dataclass(frozen=True)
class Manifest:
    manifest_version: int
    bundles: Dict[str, Dict[str, str]]
    templates: Dict[str, TemplateEntry]


def _parse_manifest(payload: str) -> Manifest:
    raw = json.loads(payload)
    templates: Dict[str, TemplateEntry] = {}
    for entry in raw.get("templates", []):
        assets = [
            TemplateAsset(a["filename"], a["sha256"])
            for a in entry.get("assets", [])
        ]
        templates[entry["id"]] = TemplateEntry(
            template_id=entry["id"],
            bundle=entry["bundle"],
            version=entry.get("version", ""),
            assets=assets,
        )
    return Manifest(
        manifest_version=raw.get("manifest_version", 1),
        bundles=raw.get("bundles", {}),
        templates=templates,
    )


@lru_cache(maxsize=1)
def load_manifest() -> Manifest:
    """Load and cache the manifest from package data."""
    data = resources.files(__package__).joinpath(MANIFEST_RESOURCE).read_text()
    return _parse_manifest(data)


def iter_templates() -> Iterable[TemplateEntry]:
    """Iterate over all template entries."""
    return load_manifest().templates.values()


def get_template_entry(template_id: str) -> TemplateEntry:
    """Return manifest entry for the given template id."""
    try:
        return load_manifest().templates[template_id]
    except KeyError as exc:
        raise KeyError(f"Template '{template_id}' not found in manifest") from exc


def _bundle_package(bundle_name: str) -> str:
    try:
        return BUNDLE_PACKAGE_MAP[bundle_name]
    except KeyError as exc:
        raise KeyError(f"No package mapping defined for bundle '{bundle_name}'") from exc


def get_asset_path(template_id: str, filename: str) -> str:
    """
    Resolve the absolute path for an asset belonging to `template_id`.

    Raises:
        FileNotFoundError: if the bundle package or asset is missing.
    """
    entry = get_template_entry(template_id)
    package_name = _bundle_package(entry.bundle)
    try:
        package_files = resources.files(package_name)
    except ModuleNotFoundError as exc:
        raise FileNotFoundError(
            f"Media package '{package_name}' is not installed for bundle '{entry.bundle}'"
        ) from exc
    asset = package_files / "templates" / filename
    if not asset.exists():
        raise FileNotFoundError(
            f"Asset '{filename}' for template '{template_id}' not found in package '{package_name}'"
        )
    return str(asset)


def resolve_all_assets(template_id: str) -> List[str]:
    """Return absolute paths for every asset declared for the template."""
    entry = get_template_entry(template_id)
    return [get_asset_path(template_id, asset.filename) for asset in entry.assets]


def iter_assets() -> Iterator[Tuple[str, str]]:
    """Yield tuples of (relative_filename, absolute_path) for every asset."""
    for entry in iter_templates():
        for asset in entry.assets:
            yield asset.filename, get_asset_path(entry.template_id, asset.filename)
