import asyncio
import importlib.util
import json
from pathlib import Path

from aiohttp import web
from aiohttp.test_utils import make_mocked_request

from comfyui_workflow_templates_core import iter_assets

REPO_ROOT = Path(__file__).resolve().parents[3]
BUNDLES_CONFIG = REPO_ROOT / "bundles.json"

# Load get_pip_excluded_template_names from sync_bundles.py without adding the
# scripts/ directory permanently to sys.path (same pattern as
# test_templates_repo.py).
_spec = importlib.util.spec_from_file_location(
    "sync_bundles", REPO_ROOT / "scripts" / "sync" / "sync_bundles.py"
)
_sync_bundles = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_sync_bundles)
get_pip_excluded_template_names = _sync_bundles.get_pip_excluded_template_names

SAMPLES_PER_BUNDLE = 2


def bundle_samples(per_bundle: int = SAMPLES_PER_BUNDLE) -> dict[str, list[str]]:
    """Pick a few shipped template ids per bundle, straight from bundles.json.

    These used to be hard-coded, which meant archiving a template silently broke
    this test: https://github.com/Comfy-Org/workflow_templates/pull/1088 archived
    six of the eight sampled ids and left main red on Build & Test. Deriving the
    sample from the same config sync_bundles.py reads keeps it correct by
    construction.
    """
    excluded = get_pip_excluded_template_names()
    bundles = json.loads(BUNDLES_CONFIG.read_text(encoding="utf-8"))
    samples: dict[str, list[str]] = {}
    for bundle, template_ids in bundles.items():
        picked = [t for t in sorted(template_ids) if t not in excluded][:per_bundle]
        if picked:
            samples[bundle] = picked
    return samples


def build_handler(asset_map):
    async def handle(request: web.Request) -> web.StreamResponse:
        rel_path = request.match_info.get("path", "")
        target = asset_map.get(rel_path)
        if target is None:
            raise web.HTTPNotFound()
        return web.FileResponse(target)

    return handle


def run_request(handler, rel_path: str):
    request = make_mocked_request("GET", f"/templates/{rel_path}")
    request._match_info["path"] = rel_path  # type: ignore[attr-defined]
    return asyncio.run(handler(request))


def test_static_handler_serves_samples():
    assets = dict(iter_assets())
    assert assets, "Expected bundled assets to be available"
    handler = build_handler(assets)

    samples = bundle_samples()
    assert samples, "Expected bundles.json to yield at least one sampled template"

    for bundle, template_ids in samples.items():
        for template_id in template_ids:
            variants = [name for name in assets if name.startswith(template_id)]
            assert variants, f"No assets found for template {template_id} in {bundle}"
            for rel_name in variants:
                response = run_request(handler, rel_name)
                assert isinstance(response, web.FileResponse)
                assert Path(response._path) == Path(assets[rel_name])  # type: ignore[attr-defined]

    # Verify missing path 404s
    try:
        run_request(handler, "does_not_exist")
    except web.HTTPNotFound:
        return
    raise AssertionError("Expected HTTPNotFound for missing asset")
