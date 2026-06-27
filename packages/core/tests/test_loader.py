import os
from importlib import reload
from pathlib import Path

import pytest

PACKAGE_ROOTS = [
    "packages/core/src",
    "packages/meta/src",
    "packages/json/src",
    "packages/media_api/src",
    "packages/media_video/src",
    "packages/media_image/src",
    "packages/media_other/src",
    "packages/media_assets_01/src",
]

REPO_ROOT = Path(__file__).resolve().parents[3]
for root in PACKAGE_ROOTS:
    full = REPO_ROOT / root
    full_str = str(full)
    if full_str not in os.sys.path:
        os.sys.path.insert(0, full_str)

import comfyui_workflow_templates as meta  # noqa: E402
import comfyui_workflow_templates_core.loader as loader  # noqa: E402


def test_manifest_loads():
    manifest = loader.load_manifest()
    assert manifest.manifest_version == 1
    assert len(manifest.templates) > 0


def test_resolve_sample_asset():
    entries = list(meta.iter_templates())
    assert entries
    sample = entries[0]
    asset = sample.assets[0]
    path = meta.get_asset_path(sample.template_id, asset.filename)
    assert os.path.exists(path)
    with open(path, "rb") as f:
        data = f.read(1)
    assert data


def test_missing_template_raises():
    with pytest.raises(KeyError):
        loader.get_template_entry("not-a-template")


def test_missing_bundle_resolves(monkeypatch):
    entries = list(loader.iter_templates())
    sample = next(
        e for e in entries if any(not a.filename.endswith(".json") for a in e.assets)
    )
    media_asset = next(a for a in sample.assets if not a.filename.endswith(".json"))
    monkeypatch.setitem(loader.BUNDLE_PACKAGE_MAP, sample.bundle, "_does_not_exist")
    with pytest.raises(FileNotFoundError):
        loader.get_asset_path(sample.template_id, media_asset.filename)
    reload(loader)


def test_json_assets_use_json_package():
    entry = next(e for e in loader.iter_templates() if e.bundle == "media-api")
    json_name = f"{entry.template_id}.json"
    assert loader._asset_package(entry, json_name) == loader.JSON_PACKAGE
    webp_name = next(a.filename for a in entry.assets if a.filename.endswith(".webp"))
    assert loader._asset_package(entry, webp_name) == loader.BUNDLE_PACKAGE_MAP[entry.bundle]
