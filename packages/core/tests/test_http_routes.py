import asyncio
from pathlib import Path

from aiohttp import web
from aiohttp.test_utils import make_mocked_request

from comfyui_workflow_templates_core import iter_assets


# Sampled templates per bundle. These ids must stay in sync with what the bundles
# actually ship: archiving a template removes its assets, so an id left here after
# an archive fails this test even though nothing is wrong with the handler.
BUNDLE_SAMPLES = {
    "media-api": [
        "api_bfl_flux_1_kontext_max_image",
        "api_bfl_flux_1_kontext_multiple_images_input",
    ],
    "media-image": [
        "3d_hunyuan3d-v2.1",
        "3d_hunyuan3d_image_to_model",
    ],
    "media-other": [
        "3d_moge_panorama_to_mesh",
        "3d_moge_perspective_to_mesh",
    ],
    "media-video": [
        "hunyuan_video_text_to_video",
        "api_google_gemini_omni_flash_i2v",
    ],
}


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

    for bundle, template_ids in BUNDLE_SAMPLES.items():
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
