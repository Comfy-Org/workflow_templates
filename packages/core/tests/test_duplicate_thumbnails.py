"""Focused tests for the cross-template thumbnail duplicate checker."""

import importlib.util
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageDraw

REPO_ROOT = Path(__file__).resolve().parents[3]

_spec = importlib.util.spec_from_file_location(
    "check_duplicate_thumbnails",
    REPO_ROOT / "scripts" / "validate" / "check_duplicate_thumbnails.py",
)
duplicate_thumbnails = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = duplicate_thumbnails
_spec.loader.exec_module(duplicate_thumbnails)


def _patterned_image(size: int) -> Image.Image:
    image = Image.new("RGB", (size, size))
    pixels = image.load()
    for y in range(size):
        for x in range(size):
            pixels[x, y] = (
                (x * 2 + y) % 256,
                (x + y * 2) % 256,
                (x + y) % 256,
            )
    ImageDraw.Draw(image).ellipse(
        (size // 4, size // 4, 3 * size // 4, 3 * size // 4),
        fill=(220, 90, 40),
    )
    return image


def _asset(template_id: str, path: Path) -> duplicate_thumbnails.ThumbnailAsset:
    return duplicate_thumbnails.ThumbnailAsset(template_id, path.resolve())


def test_discovers_explicit_images_and_exact_implicit_numeric_variants(tmp_path):
    explicit_dir = tmp_path / "thumbnail"
    explicit_dir.mkdir()
    (explicit_dir / "custom.png").touch()
    (tmp_path / "alpha-1.webp").touch()
    (tmp_path / "alpha-2.webp").touch()
    (tmp_path / "alpha_extra-1.webp").touch()

    entries = [
        {"name": "alpha", "thumbnail": ["thumbnail/custom.png", "output/movie.mp4"]},
        {"name": "alpha_extra"},
    ]

    assets = duplicate_thumbnails.discover_thumbnail_assets(tmp_path, entries)
    resolved = {(asset.template_id, asset.path.name) for asset in assets}

    assert resolved == {
        ("alpha", "custom.png"),
        ("alpha", "alpha-1.webp"),
        ("alpha", "alpha-2.webp"),
        ("alpha_extra", "alpha_extra-1.webp"),
    }


def test_finds_byte_identical_images_across_templates(tmp_path):
    first = tmp_path / "alpha-1.webp"
    second = tmp_path / "beta-1.webp"
    _patterned_image(80).save(first, "WEBP", lossless=True)
    shutil.copyfile(first, second)

    groups = duplicate_thumbnails.find_duplicate_groups(
        [_asset("alpha", first), _asset("beta", second)]
    )

    assert len(groups) == 1
    assert groups[0].kinds == ("byte-identical",)


def test_finds_same_visual_reencoded_at_a_different_size(tmp_path):
    large = tmp_path / "alpha-1.webp"
    small = tmp_path / "beta-1.webp"
    image = _patterned_image(128)
    image.save(large, "WEBP", lossless=True)
    image.resize((64, 64), Image.Resampling.LANCZOS).save(small, "WEBP", lossless=True, method=6)

    assert large.read_bytes() != small.read_bytes()
    groups = duplicate_thumbnails.find_duplicate_groups(
        [_asset("alpha", large), _asset("beta", small)]
    )

    assert len(groups) == 1
    assert groups[0].kinds == ("visually equivalent",)


def test_does_not_flag_multiple_assets_owned_by_one_template(tmp_path):
    first = tmp_path / "alpha-1.webp"
    second = tmp_path / "alpha-2.webp"
    _patterned_image(80).save(first, "WEBP", lossless=True)
    shutil.copyfile(first, second)

    groups = duplicate_thumbnails.find_duplicate_groups(
        [_asset("alpha", first), _asset("alpha", second)]
    )

    assert groups == []


def test_does_not_flag_a_localized_visible_difference(tmp_path):
    first = tmp_path / "alpha-1.webp"
    second = tmp_path / "beta-1.webp"
    left = Image.new("RGB", (350, 350), "black")
    right = left.copy()
    ImageDraw.Draw(right).rectangle((145, 260, 205, 275), fill="white")
    left.save(first, "WEBP", lossless=True)
    right.save(second, "WEBP", lossless=True)

    groups = duplicate_thumbnails.find_duplicate_groups(
        [_asset("alpha", first), _asset("beta", second)]
    )

    assert groups == []


def test_only_thumbnail_mapping_changes_mark_an_existing_template_changed():
    base = [
        {"name": "same", "description": "old", "thumbnail": ["thumbnail/a.png"]},
        {"name": "remapped", "thumbnail": ["thumbnail/old.png"]},
    ]
    current = [
        {"name": "same", "description": "new", "thumbnail": ["thumbnail/a.png"]},
        {"name": "remapped", "thumbnail": ["thumbnail/new.png"]},
        {"name": "added"},
    ]

    changed = duplicate_thumbnails.changed_thumbnail_templates(base, current)

    assert changed == {"remapped", "added"}


def test_changed_file_filter_ignores_unrelated_legacy_groups(tmp_path):
    legacy_left = _asset("legacy_a", tmp_path / "legacy_a-1.webp")
    legacy_right = _asset("legacy_b", tmp_path / "legacy_b-1.webp")
    group = duplicate_thumbnails.DuplicateGroup(
        assets=(legacy_left, legacy_right),
        matches=(
            duplicate_thumbnails.DuplicateMatch(legacy_left, legacy_right, "byte-identical", 0.0),
        ),
    )

    assert not duplicate_thumbnails.group_touches_changes(
        group,
        tmp_path,
        {"templates/unrelated-1.webp"},
        set(),
    )
    assert duplicate_thumbnails.group_touches_changes(
        group,
        tmp_path,
        {"legacy_a-1.webp"},
        set(),
    )
