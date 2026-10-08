#!/usr/bin/env python3
"""
Step 2a — AI-assisted enrichment of scripts/data/mcp/models_registry.json.

Model profiles (summary, strengths, capabilities) are written directly to
models_registry.json after each successful model — NOT template_cache.json.

Prerequisites:
  cp .env.example .env   # AI_API_KEY, AI_BASE_URL, AI_MODEL

Usage:
  python3 scripts/mcp/enhance_models_registry.py --check
  python3 scripts/mcp/enhance_models_registry.py
  python3 scripts/mcp/enhance_models_registry.py --model "Seedance 2.0"
  python3 scripts/mcp/enhance_models_registry.py --all
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

_MCP_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(_MCP_DIR))

from bootstrap import install_paths  # noqa: E402

install_paths()

from ai import chat_json_completion, load_ai_settings  # noqa: E402
from ai_context import (  # noqa: E402
    MCP_FILE,
    REGISTRY_FILE,
    REGISTRY_SKIP_MODELS,
    load_json,
    load_mcp_data,
    model_template_usage,
    normalize_capability_slugs,
    registry_needs_update,
)
from json_format import dumps_compact_arrays  # noqa: E402

MAX_STRENGTHS = 4
MAX_CAPABILITIES = 6
MAX_STRENGTH_WORDS = 8
EXAMPLE_WORKFLOWS_LIMIT = 2


def build_model_prompt(
    model_name: str,
    profile: dict[str, Any],
    template_examples: list[dict[str, Any]],
) -> tuple[str, str]:
    system = (
        "You write concise model profiles for a ComfyUI workflow template index. "
        "Describe the model itself — not a list of every workflow that uses it. "
        "Do not invent release details, pricing, or features not implied by the context. "
        "Return JSON with exactly these keys:\n"
        '  "summary": string — 1-2 sentences, primary use cases only\n'
        f'  "strengths": string[] — at most {MAX_STRENGTHS} items, each ≤{MAX_STRENGTH_WORDS} words, '
        "short phrases not full sentences\n"
        f'  "capabilities": string[] — at most {MAX_CAPABILITIES} kebab-case slugs '
        "(e.g. text-to-image, image-to-video, lip-sync)"
    )
    user = json.dumps(
        {
            "model": model_name,
            "existing_profile": profile,
            "example_workflows": template_examples[:EXAMPLE_WORKFLOWS_LIMIT],
        },
        indent=2,
        ensure_ascii=False,
    )
    return system, user


def _trim_words(text: str, max_words: int) -> str:
    words = text.split()
    if len(words) <= max_words:
        return text
    return " ".join(words[:max_words])


def normalize_profile(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise ValueError(f"Expected JSON object, got {type(raw).__name__}")
    summary = str(raw.get("summary", "")).strip()
    strengths = [
        _trim_words(str(item).strip(), MAX_STRENGTH_WORDS)
        for item in raw.get("strengths", [])
        if str(item).strip()
    ][:MAX_STRENGTHS]
    capabilities = normalize_capability_slugs(
        [str(item) for item in raw.get("capabilities", []) if str(item).strip()]
    )[:MAX_CAPABILITIES]
    if not summary:
        raise ValueError("Missing summary in AI response")
    return {
        "summary": summary,
        "strengths": strengths,
        "capabilities": capabilities,
    }


def select_targets(
    registry: dict[str, Any],
    usage: dict[str, list[dict[str, Any]]],
    *,
    model: str | None,
    all_models: bool,
    include_skipped: bool,
) -> list[str]:
    if model:
        if model not in registry:
            raise KeyError(f"Model not in registry: {model}")
        return [model]

    if all_models:
        targets = [
            name for name in registry if include_skipped or name not in REGISTRY_SKIP_MODELS
        ]
    else:
        targets = [
            name
            for name, profile in registry.items()
            if (include_skipped or name not in REGISTRY_SKIP_MODELS)
            and registry_needs_update(name, profile)
        ]

    targets.sort(key=lambda n: (0 if n in usage else 1, n.lower()))
    return targets


def main() -> int:
    parser = argparse.ArgumentParser(description="AI-enrich models_registry.json")
    parser.add_argument("--check", action="store_true", help="Validate config and list targets")
    parser.add_argument("--model", metavar="NAME", help="Process a single model by registry key")
    parser.add_argument(
        "--all",
        action="store_true",
        help="Regenerate all models (not only pending/empty profiles)",
    )
    parser.add_argument(
        "--include-skipped",
        action="store_true",
        help=f"Include skipped keys: {', '.join(sorted(REGISTRY_SKIP_MODELS))}",
    )
    args = parser.parse_args()

    if not MCP_FILE.is_file():
        print(f"Missing {MCP_FILE}. Run scripts/mcp/sync_index.py first.", file=sys.stderr)
        return 1
    if not REGISTRY_FILE.is_file():
        print(f"Missing {REGISTRY_FILE}.", file=sys.stderr)
        return 1

    registry: dict[str, Any] = load_json(REGISTRY_FILE)
    mcp_data = load_mcp_data()
    usage = model_template_usage(mcp_data, limit_per_model=EXAMPLE_WORKFLOWS_LIMIT)

    try:
        targets = select_targets(
            registry,
            usage,
            model=args.model,
            all_models=args.all,
            include_skipped=args.include_skipped,
        )
    except KeyError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    print(f"Output: {REGISTRY_FILE}")
    print(f"Registry models: {len(registry)}")
    print(f"Targets: {len(targets)}")

    if args.check:
        for name in targets[:10]:
            examples = len(usage.get(name, []))
            print(f"  - {name} ({examples} example workflows)")
        if len(targets) > 10:
            print(f"  ... and {len(targets) - 10} more")
        return 0

    settings = load_ai_settings()
    print(f"API base: {settings.base_url}")
    print(f"Model: {settings.model}")

    updated = 0
    for name in targets:
        profile = registry.get(name, {})
        examples = usage.get(name, [])
        system, user = build_model_prompt(name, profile, examples)
        try:
            raw = chat_json_completion(settings, system, user)
            new_profile = normalize_profile(raw)
        except (RuntimeError, ValueError, json.JSONDecodeError) as exc:
            print(f"  failed: {name} — {exc}", file=sys.stderr)
            continue

        if new_profile != profile:
            registry[name] = new_profile
            REGISTRY_FILE.write_text(dumps_compact_arrays(registry), encoding="utf-8")
            updated += 1
            print(f"  updated: {name}")

    if updated:
        print(f"\nDone: {updated} models → {REGISTRY_FILE}")
    else:
        print("\nNo changes.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
