import importlib.util
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
SCRIPT = REPO_ROOT / "scripts" / "ci" / "check_consumer_catalog_changes.py"
SPEC = importlib.util.spec_from_file_location("check_consumer_catalog_changes", SCRIPT)
assert SPEC and SPEC.loader
CHECK = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = CHECK
SPEC.loader.exec_module(CHECK)


def category(title, templates, *, essential=False, module="default"):
    return {
        "moduleName": module,
        "title": title,
        "isEssential": essential,
        "templates": templates,
    }


@pytest.fixture
def populated_catalog():
    return [
        category("Getting Started", [{"name": "default"}], essential=True),
        category("Image", [{"name": "flux"}]),
        category("Partners", [{"name": "partner", "openSource": False}]),
    ]


@pytest.mark.parametrize(
    "replacement",
    [
        [],
        [category("Start Here", [{"name": "default"}], essential=True)],
        [category("Getting Started", [{"name": "default"}])],
        [category("Getting Started", [], essential=True)],
    ],
    ids=["removed", "renamed", "declassified", "emptied"],
)
def test_flags_disappearance_of_essential_category(populated_catalog, replacement):
    after = [*replacement, *populated_catalog[1:]]

    impacts = CHECK.detect_impacts(populated_catalog, after)

    assert [impact.kind for impact in impacts] == ["essential_category_removed"]


def test_flags_elimination_of_partner_population(populated_catalog):
    after = [populated_catalog[0], populated_catalog[1]]

    impacts = CHECK.detect_impacts(populated_catalog, after)

    assert [impact.kind for impact in impacts] == ["partner_population_removed"]


def test_allows_shrinking_preserved_consumer_populations(populated_catalog):
    before = [
        category(
            "Getting Started",
            [{"name": "default"}, {"name": "second"}],
            essential=True,
        ),
        category(
            "Partners",
            [{"name": "a", "openSource": False}, {"name": "b", "openSource": False}],
        ),
    ]
    after = [
        category("Getting Started", [{"name": "default"}], essential=True),
        category("Partners", [{"name": "a", "openSource": False}]),
    ]

    assert CHECK.detect_impacts(before, after) == []


def test_allows_removal_or_rename_of_ordinary_category(populated_catalog):
    after = [populated_catalog[0], populated_catalog[2], category("Pictures", [{"name": "flux"}])]

    assert CHECK.detect_impacts(populated_catalog, after) == []


def test_allows_module_move_when_frontend_category_id_is_unchanged(populated_catalog):
    after = [
        category(
            "Getting Started",
            [{"name": "default"}],
            essential=True,
            module="new-module",
        ),
        *populated_catalog[1:],
    ]

    assert CHECK.detect_impacts(populated_catalog, after) == []
