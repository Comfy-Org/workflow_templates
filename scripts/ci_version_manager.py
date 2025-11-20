#!/usr/bin/env python3
import json
import re
import subprocess
from pathlib import Path
from typing import Set, List

ROOT = Path.cwd()

def run_git(args: List[str]) -> str:
    return subprocess.check_output(["git", *args], cwd=ROOT).decode().strip()

def get_changed_packages() -> Set[str]:
    try:
        last_tag = run_git(["tag", "--sort=-version:refname", "--merged", "HEAD"]).split('\n')[0]
        if not last_tag:
            return {"core", "media_api", "media_video", "media_image", "media_other", "meta"}
        
        changed_files = run_git(["diff", f"{last_tag}..HEAD", "--name-only"]).split('\n')
        affected = set()
        
        for file in changed_files:
            if file.startswith("packages/core/"):
                affected.add("core")
            elif file.startswith("packages/media_api/") or "media-api" in file:
                affected.add("media_api")
            elif file.startswith("packages/media_video/") or "media-video" in file:
                affected.add("media_video") 
            elif file.startswith("packages/media_image/") or "media-image" in file:
                affected.add("media_image")
            elif file.startswith("packages/media_other/") or "media-other" in file:
                affected.add("media_other")
            elif file.startswith("packages/meta/") or file == "pyproject.toml":
                affected.add("meta")
            elif file.startswith("templates/") or file == "bundles.json":
                try:
                    bundles = json.loads(Path("bundles.json").read_text())
                    bundle_mapping = {
                        "media-api": "media_api",
                        "media-video": "media_video", 
                        "media-image": "media_image",
                        "media-other": "media_other"
                    }
                    for bundle, pkg in bundle_mapping.items():
                        if bundle in bundles:
                            affected.add(pkg)
                except:
                    pass
        
        if affected & {"core", "media_api", "media_video", "media_image", "media_other"}:
            affected.add("meta")
            
        return affected
    except:
        return {"core", "media_api", "media_video", "media_image", "media_other", "meta"}

def bump_versions(packages: Set[str]) -> None:
    for pkg in packages:
        if pkg == "meta":
            paths = ["packages/meta/pyproject.toml", "pyproject.toml"]
        else:
            paths = [f"packages/{pkg}/pyproject.toml"]
        
        for path_str in paths:
            path = Path(path_str)
            if path.exists():
                text = path.read_text()
                
                def bump_version_match(match):
                    version = match.group(1)
                    parts = version.split('.')
                    parts[2] = str(int(parts[2]) + 1)
                    return f'version = "{".".join(parts)}"'
                
                updated = re.sub(r'version\s*=\s*"([^"]+)"', bump_version_match, text)
                path.write_text(updated)

def update_dependencies() -> None:
    version_re = re.compile(r'^version\s*=\s*"([^"]+)"', re.MULTILINE)
    versions = {}
    
    pyprojects = {
        "core": "packages/core/pyproject.toml",
        "media_api": "packages/media_api/pyproject.toml", 
        "media_video": "packages/media_video/pyproject.toml",
        "media_image": "packages/media_image/pyproject.toml",
        "media_other": "packages/media_other/pyproject.toml",
    }
    
    for pkg, path in pyprojects.items():
        if Path(path).exists():
            text = Path(path).read_text()
            match = version_re.search(text)
            if match:
                versions[pkg] = match.group(1)
    
    for meta_path in ["pyproject.toml", "packages/meta/pyproject.toml"]:
        if Path(meta_path).exists():
            text = Path(meta_path).read_text()
            
            for pkg, version in versions.items():
                pip_name = f"comfyui-workflow-templates-{pkg.replace('_', '-')}"
                pattern = rf'("{re.escape(pip_name)}>=)[^"]+(")'
                replacement = rf'\g<1>{version}\g<2>'
                text = re.sub(pattern, replacement, text)
            
            Path(meta_path).write_text(text)

if __name__ == "__main__":
    packages = get_changed_packages()
    print(f"Detected changed packages: {sorted(packages)}")
    
    if packages:
        bump_versions(packages)
        update_dependencies()
        print(f"Bumped versions for: {sorted(packages)}")
        print(" ".join(sorted(packages)))
    else:
        print("")