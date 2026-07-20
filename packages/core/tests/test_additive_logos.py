"""Tests for additive provider-logo packaging across frozen media-other."""

from __future__ import annotations

import importlib.util
import json
import os
from pathlib import Path

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

LIB_DIR = REPO_ROOT / "scripts" / "lib"
if str(LIB_DIR) not in os.sys.path:
    os.sys.path.insert(0, str(LIB_DIR))

import comfyui_workflow_templates_core.loader as loader  # noqa: E402
from version_policy import (  # noqa: E402
    get_additive_logo_bundle,
    get_frozen_logo_assets,
    is_additive_logo_path,
    load_version_policy,
    media_bundle_for_template_asset,
    template_id_from_asset_path,
)

_spec = importlib.util.spec_from_file_location(
    "sync_bundles", REPO_ROOT / "scripts" / "sync" / "sync_bundles.py"
)
_sync_bundles = importlib.util.module_from_spec(_spec)
assert _spec.loader is not None
_spec.loader.exec_module(_sync_bundles)


def test_logo_paths_belong_to_index_logo():
    assert template_id_from_asset_path("templates/logo/sync_so.webp") == "index_logo"
    assert template_id_from_asset_path("logo/openai.png") == "index_logo"


def test_frozen_logo_inventory_excludes_new_logos():
    policy = load_version_policy(REPO_ROOT / "scripts" / "data" / "version_policy.json")
    frozen = get_frozen_logo_assets(policy)
    assert "logo/openai.png" in frozen
    assert "logo/sync_so.webp" not in frozen
    assert get_additive_logo_bundle(policy) == "media-assets-01"
    assert is_additive_logo_path("templates/logo/sync_so.webp", policy)
    assert not is_additive_logo_path("templates/logo/openai.png", policy)


def test_media_bundle_split_for_logos():
    bundles = json.loads((REPO_ROOT / "bundles.json").read_text(encoding="utf-8"))
    policy = load_version_policy(REPO_ROOT / "scripts" / "data" / "version_policy.json")
    assert (
        media_bundle_for_template_asset("templates/logo/sync_so.webp", bundles, policy)
        == "media-assets-01"
    )
    assert (
        media_bundle_for_template_asset("templates/logo/openai.png", bundles, policy)
        == "media-other"
    )


def test_index_logo_stays_on_media_other_with_additive_override():
    entry = loader.get_template_entry("index_logo")
    assert entry.bundle == "media-other"

    sync_asset = next(a for a in entry.assets if a.filename == "logo/sync_so.webp")
    assert sync_asset.bundle == "media-assets-01"

    legacy = next(a for a in entry.assets if a.filename == "logo/openai.png")
    assert legacy.bundle is None

    assert (
        loader._asset_package(entry, sync_asset.filename, sync_asset.bundle)
        == "comfyui_workflow_templates_media_assets_01"
    )
    assert (
        loader._asset_package(entry, legacy.filename, legacy.bundle)
        == "comfyui_workflow_templates_media_other"
    )


def test_resolve_additive_and_legacy_logos():
    additive = loader.get_asset_path("index_logo", "logo/sync_so.webp")
    legacy = loader.get_asset_path("index_logo", "logo/openai.png")
    assert additive.endswith("logo/sync_so.webp")
    assert "media_assets_01" in additive.replace("\\", "/")
    assert legacy.endswith("logo/openai.png")
    assert "media_other" in legacy.replace("\\", "/")
    assert Path(additive).is_file()
    assert Path(legacy).is_file()


def test_index_logo_json_points_at_renamed_file():
    logo_index = json.loads((REPO_ROOT / "templates" / "index_logo.json").read_text())
    assert logo_index["Sync.so"] == "logo/sync_so.webp"
    assert (REPO_ROOT / "templates" / "logo" / "sync_so.webp").is_file()
    assert not (REPO_ROOT / "templates" / "logo" / "sync.so.webp").exists()


def test_sync_build_manifest_marks_additive_logo_bundle():
    manifest = _sync_bundles.build_manifest(filter_pip=True)
    entry = next(t for t in manifest["templates"] if t["id"] == "index_logo")
    assert entry["bundle"] == "media-other"
    sync_asset = next(a for a in entry["assets"] if a["filename"] == "logo/sync_so.webp")
    assert sync_asset["bundle"] == "media-assets-01"
    legacy = next(a for a in entry["assets"] if a["filename"] == "logo/openai.png")
    assert "bundle" not in legacy
