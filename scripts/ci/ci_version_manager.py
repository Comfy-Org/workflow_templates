#!/usr/bin/env python3
"""
Auto-bump sub-package versions only when the root pyproject.toml version has been
changed (e.g. by the PR author). Otherwise skip bumping to avoid unnecessary
version churn on every template-only PR.

Frozen legacy media packages: scripts/docs/frozen_bundles.md
"""
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Set, List, Optional

_LIB_DIR = Path(__file__).resolve().parent.parent / "lib"
if str(_LIB_DIR) not in sys.path:
    sys.path.insert(0, str(_LIB_DIR))

from paths import VERSION_POLICY_FILE  # noqa: E402
from version_policy import get_frozen_packages as _get_frozen_packages_from_policy  # noqa: E402
from version_policy import load_version_policy  # noqa: E402

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
}


def _is_json_template_path(file: str) -> bool:
    return file.startswith("templates/") and file.endswith(".json")


def _is_media_template_path(file: str) -> bool:
    if not file.startswith("templates/"):
        return False
    suffix = Path(file).suffix.lower()
    return suffix in MEDIA_ASSET_EXTENSIONS or file.startswith("templates/logo/")


_THUMBNAIL_SUFFIX = re.compile(r"-\d+$")


def _template_id_from_path(file: str, bundles: Optional[dict] = None) -> str:
    """Extract template id from a template asset path."""
    name = Path(file).name
    if name.endswith(".json"):
        return Path(name).stem

    stem = Path(name).stem
    candidate = _THUMBNAIL_SUFFIX.sub("", stem)

    if bundles:
        all_ids = {tid for ids in bundles.values() for tid in ids}
        if candidate in all_ids:
            return candidate
        if stem in all_ids:
            return stem

    return candidate


def _json_asset_fingerprints(manifest: dict) -> dict[str, str]:
    fingerprints: dict[str, str] = {}
    for entry in manifest.get("templates", []):
        for asset in entry.get("assets", []):
            filename = asset.get("filename", "")
            if filename.endswith(".json"):
                fingerprints[filename] = asset.get("sha256", "")
    return fingerprints


def _media_asset_fingerprints(manifest: dict, bundle: str) -> dict[str, str]:
    fingerprints: dict[str, str] = {}
    for entry in manifest.get("templates", []):
        if entry.get("bundle") != bundle:
            continue
        for asset in entry.get("assets", []):
            filename = asset.get("filename", "")
            if not filename.endswith(".json"):
                fingerprints[filename] = asset.get("sha256", "")
    return fingerprints


def _manifest_json_assets_changed(old_manifest: dict, cur_manifest: dict) -> bool:
    return _json_asset_fingerprints(old_manifest) != _json_asset_fingerprints(cur_manifest)


def _manifest_media_assets_changed(old_manifest: dict, cur_manifest: dict, bundle: str) -> bool:
    old_ids = {e["id"] for e in old_manifest.get("templates", []) if e.get("bundle") == bundle}
    cur_ids = {e["id"] for e in cur_manifest.get("templates", []) if e.get("bundle") == bundle}
    if old_ids != cur_ids:
        return True
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


def root_version_changed() -> bool:
    """
    Return True if the root pyproject.toml version was changed compared to the
    merge-base with the default branch (origin/main). Only then do we run auto-bump.
    """
    try:
        base = run_git(["merge-base", "HEAD", "origin/main"])
    except subprocess.CalledProcessError:
        try:
            base = run_git(["merge-base", "HEAD", "main"])
        except subprocess.CalledProcessError:
            return True  # fallback: allow bump when merge-base unavailable
    try:
        current = get_current_version("meta")
        base_content = run_git(["show", f"{base}:pyproject.toml"])
        match = re.search(r'^version\s*=\s*"([^"]+)"', base_content, re.MULTILINE)
        base_version = match.group(1) if match else ""
        return current != base_version
    except Exception:
        return True  # fallback: allow bump on parse/git errors

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

def find_last_version_bump_commit(pkg: str, current_version: str) -> str:
    """Find the commit where this package's version was last bumped to current_version"""
    if pkg == "meta":
        file_path = "pyproject.toml"
    else:
        file_path = f"packages/{pkg}/pyproject.toml"
    
    try:
        # Get commit history for the pyproject.toml file
        log_output = run_git(["log", "--oneline", "--follow", "--", file_path])
        
        for line in log_output.split('\n'):
            if not line.strip():
                continue
            commit_hash = line.split()[0]
            
            # Check version in this commit
            try:
                old_content = run_git(["show", f"{commit_hash}:{file_path}"])
                old_version_match = re.search(r'^version\s*=\s*"([^"]+)"', old_content, re.MULTILINE)
                if old_version_match:
                    old_version = old_version_match.group(1)
                    if old_version == current_version:
                        # This is where this version was introduced
                        return commit_hash
            except:
                continue
        
        # Fallback: if we can't find the exact version bump, use HEAD~10 or first commit
        try:
            return run_git(["rev-list", "--max-count=1", "HEAD~10"])
        except:
            return run_git(["rev-list", "--max-count=1", "HEAD"])
            
    except:
        # Ultimate fallback
        return "HEAD~1"

def get_files_affecting_package(pkg: str, since_commit: str) -> List[str]:
    """Get files that affect a specific package since the given commit, excluding CI auto-commits"""
    try:
        # Get all files changed since the reference commit
        committed_files = set(run_git(["diff", f"{since_commit}..HEAD", "--name-only"]).split('\n'))
        
        # Also check for unstaged changes in working directory (important for core package manifest.json)
        # This handles the case where sync_bundles.py modified manifest.json but it's not yet committed
        unstaged_set = set()
        try:
            unstaged_output = run_git(["diff", "--name-only", "HEAD"])
            unstaged_set = set(unstaged_output.split('\n')) if unstaged_output.strip() else set()
        except:
            pass  # If we can't get unstaged files, continue with committed changes only
        
        # Combine committed and unstaged changes
        all_changed_files = committed_files | unstaged_set
        
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
                
            # For committed files, check if they were modified by CI auto-commits
            try:
                last_commit = run_git(["log", "-1", "--format=%s", f"{since_commit}..HEAD", "--", file]).strip()
                # Skip files that were last modified by CI auto-commits
                if last_commit.startswith("Auto-bump package versions") or last_commit.startswith("chore: bump version"):
                    continue
            except:
                pass  # If we can't get commit info, include the file
                
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
                template_name = _template_id_from_path(file, bundles)
                if pkg_bundle in bundles and template_name in bundles[pkg_bundle]:
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
    except:
        return []

def get_changed_packages() -> Set[str]:
    """Determine which packages need version bumps based on changes since their last version bump"""
    try:
        packages = [
            "core",
            "json",
            "media_api",
            "media_video",
            "media_image",
            "media_other",
            "media_assets_01",
            "blueprints",
            "meta",
        ]
        affected = set()

        for pkg in packages:
            current_version = get_current_version(pkg)
            last_bump_commit = find_last_version_bump_commit(pkg, current_version)
            affecting_files = get_files_affecting_package(pkg, last_bump_commit)

            if affecting_files:
                affected.add(pkg)
                print(f"Package {pkg} needs bump: {len(affecting_files)} files changed since version {current_version}")
                for f in affecting_files[:5]:  # Show first 5 files
                    print(f"  - {f}")
                if len(affecting_files) > 5:
                    print(f"  ... and {len(affecting_files) - 5} more files")
            else:
                print(f"Package {pkg} up to date since version {current_version}")

        frozen = get_frozen_packages()
        if frozen:
            skipped = affected & frozen
            if skipped:
                print(f"Skipping frozen packages (no auto-bump): {sorted(skipped)}")
            affected -= frozen

        # If any non-meta packages changed, also bump meta
        if affected - {"meta"}:
            affected.add("meta")

        return affected
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
            "meta",
        }

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

def update_dependencies() -> None:
    """Update root meta package dependencies to match auto-bumped individual packages"""
    changed_packages = get_changed_packages()
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

if __name__ == "__main__":
    if not root_version_changed():
        print("Root pyproject.toml version unchanged; skipping auto-bump.")
        print("")
        exit(0)

    packages = get_changed_packages()
    print(f"Detected changed packages: {sorted(packages)}")
    
    non_meta_packages = packages - {"meta"}
    
    if non_meta_packages:
        bump_versions(packages)
        update_dependencies()
        print(f"Auto-bumped packages and updated dependencies: {sorted(non_meta_packages)}")
        
    # Output all packages that need building (including meta if changed)
    if packages:
        print(" ".join(sorted(packages)))
    else:
        print("")