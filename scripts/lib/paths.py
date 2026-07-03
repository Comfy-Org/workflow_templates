"""Shared path constants for repository maintenance scripts."""

import os
from pathlib import Path

SCRIPTS_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = SCRIPTS_ROOT.parent
DATA_DIR = SCRIPTS_ROOT / "data"
MCP_DATA_DIR = DATA_DIR / "mcp"
TEMPLATES_DIR = REPO_ROOT / "templates"

COMFYUI_NODE_COMPAT_LOG = REPO_ROOT / "comfyui-node-compat.log"
COMFYUI_NODE_COMPAT_LATEST_LOG = REPO_ROOT / "comfyui-node-compat.latest.log"

COMFYUI_DIR_ENV = "COMFYUI_DIR"


def resolve_comfyui_dir() -> Path | None:
    """Return a local ComfyUI checkout from COMFYUI_REPO_PATH or COMFYUI_DIR."""
    try:
        from env import load_repo_env

        load_repo_env()
    except ImportError:
        pass

    for env_name in ("COMFYUI_REPO_PATH", COMFYUI_DIR_ENV):
        value = os.environ.get(env_name)
        if not value:
            continue
        path = Path(value).expanduser().resolve()
        if path.is_dir() and (path / "nodes.py").is_file():
            return path
    return None


I18N_FILE = DATA_DIR / "i18n.json"
WHITELIST_FILE = DATA_DIR / "whitelist.json"
VERSION_POLICY_FILE = DATA_DIR / "version_policy.json"

# MCP pipeline data (scripts/mcp/)
MODELS_REGISTRY_FILE = MCP_DATA_DIR / "models_registry.json"
# Back-compat alias (deprecated)
MODELS_CAPABILITIES_FILE = MODELS_REGISTRY_FILE
API_NODE_OPTIONS_FILE = MCP_DATA_DIR / "api_node_model_options.json"
TEMPLATE_CACHE_FILE = MCP_DATA_DIR / "template_cache.json"
TEMPLATE_CACHE_EXAMPLE = MCP_DATA_DIR / "template_cache.example.json"
TEMPLATE_OVERRIDES_FILE = MCP_DATA_DIR / "template_overrides.json"
TEMPLATE_OVERRIDES_EXAMPLE = MCP_DATA_DIR / "template_overrides.example.json"
REGISTRY_ALIASES_FILE = MCP_DATA_DIR / "registry_aliases.json"
