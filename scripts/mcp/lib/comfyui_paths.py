"""Resolve paths into a local ComfyUI checkout."""

from __future__ import annotations

import os
from pathlib import Path

from env import load_repo_env
from paths import REPO_ROOT

COMFYUI_REPO_PATH_ENV = "COMFYUI_REPO_PATH"
COMFY_API_NODES_SUBDIR = Path("comfy_api_nodes")


def resolve_comfyui_repo_path() -> Path | None:
    """Return expanded ComfyUI repo root from env, or None if unset/invalid."""
    load_repo_env()
    raw = os.environ.get(COMFYUI_REPO_PATH_ENV, "").strip()
    if not raw:
        return None
    path = Path(raw).expanduser()
    if not path.is_absolute():
        path = (REPO_ROOT / path).resolve()
    else:
        path = path.resolve()
    return path if path.is_dir() else None


def resolve_comfy_api_nodes_dir() -> Path:
    """Return comfy_api_nodes directory; raises FileNotFoundError with setup hint."""
    repo = resolve_comfyui_repo_path()
    if repo is None:
        raise FileNotFoundError(
            f"{COMFYUI_REPO_PATH_ENV} is not set or does not point to a ComfyUI checkout.\n"
            f"Copy {REPO_ROOT / '.env.example'} to {REPO_ROOT / '.env'} "
            f"and set {COMFYUI_REPO_PATH_ENV}=/path/to/ComfyUI"
        )
    api_nodes = repo / COMFY_API_NODES_SUBDIR
    if not api_nodes.is_dir():
        raise FileNotFoundError(
            f"Expected API nodes at {api_nodes}\n"
            f"Check that {COMFYUI_REPO_PATH_ENV} points to the ComfyUI repository root."
        )
    return api_nodes
