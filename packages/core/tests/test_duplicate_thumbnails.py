"""Tests for the cross-template thumbnail duplicate checker."""

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
checker = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = checker
_spec.loader.exec_module(checker)


def patterned_image(size: int) -> Image.Image:
    image = Image.linear_gradient("L").resize((size, size)).convert("RGB")
    ImageDraw.Draw(image).ellipse(
        (size // 4, size // 4, 3 * size // 4, 3 * size // 4), fill=(220, 90, 40)
    )
    return image


def asset(template_id: str, path: Path):
    return template_id, path.resolve()


def test_finds_explicit_images_and_exact_implicit_names(tmp_path):
    thumbnail_dir = tmp_path / "thumbnail"
    thumbnail_dir.mkdir()
    (thumbnail_dir / "custom.png").touch()
    (tmp_path / "alpha-1.webp").touch()
    (tmp_path / "alpha-2.webp").touch()
    (tmp_path / "alpha_extra-1.webp").touch()
    entries = [
        {"name": "alpha", "thumbnail": ["thumbnail/custom.png", "output/movie.mp4"]},
        {"name": "alpha_extra"},
    ]

    found = {
        (template_id, path.name) for template_id, path in checker.find_assets(tmp_path, entries)
    }

    assert found == {
        ("alpha", "custom.png"),
        ("alpha", "alpha-1.webp"),
        ("alpha", "alpha-2.webp"),
        ("alpha_extra", "alpha_extra-1.webp"),
    }


def test_finds_byte_identical_images_across_templates(tmp_path):
    first = tmp_path / "alpha.webp"
    second = tmp_path / "beta.webp"
    patterned_image(80).save(first, "WEBP", lossless=True)
    shutil.copyfile(first, second)

    duplicates = checker.find_duplicates([asset("alpha", first), asset("beta", second)])

    assert [duplicate[2] for duplicate in duplicates] == ["byte-identical"]


def test_finds_same_visual_reencoded_at_a_different_size(tmp_path):
    large = tmp_path / "alpha.webp"
    small = tmp_path / "beta.webp"
    image = patterned_image(128)
    image.save(large, "WEBP", lossless=True)
    image.resize((64, 64), Image.Resampling.LANCZOS).save(small, "WEBP", lossless=True)

    assert large.read_bytes() != small.read_bytes()
    duplicates = checker.find_duplicates([asset("alpha", large), asset("beta", small)])

    assert [duplicate[2] for duplicate in duplicates] == ["visually equivalent"]


def test_ignores_same_template_and_visible_differences(tmp_path):
    first = tmp_path / "first.webp"
    same = tmp_path / "same.webp"
    different = tmp_path / "different.webp"
    image = Image.new("RGB", (350, 350), "black")
    image.save(first, "WEBP", lossless=True)
    shutil.copyfile(first, same)
    ImageDraw.Draw(image).rectangle((145, 260, 205, 275), fill="white")
    image.save(different, "WEBP", lossless=True)

    assert checker.find_duplicates([asset("alpha", first), asset("alpha", same)]) == []
    assert checker.find_duplicates([asset("alpha", first), asset("beta", different)]) == []


def test_explicit_image_config_ignores_unrelated_metadata():
    base = {"name": "demo", "description": "old", "thumbnail": ["thumbnail/a.png"]}
    same_mapping = {"name": "demo", "description": "new", "thumbnail": ["thumbnail/a.png"]}
    changed_mapping = {"name": "demo", "thumbnail": ["thumbnail/b.png"]}

    assert checker.explicit_images(base) == checker.explicit_images(same_mapping)
    assert checker.explicit_images(base) != checker.explicit_images(changed_mapping)


def test_only_related_changes_block_a_duplicate_pair():
    duplicate = (
        ("alpha", REPO_ROOT / "templates/alpha-1.webp"),
        ("beta", REPO_ROOT / "templates/beta-1.webp"),
        "byte-identical",
    )

    assert checker.touches_changes(duplicate, {"templates/alpha-1.webp"}, set())
    assert checker.touches_changes(duplicate, set(), {"beta"})
    assert not checker.touches_changes(duplicate, {"templates/unrelated-1.webp"}, set())
