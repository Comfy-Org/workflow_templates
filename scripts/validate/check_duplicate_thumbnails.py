#!/usr/bin/env python3
"""Find byte-identical and visually equivalent thumbnails across templates.

The repository has historical duplicate thumbnails, so CI uses ``--base-ref``
to fail only when a duplicate group involves a changed asset or thumbnail
mapping. ``--audit`` reports the entire current corpus without failing.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence

try:
    from PIL import Image, ImageOps, UnidentifiedImageError
except ModuleNotFoundError as exc:  # pragma: no cover - exercised before module import
    raise SystemExit("Pillow is required. Install it with `python -m pip install Pillow`.") from exc

_lib_dir = Path(__file__).resolve().parent.parent / "lib"
if str(_lib_dir) not in sys.path:
    sys.path.insert(0, str(_lib_dir))

from paths import REPO_ROOT, TEMPLATES_DIR  # noqa: E402


IMAGE_SUFFIXES = frozenset({".avif", ".jpeg", ".jpg", ".png", ".webp"})
IMPLICIT_THUMBNAIL_SUFFIX = ".webp"
HASH_SIZE = 16
NORMALIZED_SIZE = 32

# Perceptual hashes cheaply narrow the pair candidates. Pixel comparison then
# keeps the definition intentionally strict: equivalent encodings/resolutions,
# not two thumbnails that merely share a layout or background.
MAX_DIFFERENCE_HASH_DISTANCE = 16
MAX_AVERAGE_HASH_DISTANCE = 8
MAX_CHANNEL_MEAN_DELTA = 4.0
MAX_NORMALIZED_RMS = 3.0
MAX_NORMALIZED_CHANNEL_DELTA = 16


@dataclass(frozen=True)
class ThumbnailAsset:
    template_id: str
    path: Path


@dataclass(frozen=True)
class ThumbnailFingerprint:
    asset: ThumbnailAsset
    byte_digest: str
    difference_hash: int
    average_hash: int
    channel_means: tuple[float, float, float]
    normalized_pixels: bytes


@dataclass(frozen=True)
class DuplicateMatch:
    left: ThumbnailAsset
    right: ThumbnailAsset
    kind: str
    normalized_rms: float


@dataclass(frozen=True)
class DuplicateGroup:
    assets: tuple[ThumbnailAsset, ...]
    matches: tuple[DuplicateMatch, ...]

    @property
    def kinds(self) -> tuple[str, ...]:
        return tuple(sorted({match.kind for match in self.matches}))


def load_template_entries(index_path: Path) -> list[dict]:
    """Return template entries from every category in an index file."""
    with index_path.open(encoding="utf-8") as index_file:
        categories = json.load(index_file)

    if not isinstance(categories, list):
        raise ValueError(f"{index_path} must contain a list of categories")

    entries = []
    for category in categories:
        if not isinstance(category, dict):
            continue
        for template in category.get("templates", []):
            if isinstance(template, dict) and isinstance(template.get("name"), str):
                entries.append(template)
    return entries


def _safe_explicit_thumbnail(templates_dir: Path, relative_path: str) -> Path | None:
    """Resolve an explicit image thumbnail without allowing it outside templates/."""
    candidate = (templates_dir / relative_path).resolve()
    try:
        candidate.relative_to(templates_dir.resolve())
    except ValueError:
        return None
    if candidate.suffix.lower() not in IMAGE_SUFFIXES or not candidate.is_file():
        return None
    return candidate


def discover_thumbnail_assets(templates_dir: Path, entries: Sequence[dict]) -> list[ThumbnailAsset]:
    """Resolve explicit image thumbnails and implicit ``{template}-N.webp`` files."""
    paths_by_template: dict[str, set[Path]] = {}

    for entry in entries:
        template_id = entry["name"]
        template_paths = paths_by_template.setdefault(template_id, set())
        explicit = entry.get("thumbnail", [])
        if not isinstance(explicit, list):
            continue
        for relative_path in explicit:
            if not isinstance(relative_path, str):
                continue
            thumbnail = _safe_explicit_thumbnail(templates_dir, relative_path)
            if thumbnail is not None:
                template_paths.add(thumbnail)

    # Match the numeric suffix exactly so template-name prefixes cannot claim
    # another template's asset (for example ``foo`` must not claim ``foo_bar-1``).
    template_ids = set(paths_by_template)
    for path in templates_dir.iterdir():
        if not path.is_file() or path.suffix.lower() != IMPLICIT_THUMBNAIL_SUFFIX:
            continue
        owner, separator, number = path.stem.rpartition("-")
        if separator and number.isdigit() and owner in template_ids:
            paths_by_template[owner].add(path.resolve())

    return [
        ThumbnailAsset(template_id, path)
        for template_id, paths in sorted(paths_by_template.items())
        for path in sorted(paths)
    ]


def _bits_from_comparisons(values: Sequence[int], width: int, height: int) -> int:
    result = 0
    row_width = width + 1
    for y in range(height):
        for x in range(width):
            if values[y * row_width + x] > values[y * row_width + x + 1]:
                result |= 1 << (y * width + x)
    return result


def fingerprint_asset(asset: ThumbnailAsset) -> ThumbnailFingerprint:
    """Build byte and perceptual fingerprints for one image asset."""
    image_bytes = asset.path.read_bytes()
    byte_digest = hashlib.sha256(image_bytes).hexdigest()

    try:
        with Image.open(asset.path) as source:
            image = ImageOps.exif_transpose(source).convert("RGB")
    except (OSError, UnidentifiedImageError) as exc:
        raise ValueError(f"Cannot decode thumbnail {asset.path}: {exc}") from exc

    normalized = image.resize((NORMALIZED_SIZE, NORMALIZED_SIZE), Image.Resampling.LANCZOS)
    normalized_pixels = normalized.tobytes()
    pixel_count = NORMALIZED_SIZE * NORMALIZED_SIZE
    channel_means = tuple(sum(normalized_pixels[channel::3]) / pixel_count for channel in range(3))

    difference_image = image.convert("L").resize(
        (HASH_SIZE + 1, HASH_SIZE), Image.Resampling.LANCZOS
    )
    difference_hash = _bits_from_comparisons(list(difference_image.getdata()), HASH_SIZE, HASH_SIZE)

    average_image = image.convert("L").resize((HASH_SIZE, HASH_SIZE), Image.Resampling.LANCZOS)
    average_pixels = list(average_image.getdata())
    average = sum(average_pixels) / len(average_pixels)
    average_hash = sum((pixel > average) << index for index, pixel in enumerate(average_pixels))

    return ThumbnailFingerprint(
        asset=asset,
        byte_digest=byte_digest,
        difference_hash=difference_hash,
        average_hash=average_hash,
        channel_means=channel_means,
        normalized_pixels=normalized_pixels,
    )


def _visual_distance(left: ThumbnailFingerprint, right: ThumbnailFingerprint) -> float | None:
    if (left.difference_hash ^ right.difference_hash).bit_count() > MAX_DIFFERENCE_HASH_DISTANCE:
        return None
    if (left.average_hash ^ right.average_hash).bit_count() > MAX_AVERAGE_HASH_DISTANCE:
        return None
    if (
        max(
            abs(left_mean - right_mean)
            for left_mean, right_mean in zip(left.channel_means, right.channel_means)
        )
        > MAX_CHANNEL_MEAN_DELTA
    ):
        return None

    squared_error = 0
    for left_pixel, right_pixel in zip(left.normalized_pixels, right.normalized_pixels):
        delta = abs(left_pixel - right_pixel)
        if delta > MAX_NORMALIZED_CHANNEL_DELTA:
            return None
        squared_error += delta * delta
    normalized_rms = math.sqrt(squared_error / len(left.normalized_pixels))
    if normalized_rms > MAX_NORMALIZED_RMS:
        return None
    return normalized_rms


def find_duplicate_matches(
    fingerprints: Sequence[ThumbnailFingerprint],
) -> list[DuplicateMatch]:
    """Return duplicate pairs, excluding pairs owned by the same template."""
    matches = []
    for left_index, left in enumerate(fingerprints):
        for right in fingerprints[left_index + 1 :]:
            if left.asset.template_id == right.asset.template_id:
                continue
            if left.byte_digest == right.byte_digest:
                matches.append(DuplicateMatch(left.asset, right.asset, "byte-identical", 0.0))
                continue
            normalized_rms = _visual_distance(left, right)
            if normalized_rms is not None:
                matches.append(
                    DuplicateMatch(
                        left.asset,
                        right.asset,
                        "visually equivalent",
                        normalized_rms,
                    )
                )
    return matches


def group_duplicate_matches(matches: Sequence[DuplicateMatch]) -> list[DuplicateGroup]:
    """Group connected duplicate pairs for concise, actionable output."""
    parent: dict[ThumbnailAsset, ThumbnailAsset] = {}

    def find(asset: ThumbnailAsset) -> ThumbnailAsset:
        parent.setdefault(asset, asset)
        while parent[asset] != asset:
            parent[asset] = parent[parent[asset]]
            asset = parent[asset]
        return asset

    def union(left: ThumbnailAsset, right: ThumbnailAsset) -> None:
        left_root = find(left)
        right_root = find(right)
        if left_root != right_root:
            parent[right_root] = left_root

    for match in matches:
        union(match.left, match.right)

    assets_by_root: dict[ThumbnailAsset, set[ThumbnailAsset]] = {}
    matches_by_root: dict[ThumbnailAsset, list[DuplicateMatch]] = {}
    for match in matches:
        root = find(match.left)
        assets_by_root.setdefault(root, set()).update((match.left, match.right))
        matches_by_root.setdefault(root, []).append(match)

    groups = [
        DuplicateGroup(
            tuple(sorted(assets, key=lambda asset: (asset.template_id, str(asset.path)))),
            tuple(matches_by_root[root]),
        )
        for root, assets in assets_by_root.items()
    ]
    return sorted(
        groups,
        key=lambda group: (group.assets[0].template_id, str(group.assets[0].path)),
    )


def find_duplicate_groups(assets: Sequence[ThumbnailAsset]) -> list[DuplicateGroup]:
    fingerprints = [fingerprint_asset(asset) for asset in assets]
    return group_duplicate_matches(find_duplicate_matches(fingerprints))


def _run_git(repo_root: Path, *arguments: str) -> str:
    result = subprocess.run(
        ["git", *arguments],
        cwd=repo_root,
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip()
        raise ValueError(f"git {' '.join(arguments)} failed: {detail}")
    return result.stdout


def _explicit_image_paths(entry: dict) -> tuple[str, ...]:
    thumbnail = entry.get("thumbnail", [])
    if not isinstance(thumbnail, list):
        return ()
    return tuple(
        sorted(
            path
            for path in thumbnail
            if isinstance(path, str) and Path(path).suffix.lower() in IMAGE_SUFFIXES
        )
    )


def _thumbnail_config_by_template(entries: Iterable[dict]) -> dict[str, tuple[str, ...]]:
    return {entry["name"]: _explicit_image_paths(entry) for entry in entries}


def changed_thumbnail_templates(
    base_entries: Iterable[dict], current_entries: Iterable[dict]
) -> set[str]:
    """Return new templates and templates whose explicit image mapping changed."""
    base_config = _thumbnail_config_by_template(base_entries)
    current_config = _thumbnail_config_by_template(current_entries)
    return {
        template_id
        for template_id, config in current_config.items()
        if template_id not in base_config or base_config[template_id] != config
    }


def changes_since_base(
    repo_root: Path, base_ref: str, current_entries: Sequence[dict]
) -> tuple[set[str], set[str], str]:
    """Return changed repo paths/template mappings since the merge base."""
    base_commit = _run_git(repo_root, "merge-base", base_ref, "HEAD").strip()
    if not base_commit:
        raise ValueError(f"No merge base found for {base_ref}")

    changed_paths = {
        path
        for path in _run_git(
            repo_root,
            "diff",
            "--name-only",
            "--diff-filter=ACMRT",
            base_commit,
            "--",
            "templates",
        ).splitlines()
        if path
    }
    changed_paths.update(
        path
        for path in _run_git(
            repo_root, "ls-files", "--others", "--exclude-standard", "--", "templates"
        ).splitlines()
        if path
    )

    base_index_text = _run_git(repo_root, "show", f"{base_commit}:templates/index.json")
    base_categories = json.loads(base_index_text)
    base_entries = [
        template
        for category in base_categories
        if isinstance(category, dict)
        for template in category.get("templates", [])
        if isinstance(template, dict) and isinstance(template.get("name"), str)
    ]
    changed_templates = changed_thumbnail_templates(base_entries, current_entries)
    return changed_paths, changed_templates, base_commit


def group_touches_changes(
    group: DuplicateGroup,
    repo_root: Path,
    changed_paths: set[str],
    changed_templates: set[str],
) -> bool:
    return any(
        asset.template_id in changed_templates
        or asset.path.relative_to(repo_root).as_posix() in changed_paths
        for asset in group.assets
    )


def _format_group(
    group: DuplicateGroup,
    number: int,
    repo_root: Path,
    changed_paths: set[str] | None = None,
    changed_templates: set[str] | None = None,
) -> list[str]:
    kinds = ", ".join(group.kinds)
    lines = [f"Duplicate group {number} ({kinds}):"]
    changed_paths = changed_paths or set()
    changed_templates = changed_templates or set()
    for asset in group.assets:
        relative_path = asset.path.relative_to(repo_root).as_posix()
        reasons = []
        if relative_path in changed_paths:
            reasons.append("changed asset")
        if asset.template_id in changed_templates:
            reasons.append("changed thumbnail mapping")
        marker = f" [{', '.join(reasons)}]" if reasons else ""
        lines.append(f"  - template `{asset.template_id}`: `{relative_path}`{marker}")
    return lines


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument(
        "--audit",
        action="store_true",
        help="report every existing cross-template duplicate and exit successfully",
    )
    mode.add_argument(
        "--base-ref",
        help="fail only for duplicate groups involving changes since this Git ref",
    )
    parser.add_argument(
        "--templates-dir",
        type=Path,
        default=TEMPLATES_DIR,
        help=argparse.SUPPRESS,
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    templates_dir = args.templates_dir.resolve()
    index_path = templates_dir / "index.json"

    try:
        entries = load_template_entries(index_path)
        assets = discover_thumbnail_assets(templates_dir, entries)
        groups = find_duplicate_groups(assets)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"Thumbnail duplicate check failed: {exc}", file=sys.stderr)
        return 2

    template_count = len({entry["name"] for entry in entries})
    print(f"Scanned {len(assets)} effective image thumbnails across {template_count} templates.")

    if args.audit:
        if not groups:
            print("No cross-template duplicate thumbnails found.")
            return 0
        print(f"Found {len(groups)} cross-template duplicate thumbnail group(s).")
        for number, group in enumerate(groups, start=1):
            print()
            print("\n".join(_format_group(group, number, REPO_ROOT)))
        print("\nAudit mode reports existing debt without failing.")
        return 0

    try:
        changed_paths, changed_templates, base_commit = changes_since_base(
            REPO_ROOT, args.base_ref, entries
        )
    except (ValueError, json.JSONDecodeError) as exc:
        print(f"Thumbnail duplicate check failed: {exc}", file=sys.stderr)
        return 2

    blocking_groups = [
        group
        for group in groups
        if group_touches_changes(group, REPO_ROOT, changed_paths, changed_templates)
    ]
    ignored_count = len(groups) - len(blocking_groups)
    print(f"Compared changes with merge base {base_commit[:12]} ({args.base_ref}).")
    if not blocking_groups:
        print("No changed thumbnail introduces or modifies a cross-template duplicate.")
        if ignored_count:
            print(f"Ignored {ignored_count} pre-existing duplicate group(s).")
        return 0

    print(
        f"Found {len(blocking_groups)} duplicate group(s) involving changed thumbnails; "
        "replace the repeated image before merging."
    )
    for number, group in enumerate(blocking_groups, start=1):
        print()
        print(
            "\n".join(
                _format_group(
                    group,
                    number,
                    REPO_ROOT,
                    changed_paths,
                    changed_templates,
                )
            )
        )
    if ignored_count:
        print(f"\nIgnored {ignored_count} unrelated pre-existing duplicate group(s).")
    return 1


if __name__ == "__main__":
    sys.exit(main())
