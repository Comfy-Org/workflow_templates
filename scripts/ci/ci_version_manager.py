#!/usr/bin/env python3
"""
Auto-bump sub-package versions only when the root pyproject.toml version has been
changed (e.g. by the PR author). Otherwise skip bumping to avoid unnecessary
version churn on every template-only PR.

Frozen legacy media packages: scripts/docs/frozen_bundles.md
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Set, List, Optional

ALL_PACKAGE_IDS = (
    "core",
    "json",
    "media_api",
    "media_video",
    "media_image",
    "media_other",
    "media_assets_01",
    "media_assets_02",
    "blueprints",
    "meta",
)

_LIB_DIR = Path(__file__).resolve().parent.parent / "lib"
if str(_LIB_DIR) not in sys.path:
    sys.path.insert(0, str(_LIB_DIR))

from paths import VERSION_POLICY_FILE  # noqa: E402
from version_policy import get_frozen_packages as _get_frozen_packages_from_policy  # noqa: E402
from version_policy import (  # noqa: E402
    is_additive_logo_path,
    is_media_template_asset_path,
    load_version_policy,
    media_bundle_for_template_asset,
    template_id_from_asset_path,
)

ROOT = Path.cwd()

MEDIA_ASSET_EXTENSIONS = {
    ".webp", ".png", ".jpg", ".jpeg", ".gif", ".mp4", ".webm",
    ".mp3", ".wav", ".ogg", ".flac", ".m4a",
}

BUNDLE_PACKAGE_MAP = {
    "media-api": "media_api",
    "media-video": "media_video",
    "media-image": "media_image",
    "media-other": "media_other",
    "media-assets-01": "media_assets_01",
    "media-assets-02": "media_assets_02",
}


def _is_json_template_path(file: str) -> bool:
    return file.startswith("templates/") and file.endswith(".json")


def _is_media_template_path(file: str) -> bool:
    if not file.startswith("templates/"):
        return False
    suffix = Path(file).suffix.lower()
    return suffix in MEDIA_ASSET_EXTENSIONS or file.startswith("templates/logo/")


def _template_id_from_path(file: str, bundles: Optional[dict] = None) -> str:
    """Extract template id from a template asset path."""
    return template_id_from_asset_path(file, bundles)


def _json_asset_fingerprints(manifest: dict) -> dict[str, str]:
    fingerprints: dict[str, str] = {}
    for entry in manifest.get("templates", []):
        for asset in entry.get("assets", []):
            filename = asset.get("filename", "")
            if filename.endswith(".json"):
                fingerprints[filename] = asset.get("sha256", "")
    return fingerprints


def _media_asset_fingerprints(manifest: dict, bundle: str) -> dict[str, str]:
    """Fingerprints for non-JSON assets that resolve from the given media bundle.

    Honors per-asset ``bundle`` overrides (additive logos in the active assets bundle).
    """
    fingerprints: dict[str, str] = {}
    for entry in manifest.get("templates", []):
        for asset in entry.get("assets", []):
            filename = asset.get("filename", "")
            if filename.endswith(".json"):
                continue
            asset_bundle = asset.get("bundle") or entry.get("bundle")
            if asset_bundle != bundle:
                continue
            fingerprints[filename] = asset.get("sha256", "")
    return fingerprints


def _manifest_json_assets_changed(old_manifest: dict, cur_manifest: dict) -> bool:
    return _json_asset_fingerprints(old_manifest) != _json_asset_fingerprints(cur_manifest)


def _manifest_media_assets_changed(old_manifest: dict, cur_manifest: dict, bundle: str) -> bool:
    return _media_asset_fingerprints(old_manifest, bundle) != _media_asset_fingerprints(
        cur_manifest, bundle
    )


def run_git(args: List[str]) -> str:
    return subprocess.check_output(["git", *args], cwd=ROOT).decode().strip()


def get_frozen_packages() -> Set[str]:
    """Packages excluded from CI auto-bump. See scripts/docs/frozen_bundles.md."""
    try:
        return _get_frozen_packages_from_policy(load_version_policy(VERSION_POLICY_FILE))
    except Exception as exc:
        print(f"Warning: could not read {VERSION_POLICY_FILE}: {exc}")
        return set()


AUTO_BUMP_COMMIT_PREFIXES = ("Auto-bump package versions", "chore: bump version")

_auto_bump_only_files_cache: dict[str, set[str]] = {}
_committed_files_cache: dict[str, set[str]] = {}
_unstaged_files_cache: Optional[set[str]] = None


def get_merge_base() -> str:
    """Merge-base of HEAD with the default branch (origin/main or main)."""
    try:
        return run_git(["merge-base", "HEAD", "origin/main"])
    except subprocess.CalledProcessError:
        return run_git(["merge-base", "HEAD", "main"])


def root_version_changed() -> bool:
    """
    Return True if the root pyproject.toml version was changed compared to the
    merge-base with the default branch (origin/main). Only then do we run auto-bump.
    """
    try:
        base = get_merge_base()
        return get_current_version("meta") != get_version_at_ref("meta", base)
    except Exception:
        return True  # fallback: allow bump on parse/git errors


def _pyproject_path(pkg: str) -> str:
    if pkg == "meta":
        return "pyproject.toml"
    return f"packages/{pkg}/pyproject.toml"


def get_version_at_ref(pkg: str, ref: str) -> str:
    """Read a package version from pyproject.toml at a git ref."""
    try:
        content = run_git(["show", f"{ref}:{_pyproject_path(pkg)}"])
        match = re.search(r'^version\s*=\s*"([^"]+)"', content, re.MULTILINE)
        return match.group(1) if match else "0.0.0"
    except Exception:
        return "0.0.0"


def find_version_intro_commit(pkg: str, current_version: str, fallback_ref: str) -> str:
    """Find the commit that introduced the package's current version.

    Release PRs normally change only the root meta version.  Package changes to
    release may already be on the default branch, so limiting this lookup to
    ``merge_base..HEAD`` incorrectly makes every subpackage look up to date.

    ``-G`` keeps the lookup cheap by visiting only commits that changed the
    project version line.  The first matching commit is also the right boundary
    after an auto-bump commit, preventing a second workflow run from bumping the
    same package again.
    """
    file_path = _pyproject_path(pkg)
    try:
        log_output = run_git(
            ["log", "--format=%H", "-G", r"^version[[:space:]]*=", "--", file_path]
        )
        for commit_hash in log_output.splitlines():
            commit_hash = commit_hash.strip()
            if not commit_hash:
                continue
            try:
                if get_version_at_ref(pkg, commit_hash) == current_version:
                    return commit_hash
            except Exception:
                continue
    except Exception:
        pass
    return fallback_ref


def get_since_commit_for_package(pkg: str, merge_base: str) -> str:
    """Reference commit for changes not yet covered by the current package version."""
    current = get_current_version(pkg)
    return find_version_intro_commit(pkg, current, merge_base)


def _auto_bump_only_files(since_commit: str) -> set[str]:
    """Files whose newest change in since_commit..HEAD came from a CI auto-bump commit."""
    if since_commit in _auto_bump_only_files_cache:
        return _auto_bump_only_files_cache[since_commit]

    skipped: set[str] = set()
    output = run_git(["log", f"{since_commit}..HEAD", "--format=COMMIT:%s", "--name-only"])
    current_msg = ""
    for line in output.splitlines():
        if line.startswith("COMMIT:"):
            current_msg = line[7:]
        elif line.strip() and line not in skipped:
            if any(current_msg.startswith(prefix) for prefix in AUTO_BUMP_COMMIT_PREFIXES):
                skipped.add(line)

    _auto_bump_only_files_cache[since_commit] = skipped
    return skipped


def _committed_files_since(since_commit: str) -> set[str]:
    """Cached ``git diff since..HEAD --name-only`` (shared across packages).

    Only successful queries are cached: caching a failure as an empty set would read
    as "nothing changed" and silently skip the version bump for every later package.
    """
    if since_commit not in _committed_files_cache:
        output = run_git(["diff", f"{since_commit}..HEAD", "--name-only"])
        _committed_files_cache[since_commit] = {
            line.strip() for line in output.splitlines() if line.strip()
        }
    return _committed_files_cache[since_commit]


def _unstaged_files() -> set[str]:
    """Cached working-tree changes vs HEAD (sync_bundles often leaves many).

    Same rule as ``_committed_files_since``: a failed query is never cached as an
    empty set, it propagates.
    """
    global _unstaged_files_cache
    if _unstaged_files_cache is None:
        output = run_git(["diff", "--name-only", "HEAD"])
        _unstaged_files_cache = {
            line.strip() for line in output.splitlines() if line.strip()
        }
    return _unstaged_files_cache


def get_current_version(pkg: str) -> str:
    """Get current version of a package from its pyproject.toml"""
    if pkg == "meta":
        path = Path("pyproject.toml")
    else:
        path = Path(f"packages/{pkg}/pyproject.toml")
    
    if not path.exists():
        return "0.0.0"
    
    text = path.read_text()
    match = re.search(r'^version\s*=\s*"([^"]+)"', text, re.MULTILINE)
    return match.group(1) if match else "0.0.0"


def get_files_affecting_package(pkg: str, since_commit: str) -> List[str]:
    """Get files that affect a specific package since the given commit, excluding CI auto-commits.

    An empty result means "this package needs no bump", so a failed query must not be
    reported as one: errors propagate (``get_changed_packages`` has the safe
    bump-everything fallback) instead of silently dropping a release.
    """
    # Cached across packages: after sync_bundles the unstaged set can be huge
    # (entire media wheels), so never re-run these git commands per package.
    committed_files = _committed_files_since(since_commit)
    unstaged_set = _unstaged_files()
    all_changed_files = committed_files | unstaged_set

    auto_bump_files = _auto_bump_only_files(since_commit)

    # Filter out files from CI auto-commits by checking commit messages
    affecting_files = []
    for file in all_changed_files:
        file = file.strip()
        if not file:
            continue

        # For unstaged files, skip the commit check and include them directly
        # (they are new changes from sync_bundles.py that haven't been committed yet)
        if file in unstaged_set:
            affecting_files.append(file)
            continue

        if file in auto_bump_files:
            continue

        affecting_files.append(file)
    
    # Filter to only files that affect this package
    filtered_files = []
    
    bundles = json.loads(Path("bundles.json").read_text()) if Path("bundles.json").exists() else {}

    # Find which bundle this package corresponds to (media bundles only)
    pkg_bundle = None
    for bundle_name, bundle_pkg in BUNDLE_PACKAGE_MAP.items():
        if bundle_pkg == pkg:
            pkg_bundle = bundle_name
            break
    
    for file in affecting_files:
        file = file.strip()
        if not file:
            continue
            
        # Direct package directory changes
        if file.startswith(f"packages/{pkg}/"):
            filtered_files.append(file)
        # Core package affects meta
        elif pkg == "meta" and (file.startswith("packages/") or file == "pyproject.toml"):
            filtered_files.append(file)
        # Blueprints package: affected by blueprints/ directory and blueprints_bundles.json
        elif pkg == "blueprints":
            if file.startswith("blueprints/") or file == "blueprints_bundles.json":
                filtered_files.append(file)
            elif file == "packages/core/src/comfyui_workflow_templates_core/blueprints_manifest.json":
                filtered_files.append(file)
        # JSON package: any workflow/index JSON change
        elif pkg == "json" and _is_json_template_path(file):
            filtered_files.append(file)
        # Media asset packages: non-JSON template assets for this bundle
        elif pkg_bundle and file.startswith("templates/"):
            if _is_json_template_path(file):
                continue
            if not _is_media_template_path(file):
                continue
            policy = load_version_policy(VERSION_POLICY_FILE)
            owning_bundle = media_bundle_for_template_asset(file, bundles, policy)
            if owning_bundle == pkg_bundle:
                filtered_files.append(file)
        # manifest.json changes: JSON sha -> json; media sha -> bundle package
        elif pkg == "json" and file == "packages/core/src/comfyui_workflow_templates_core/manifest.json":
            try:
                old_manifest = json.loads(run_git(["show", f"{since_commit}:{file}"]))
                cur_manifest = json.loads(Path(file).read_text())
                if _manifest_json_assets_changed(old_manifest, cur_manifest):
                    filtered_files.append(file)
            except Exception:
                filtered_files.append(file)
        elif pkg_bundle and file == "packages/core/src/comfyui_workflow_templates_core/manifest.json":
            try:
                old_manifest = json.loads(run_git(["show", f"{since_commit}:{file}"]))
                cur_manifest = json.loads(Path(file).read_text())
                if _manifest_media_assets_changed(old_manifest, cur_manifest, pkg_bundle):
                    filtered_files.append(file)
            except Exception:
                filtered_files.append(file)
        # bundles.json changes affecting this package's bundle
        elif pkg == "json" and file == "bundles.json":
            filtered_files.append(file)
        elif pkg_bundle and file == "bundles.json":
            try:
                # First check if bundles.json existed in the old commit
                run_git(["cat-file", "-e", f"{since_commit}:bundles.json"])
                old_bundles = json.loads(run_git(["show", f"{since_commit}:bundles.json"]))
                if bundles.get(pkg_bundle) != old_bundles.get(pkg_bundle):
                    filtered_files.append(file)
            except subprocess.CalledProcessError:
                # bundles.json didn't exist in old commit, so this is a new file affecting all bundles
                filtered_files.append(file)
            except:
                # Other error, assume it affects this package
                filtered_files.append(file)
    
    return filtered_files

def get_publish_package_ids(base_ref: str) -> Set[str]:
    """Packages whose version differs from base_ref (candidates for PyPI publish)."""
    return {
        pkg
        for pkg in ALL_PACKAGE_IDS
        if get_current_version(pkg) != get_version_at_ref(pkg, base_ref)
    }


def get_changed_packages() -> Set[str]:
    """Determine which packages need version bumps based on changes vs main merge-base."""
    try:
        affected = set()
        merge_base = get_merge_base()
        frozen = get_frozen_packages()
        print(f"Comparing changes since merge-base with main: {merge_base[:12]}")

        # Frozen packages are never auto-bumped. Skip their (often months-long)
        # version-intro + history scans; PR-scoped media edits are checked below.
        for pkg in ALL_PACKAGE_IDS:
            if pkg in frozen:
                print(f"Package {pkg} frozen; skipping bump analysis")
                continue

            current_version = get_current_version(pkg)
            since_commit = get_since_commit_for_package(pkg, merge_base)
            affecting_files = get_files_affecting_package(pkg, since_commit)

            if affecting_files:
                affected.add(pkg)
                print(
                    f"Package {pkg} needs bump: {len(affecting_files)} files changed "
                    f"since version {current_version}"
                )
                for f in affecting_files[:5]:
                    print(f"  - {f}")
                if len(affecting_files) > 5:
                    print(f"  ... and {len(affecting_files) - 5} more files")
            else:
                print(f"Package {pkg} up to date since version {current_version}")

        blocked = _blocked_frozen_media_updates(merge_base)
        if blocked:
            details = ", ".join(sorted(blocked))
            raise SystemExit(
                "Frozen media packages need an update but are not auto-bumped: "
                f"{details}. Move new assets to the recommended asset bundle "
                "(see scripts/data/version_policy.json) "
                "or manually bump the frozen package version."
            )

        # If any non-meta packages changed, also bump meta
        if affected - {"meta"}:
            affected.add("meta")

        return affected
    except SystemExit:
        raise
    except Exception as e:
        print(f"Error in change detection: {e}")
        return {
            "core",
            "json",
            "media_api",
            "media_video",
            "media_image",
            "media_other",
            "media_assets_01",
            "media_assets_02",
            "meta",
        }


def _blocked_frozen_media_updates(merge_base: str) -> Set[str]:
    """Frozen packages with media-asset edits in this PR (merge_base..HEAD + unstaged).

    Scoped to the PR range so we do not re-scan months of frozen-package history.
    """
    policy = load_version_policy(VERSION_POLICY_FILE)
    frozen = get_frozen_packages()
    if not frozen:
        return set()

    bundles = json.loads(Path("bundles.json").read_text()) if Path("bundles.json").exists() else {}
    blocked: Set[str] = set()
    for pkg in sorted(frozen):
        for file in get_files_affecting_package(pkg, merge_base):
            if not file.startswith("templates/"):
                continue
            if _is_json_template_path(file):
                continue
            if not is_media_template_asset_path(file):
                continue
            if is_additive_logo_path(file, policy):
                continue
            owning = media_bundle_for_template_asset(file, bundles, policy)
            if owning and BUNDLE_PACKAGE_MAP.get(owning) == pkg:
                blocked.add(pkg)
                break
    return blocked

def bump_versions(packages: Set[str]) -> None:
    frozen = get_frozen_packages()
    # Auto-bump individual packages (core, media-api, etc.) but not the root meta package
    for pkg in packages:
        if pkg == "meta" or pkg in frozen:
            continue  # Root pyproject.toml version is manually controlled
        
        paths = [f"packages/{pkg}/pyproject.toml"]
        
        for path_str in paths:
            path = Path(path_str)
            if path.exists():
                text = path.read_text()
                
                def bump_version_match(match):
                    version = match.group(1)
                    parts = version.split('.')
                    if len(parts) >= 3:
                        parts[2] = str(int(parts[2]) + 1)
                    elif len(parts) == 2:
                        parts.append("1")
                    else:
                        parts = [parts[0], "0", "1"]
                    return f'version = "{".".join(parts)}"'
                
                # Only bump the project version, not tool versions like ruff target-version
                updated = re.sub(r'^version\s*=\s*"([^"]+)"', bump_version_match, text, flags=re.MULTILINE)
                path.write_text(updated)

def update_dependencies(changed_packages: Set[str]) -> None:
    """Pin root meta deps to the versions already written by ``bump_versions``.

    Takes the detected package set so we do not re-run the full git change scan
    (previously this called ``get_changed_packages()`` again and dominated CI time).
    """
    non_meta_packages = changed_packages - {"meta"}

    version_re = re.compile(r'^version\s*=\s*"([^"]+)"', re.MULTILINE)
    versions = {}

    pyprojects = {
        "core": "packages/core/pyproject.toml",
        "json": "packages/json/pyproject.toml",
        "media_api": "packages/media_api/pyproject.toml",
        "media_video": "packages/media_video/pyproject.toml",
        "media_image": "packages/media_image/pyproject.toml",
        "media_other": "packages/media_other/pyproject.toml",
        "media_assets_01": "packages/media_assets_01/pyproject.toml",
        "media_assets_02": "packages/media_assets_02/pyproject.toml",
    }

    frozen = get_frozen_packages()

    # Get versions for packages that were auto-bumped
    for pkg, path in pyprojects.items():
        if pkg in frozen:
            continue
        if pkg in non_meta_packages and Path(path).exists():
            text = Path(path).read_text()
            match = version_re.search(text)
            if match:
                versions[pkg] = match.group(1)

    if not versions:
        return

    # Update root pyproject.toml dependencies to match bumped package versions
    meta_path = "pyproject.toml"
    if Path(meta_path).exists():
        text = Path(meta_path).read_text()

        for pkg, version in versions.items():
            pip_name = f"comfyui-workflow-templates-{pkg.replace('_', '-')}"
            pattern = rf'("{re.escape(pip_name)})==([0-9.]+)(")'
            replacement = rf'\g<1>=={version}\g<3>'
            text = re.sub(pattern, replacement, text)

        Path(meta_path).write_text(text)

def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--list-publish-packages",
        action="store_true",
        help="Print package ids whose version differs from --base-ref (comma-separated, no bump)",
    )
    parser.add_argument(
        "--base-ref",
        help="Git ref to compare versions against (default: merge-base with origin/main)",
    )
    return parser.parse_args()


def main() -> int:
    args = _parse_args()

    if args.list_publish_packages:
        base_ref = args.base_ref or get_merge_base()
        publish_ids = get_publish_package_ids(base_ref)
        print(",".join(sorted(publish_ids)))
        return 0

    if not root_version_changed():
        print("Root pyproject.toml version unchanged; skipping auto-bump.")
        print("")
        return 0

    packages = get_changed_packages()
    print(f"Detected changed packages: {sorted(packages)}")

    non_meta_packages = packages - {"meta"}

    if non_meta_packages:
        bump_versions(packages)
        update_dependencies(packages)
        print(f"Auto-bumped packages and updated dependencies: {sorted(non_meta_packages)}")

    # Output all packages that need building (including meta if changed)
    if packages:
        print(" ".join(sorted(packages)))
    else:
        print("")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
