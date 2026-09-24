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
    def setUp(self):
        # Clear module-level git caches between tests.
        ci_version_manager._auto_bump_only_files_cache.clear()
        ci_version_manager._committed_files_cache.clear()
        ci_version_manager._unstaged_files_cache = None

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

    def test_update_dependencies_uses_provided_package_set(self):
        """Pin updates must not re-run the full change scan."""
        with (
            patch.object(ci_version_manager, "get_changed_packages") as get_changed,
            patch.object(
                ci_version_manager,
                "get_frozen_packages",
                return_value=set(),
            ),
            patch.object(Path, "exists", return_value=True),
            patch.object(Path, "read_text", return_value='version = "9.9.9"\n'),
            patch.object(Path, "write_text") as write_text,
        ):
            ci_version_manager.update_dependencies({"json", "meta"})

        get_changed.assert_not_called()
        self.assertTrue(write_text.called)

    def test_frozen_packages_skip_version_intro_scan(self):
        """Frozen packages must not trigger months-long history walks."""
        with (
            patch.object(ci_version_manager, "get_merge_base", return_value="merge-base"),
            patch.object(
                ci_version_manager,
                "get_frozen_packages",
                return_value={"media_api", "media_assets_01"},
            ),
            patch.object(
                ci_version_manager, "get_since_commit_for_package"
            ) as get_since,
            patch.object(
                ci_version_manager, "get_files_affecting_package", return_value=[]
            ),
            patch.object(
                ci_version_manager, "_blocked_frozen_media_updates", return_value=set()
            ),
            patch.object(ci_version_manager, "get_current_version", return_value="0.0.1"),
        ):
            result = ci_version_manager.get_changed_packages()

        self.assertEqual(result, set())
        analyzed = {call.args[0] for call in get_since.call_args_list}
        self.assertNotIn("media_api", analyzed)
        self.assertNotIn("media_assets_01", analyzed)

    def test_blocked_frozen_media_uses_merge_base_not_version_intro(self):
        calls = []

        def fake_files(pkg, since):
            calls.append((pkg, since))
            if pkg == "media_api" and since == "merge-base":
                return ["templates/api_foo-1.webp"]
            return []

        with (
            patch.object(
                ci_version_manager,
                "get_frozen_packages",
                return_value={"media_api"},
            ),
            patch.object(
                ci_version_manager,
                "get_files_affecting_package",
                side_effect=fake_files,
            ),
            patch.object(
                ci_version_manager,
                "load_version_policy",
                return_value={},
            ),
            patch.object(
                Path,
                "read_text",
                return_value='{"media-api": ["api_foo"]}',
            ),
            patch.object(
                Path,
                "exists",
                return_value=True,
            ),
            patch.object(
                ci_version_manager,
                "is_media_template_asset_path",
                return_value=True,
            ),
            patch.object(
                ci_version_manager,
                "is_additive_logo_path",
                return_value=False,
            ),
            patch.object(
                ci_version_manager,
                "media_bundle_for_template_asset",
                return_value="media-api",
            ),
        ):
            blocked = ci_version_manager._blocked_frozen_media_updates("merge-base")

        self.assertEqual(blocked, {"media_api"})
        self.assertEqual(calls, [("media_api", "merge-base")])


if __name__ == "__main__":
    unittest.main()
