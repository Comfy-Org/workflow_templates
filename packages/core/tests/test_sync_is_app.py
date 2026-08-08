"""Tests for scripts/sync/sync_is_app.py, the isApp bake into index.json.

The point of interest is that the plan pass and the write pass have to agree on
what "already correct" means. Canonical is `isApp: true` present for an App and
the key absent otherwise, so an explicit `isApp: false` and any non-boolean
value are both stale. When the two passes judged that independently, `--check`
could report the index clean while the write pass would still have changed it.
"""

import importlib.util
import json
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]

_spec = importlib.util.spec_from_file_location(
    "sync_is_app", REPO_ROOT / "scripts" / "sync" / "sync_is_app.py"
)
sync_is_app = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(sync_is_app)


def _write_workflow(templates_dir: Path, name: str, linear_mode) -> None:
    """Write a minimal workflow file, with extra.linearMode set to `linear_mode`.

    Passing `None` writes a workflow with no `linearMode` key at all, which is
    the normal node-graph case.
    """
    extra = {} if linear_mode is None else {"linearMode": linear_mode}
    (templates_dir / f"{name}.json").write_text(
        json.dumps({"nodes": [], "extra": extra}), encoding="utf-8"
    )


def _categories(*templates):
    return [{"category": "Basics", "templates": list(templates)}]


# ── workflow_is_app ──────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "linear_mode,expected",
    [(True, True), (False, False), (None, False), ("true", False), (1, False)],
)
def test_workflow_is_app_only_accepts_a_true_boolean(tmp_path, linear_mode, expected):
    _write_workflow(tmp_path, "demo", linear_mode)
    assert sync_is_app.workflow_is_app(tmp_path, "demo") is expected


def test_workflow_is_app_tolerates_a_missing_file(tmp_path):
    assert sync_is_app.workflow_is_app(tmp_path, "absent") is False


def test_workflow_is_app_tolerates_unreadable_json(tmp_path):
    (tmp_path / "broken.json").write_text("{not json", encoding="utf-8")
    assert sync_is_app.workflow_is_app(tmp_path, "broken") is False


# ── entry_is_canonical ───────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "stored,desired,canonical",
    [
        ({}, False, True),  # absent + not an App: already correct
        ({}, True, False),  # absent + App: needs writing
        ({"isApp": True}, True, True),  # present true + App: already correct
        ({"isApp": True}, False, False),  # present true + not an App: needs deleting
        ({"isApp": False}, False, False),  # explicit false is never canonical
        ({"isApp": False}, True, False),
        ({"isApp": "yes"}, True, False),  # truthy non-boolean is never canonical
        ({"isApp": "yes"}, False, False),
        ({"isApp": 1}, True, False),
    ],
)
def test_entry_is_canonical(stored, desired, canonical):
    assert sync_is_app.entry_is_canonical(dict(stored), desired) is canonical


# ── plan_changes and apply_changes agree ─────────────────────────────────────


@pytest.mark.parametrize(
    "stored,linear_mode",
    [
        ({"isApp": False}, None),  # the case that used to report clean
        ({"isApp": "yes"}, True),  # the case whose write used to be skipped
        ({"isApp": 1}, True),
        ({}, True),
        ({"isApp": True}, None),
    ],
)
def test_a_stale_entry_is_planned_and_written(tmp_path, stored, linear_mode):
    """Whatever the plan reports as a change, the write pass must also count."""
    _write_workflow(tmp_path, "demo", linear_mode)
    categories = _categories({"name": "demo", **stored})

    changes, desired_by_entry = sync_is_app.plan_changes(tmp_path, categories)
    assert len(changes) == 1

    changed = sync_is_app.apply_changes(categories, desired_by_entry)
    assert changed == 1

    # And the result is canonical, so a second run is a no-op.
    again, desired_again = sync_is_app.plan_changes(tmp_path, categories)
    assert again == []
    assert sync_is_app.apply_changes(categories, desired_again) == 0


@pytest.mark.parametrize("stored,linear_mode", [({}, None), ({}, False), ({"isApp": True}, True)])
def test_a_canonical_entry_is_left_alone(tmp_path, stored, linear_mode):
    _write_workflow(tmp_path, "demo", linear_mode)
    categories = _categories({"name": "demo", **stored})

    changes, desired_by_entry = sync_is_app.plan_changes(tmp_path, categories)
    assert changes == []
    assert sync_is_app.apply_changes(categories, desired_by_entry) == 0
    assert categories[0]["templates"][0] == {"name": "demo", **stored}


def test_apply_changes_normalises_a_truthy_non_boolean(tmp_path):
    """`isApp: "yes"` on an App becomes a real boolean rather than being kept."""
    _write_workflow(tmp_path, "demo", True)
    categories = _categories({"name": "demo", "isApp": "yes"})

    _, desired_by_entry = sync_is_app.plan_changes(tmp_path, categories)
    assert sync_is_app.apply_changes(categories, desired_by_entry) == 1
    assert categories[0]["templates"][0]["isApp"] is True


def test_apply_changes_drops_an_explicit_false(tmp_path):
    _write_workflow(tmp_path, "demo", None)
    categories = _categories({"name": "demo", "isApp": False})

    _, desired_by_entry = sync_is_app.plan_changes(tmp_path, categories)
    assert sync_is_app.apply_changes(categories, desired_by_entry) == 1
    assert "isApp" not in categories[0]["templates"][0]


def test_entries_without_a_name_are_skipped(tmp_path):
    categories = _categories({"title": "no name here"})
    changes, desired_by_entry = sync_is_app.plan_changes(tmp_path, categories)
    assert changes == []
    assert desired_by_entry == {}


# ── the --check CLI contract ─────────────────────────────────────────────────


def _run_check(monkeypatch, templates_dir: Path) -> int:
    monkeypatch.setattr(
        "sys.argv",
        ["sync_is_app.py", "--templates-dir", str(templates_dir), "--check"],
    )
    return sync_is_app.main()


def test_check_fails_on_an_explicit_false(tmp_path, monkeypatch):
    """The regression: this combination used to exit 0 while still being stale."""
    _write_workflow(tmp_path, "demo", None)
    (tmp_path / "index.json").write_text(
        json.dumps(_categories({"name": "demo", "isApp": False})), encoding="utf-8"
    )
    assert _run_check(monkeypatch, tmp_path) == 1


def test_check_passes_on_a_canonical_index(tmp_path, monkeypatch):
    _write_workflow(tmp_path, "graph", None)
    _write_workflow(tmp_path, "app", True)
    (tmp_path / "index.json").write_text(
        json.dumps(_categories({"name": "graph"}, {"name": "app", "isApp": True})),
        encoding="utf-8",
    )
    assert _run_check(monkeypatch, tmp_path) == 0


def test_check_reports_a_missing_index(tmp_path, monkeypatch):
    assert _run_check(monkeypatch, tmp_path) == 1
