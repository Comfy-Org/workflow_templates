"""Tests for the Partner Node marker check in scripts/validate/validate_templates.py.

Three properties matter. A workflow that calls a Partner Node must be caught when
either marker is missing, including when the node hides inside a subgraph — that is
the shape that shipped mislabelled in #1124. The reverse must stay quiet: the API
node snapshot lags newly shipped vendors, so a marked template with no detectable
Partner Node is legitimate and must not fail the build. And the check must never
pass by accident, so an unusable node list is an error rather than a no-op.
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
    "validate_templates", REPO_ROOT / "scripts" / "validate" / "validate_templates.py"
)
validate_templates = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = validate_templates
_spec.loader.exec_module(validate_templates)

PARTNER_NODE = "GeminiImage2Node"


@pytest.fixture
def api_node_ids(tmp_path) -> Path:
    path = tmp_path / "api_node_ids.json"
    path.write_text(json.dumps({"node_ids": [PARTNER_NODE, "GeminiNode"]}), encoding="utf-8")
    return path


def _write_workflow(templates_dir: Path, name: str, *node_types: str) -> None:
    nodes = [{"id": i, "type": t} for i, t in enumerate(node_types)]
    (templates_dir / f"{name}.json").write_text(json.dumps({"nodes": nodes}), encoding="utf-8")


def _write_subgraph_workflow(templates_dir: Path, name: str, *node_types: str) -> None:
    """A workflow whose only Partner Node sits inside a subgraph definition."""
    workflow = {
        "nodes": [{"id": 0, "type": "6a4f1e02-0000-0000-0000-000000000000"}],
        "definitions": {"subgraphs": [{"nodes": [{"id": 1, "type": t} for t in node_types]}]},
    }
    (templates_dir / f"{name}.json").write_text(json.dumps(workflow), encoding="utf-8")


def _categories(*templates):
    return [{"moduleName": "default", "title": "Default", "templates": list(templates)}]


def _entry(name="demo", *, open_source=..., tags=("Image",)):
    entry = {"name": name, "tags": list(tags)}
    if open_source is not ...:
        entry["openSource"] = open_source
    return entry


def _check(tmp_path, api_node_ids, *templates):
    return validate_templates.check_partner_node_markers(
        _categories(*templates), tmp_path, api_node_ids
    )


# ── a Partner Node demands both markers ──────────────────────────────────────


def test_both_markers_present_passes(tmp_path, api_node_ids):
    _write_workflow(tmp_path, "demo", PARTNER_NODE)
    valid, errors = _check(tmp_path, api_node_ids, _entry(open_source=False, tags=["API"]))
    assert (valid, errors) == (True, [])


@pytest.mark.parametrize("open_source", [..., True, None])
def test_partner_node_without_open_source_false_fails(tmp_path, api_node_ids, open_source):
    _write_workflow(tmp_path, "demo", "KSampler", PARTNER_NODE)
    valid, errors = _check(tmp_path, api_node_ids, _entry(open_source=open_source, tags=["API"]))
    assert not valid
    assert len(errors) == 1
    assert PARTNER_NODE in errors[0] and "openSource" in errors[0]


def test_partner_node_without_api_tag_fails(tmp_path, api_node_ids):
    _write_workflow(tmp_path, "demo", PARTNER_NODE)
    valid, errors = _check(tmp_path, api_node_ids, _entry(open_source=False))
    assert not valid
    assert len(errors) == 1
    assert '"API" tag' in errors[0]


def test_partner_node_missing_both_markers_reports_both(tmp_path, api_node_ids):
    _write_workflow(tmp_path, "demo", PARTNER_NODE)
    valid, errors = _check(tmp_path, api_node_ids, _entry())
    assert not valid
    assert len(errors) == 2


# The regression from #1124: a subgraph hides the Partner Node from a top-level scan.
def test_a_partner_node_inside_a_subgraph_is_found(tmp_path, api_node_ids):
    _write_subgraph_workflow(tmp_path, "demo", "GeminiNode")
    valid, errors = _check(tmp_path, api_node_ids, _entry(open_source=True, tags=["API"]))
    assert not valid
    assert "GeminiNode" in errors[0]


def test_a_workflow_without_partner_nodes_needs_no_markers(tmp_path, api_node_ids):
    _write_workflow(tmp_path, "demo", "KSampler", "SaveImage")
    valid, errors = _check(tmp_path, api_node_ids, _entry())
    assert (valid, errors) == (True, [])


# ── the two markers must agree with each other ───────────────────────────────
# Neither can be judged alone without a Partner Node in the graph, but they still
# cannot contradict: each one drives a different user-facing label.


def test_api_tag_without_open_source_false_fails(tmp_path, api_node_ids):
    _write_workflow(tmp_path, "demo", "UpscaleModelLoader")
    valid, errors = _check(tmp_path, api_node_ids, _entry(open_source=True, tags=["API"]))
    assert not valid
    assert "must agree" in errors[0]


def test_open_source_false_without_api_tag_fails(tmp_path, api_node_ids):
    _write_workflow(tmp_path, "demo", "UpscaleModelLoader")
    valid, errors = _check(tmp_path, api_node_ids, _entry(open_source=False))
    assert not valid
    assert "must agree" in errors[0]


# A vendor shipped after the last api_node_ids.json scan has no detectable node, so
# a fully marked template must stay green — tightening this would redden main.
def test_both_markers_without_a_detectable_partner_node_passes(tmp_path, api_node_ids):
    _write_workflow(tmp_path, "demo", "LtxvNewVendorNode")
    valid, errors = _check(tmp_path, api_node_ids, _entry(open_source=False, tags=["API"]))
    assert (valid, errors) == (True, [])


# ── locale index files ───────────────────────────────────────────────────────


def _write_locale(templates_dir: Path, filename: str, *templates) -> None:
    (templates_dir / filename).write_text(json.dumps(_categories(*templates)), encoding="utf-8")


def test_a_locale_in_sync_passes(tmp_path, api_node_ids):
    _write_workflow(tmp_path, "demo", PARTNER_NODE)
    _write_locale(tmp_path, "index.ja.json", _entry(open_source=False, tags=["API", "画像"]))
    valid, errors = _check(tmp_path, api_node_ids, _entry(open_source=False, tags=["API"]))
    assert (valid, errors) == (True, [])


def test_a_locale_with_a_stale_open_source_fails(tmp_path, api_node_ids):
    _write_workflow(tmp_path, "demo", PARTNER_NODE)
    _write_locale(tmp_path, "index.ja.json", _entry(open_source=True, tags=["API"]))
    valid, errors = _check(tmp_path, api_node_ids, _entry(open_source=False, tags=["API"]))
    assert not valid
    assert "index.ja.json" in errors[0] and "openSource" in errors[0]


def test_a_locale_missing_the_api_tag_fails(tmp_path, api_node_ids):
    _write_workflow(tmp_path, "demo", PARTNER_NODE)
    _write_locale(tmp_path, "index.zh.json", _entry(open_source=False, tags=["图像"]))
    valid, errors = _check(tmp_path, api_node_ids, _entry(open_source=False, tags=["API"]))
    assert not valid
    assert "index.zh.json" in errors[0] and '"API" tag' in errors[0]


def test_a_template_absent_from_a_locale_is_not_a_marker_error(tmp_path, api_node_ids):
    _write_workflow(tmp_path, "demo", PARTNER_NODE)
    _write_locale(tmp_path, "index.ja.json")
    valid, errors = _check(tmp_path, api_node_ids, _entry(open_source=False, tags=["API"]))
    assert (valid, errors) == (True, [])


# ── the check never passes by accident ───────────────────────────────────────


@pytest.mark.parametrize(
    "payload",
    [
        '{"node_ids": []}',
        "{}",
        "{not json",
        '{"node_ids": null}',
        '{"node_ids": {"0": "GeminiImage2Node"}}',
        '{"node_ids": 7}',
        '["GeminiImage2Node"]',
        '"GeminiImage2Node"',
        # A list that only looks usable: a non-string or blank entry means the
        # generator misbehaved, so no entry in it can be trusted.
        '{"node_ids": ["GeminiImage2Node", null]}',
        '{"node_ids": ["GeminiImage2Node", ""]}',
        '{"node_ids": ["GeminiImage2Node", 7]}',
        # Stale file: the count and the list disagree, so the list is incomplete.
        '{"node_count": 234, "node_ids": ["GeminiImage2Node"]}',
    ],
)
def test_an_unusable_node_list_is_an_error(tmp_path, payload):
    path = tmp_path / "api_node_ids.json"
    path.write_text(payload, encoding="utf-8")
    _write_workflow(tmp_path, "demo", PARTNER_NODE)
    valid, errors = _check(tmp_path, path, _entry())
    assert not valid
    assert "Cannot check Partner Node markers" in errors[0]


# The regression Oracle caught: a bare string is iterable, so filtering entries
# instead of rejecting the payload loaded a set of single characters, which matched
# no node type and let an unmarked Partner Node template through.
def test_a_string_node_list_never_reads_as_characters(tmp_path):
    path = tmp_path / "api_node_ids.json"
    path.write_text('{"node_ids": "GeminiImage2Node"}', encoding="utf-8")
    classes, errors = validate_templates.load_partner_node_classes(path)
    assert classes == set()
    assert "must be a list" in errors[0]


def test_a_well_formed_node_list_loads(tmp_path):
    path = tmp_path / "api_node_ids.json"
    path.write_text(
        json.dumps({"node_count": 2, "node_ids": [PARTNER_NODE, "GeminiNode"]}), encoding="utf-8"
    )
    classes, errors = validate_templates.load_partner_node_classes(path)
    assert (classes, errors) == ({PARTNER_NODE, "GeminiNode"}, [])


def test_the_committed_node_list_is_usable():
    """The gate is only as good as the real file it reads in CI."""
    classes, errors = validate_templates.load_partner_node_classes(
        REPO_ROOT / "scripts" / "data" / "mcp" / "api_node_ids.json"
    )
    assert errors == []
    assert PARTNER_NODE in classes


def test_a_missing_node_list_is_an_error(tmp_path):
    _write_workflow(tmp_path, "demo", PARTNER_NODE)
    valid, errors = _check(tmp_path, tmp_path / "absent.json", _entry())
    assert not valid
    assert "Cannot check Partner Node markers" in errors[0]


# Both are already reported by the file-consistency and workflow-schema checks;
# duplicating them here would double every such failure in the PR comment.
def test_a_missing_workflow_is_left_to_the_file_consistency_check(tmp_path, api_node_ids):
    valid, errors = _check(tmp_path, api_node_ids, _entry(name="ghost"))
    assert (valid, errors) == (True, [])


def test_a_malformed_workflow_is_left_to_the_schema_check(tmp_path, api_node_ids):
    (tmp_path / "demo.json").write_text("{not json", encoding="utf-8")
    valid, errors = _check(tmp_path, api_node_ids, _entry())
    assert (valid, errors) == (True, [])


def test_an_entry_without_a_name_is_skipped(tmp_path, api_node_ids):
    valid, errors = _check(tmp_path, api_node_ids, {"tags": ["API"]})
    assert (valid, errors) == (True, [])
