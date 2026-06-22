"""Template AI cache — description/io keyed by workflow JSON source hash."""

from __future__ import annotations

import hashlib
import json
from typing import Any

from json_format import dumps_compact_arrays
from paths import TEMPLATE_CACHE_FILE, TEMPLATES_DIR

MCP_FILE = TEMPLATES_DIR / "index.mcp.json"

SCHEMA_VERSION = 1


def empty_cache() -> dict[str, Any]:
    return {"schema_version": SCHEMA_VERSION, "templates": {}}


def workflow_json_path(template_name: str):
    return TEMPLATES_DIR / f"{template_name}.json"


def workflow_source_hash(template_name: str) -> str | None:
    """SHA-256 hex digest of the template workflow JSON file (raw bytes)."""
    path = workflow_json_path(template_name)
    if not path.is_file():
        return None
    return hashlib.sha256(path.read_bytes()).hexdigest()


def cache_matches_workflow(template_name: str, cached: dict[str, Any] | None) -> bool:
    if not cached:
        return False
    stored = cached.get("source_hash")
    current = workflow_source_hash(template_name)
    return bool(stored and current and stored == current)


def load_template_cache(path=TEMPLATE_CACHE_FILE) -> dict[str, Any]:
    if not path.is_file():
        return empty_cache()
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        return empty_cache()
    data.setdefault("schema_version", SCHEMA_VERSION)
    data.setdefault("templates", {})
    data.pop("models", None)  # legacy
    return data


def save_template_cache(cache: dict[str, Any], path=TEMPLATE_CACHE_FILE) -> None:
    payload = {"schema_version": SCHEMA_VERSION, "templates": cache.get("templates", {})}
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(dumps_compact_arrays(payload), encoding="utf-8")


def set_template_cache(
    cache: dict[str, Any],
    template_name: str,
    *,
    description: str,
    io: dict[str, Any] | None = None,
    source_hash: str | None = None,
) -> None:
    digest = source_hash or workflow_source_hash(template_name)
    if not digest:
        raise ValueError(f"Missing workflow JSON: {workflow_json_path(template_name)}")
    entry: dict[str, Any] = {"source_hash": digest, "description": description}
    if io is not None:
        entry["io"] = io
    cache.setdefault("templates", {})[template_name] = entry


def apply_template_overlay(
    entry: dict[str, Any],
    cached: dict[str, Any] | None,
    template_name: str,
) -> dict[str, Any]:
    if not cache_matches_workflow(template_name, cached):
        return entry
    if cached.get("description"):
        entry["description"] = cached["description"]
    if cached.get("io"):
        entry["io"] = cached["io"]
    return entry


def apply_template_cache_to_mcp(
    mcp_data: list[dict[str, Any]],
    cache: dict[str, Any],
) -> int:
    """Overlay cached description/io when source_hash matches workflow JSON."""
    templates_cache = cache.get("templates", {})
    applied = 0
    for group in mcp_data:
        for tpl in group.get("templates", []):
            name = tpl.get("name", "")
            cached = templates_cache.get(name)
            if not cache_matches_workflow(name, cached):
                continue
            before = (tpl.get("description"), tpl.get("io"))
            apply_template_overlay(tpl, cached, name)
            if (tpl.get("description"), tpl.get("io")) != before:
                applied += 1
    return applied


def templates_needing_enhance(
    cache: dict[str, Any],
    template_names: list[str],
) -> list[str]:
    """Templates missing from cache or whose workflow JSON hash changed."""
    templates_cache = cache.get("templates", {})
    stale: list[str] = []
    for name in template_names:
        if not cache_matches_workflow(name, templates_cache.get(name)):
            stale.append(name)
    return sorted(stale)


def import_templates_from_mcp(cache: dict[str, Any] | None = None) -> dict[str, Any]:
    """Seed cache from index.mcp.json; attach source_hash from workflow JSON."""
    cache = cache or load_template_cache()
    cache.setdefault("templates", {})

    if not MCP_FILE.is_file():
        return cache

    mcp_data = json.loads(MCP_FILE.read_text(encoding="utf-8"))
    for group in mcp_data:
        for tpl in group.get("templates", []):
            name = tpl.get("name", "")
            digest = workflow_source_hash(name)
            if not name or not digest:
                continue
            existing = cache["templates"].get(name)
            if existing and cache_matches_workflow(name, existing):
                continue
            entry: dict[str, Any] = {"source_hash": digest}
            if tpl.get("description"):
                entry["description"] = tpl["description"]
            if tpl.get("io"):
                entry["io"] = tpl["io"]
            if "description" in entry:
                cache["templates"][name] = entry

    return cache


def migrate_legacy_cache(cache: dict[str, Any]) -> dict[str, Any]:
    """Drop updated_at; set source_hash from workflow JSON where missing."""
    for name, entry in list(cache.get("templates", {}).items()):
        entry.pop("updated_at", None)
        digest = workflow_source_hash(name)
        if digest:
            entry["source_hash"] = digest
        if not entry.get("description"):
            cache["templates"].pop(name, None)
    return cache
