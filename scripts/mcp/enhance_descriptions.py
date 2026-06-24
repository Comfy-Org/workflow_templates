#!/usr/bin/env python3
"""
Step 2b — AI-assisted per-template descriptions (scripts/data/mcp/template_cache.json).

Each successful template is written to template_cache.json and index.mcp.json immediately
(so interrupted runs keep progress).

Prerequisites:
  cp .env.example .env   # AI_API_KEY, AI_BASE_URL, AI_MODEL

Usage:
  python3 scripts/mcp/enhance_descriptions.py --check
  python3 scripts/mcp/enhance_descriptions.py
  python3 scripts/mcp/enhance_descriptions.py --category "Use Cases"
  python3 scripts/mcp/enhance_descriptions.py --template api_hailuo_minimax_t2v
  python3 scripts/mcp/enhance_descriptions.py --all
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any

_MCP_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(_MCP_DIR))

from bootstrap import install_paths  # noqa: E402

install_paths()

from ai import chat_completion, load_ai_settings  # noqa: E402
from ai_context import (  # noqa: E402
    MCP_FILE,
    REGISTRY_FILE,
    iter_mcp_templates,
    load_index_templates,
    load_json,
    load_mcp_data,
    lookup_registry_profile,
)
from json_format import dumps_compact_arrays  # noqa: E402
from paths import TEMPLATE_CACHE_FILE  # noqa: E402
from template_cache import (  # noqa: E402
    apply_template_cache_to_mcp,
    load_template_cache,
    save_template_cache,
    set_template_cache,
    templates_needing_enhance,
    workflow_source_hash,
)

USE_CASES_CATEGORY = "Use Cases"


def build_prompt(
    template: dict[str, Any],
    *,
    category: str,
    category_description: str,
    registry: dict[str, Any],
    index_entry: dict[str, Any] | None,
) -> tuple[str, str]:
    import json

    model_name = template.get("model", "")
    model_info = lookup_registry_profile(model_name, registry)
    index_description = (index_entry or {}).get("description", "")
    is_use_case = category == USE_CASES_CATEGORY

    if is_use_case:
        system = (
            "You write concise, accurate ComfyUI workflow template descriptions for an MCP tool index. "
            "This template is in the **Use Cases** category: a concrete, purpose-built example that "
            "demonstrates a specific effect, technique, or content type — not a general-purpose baseline workflow. "
            "Explain what the user can achieve, what they need to provide (see io), and which model drives it. "
            "Mention third-party API execution when capabilities.workflow includes api. "
            "Output plain text only — one or two short paragraphs. "
            "Do not invent features not supported by the provided metadata."
        )
    else:
        system = (
            "You write concise, accurate ComfyUI workflow template descriptions for an MCP tool index. "
            f"This template is in the **{category}** category: {category_description} "
            "Describe the workflow's primary task, inputs/outputs, and model. "
            "Mention third-party API execution when capabilities.workflow includes api. "
            "Output plain text only — one or two short paragraphs. "
            "Do not invent features not supported by the provided metadata."
        )

    user = json.dumps(
        {
            "category": category,
            "category_description": category_description,
            "template": {
                "name": template.get("name"),
                "title": template.get("title"),
                "task": template.get("task"),
                "model": model_name,
                "capabilities": template.get("capabilities"),
                "io": template.get("io"),
                "current_description": template.get("description", ""),
            },
            "index_json_description": index_description,
            "model_profile": model_info,
        },
        indent=2,
        ensure_ascii=False,
    )
    return system, user


def select_targets(
    rows: list[tuple[str, str, dict[str, Any]]],
    cache: dict[str, Any],
    *,
    template: str | None,
    category: str | None,
    all_templates: bool,
) -> list[tuple[str, str, dict[str, Any]]]:
    if template:
        matches = [row for row in rows if row[2].get("name") == template]
        if not matches:
            raise KeyError(f"Template not found: {template}")
        return matches

    names = [row[2]["name"] for row in rows]
    if all_templates:
        stale = set(names)
    else:
        stale = set(templates_needing_enhance(cache, names))

    targets = [row for row in rows if row[2]["name"] in stale]
    if category:
        targets = [row for row in targets if row[0] == category]
    return targets


def persist_template_enhancement(cache: dict[str, Any], mcp_data: list[dict[str, Any]]) -> None:
    """Write cache + merge into index.mcp.json (called after each successful template)."""
    save_template_cache(cache)
    apply_template_cache_to_mcp(mcp_data, cache)
    MCP_FILE.write_text(dumps_compact_arrays(mcp_data), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="AI-enhance template descriptions into template_cache.json")
    parser.add_argument("--check", action="store_true", help="Validate config and list targets only")
    parser.add_argument("--template", metavar="NAME", help="Process a single template by name")
    parser.add_argument("--category", metavar="NAME", help='Filter by MCP category (e.g. "Use Cases")')
    parser.add_argument(
        "--all",
        action="store_true",
        help="Regenerate all targets (ignore source_hash)",
    )
    args = parser.parse_args()

    if not MCP_FILE.is_file():
        print(f"Missing {MCP_FILE}. Run scripts/mcp/sync_index.py first.", file=sys.stderr)
        return 1

    mcp_data = load_mcp_data()
    registry = load_json(REGISTRY_FILE)
    index_by_name = load_index_templates()
    all_rows = iter_mcp_templates(mcp_data)
    cache = load_template_cache()

    try:
        targets = select_targets(
            all_rows,
            cache,
            template=args.template,
            category=args.category,
            all_templates=args.all,
        )
    except KeyError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    stale_count = len(templates_needing_enhance(cache, [row[2]["name"] for row in all_rows]))
    print(f"Cache: {TEMPLATE_CACHE_FILE} ({len(cache.get('templates', {}))} entries)")
    print(f"MCP templates: {len(all_rows)}")
    print(f"Stale/missing (hash): {stale_count}")
    print(f"Targets: {len(targets)}")

    if args.check:
        for category, _desc, tpl in targets[:8]:
            h = workflow_source_hash(tpl["name"]) or "?"
            print(f"  - [{category}] {tpl['name']} (hash {h[:12]}…)")
        if len(targets) > 8:
            print(f"  ... and {len(targets) - 8} more")
        return 0

    settings = load_ai_settings()
    print(f"API base: {settings.base_url}")
    print(f"Model: {settings.model}")

    updated = 0
    for category, category_desc, tpl in targets:
        name = tpl["name"]
        digest = workflow_source_hash(name)
        if not digest:
            print(f"  skip (no workflow JSON): {name}", file=sys.stderr)
            continue

        system, user = build_prompt(
            tpl,
            category=category,
            category_description=category_desc,
            registry=registry,
            index_entry=index_by_name.get(name),
        )
        try:
            new_desc = chat_completion(settings, system, user)
        except RuntimeError as exc:
            print(f"  failed: {name} — {exc}", file=sys.stderr)
            continue

        cached_io = cache.get("templates", {}).get(name, {}).get("io") or tpl.get("io")
        set_template_cache(
            cache,
            name,
            description=new_desc,
            io=cached_io,
            source_hash=digest,
        )
        persist_template_enhancement(cache, mcp_data)
        updated += 1
        print(f"  cached: [{category}] {name}")

    if updated:
        print(f"\nDone: {updated} templates → {TEMPLATE_CACHE_FILE} + {MCP_FILE}")
    else:
        print("\nNo changes.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
