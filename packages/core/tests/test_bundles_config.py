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

import comfyui_workflow_templates_core.loader as loader  # noqa: E402

# Load get_pip_excluded_template_names from sync_bundles.py without adding the
# scripts/ directory permanently to sys.path.
_spec = importlib.util.spec_from_file_location(
    "sync_bundles", REPO_ROOT / "scripts" / "sync" / "sync_bundles.py"
)
_sync_bundles = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_sync_bundles)
get_pip_excluded_template_names = _sync_bundles.get_pip_excluded_template_names


def load_bundle_config():
    path = REPO_ROOT / "bundles.json"
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def test_manifest_aligns_with_bundles_config():
    config = load_bundle_config()
    excluded = get_pip_excluded_template_names()
    manifest_map = {entry.template_id: entry.bundle for entry in loader.iter_templates()}

    config_map = {}
    for bundle, templates in config.items():
        for template_id in templates:
            assert template_id not in config_map, (
                f"Duplicate template '{template_id}' in bundles.json"
            )
            if template_id not in excluded:
                config_map[template_id] = bundle

    assert manifest_map.keys() == config_map.keys(), (
        "Mismatch between manifest and bundles.json templates"
    )

    for template_id, bundle in manifest_map.items():
        assert (
            config_map[template_id] == bundle
        ), f"Template '{template_id}' expected in '{config_map[template_id]}', got '{bundle}'"
