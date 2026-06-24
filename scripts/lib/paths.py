"""Shared path constants for repository maintenance scripts."""

from pathlib import Path

SCRIPTS_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = SCRIPTS_ROOT.parent
DATA_DIR = SCRIPTS_ROOT / "data"
MCP_DATA_DIR = DATA_DIR / "mcp"
TEMPLATES_DIR = REPO_ROOT / "templates"

I18N_FILE = DATA_DIR / "i18n.json"
WHITELIST_FILE = DATA_DIR / "whitelist.json"

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
