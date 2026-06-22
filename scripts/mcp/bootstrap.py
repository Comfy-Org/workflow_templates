"""Add scripts/lib and scripts/mcp/lib to sys.path for MCP CLI entrypoints."""

from __future__ import annotations

import sys
from pathlib import Path

_MCP_DIR = Path(__file__).resolve().parent
_SCRIPTS_ROOT = _MCP_DIR.parent


def install_paths() -> Path:
    for entry in (_SCRIPTS_ROOT / "lib", _MCP_DIR / "lib"):
        path = str(entry)
        if path not in sys.path:
            sys.path.insert(0, path)
    return _MCP_DIR
