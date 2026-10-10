#!/usr/bin/env python3
"""Find duplicate-looking image thumbnails owned by different templates."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import subprocess
import sys
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ModuleNotFoundError as exc:  # pragma: no cover
    raise SystemExit("Install Pillow first: `python -m pip install Pillow`.") from exc

_lib_dir = Path(__file__).resolve().parent.parent / "lib"
if str(_lib_dir) not in sys.path:
    sys.path.insert(0, str(_lib_dir))

from paths import REPO_ROOT, TEMPLATES_DIR  # noqa: E402


IMAGE_SUFFIXES = {".avif", ".jpeg", ".jpg", ".png", ".webp"}
HASH_SIZE = 16
NORMALIZED_SIZE = 32
MAX_HASH_DISTANCE = 16
MAX_PIXEL_DELTA = 16
MAX_PIXEL_RMS = 3.0

Asset = tuple[str, Path]
Fingerprint = tuple[str, int, bytes]
Duplicate = tuple[Asset, Asset, str]


def entries_from_json(data: object) -> list[dict]:
    if not isinstance(data, list):
        raise ValueError("templates/index.json must contain a list of categories")
    return [
        template
        for category in data
        if isinstance(category, dict)
        for template in category.get("templates", [])
        if isinstance(template, dict) and isinstance(template.get("name"), str)
    ]


def load_entries(index_path: Path) -> list[dict]:
    with index_path.open(encoding="utf-8") as index_file:
        return entries_from_json(json.load(index_file))


def find_assets(templates_dir: Path, entries: list[dict]) -> list[Asset]:
    """Find explicit image paths and implicit ``{template}-N.webp`` assets."""
    templates_dir = templates_dir.resolve()
    paths_by_template = {entry["name"]: set() for entry in entries}

    for entry in entries:
        thumbnail_paths = entry.get("thumbnail", [])
        if not isinstance(thumbnail_paths, list):
            continue
        for relative_path in thumbnail_paths:
            if not isinstance(relative_path, str):
                continue
            path = (templates_dir / relative_path).resolve()
            try:
                path.relative_to(templates_dir)
            except ValueError:
                continue
            if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES:
                paths_by_template[entry["name"]].add(path)

    template_ids = set(paths_by_template)
    for path in templates_dir.glob("*.webp"):
        template_id, separator, number = path.stem.rpartition("-")
        if separator and number.isdigit() and template_id in template_ids:
            paths_by_template[template_id].add(path.resolve())

    return [
        (template_id, path)
        for template_id, paths in sorted(paths_by_template.items())
        for path in sorted(paths)
    ]


def fingerprint(path: Path) -> Fingerprint:
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    try:
        with Image.open(path) as source:
            image = ImageOps.exif_transpose(source).convert("RGB")
    except OSError as exc:
        raise ValueError(f"Cannot decode {path}: {exc}") from exc

    normalized = image.resize((NORMALIZED_SIZE, NORMALIZED_SIZE), Image.Resampling.LANCZOS)
    normalized_pixels = normalized.tobytes()
    grayscale = image.convert("L").resize((HASH_SIZE + 1, HASH_SIZE), Image.Resampling.LANCZOS)
    values = list(grayscale.getdata())
    row_width = HASH_SIZE + 1
    difference_hash = sum(
        (values[y * row_width + x] > values[y * row_width + x + 1]) << (y * HASH_SIZE + x)
        for y in range(HASH_SIZE)
        for x in range(HASH_SIZE)
    )
    return digest, difference_hash, normalized_pixels


def visually_same(left: Fingerprint, right: Fingerprint) -> bool:
    if (left[1] ^ right[1]).bit_count() > MAX_HASH_DISTANCE:
        return False

    squared_error = 0
    for left_pixel, right_pixel in zip(left[2], right[2]):
        delta = abs(left_pixel - right_pixel)
        if delta > MAX_PIXEL_DELTA:
            return False
        squared_error += delta * delta
    return math.sqrt(squared_error / len(left[2])) <= MAX_PIXEL_RMS


def find_duplicates(assets: list[Asset]) -> list[Duplicate]:
    fingerprints = [(asset, fingerprint(asset[1])) for asset in assets]
    duplicates = []
    for index, (left_asset, left_fingerprint) in enumerate(fingerprints):
        for right_asset, right_fingerprint in fingerprints[index + 1 :]:
            if left_asset[0] == right_asset[0]:
                continue
            if left_fingerprint[0] == right_fingerprint[0]:
                duplicates.append((left_asset, right_asset, "byte-identical"))
            elif visually_same(left_fingerprint, right_fingerprint):
                duplicates.append((left_asset, right_asset, "visually equivalent"))
    return duplicates


def git(repo_root: Path, *arguments: str) -> str:
    result = subprocess.run(
        ["git", *arguments], cwd=repo_root, capture_output=True, text=True, check=False
    )
    if result.returncode:
        raise ValueError(result.stderr.strip() or f"git {' '.join(arguments)} failed")
    return result.stdout


def explicit_images(entry: dict) -> tuple[str, ...]:
    paths = entry.get("thumbnail", [])
    if not isinstance(paths, list):
        return ()
    return tuple(
        sorted(
            path
            for path in paths
            if isinstance(path, str) and Path(path).suffix.lower() in IMAGE_SUFFIXES
        )
    )


def changes_since_base(
    repo_root: Path, base_ref: str, current_entries: list[dict]
) -> tuple[set[str], set[str], str]:
    base_commit = git(repo_root, "merge-base", base_ref, "HEAD").strip()
    if not base_commit:
        raise ValueError(f"No merge base found for {base_ref}")

    changed_paths = set(
        git(
            repo_root,
            "diff",
            "--name-only",
            "--diff-filter=ACMRT",
            base_commit,
            "--",
            "templates",
        ).splitlines()
    )
    changed_paths.update(
        git(repo_root, "ls-files", "--others", "--exclude-standard", "--", "templates").splitlines()
    )

    base_entries = entries_from_json(
        json.loads(git(repo_root, "show", f"{base_commit}:templates/index.json"))
    )
    base_config = {entry["name"]: explicit_images(entry) for entry in base_entries}
    current_config = {entry["name"]: explicit_images(entry) for entry in current_entries}
    changed_templates = {
        template_id
        for template_id, config in current_config.items()
        if template_id not in base_config or base_config[template_id] != config
    }
    return changed_paths, changed_templates, base_commit


def touches_changes(
    duplicate: Duplicate,
    changed_paths: set[str],
    changed_templates: set[str],
) -> bool:
    return any(
        template_id in changed_templates or path.relative_to(REPO_ROOT).as_posix() in changed_paths
        for template_id, path in duplicate[:2]
    )


def print_duplicate(
    duplicate: Duplicate,
    number: int,
    changed_paths: set[str] | None = None,
    changed_templates: set[str] | None = None,
) -> None:
    changed_paths = changed_paths or set()
    changed_templates = changed_templates or set()
    print(f"Duplicate {number} ({duplicate[2]}):")
    for template_id, path in duplicate[:2]:
        relative_path = path.relative_to(REPO_ROOT).as_posix()
        reasons = []
        if relative_path in changed_paths:
            reasons.append("changed asset")
        if template_id in changed_templates:
            reasons.append("changed thumbnail mapping")
        marker = f" [{', '.join(reasons)}]" if reasons else ""
        print(f"  - template `{template_id}`: `{relative_path}`{marker}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--audit", action="store_true", help="report all existing duplicates")
    mode.add_argument("--base-ref", help="fail only for duplicates involving changed thumbnails")
    args = parser.parse_args()

    try:
        entries = load_entries(TEMPLATES_DIR / "index.json")
        assets = find_assets(TEMPLATES_DIR, entries)
        duplicates = find_duplicates(assets)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"Thumbnail duplicate check failed: {exc}", file=sys.stderr)
        return 2

    print(
        f"Scanned {len(assets)} effective image thumbnails across "
        f"{len({entry['name'] for entry in entries})} templates."
    )
    if args.audit:
        print(f"Found {len(duplicates)} cross-template duplicate pair(s).")
        for number, duplicate in enumerate(duplicates, 1):
            print()
            print_duplicate(duplicate, number)
        print("\nAudit mode reports existing debt without failing.")
        return 0

    try:
        changed_paths, changed_templates, base_commit = changes_since_base(
            REPO_ROOT, args.base_ref, entries
        )
    except (ValueError, json.JSONDecodeError) as exc:
        print(f"Thumbnail duplicate check failed: {exc}", file=sys.stderr)
        return 2

    blocking = [
        duplicate
        for duplicate in duplicates
        if touches_changes(duplicate, changed_paths, changed_templates)
    ]
    ignored = len(duplicates) - len(blocking)
    print(f"Compared changes with merge base {base_commit[:12]} ({args.base_ref}).")
    if not blocking:
        print("No changed thumbnail duplicates another template thumbnail.")
        if ignored:
            print(f"Ignored {ignored} pre-existing duplicate pair(s).")
        return 0

    print(f"Found {len(blocking)} changed duplicate pair(s); replace the repeated image.")
    for number, duplicate in enumerate(blocking, 1):
        print()
        print_duplicate(duplicate, number, changed_paths, changed_templates)
    if ignored:
        print(f"\nIgnored {ignored} unrelated pre-existing duplicate pair(s).")
    return 1


if __name__ == "__main__":
    sys.exit(main())
