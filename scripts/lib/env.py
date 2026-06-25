"""Minimal .env loader for repo maintenance scripts (no external dependency)."""

from __future__ import annotations

import os
from pathlib import Path

from paths import REPO_ROOT

_ENV_LOADED = False


def load_repo_env() -> None:
    """Load KEY=VALUE pairs from repo-root `.env` into os.environ (does not override)."""
    global _ENV_LOADED
    if _ENV_LOADED:
        return
    _ENV_LOADED = True

    env_file = REPO_ROOT / ".env"
    if not env_file.is_file():
        return

    for raw_line in env_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].strip()
        if "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip("'\"")
        if key and key not in os.environ:
            os.environ[key] = value
