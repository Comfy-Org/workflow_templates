"""Regression tests for release-time package version detection."""

import importlib.util
import subprocess
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

    def test_release_uses_tag_and_bumps_core_json_once(self):
        """The release snapshot includes changes already merged to main."""
        calls = []

        def fake_run_git(args):
            calls.append(args)
            if args[0] == "tag":
                return "v1.0.0"
            if args[0] == "show":
                return '{"templates": []}'
            if args[0] == "diff":
                return ""
            raise AssertionError(args)

        with (
            patch.object(ci_version_manager, "run_git", side_effect=fake_run_git),
            patch.object(ci_version_manager, "get_merge_base", return_value="merge-base"),
            patch.object(ci_version_manager, "get_frozen_packages", return_value=set()),
            patch.object(ci_version_manager, "_blocked_frozen_media_updates", return_value=set()),
            patch.object(ci_version_manager, "get_current_version", return_value="1.0.0"),
            patch.object(ci_version_manager, "get_version_at_ref", return_value="1.0.0"),
            patch.object(Path, "read_text", return_value='{"templates": []}'),
        ):
            result = ci_version_manager.get_changed_packages()

        self.assertEqual(result, {"core", "json", "meta"})
        self.assertFalse(any(args[0] == "log" for args in calls))

    def test_already_bumped_packages_are_not_bumped_again(self):
        with (
            patch.object(
                ci_version_manager, "run_git", side_effect=["v1.0.0", '{"templates": []}']
            ),
            patch.object(ci_version_manager, "get_merge_base", return_value="merge-base"),
            patch.object(ci_version_manager, "get_frozen_packages", return_value=set()),
            patch.object(ci_version_manager, "_blocked_frozen_media_updates", return_value=set()),
            patch.object(ci_version_manager, "get_current_version", return_value="1.0.1"),
            patch.object(ci_version_manager, "get_version_at_ref", return_value="1.0.0"),
            patch.object(Path, "read_text", return_value='{"templates": []}'),
        ):
            self.assertEqual(ci_version_manager.get_changed_packages(), set())

    def test_replacing_existing_media_asset_bumps_its_bundle(self):
        """bundles.json need not change when an existing thumbnail is replaced."""
        before = (
            '{"templates": [{"bundle": "media-assets-02", '
            '"assets": [{"filename": "a.webp", "sha256": "old"}]}]}'
        )
        after = before.replace('"old"', '"new"')

        def fake_run_git(args):
            if args[0] == "tag":
                return "v1.0.0"
            if args[0] == "show":
                return before
            if args[0] == "diff":
                return ""
            raise AssertionError(args)

        with (
            patch.object(ci_version_manager, "run_git", side_effect=fake_run_git),
            patch.object(ci_version_manager, "get_merge_base", return_value="merge-base"),
            patch.object(
                ci_version_manager, "get_frozen_packages",
                return_value={
                    "media_api", "media_video", "media_image", "media_other", "media_assets_01"
                },
            ),
            patch.object(ci_version_manager, "_blocked_frozen_media_updates", return_value=set()),
            patch.object(ci_version_manager, "get_current_version", return_value="1.0.0"),
            patch.object(ci_version_manager, "get_version_at_ref", return_value="1.0.0"),
            patch.object(Path, "read_text", return_value=after),
        ):
            result = ci_version_manager.get_changed_packages()

        self.assertEqual(result, {"core", "json", "media_assets_02", "meta"})

    def test_missing_release_tag_fails_without_bumping(self):
        with (
            patch.object(ci_version_manager, "run_git", return_value=""),
            patch.object(ci_version_manager, "get_merge_base", return_value="merge-base"),
            patch.object(ci_version_manager, "get_frozen_packages", return_value=set()),
            patch.object(ci_version_manager, "_blocked_frozen_media_updates", return_value=set()),
        ):
            with self.assertRaisesRegex(SystemExit, "No reachable release tag"):
                ci_version_manager.get_changed_packages()

    def test_prerelease_tag_is_not_used_as_release_baseline(self):
        def fake_run_git(args):
            if args[0] == "tag":
                return "v1.1.0-rc.1\nv1.0.0"
            if args[0] == "show":
                self.assertTrue(args[1].startswith("v1.0.0:"))
                return '{"templates": []}'
            if args[0] == "diff":
                return ""
            raise AssertionError(args)

        with (
            patch.object(ci_version_manager, "run_git", side_effect=fake_run_git),
            patch.object(ci_version_manager, "get_merge_base", return_value="merge-base"),
            patch.object(ci_version_manager, "get_frozen_packages", return_value=set()),
            patch.object(ci_version_manager, "_blocked_frozen_media_updates", return_value=set()),
            patch.object(ci_version_manager, "get_current_version", return_value="1.0.0"),
            patch.object(ci_version_manager, "get_version_at_ref", return_value="1.0.0"),
            patch.object(Path, "read_text", return_value='{"templates": []}'),
        ):
            self.assertEqual(ci_version_manager.get_changed_packages(), {"core", "json", "meta"})

    def test_only_prerelease_tags_fail_without_bumping(self):
        with (
            patch.object(ci_version_manager, "run_git", return_value="v1.0.0-rc.1"),
            patch.object(ci_version_manager, "get_merge_base", return_value="merge-base"),
            patch.object(ci_version_manager, "get_frozen_packages", return_value=set()),
            patch.object(ci_version_manager, "_blocked_frozen_media_updates", return_value=set()),
        ):
            with self.assertRaisesRegex(SystemExit, "No reachable release tag"):
                ci_version_manager.get_changed_packages()

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

    def test_failed_git_query_is_not_cached_as_no_changed_files(self):
        """A failed git diff must propagate instead of reading as "nothing changed".

        An empty file list means the package needs no bump, so caching a query
        failure as ``set()`` silently drops the release it was supposed to detect.
        """
        calls = []

        def fake_run_git(args):
            calls.append(args)
            raise subprocess.CalledProcessError(128, ["git", *args])

        with patch.object(ci_version_manager, "run_git", side_effect=fake_run_git):
            with self.assertRaises(subprocess.CalledProcessError):
                ci_version_manager._committed_files_since("merge-base")
            with self.assertRaises(subprocess.CalledProcessError):
                ci_version_manager.get_files_affecting_package("core", "merge-base")

        self.assertEqual(ci_version_manager._committed_files_cache, {})
        self.assertIsNone(ci_version_manager._unstaged_files_cache)
        self.assertEqual(len(calls), 2)


if __name__ == "__main__":
    unittest.main()
