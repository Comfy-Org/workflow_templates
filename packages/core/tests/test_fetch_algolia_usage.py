"""Tests for scripts/sync/fetch_algolia_usage.py — the Algolia run_clicks bake.

Covers the pure logic (pagination, CSV shape, run_clicks coercion) and the CLI
guardrails (missing key, empty index) with urllib fully mocked, so the suite
never hits the network.
"""

import csv
import importlib.util
import io
import json
from pathlib import Path
from unittest import mock

REPO_ROOT = Path(__file__).resolve().parents[3]

_spec = importlib.util.spec_from_file_location(
    "fetch_algolia_usage", REPO_ROOT / "scripts" / "sync" / "fetch_algolia_usage.py"
)
fetch_algolia_usage = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(fetch_algolia_usage)


def _page(hits, nb_pages=1):
    """Build a fake Algolia query response as a file-like object urlopen returns."""
    payload = json.dumps({"hits": hits, "nbPages": nb_pages}).encode("utf-8")
    return io.BytesIO(payload)


def _argv(templates_dir):
    return ["fetch_algolia_usage.py", "--templates-dir", str(templates_dir)]


# ── fetch_run_clicks ─────────────────────────────────────────────────────────


def test_fetch_run_clicks_single_page():
    resp = _page([{"slug": "seedance", "run_clicks": 32300}, {"slug": "flux", "run_clicks": 12}])
    with mock.patch("urllib.request.urlopen", return_value=resp):
        result = fetch_algolia_usage.fetch_run_clicks("app", "key", "templates_index")
    assert result == {"seedance": 32300, "flux": 12}


def test_fetch_run_clicks_paginates_and_merges():
    pages = [
        _page([{"slug": "a", "run_clicks": 1}], nb_pages=2),
        _page([{"slug": "b", "run_clicks": 2}], nb_pages=2),
    ]
    with mock.patch("urllib.request.urlopen", side_effect=pages) as urlopen:
        result = fetch_algolia_usage.fetch_run_clicks("app", "key", "templates_index")
    assert result == {"a": 1, "b": 2}
    assert urlopen.call_count == 2


def test_fetch_run_clicks_skips_hits_without_slug():
    resp = _page([{"run_clicks": 99}, {"slug": "keep", "run_clicks": 5}])
    with mock.patch("urllib.request.urlopen", return_value=resp):
        result = fetch_algolia_usage.fetch_run_clicks("app", "key", "templates_index")
    assert result == {"keep": 5}


def test_fetch_run_clicks_missing_run_clicks_is_zero():
    resp = _page([{"slug": "x"}])
    with mock.patch("urllib.request.urlopen", return_value=resp):
        result = fetch_algolia_usage.fetch_run_clicks("app", "key", "templates_index")
    assert result == {"x": 0}


def test_fetch_run_clicks_non_numeric_coerces_to_zero_without_aborting():
    # One malformed value must not discard the whole refresh — it degrades to 0.
    resp = _page([{"slug": "bad", "run_clicks": "N/A"}, {"slug": "good", "run_clicks": 5}])
    with mock.patch("urllib.request.urlopen", return_value=resp):
        result = fetch_algolia_usage.fetch_run_clicks("app", "key", "templates_index")
    assert result == {"bad": 0, "good": 5}


def test_fetch_run_clicks_propagates_http_error():
    import urllib.error

    err = urllib.error.HTTPError("url", 500, "Server Error", {}, None)
    with mock.patch("urllib.request.urlopen", side_effect=err):
        with __import__("pytest").raises(urllib.error.HTTPError):
            fetch_algolia_usage.fetch_run_clicks("app", "key", "templates_index")


def test_main_returns_1_when_fetch_raises(monkeypatch, tmp_path):
    import urllib.error

    monkeypatch.setenv("ALGOLIA_API_KEY", "key")
    monkeypatch.setattr("sys.argv", _argv(tmp_path / "templates"))
    err = urllib.error.URLError("connection refused")
    with mock.patch.object(fetch_algolia_usage, "fetch_run_clicks", side_effect=err):
        rc = fetch_algolia_usage.main()
    assert rc == 1
    assert not (tmp_path / "temp" / "usage.csv").exists()


# ── write_usage_csv ──────────────────────────────────────────────────────────


def test_write_usage_csv_exact_shape(tmp_path):
    out = tmp_path / "temp" / "usage.csv"
    fetch_algolia_usage.write_usage_csv({"beta": 2, "alpha": 10}, out)

    with open(out, newline="", encoding="utf-8") as f:
        rows = list(csv.reader(f))
    # Header matches exactly what sync_data.py's load_usage_data expects.
    assert rows[0] == ["Metric", "workflow_name", "usage_count"]
    # Sorted by slug; Metric column is the literal "run_clicks".
    assert rows[1] == ["run_clicks", "alpha", "10"]
    assert rows[2] == ["run_clicks", "beta", "2"]


def test_write_usage_csv_creates_parent_dir(tmp_path):
    out = tmp_path / "nonexistent" / "temp" / "usage.csv"
    fetch_algolia_usage.write_usage_csv({"a": 1}, out)
    assert out.exists()


# ── main() CLI guardrails ────────────────────────────────────────────────────


def test_main_missing_api_key_errors(monkeypatch):
    monkeypatch.delenv("ALGOLIA_API_KEY", raising=False)
    monkeypatch.setattr("sys.argv", ["fetch_algolia_usage.py"])
    assert fetch_algolia_usage.main() == 1


def test_main_empty_index_leaves_csv_untouched(monkeypatch, tmp_path):
    monkeypatch.setenv("ALGOLIA_API_KEY", "key")
    monkeypatch.setattr("sys.argv", _argv(tmp_path / "templates"))
    with mock.patch.object(fetch_algolia_usage, "fetch_run_clicks", return_value={}):
        rc = fetch_algolia_usage.main()
    assert rc == 1
    assert not (tmp_path / "temp" / "usage.csv").exists()


def test_main_happy_path_writes_csv(monkeypatch, tmp_path):
    monkeypatch.setenv("ALGOLIA_API_KEY", "key")
    monkeypatch.setattr("sys.argv", _argv(tmp_path / "templates"))
    clicks = {"seedance": 32300}
    with mock.patch.object(fetch_algolia_usage, "fetch_run_clicks", return_value=clicks):
        rc = fetch_algolia_usage.main()
    assert rc == 0
    csv_path = tmp_path / "temp" / "usage.csv"
    assert csv_path.exists()
    with open(csv_path, newline="", encoding="utf-8") as f:
        rows = list(csv.reader(f))
    assert rows == [["Metric", "workflow_name", "usage_count"], ["run_clicks", "seedance", "32300"]]
