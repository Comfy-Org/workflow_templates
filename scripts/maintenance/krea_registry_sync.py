"""One-off: merge Krea scraped model descriptions into models_registry.json."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

TIER_RANK = {
    "Quality": 4,
    "Intelligent": 3,
    "Fast": 2,
    "Legacy": 1,
}


def _norm(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", name.lower())


def load_krea_entries(
    image_path: Path,
    video_path: Path,
) -> list[dict[str, Any]]:
    """Load all Krea models (image + video); same display name may appear twice."""
    entries: list[dict[str, Any]] = []
    for path, media in ((image_path, "image"), (video_path, "video")):
        data = json.loads(path.read_text(encoding="utf-8"))
        for category in data.get("categories", []):
            tier = category["name"].replace(" Models", "")
            for model in category.get("models", []):
                entries.append(
                    {
                        "name": model["name"],
                        "description": (model.get("description") or "").strip(),
                        "tier": tier,
                        "media": media,
                        "slug": model.get("slug", ""),
                    }
                )
    return entries


def resolve_registry_key(
    krea_name: str,
    registry: dict[str, Any],
    aliases: dict[str, str | None],
) -> str | None:
    if krea_name in aliases:
        target = aliases[krea_name]
        return target if target and target in registry else None

    if krea_name in registry:
        return krea_name

    norm_name = _norm(krea_name)
    for key in registry:
        if _norm(key) == norm_name:
            return key

    return None


def _variant_strength(krea_name: str, description: str) -> str:
    text = description.strip()
    if not text:
        return krea_name
    if len(text) <= 120:
        return f"{krea_name}: {text}"
    return f"{krea_name}: {text[:117]}..."


def merge_krea_into_registry(
    registry: dict[str, Any],
    krea_entries: list[dict[str, Any]],
    aliases: dict[str, str | None],
) -> tuple[dict[str, Any], dict[str, list[str]], list[str]]:
    """Return updated registry, per-key change log, and skipped Krea names."""
    updated = {key: dict(value) for key, value in registry.items()}
    matches: dict[str, list[dict[str, Any]]] = {}
    skipped: list[str] = []

    for meta in krea_entries:
        krea_name = meta["name"]
        reg_key = resolve_registry_key(krea_name, registry, aliases)
        if not reg_key:
            skipped.append(f"{krea_name} ({meta['media']})")
            continue
        label = krea_name if meta["media"] == "image" else f"{krea_name} ({meta['media']})"
        matches.setdefault(reg_key, []).append({**meta, "krea_name": label})

    changes: dict[str, list[str]] = {}

    for reg_key, items in matches.items():
        items.sort(
            key=lambda item: (
                TIER_RANK.get(item["tier"], 0),
                len(item.get("description", "")),
            ),
            reverse=True,
        )
        best = items[0]
        entry = updated[reg_key]
        old_summary = entry.get("summary", "")

        new_summary = best["description"] or old_summary
        if new_summary != old_summary:
            entry["summary"] = new_summary
            changes.setdefault(reg_key, []).append("summary")

        strengths: list[str] = []
        seen: set[str] = set()
        for item in items:
            if item["krea_name"] == best["krea_name"] and len(items) == 1:
                continue
            line = _variant_strength(item["krea_name"], item["description"])
            if line not in seen:
                seen.add(line)
                strengths.append(line)

        tier_note = f"Krea tier: {best['tier']}"
        if tier_note not in seen:
            strengths.insert(0, tier_note)

        if strengths:
            entry["strengths"] = strengths
            changes.setdefault(reg_key, []).append("strengths")

    return updated, changes, skipped
