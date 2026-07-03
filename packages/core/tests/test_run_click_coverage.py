"""Tests for the run-click coverage guard (scripts/lib/run_click_coverage.py).

The guard detects when the Algolia slug↔template-name join drifts (few templates
receiving run-click data), so a silent usage-zeroing surfaces as a warning.
"""

import importlib.util
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]

_spec = importlib.util.spec_from_file_location(
    "run_click_coverage", REPO_ROOT / "scripts" / "lib" / "run_click_coverage.py"
)
rcc = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(rcc)


def _master(*names):
    return [{"templates": [{"name": n} for n in names]}]


def test_all_covered():
    master = _master("a", "b", "c")
    usage = {"a": 1, "b": 2, "c": 3}
    assert rcc.compute_run_click_coverage(master, usage) == (3, 3)


def test_partial_coverage():
    master = _master("a", "b", "c", "d")
    usage = {"a": 1, "b": 2}
    assert rcc.compute_run_click_coverage(master, usage) == (2, 4)


def test_no_coverage_drifted_join():
    # Simulates slug drift: CSV keyed by "name-shareId", master by bare name.
    master = _master("seedance", "flux")
    usage = {"seedance-abc123": 5, "flux-def456": 6}
    covered, total = rcc.compute_run_click_coverage(master, usage)
    assert (covered, total) == (0, 2)
    assert (covered / total) < rcc.RUN_CLICK_COVERAGE_WARN_THRESHOLD


def test_healthy_rate_above_threshold():
    master = _master(*[f"t{i}" for i in range(10)])
    usage = {f"t{i}": i for i in range(9)}  # 9/10 = 90%
    covered, total = rcc.compute_run_click_coverage(master, usage)
    assert (covered / total) >= rcc.RUN_CLICK_COVERAGE_WARN_THRESHOLD


def test_empty_master_no_zero_division():
    assert rcc.compute_run_click_coverage([], {"a": 1}) == (0, 0)


def test_threshold_is_sane():
    assert 0 < rcc.RUN_CLICK_COVERAGE_WARN_THRESHOLD <= 1


# ── log_run_click_coverage (prints coverage; warns on drift) ─────────────────


def test_log_warns_below_threshold(capsys):
    master = _master("seedance", "flux")
    usage = {"seedance-abc": 5}  # 0/2 join → drift
    rcc.log_run_click_coverage(master, usage)
    out = capsys.readouterr().out
    assert "Run-click coverage: 0/2" in out
    assert "may have drifted" in out


def test_log_no_warn_when_healthy(capsys):
    master = _master(*[f"t{i}" for i in range(10)])
    usage = {f"t{i}": i for i in range(9)}  # 90%
    rcc.log_run_click_coverage(master, usage)
    out = capsys.readouterr().out
    assert "Run-click coverage: 9/10" in out
    assert "drifted" not in out


def test_log_noop_without_usage_data(capsys):
    rcc.log_run_click_coverage(_master("a"), {})
    assert capsys.readouterr().out == ""
