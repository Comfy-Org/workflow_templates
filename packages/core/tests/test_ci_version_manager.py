"""Regression tests for release-time package version detection."""

import importlib.util
import json
import os
import subprocess
import sys
import tempfile
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

    def test_media_package_source_change_bumps_without_asset_changes(self):
        def fake_run_git(args):
            if args[0] == "tag":
                return "v1.0.0"
            if args[0] == "show":
                return '{"templates": []}'
            if args[0] == "diff":
                if "packages/media_assets_02/" in args:
                    return "packages/media_assets_02/src/example/__init__.py"
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
            self.assertEqual(ci_version_manager.get_changed_packages(), {
                "core", "json", "media_assets_02", "meta"
            })

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

    def test_required_baseline_version_read_failure_is_not_zero(self):
        with patch.object(
            ci_version_manager, "run_git",
            side_effect=subprocess.CalledProcessError(128, ["git", "show"]),
        ):
            with self.assertRaisesRegex(RuntimeError, "Cannot read package version for core"):
                ci_version_manager.get_version_at_ref("core", "v1.0.0", required=True)

    def test_required_baseline_version_must_have_project_version(self):
        with patch.object(ci_version_manager, "run_git", return_value="[project]\n"):
            with self.assertRaisesRegex(RuntimeError, "Cannot read package version for core"):
                ci_version_manager.get_version_at_ref("core", "v1.0.0", required=True)

    def test_missing_package_at_valid_ref_is_distinct_from_git_failure(self):
        with patch.object(ci_version_manager, "run_git", return_value="") as run_git:
            self.assertEqual(ci_version_manager.get_version_at_ref(
                "core", "base", required=True, allow_missing=True
            ), "0.0.0")
        run_git.assert_called_once_with(["ls-tree", "base", "--", "packages/core/pyproject.toml"])
        with patch.object(ci_version_manager, "run_git", side_effect=subprocess.CalledProcessError(
            128, ["git", "ls-tree"], stderr=b"fatal: invalid object name"
        )):
            with self.assertRaisesRegex(RuntimeError, "invalid object name"):
                ci_version_manager.get_version_at_ref(
                    "core", "base", required=True, allow_missing=True
                )

    def test_frozen_updates_stop_detection_before_tag_queries(self):
        with (
            patch.object(ci_version_manager, "get_merge_base", return_value="base"),
            patch.object(ci_version_manager, "get_frozen_packages", return_value={"media_api"}),
            patch.object(
                ci_version_manager, "_blocked_frozen_media_updates", return_value={"media_api"}
            ),
            patch.object(ci_version_manager, "run_git") as run_git,
        ):
            with self.assertRaisesRegex(SystemExit, "Frozen media packages need an update"):
                ci_version_manager.get_changed_packages()
        run_git.assert_not_called()

    def test_detection_git_error_is_reported_without_a_traceback(self):
        with (
            patch.object(ci_version_manager, "_parse_args", return_value=type(
                "Args", (), {"list_publish_packages": False}
            )()),
            patch.object(ci_version_manager, "root_version_changed", return_value=True),
            patch.object(ci_version_manager, "get_changed_packages", side_effect=(
                subprocess.CalledProcessError(128, ["git", "tag"], stderr=b"fatal: bad ref")
            )),
        ):
            with self.assertRaisesRegex(
                SystemExit, "Release change detection failed: fatal: bad ref"
            ):
                ci_version_manager.main()

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


class ReleaseIntegrationTests(unittest.TestCase):
    def test_release_includes_main_changes_and_rerun_does_not_bump_again(self):
        self._exercise_release()

    def test_stale_tag_does_not_skip_versions_already_advanced_on_main(self):
        self._exercise_release(stale_tag=True)

    def test_package_added_on_main_after_tag_can_be_released(self):
        self._exercise_release(new_package=True)

    def test_package_added_on_pr_keeps_initial_version_and_is_publishable(self):
        self._exercise_release(new_on_pr=True)

    def test_blueprint_core_manifest_change_is_detected(self):
        self._exercise_release(manifest_only=True)

    def _exercise_release(
        self, *, stale_tag=False, new_package=False, new_on_pr=False, manifest_only=False
    ):
        """Exercise real tags, package versions and content across a release PR."""
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)

            def git(*args):
                return subprocess.check_output(
                    ["git", *args], cwd=root, stderr=subprocess.PIPE
                ).decode().strip()

            def write(path, content):
                target = root / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(content)

            def commit(message):
                git("add", ".")
                git("commit", "-m", message)

            git("init", "-b", "main")
            git("config", "user.name", "Release test")
            git("config", "user.email", "release-test@example.com")
            for pkg in ("core", "json", "media_assets_02", "blueprints"):
                if (new_package or new_on_pr) and pkg == "media_assets_02":
                    continue
                write(f"packages/{pkg}/pyproject.toml", '[project]\nversion = "1.0.0"\n')
            write("pyproject.toml", '[project]\nversion = "1.0.0"\n')
            manifest_path = "packages/core/src/comfyui_workflow_templates_core/manifest.json"
            manifest = {"templates": [{"bundle": "media-assets-02", "assets": [
                {"filename": "a.webp", "sha256": "old"}
            ]}]}
            write(manifest_path, json.dumps(manifest))
            write("blueprints/example.json", "{}")
            blueprint_manifest = (
                "packages/core/src/comfyui_workflow_templates_core/blueprints_manifest.json"
            )
            write(blueprint_manifest, '{"blueprints": []}')
            commit("Published release")
            git("tag", "v1.0.0")

            if stale_tag:
                for pkg in ("core", "json", "media_assets_02", "blueprints"):
                    write(f"packages/{pkg}/pyproject.toml", '[project]\nversion = "1.0.1"\n')
                write("pyproject.toml", '[project]\nversion = "1.0.1"\n')
                commit("Previous release succeeded but its tag was not created")
            if new_package:
                write("packages/media_assets_02/pyproject.toml", '[project]\nversion = "1.0.1"\n')
            if manifest_only:
                write(blueprint_manifest, '{"blueprints": [{"id": "example"}]}')
            else:
                manifest["templates"][0]["assets"][0]["sha256"] = "new"
                write(manifest_path, json.dumps(manifest))
                write("blueprints/example.json", '{"changed": true}')
            commit("Merge template and blueprint changes into main")
            git("update-ref", "refs/remotes/origin/main", "HEAD")
            git("checkout", "-b", "release")
            if new_on_pr:
                write("packages/media_assets_02/pyproject.toml", '[project]\nversion = "1.0.1"\n')
            # A reachable prerelease tag must not become the published baseline.
            git("tag", "v1.1.0-rc.1")
            release_version = "1.0.2" if stale_tag else "1.0.1"
            write("pyproject.toml", f'[project]\nversion = "{release_version}"\n')
            commit("Start next release")

            previous_cwd = Path.cwd()
            try:
                os.chdir(root)
                with (
                    patch.object(ci_version_manager, "ROOT", root),
                    patch.object(ci_version_manager, "get_frozen_packages", return_value=set()),
                    patch.object(
                        ci_version_manager, "_blocked_frozen_media_updates", return_value=set()
                    ),
                    patch.object(ci_version_manager, "ALL_PACKAGE_IDS", (
                        "core", "json", "media_assets_02", "blueprints", "meta"
                    )),
                ):
                    self.assertTrue(ci_version_manager.root_version_changed())
                    changed = ci_version_manager.get_changed_packages()
                    expected = {"core", "json", "blueprints", "meta"}
                    if not manifest_only and not new_on_pr:
                        expected.add("media_assets_02")
                    self.assertEqual(changed, expected)
                    ci_version_manager.bump_versions(changed)
                    if "media_assets_02" in expected:
                        expected_version = "1.0.2" if stale_tag or new_package else "1.0.1"
                        self.assertEqual(
                            ci_version_manager.get_current_version("media_assets_02"),
                            expected_version,
                        )
                    if new_on_pr:
                        self.assertEqual(
                            ci_version_manager.get_current_version("media_assets_02"), "1.0.1"
                        )
                        self.assertIn("media_assets_02", ci_version_manager.get_publish_package_ids(
                            "origin/main"
                        ))
                    commit("Auto-bump package versions")
                    self.assertTrue(ci_version_manager.root_version_changed())
                    self.assertEqual(ci_version_manager.get_changed_packages(), set())
            finally:
                os.chdir(previous_cwd)


if __name__ == "__main__":
    unittest.main()
