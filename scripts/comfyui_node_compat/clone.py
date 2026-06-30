"""Clone or resolve a local ComfyUI checkout."""

from __future__ import annotations

import os
import subprocess
import tempfile
from pathlib import Path

import sys

_lib_dir = Path(__file__).resolve().parent.parent / "lib"
if str(_lib_dir) not in sys.path:
    sys.path.insert(0, str(_lib_dir))

from env import load_repo_env  # noqa: E402
from paths import resolve_comfyui_dir  # noqa: E402

DEFAULT_COMFYUI_GITHUB_REPO = "Comfy-Org/ComfyUI"
DEFAULT_COMFYUI_REF = "master"
COMFYUI_REF_ENV = "COMFYUI_REF"
COMFYUI_GITHUB_REPO_ENV = "COMFYUI_GITHUB_REPO"


def git_head_info(comfyui_dir: Path) -> dict[str, str]:
    if not (comfyui_dir / ".git").exists():
        return {"comfyui_dir": str(comfyui_dir)}

    def run_git(*args: str) -> str:
        result = subprocess.run(
            ["git", "-C", str(comfyui_dir), *args],
            check=False,
            capture_output=True,
            text=True,
        )
        return result.stdout.strip() if result.returncode == 0 else ""

    return {
        "comfyui_dir": str(comfyui_dir),
        "comfyui_repo": run_git("remote", "get-url", "origin") or DEFAULT_COMFYUI_GITHUB_REPO,
        "comfyui_ref": run_git("rev-parse", "HEAD"),
        "comfyui_branch": run_git("rev-parse", "--abbrev-ref", "HEAD"),
    }


def clone_comfyui_repo(
    *,
    github_repo: str | None = None,
    ref: str | None = None,
    dest: Path | None = None,
) -> Path:
    load_repo_env()
    github_repo = (
        github_repo
        or os.environ.get(COMFYUI_GITHUB_REPO_ENV, "").strip()
        or DEFAULT_COMFYUI_GITHUB_REPO
    )
    ref = ref or os.environ.get(COMFYUI_REF_ENV, "").strip() or DEFAULT_COMFYUI_REF
    dest = dest or Path(tempfile.mkdtemp(prefix="comfyui-checkout-"))

    subprocess.run(
        [
            "git",
            "clone",
            "--depth",
            "1",
            "--branch",
            ref,
            f"https://github.com/{github_repo}.git",
            str(dest),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    if not (dest / "nodes.py").is_file():
        raise FileNotFoundError(f"Cloned ComfyUI checkout is missing nodes.py: {dest}")
    return dest.resolve()


def resolve_comfyui_checkout(explicit: Path | None = None) -> Path | None:
    if explicit is not None:
        path = explicit.expanduser().resolve()
        return path if path.is_dir() and (path / "nodes.py").is_file() else None
    return resolve_comfyui_dir()
