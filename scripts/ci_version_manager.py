#!/usr/bin/env python3
import json
import re
import subprocess
from pathlib import Path
from typing import Set, List, Dict

ROOT = Path.cwd()

def run_git(args: List[str]) -> str:
    return subprocess.check_output(["git", *args], cwd=ROOT).decode().strip()

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
        all_changed_files = run_git(["diff", f"{since_commit}..HEAD", "--name-only"]).split('\n')
        
        # Filter out files from CI auto-commits by checking commit messages
        affecting_files = []
        for file in all_changed_files:
            file = file.strip()
            if not file:
                continue
                
            # Get the commit that last modified this file
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
        bundle_mapping = {
            "media-api": "media_api",
            "media-video": "media_video", 
            "media-image": "media_image",
            "media-other": "media_other"
        }
        
        # Find which bundle this package corresponds to
        pkg_bundle = None
        for bundle_name, bundle_pkg in bundle_mapping.items():
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
            # Template files affecting this package's bundle
            elif pkg_bundle and file.startswith("templates/"):
                template_name = Path(file).stem.split('-')[0]
                if pkg_bundle in bundles and template_name in bundles[pkg_bundle]:
                    filtered_files.append(file)
            # bundles.json changes affecting this package's bundle
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
        packages = ["core", "media_api", "media_video", "media_image", "media_other", "meta"]
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
        
        # If any non-meta packages changed, also bump meta
        if affected - {"meta"}:
            affected.add("meta")
            
        return affected
    except Exception as e:
        print(f"Error in change detection: {e}")
        return {"core", "media_api", "media_video", "media_image", "media_other", "meta"}

def bump_versions(packages: Set[str]) -> None:
    # Auto-bump individual packages (core, media-api, etc.) but not the root meta package
    for pkg in packages:
        if pkg == "meta":
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
        "media_api": "packages/media_api/pyproject.toml", 
        "media_video": "packages/media_video/pyproject.toml",
        "media_image": "packages/media_image/pyproject.toml",
        "media_other": "packages/media_other/pyproject.toml",
    }
    
    # Get versions for packages that were auto-bumped
    for pkg, path in pyprojects.items():
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