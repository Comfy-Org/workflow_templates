"""Shared path constants for repository maintenance scripts."""

from pathlib import Path

SCRIPTS_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = SCRIPTS_ROOT.parent
DATA_DIR = SCRIPTS_ROOT / "data"
TEMPLATES_DIR = REPO_ROOT / "templates"

I18N_FILE = DATA_DIR / "i18n.json"
WHITELIST_FILE = DATA_DIR / "whitelist.json"
MODELS_CAPABILITIES_FILE = DATA_DIR / "models_capabilities.json"
