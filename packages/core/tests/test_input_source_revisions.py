import importlib.util
import json
import subprocess
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location(
    "sync_bundles", REPO_ROOT / "scripts" / "sync" / "sync_bundles.py"
)
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


def git(repo: Path, *args: str) -> str:
    return subprocess.check_output(
        ["git", "-c", "user.name=Template tests", "-c", "user.email=tests@example.com", *args],
        cwd=repo,
        text=True,
    ).strip()


@pytest.fixture
def repo(tmp_path):
    git(tmp_path, "init", "-b", "main")
    (tmp_path / "input").mkdir()
    (tmp_path / "input" / "sample.mp4").write_text("original video")
    templates = tmp_path / "templates"
    templates.mkdir()
    catalog = [
        {
            "templates": [
                {
                    "name": "video",
                    "io": {
                        "inputs": [{"nodeId": 35, "nodeType": "LoadVideo", "file": "sample.mp4"}],
                        "outputs": [{"file": "result.mp4"}],
                    },
                }
            ]
        }
    ]
    for name in ("index.json", "index.ja.json"):
        (templates / name).write_text(json.dumps(catalog))
    git(tmp_path, "add", ".")
    git(tmp_path, "commit", "--no-gpg-sign", "-m", "Initial template release")
    return tmp_path


def packaged_input(repo: Path, sources: dict[str, str]) -> dict:
    catalog = sync.filter_index_for_pip(
        (repo / "templates" / "index.json").read_bytes(), frozenset(), sources
    )
    return json.loads(catalog)[0]["templates"][0]["io"]["inputs"][0]


def test_published_reference_survives_replacement_and_removal_on_main(repo):
    published = packaged_input(repo, sync.get_input_source_revisions(repo))
    revision = published["sourceRevision"]
    assert revision == git(repo, "rev-parse", "HEAD")

    (repo / "input" / "sample.mp4").write_text("replacement video")
    git(repo, "commit", "-am", "Replace sample", "--no-gpg-sign")
    replacement = packaged_input(repo, sync.get_input_source_revisions(repo))
    assert replacement["sourceRevision"] != revision
    assert (
        git(repo, "show", f"{replacement['sourceRevision']}:input/sample.mp4")
        == "replacement video"
    )
    assert git(repo, "show", f"{revision}:input/sample.mp4") == "original video"

    git(repo, "rm", "input/sample.mp4")
    git(repo, "commit", "-m", "Remove sample", "--no-gpg-sign")
    assert "sourceRevision" not in packaged_input(repo, sync.get_input_source_revisions(repo))
    assert git(repo, "show", f"{revision}:input/sample.mp4") == "original video"


def test_only_regular_committed_inputs_are_versioned(repo):
    (repo / "input" / "uncommitted.mp4").write_text("new video")
    (repo / "input" / "link.mp4").symlink_to("sample.mp4")
    git(repo, "add", "input/link.mp4")
    git(repo, "commit", "-m", "Add symlink", "--no-gpg-sign")
    assert sync.get_input_source_revisions(repo) == {"sample.mp4": git(repo, "rev-parse", "HEAD")}


def test_release_sparse_checkout_can_pin_inputs_without_downloading_them(repo):
    git(repo, "sparse-checkout", "init", "--cone")
    git(repo, "sparse-checkout", "set", "templates")
    assert not (repo / "input").exists()
    assert packaged_input(repo, sync.get_input_source_revisions(repo))["sourceRevision"] == git(
        repo, "rev-parse", "HEAD"
    )


def test_sync_versions_all_packaged_catalogs_without_changing_source(repo, tmp_path, monkeypatch):
    target = tmp_path / "packaged"
    sources = sync.get_input_source_revisions(repo)
    monkeypatch.setattr(sync, "get_input_source_revisions", lambda: sources)
    monkeypatch.setattr(sync, "TEMPLATES_DIR", repo / "templates")
    monkeypatch.setattr(sync, "JSON_TARGET", target)
    monkeypatch.setattr(sync, "BUNDLE_TARGETS", {})
    sync.sync_bundle_directories(
        {
            "templates": [
                {
                    "bundle": "json",
                    "assets": [{"filename": "index.json"}, {"filename": "index.ja.json"}],
                }
            ]
        },
        excluded_names=frozenset(),
    )
    for name in ("index.json", "index.ja.json"):
        source = json.loads((repo / "templates" / name).read_text())
        packaged = json.loads((target / name).read_text())
        io = packaged[0]["templates"][0]["io"]
        assert io["inputs"][0]["sourceRevision"] == sources["sample.mp4"]
        assert io["outputs"] == source[0]["templates"][0]["io"]["outputs"]
        assert "sourceRevision" not in source[0]["templates"][0]["io"]["inputs"][0]


def test_missing_asset_does_not_keep_an_old_source_revision():
    catalog = [
        {
            "templates": [
                {
                    "name": "video",
                    "io": {"inputs": [{"file": "missing.mp4", "sourceRevision": "stale"}]},
                }
            ]
        }
    ]
    result = json.loads(sync.filter_index_for_pip(json.dumps(catalog), frozenset(), {}))
    assert result[0]["templates"][0]["io"]["inputs"] == [{"file": "missing.mp4"}]


def test_mcp_input_type_names_are_preserved():
    catalog = [{"templates": [{"name": "video", "io": {"inputs": ["video", "text"]}}]}]
    result = json.loads(sync.filter_index_for_pip(json.dumps(catalog), frozenset(), {}))
    assert result == catalog
