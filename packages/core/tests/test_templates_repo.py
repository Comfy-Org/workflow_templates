import importlib.util
import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
TEMPLATES_DIR = REPO_ROOT / "templates"
BUNDLES_CONFIG = REPO_ROOT / "bundles.json"
MANIFEST_PATH = (
    REPO_ROOT
    / "packages"
    / "core"
    / "src"
    / "comfyui_workflow_templates_core"
    / "manifest.json"
)
SUPPORTED_EXTENSIONS = {
    ".json",
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

# Load get_pip_excluded_template_names from sync_bundles.py without adding the
# scripts/ directory permanently to sys.path.
_spec = importlib.util.spec_from_file_location(
    "sync_bundles", REPO_ROOT / "scripts" / "sync_bundles.py"
)
_sync_bundles = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_sync_bundles)
get_pip_excluded_template_names = _sync_bundles.get_pip_excluded_template_names


def test_templates_directory_matches_bundles_config():
    template_ids = {path.stem for path in TEMPLATES_DIR.glob("*.json")}
    bundles = json.loads(BUNDLES_CONFIG.read_text())
    configured_ids = {
        template_id for templates in bundles.values() for template_id in templates
    }
    assert template_ids == configured_ids, (
        "Mismatch between templates/ JSON files and bundles.json assignments"
    )


def test_manifest_includes_all_template_assets():
    manifest = json.loads(MANIFEST_PATH.read_text())
    excluded = get_pip_excluded_template_names()
    manifest_assets = {
        asset["filename"]
        for entry in manifest.get("templates", [])
        for asset in entry.get("assets", [])
    }
    files_on_disk = {
        path.name
        for path in TEMPLATES_DIR.iterdir()
        if path.is_file()
        and path.suffix.lower() in SUPPORTED_EXTENSIONS
        # Exclude assets belonging to pip-filtered templates.
        # Asset filenames always start with the template name (e.g. "foo.json", "foo-1.webp").
        and not any(
            path.name == ex + path.suffix
            or path.name.startswith(ex + "-")
            or path.name.startswith(ex + ".")
            for ex in excluded
        )
    }
    missing = sorted(files_on_disk - manifest_assets)
    assert not missing, f"Assets missing from manifest: {missing}"
