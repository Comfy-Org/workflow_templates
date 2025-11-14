"""
Meta-package wrapper that re-exports core manifest helpers while
keeping the original import path (`comfyui_workflow_templates`) stable.
"""

from __future__ import annotations

from comfyui_workflow_templates_core import (
    get_asset_path,
    get_template_entry,
    iter_templates,
    load_manifest,
    resolve_all_assets,
)

__all__ = [
    "get_asset_path",
    "get_template_entry",
    "iter_templates",
    "load_manifest",
    "resolve_all_assets",
    "get_templates_path",
]


def get_templates_path() -> str:
    """
    Legacy helper retained for compatibility.

    Multi-bundle distribution no longer exposes a single `templates/`
    directory, so this function now raises to encourage callers to use
    `get_asset_path`/`resolve_all_assets` instead.
    """
    raise RuntimeError(
        "get_templates_path() is no longer supported. "
        "Use get_asset_path(template_id, filename) to access assets."
    )
