"""Tests for scripts/sync/sync_is_app.py, the isApp bake into index.json.

Two properties matter. The plan pass and the write pass must agree on what
"already correct" means, or `--check` passes on a file a real run still rewrites.
And a workflow that cannot be read must never be treated as "not an App", since
the write pass deletes the key for that answer and would erase a correct flag.
"""

import importlib.util
import json
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]

_lib = REPO_ROOT / "scripts" / "lib"
if str(_lib) not in sys.path:
    sys.path.insert(0, str(_lib))

_spec = importlib.util.spec_from_file_location(
    "sync_is_app", REPO_ROOT / "scripts" / "sync" / "sync_is_app.py"
)
sync_is_app = importlib.util.module_from_spec(_spec)
# Registered before exec so @dataclass can resolve the module it is defined in.
sys.modules[_spec.name] = sync_is_app
_spec.loader.exec_module(sync_is_app)


def _write_workflow(templates_dir: Path, name: str, linear_mode) -> None:
    """Write a workflow with extra.linearMode set; None omits linearMode."""
    extra = {} if linear_mode is None else {"linearMode": linear_mode}
    (templates_dir / f"{name}.json").write_text(
        json.dumps({"nodes": [], "extra": extra}), encoding="utf-8"
    )


def _categories(*templates):
    return [{"category": "Basics", "templates": list(templates)}]


def _write_index(templates_dir: Path, *templates) -> Path:
    path = templates_dir / "index.json"
    path.write_text(json.dumps(_categories(*templates)), encoding="utf-8")
    return path


# ── workflow_is_app ──────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "linear_mode,expected",
    [(True, True), (False, False), (None, False), ("true", False), (1, False)],
)
def test_only_a_true_boolean_is_an_app(tmp_path, linear_mode, expected):
    _write_workflow(tmp_path, "demo", linear_mode)
    assert sync_is_app.workflow_is_app(tmp_path, "demo") is expected


def test_absent_extra_block_is_a_node_graph(tmp_path):
    (tmp_path / "demo.json").write_text('{"nodes":[]}', encoding="utf-8")
    assert sync_is_app.workflow_is_app(tmp_path, "demo") is False


# ── unreadable workflows are not answers ─────────────────────────────────────
# Each of these used to return False, which the write pass turns into a deletion.


def test_missing_file_is_unreadable(tmp_path):
    with pytest.raises(sync_is_app.WorkflowUnreadable):
        sync_is_app.workflow_is_app(tmp_path, "absent")


def test_malformed_json_is_unreadable(tmp_path):
    (tmp_path / "demo.json").write_text("{not json", encoding="utf-8")
    with pytest.raises(sync_is_app.WorkflowUnreadable):
        sync_is_app.workflow_is_app(tmp_path, "demo")


def test_non_object_top_level_is_unreadable(tmp_path):
    (tmp_path / "demo.json").write_text("[1,2,3]", encoding="utf-8")
    with pytest.raises(sync_is_app.WorkflowUnreadable):
        sync_is_app.workflow_is_app(tmp_path, "demo")


def test_non_object_extra_is_unreadable(tmp_path):
    (tmp_path / "demo.json").write_text('{"extra":"nope"}', encoding="utf-8")
    with pytest.raises(sync_is_app.WorkflowUnreadable):
        sync_is_app.workflow_is_app(tmp_path, "demo")


def test_unreadable_permissions_are_reported(tmp_path):
    path = tmp_path / "demo.json"
    path.write_text('{"extra":{"linearMode":true}}', encoding="utf-8")
    path.chmod(0o000)
    try:
        with pytest.raises(sync_is_app.WorkflowUnreadable):
            sync_is_app.workflow_is_app(tmp_path, "demo")
    finally:
        path.chmod(0o644)


# The regression this guards: a read failure must not delete a correct flag.
def test_an_unreadable_workflow_never_erases_a_stored_true(tmp_path):
    entry = {"name": "demo", "isApp": True}
    plan = sync_is_app.plan_changes(tmp_path, _categories(entry))

    assert plan.changes == []
    assert plan.updates == []
    assert len(plan.unreadable) == 1

    assert sync_is_app.apply_changes(plan) == 0
    assert entry["isApp"] is True


# ── entry_is_canonical ───────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "stored,desired,canonical",
    [
        ({}, False, True),
        ({}, True, False),
        ({"isApp": True}, True, True),
        ({"isApp": True}, False, False),
        ({"isApp": False}, False, False),  # explicit false is never canonical
        ({"isApp": False}, True, False),
        ({"isApp": "yes"}, True, False),  # truthy non-boolean is never canonical
        ({"isApp": "yes"}, False, False),
        ({"isApp": 1}, True, False),
        ({"isApp": None}, False, False),  # an explicit null is present, not absent
        ({"isApp": None}, True, False),
    ],
)
def test_entry_is_canonical(stored, desired, canonical):
    assert sync_is_app.entry_is_canonical(dict(stored), desired) is canonical


# ── plan and write agree ─────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "stored,linear_mode",
    [
        ({"isApp": False}, None),  # used to report clean
        ({"isApp": "yes"}, True),  # used to skip the write
        ({"isApp": 1}, True),
        ({"isApp": None}, True),
        ({}, True),
        ({"isApp": True}, None),
    ],
)
def test_a_stale_entry_is_planned_and_written(tmp_path, stored, linear_mode):
    _write_workflow(tmp_path, "demo", linear_mode)
    entry = {"name": "demo", **stored}
    plan = sync_is_app.plan_changes(tmp_path, _categories(entry))
    assert len(plan.changes) == 1
    assert sync_is_app.apply_changes(plan) == 1

    again = sync_is_app.plan_changes(tmp_path, _categories(entry))
    assert again.changes == []
    assert sync_is_app.apply_changes(again) == 0


@pytest.mark.parametrize("stored,linear_mode", [({}, None), ({}, False), ({"isApp": True}, True)])
def test_a_canonical_entry_is_left_alone(tmp_path, stored, linear_mode):
    _write_workflow(tmp_path, "demo", linear_mode)
    entry = {"name": "demo", **stored}
    plan = sync_is_app.plan_changes(tmp_path, _categories(entry))
    assert plan.changes == []
    assert sync_is_app.apply_changes(plan) == 0
    assert entry == {"name": "demo", **stored}


def test_apply_normalises_a_truthy_non_boolean(tmp_path):
    _write_workflow(tmp_path, "demo", True)
    entry = {"name": "demo", "isApp": "yes"}
    sync_is_app.apply_changes(sync_is_app.plan_changes(tmp_path, _categories(entry)))
    assert entry["isApp"] is True


def test_apply_drops_an_explicit_false(tmp_path):
    _write_workflow(tmp_path, "demo", None)
    entry = {"name": "demo", "isApp": False}
    sync_is_app.apply_changes(sync_is_app.plan_changes(tmp_path, _categories(entry)))
    assert "isApp" not in entry


def test_entries_without_a_name_are_skipped(tmp_path):
    plan = sync_is_app.plan_changes(tmp_path, _categories({"title": "no name"}))
    assert plan.changes == [] and plan.updates == [] and plan.unreadable == []


# ── the CLI contract ─────────────────────────────────────────────────────────


def _run(monkeypatch, templates_dir: Path, *flags: str) -> int:
    monkeypatch.setattr(
        "sys.argv", ["sync_is_app.py", "--templates-dir", str(templates_dir), *flags]
    )
    return sync_is_app.main()


def test_check_fails_on_an_explicit_false(tmp_path, monkeypatch):
    _write_workflow(tmp_path, "demo", None)
    _write_index(tmp_path, {"name": "demo", "isApp": False})
    assert _run(monkeypatch, tmp_path, "--check") == 1


def test_check_passes_on_a_canonical_index(tmp_path, monkeypatch):
    _write_workflow(tmp_path, "graph", None)
    _write_workflow(tmp_path, "app", True)
    _write_index(tmp_path, {"name": "graph"}, {"name": "app", "isApp": True})
    assert _run(monkeypatch, tmp_path, "--check") == 0


# An index that is canonical as far as it goes, but where a workflow could not be
# read, must not pass: nothing proved that entry is right.
def test_check_fails_when_a_workflow_is_unreadable(tmp_path, monkeypatch, capsys):
    _write_workflow(tmp_path, "app", True)
    _write_index(tmp_path, {"name": "app", "isApp": True}, {"name": "ghost"})
    assert _run(monkeypatch, tmp_path, "--check") == 1
    assert "ghost" in capsys.readouterr().err


def test_check_reports_a_missing_index(tmp_path, monkeypatch):
    assert _run(monkeypatch, tmp_path, "--check") == 1


def test_a_malformed_index_is_an_error_not_a_traceback(tmp_path, monkeypatch, capsys):
    (tmp_path / "index.json").write_text("{not json", encoding="utf-8")
    assert _run(monkeypatch, tmp_path, "--check") == 1
    assert "could not read" in capsys.readouterr().err


@pytest.mark.parametrize(
    "stored,reported",
    [
        ({"name": "demo"}, "absent"),
        ({"name": "demo", "isApp": None}, "null"),
        ({"name": "demo", "isApp": False}, "false"),
        ({"name": "demo", "isApp": "yes"}, '"yes"'),
    ],
)
def test_check_reports_the_stored_value_as_written(tmp_path, monkeypatch, capsys, stored, reported):
    """An explicit null must not be reported as an absent key."""
    _write_workflow(tmp_path, "demo", True)
    _write_index(tmp_path, stored)
    assert _run(monkeypatch, tmp_path, "--check") == 1
    assert f"demo: isApp {reported} -> True" in capsys.readouterr().out


# ── --dry-run ────────────────────────────────────────────────────────────────


def test_dry_run_writes_nothing_and_exits_zero(tmp_path, monkeypatch):
    _write_workflow(tmp_path, "demo", True)
    index = _write_index(tmp_path, {"name": "demo"})
    before = index.read_text(encoding="utf-8")

    assert _run(monkeypatch, tmp_path, "--dry-run") == 0
    assert index.read_text(encoding="utf-8") == before


def test_dry_run_reports_the_same_entries_a_write_would_change(tmp_path, monkeypatch, capsys):
    _write_workflow(tmp_path, "demo", True)
    _write_index(tmp_path, {"name": "demo"})

    _run(monkeypatch, tmp_path, "--dry-run")
    dry = capsys.readouterr().out

    _run(monkeypatch, tmp_path)
    assert "demo: isApp absent -> True" in dry
    assert json.loads((tmp_path / "index.json").read_text())[0]["templates"][0]["isApp"] is True


# ── the write path ───────────────────────────────────────────────────────────


def test_write_leaves_an_up_to_date_index_untouched(tmp_path, monkeypatch):
    _write_workflow(tmp_path, "app", True)
    index = _write_index(tmp_path, {"name": "app", "isApp": True})
    before = index.read_text(encoding="utf-8")

    assert _run(monkeypatch, tmp_path) == 0
    assert index.read_text(encoding="utf-8") == before


def test_write_exits_non_zero_when_something_was_unreadable(tmp_path, monkeypatch):
    _write_workflow(tmp_path, "app", True)
    _write_index(tmp_path, {"name": "app"}, {"name": "ghost"})

    assert _run(monkeypatch, tmp_path) == 1
    entries = json.loads((tmp_path / "index.json").read_text())[0]["templates"]
    # The readable entry is still corrected; the unreadable one is left alone.
    assert entries[0]["isApp"] is True
    assert "isApp" not in entries[1]
