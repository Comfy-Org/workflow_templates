"""Regression tests for release-time package version detection."""

import importlib.util
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


REPO_ROOT = Path(__file__).resolve().parents[3]
SCRIPTS_LIB = REPO_ROOT / "scripts" / "lib"
if str(SCRIPTS_LIB) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_LIB))

SPEC = importlib.util.spec_from_file_location(
    "ci_version_manager", REPO_ROOT / "scripts" / "ci" / "ci_version_manager.py"
)
ci_version_manager = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = ci_version_manager
SPEC.loader.exec_module(ci_version_manager)


class VersionDetectionTests(unittest.TestCase):
    def test_release_looks_before_pr_merge_base_for_package_version(self):
        """A version-only release PR must see unreleased changes already on main."""
        calls = []

        def fake_run_git(args):
            calls.append(args)
            if args[0] == "log":
                return "version-intro\nolder-version"
            if args[:2] == ["show", "version-intro:packages/core/pyproject.toml"]:
                return '[project]\nversion = "1.2.3"\n'
            if args[:2] == ["show", "older-version:packages/core/pyproject.toml"]:
                return '[project]\nversion = "1.2.2"\n'
            raise AssertionError(f"Unexpected git invocation: {args}")

        with (
            patch.object(ci_version_manager, "run_git", side_effect=fake_run_git),
            patch.object(ci_version_manager, "get_current_version", return_value="1.2.3"),
        ):
            since = ci_version_manager.get_since_commit_for_package(
                "core", "pr-merge-base"
            )

        self.assertEqual(since, "version-intro")
        log_call = calls[0]
        self.assertEqual(log_call[:2], ["log", "--format=%H"])
        self.assertNotIn("pr-merge-base..HEAD", log_call)
        self.assertEqual(log_call[-1], "packages/core/pyproject.toml")

    def test_latest_auto_bump_commit_becomes_the_next_detection_boundary(self):
        """A rerun after CI commits a bump must not inspect changes before that bump."""

        def fake_run_git(args):
            if args[0] == "log":
                return "auto-bump-commit\nprevious-version"
            if args[:2] == ["show", "auto-bump-commit:packages/json/pyproject.toml"]:
                return '[project]\nversion = "2.0.1"\n'
            raise AssertionError(f"Unexpected git invocation: {args}")

        with (
            patch.object(ci_version_manager, "run_git", side_effect=fake_run_git),
            patch.object(ci_version_manager, "get_current_version", return_value="2.0.1"),
        ):
            since = ci_version_manager.get_since_commit_for_package(
                "json", "pr-merge-base"
            )

        self.assertEqual(since, "auto-bump-commit")
