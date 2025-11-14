#!/usr/bin/env python3
"""Auto-bump package versions when relevant files change.

Usage examples:
    python3 scripts/bump_versions.py                  # uses latest git tag as base
    python3 scripts/bump_versions.py --base-ref v0.3.0
    python3 scripts/bump_versions.py --dry-run

The script compares the working tree (HEAD) with the previous release tag,
figures out which packages/assets changed, bumps the patch version for those
packages, and keeps dependency constraints in sync.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path
import os
from typing import Dict, Iterable, List, Mapping, Set

ROOT = Path(
    os.environ.get("WORKFLOW_TEMPLATES_ROOT", Path(__file__).resolve().parents[1])
)
BUNDLES_FILE = ROOT / "bundles.json"

def run_git(args: List[str]) -> str:
    return (
        subprocess.check_output(["git", *args], cwd=ROOT, stderr=subprocess.PIPE)
        .decode()
        .strip()
    )


def default_base_ref() -> str:
    try:
        return run_git(["describe", "--tags", "--abbrev=0"])
    except subprocess.CalledProcessError as exc:  # pragma: no cover - defensive
        raise SystemExit("Unable to determine base tag. Pass --base-ref explicitly.") from exc


@dataclass
class PackageConfig:
    name: str
    paths: List[str]
    pyproject_paths: List[Path]
    pip_name: str


PACKAGE_CONFIGS: Dict[str, PackageConfig] = {
    "core": PackageConfig(
        name="core",
        paths=["packages/core"],
        pyproject_paths=[ROOT / "packages/core/pyproject.toml"],
        pip_name="comfyui-workflow-templates-core",
    ),
    "media_api": PackageConfig(
        name="media_api",
        paths=["packages/media_api"],
        pyproject_paths=[ROOT / "packages/media_api/pyproject.toml"],
        pip_name="comfyui-workflow-templates-media-api",
    ),
    "media_video": PackageConfig(
        name="media_video",
        paths=["packages/media_video"],
        pyproject_paths=[ROOT / "packages/media_video/pyproject.toml"],
        pip_name="comfyui-workflow-templates-media-video",
    ),
    "media_image": PackageConfig(
        name="media_image",
        paths=["packages/media_image"],
        pyproject_paths=[ROOT / "packages/media_image/pyproject.toml"],
        pip_name="comfyui-workflow-templates-media-image",
    ),
    "media_other": PackageConfig(
        name="media_other",
        paths=["packages/media_other"],
        pyproject_paths=[ROOT / "packages/media_other/pyproject.toml"],
        pip_name="comfyui-workflow-templates-media-other",
    ),
    "meta": PackageConfig(
        name="meta",
        paths=["packages/meta", "pyproject.toml"],
        pyproject_paths=[
            ROOT / "packages/meta/pyproject.toml",
            ROOT / "pyproject.toml",
        ],
        pip_name="comfyui-workflow-templates",
    ),
}

BUNDLE_TO_PACKAGE = {
    "media-api": "media_api",
    "media-video": "media_video",
    "media-image": "media_image",
    "media-other": "media_other",
}

VERSION_RE = re.compile(r"^(version\s*=\s*)\"(\d+\.\d+\.\d+)\"", re.MULTILINE)
def dependency_regex(pip_name: str) -> re.Pattern[str]:
    escaped = re.escape(pip_name)
    return re.compile(rf'("{escaped}>=)(\d+\.\d+\.\d+)(")')


def load_versions() -> Dict[str, str]:
    versions = {}
    for pkg, cfg in PACKAGE_CONFIGS.items():
        text = cfg.pyproject_paths[0].read_text()
        match = VERSION_RE.search(text)
        if not match:  # pragma: no cover - file corruption safeguard
            raise SystemExit(f"Unable to find version in {cfg.pyproject_paths[0]}")
        versions[pkg] = match.group(2)
    return versions


def bump_patch(version: str) -> str:
    major, minor, patch = version.split(".")
    return f"{major}.{minor}.{int(patch) + 1}"


def git_changed_files(base_ref: str) -> List[str]:
    if not base_ref:
        return []
    out = run_git(["diff", f"{base_ref}..HEAD", "--name-only"])
    return [line.strip() for line in out.splitlines() if line.strip()]


def load_bundles_from_git(ref: str) -> Mapping[str, List[str]]:
    try:
        raw = run_git(["show", f"{ref}:bundles.json"])
        return json.loads(raw)
    except subprocess.CalledProcessError:
        return {}


def template_bundle_map(bundles: Mapping[str, Iterable[str]]) -> Dict[str, str]:
    mapping = {}
    for bundle, template_ids in bundles.items():
        pkg = BUNDLE_TO_PACKAGE.get(bundle)
        if not pkg:
            continue
        for template_id in template_ids:
            mapping[template_id] = pkg
    return mapping


def detect_bundle_changes(base_ref: str) -> Set[str]:
    if not base_ref:
        return set()
    head_bundles = json.loads(BUNDLES_FILE.read_text())
    base_bundles = load_bundles_from_git(base_ref)
    head_map = template_bundle_map(head_bundles)
    base_map = template_bundle_map(base_bundles)

    changed = set()
    bundle_keys = set(head_bundles.keys()) | set(base_bundles.keys())
    for bundle in bundle_keys:
        head_set = set(head_bundles.get(bundle, []))
        base_set = set(base_bundles.get(bundle, []))
        delta = head_set.symmetric_difference(base_set)
        for template_id in delta:
            pkg = head_map.get(template_id) or base_map.get(template_id)
            if pkg:
                changed.add(pkg)
    return changed


def detect_template_asset_changes(changed_files: Iterable[str]) -> Set[str]:
    head_map = template_bundle_map(json.loads(BUNDLES_FILE.read_text()))
    template_ids_sorted = sorted(head_map.keys(), key=len, reverse=True)
    affected = set()
    for rel_path in changed_files:
        if not rel_path.startswith("templates/"):
            continue
        filename = Path(rel_path).name
        for template_id in template_ids_sorted:
            if filename.startswith(template_id):
                affected.add(head_map[template_id])
                break
    return affected


def packages_changed_from_paths(changed_files: Iterable[str]) -> Set[str]:
    affected = set()
    for rel_path in changed_files:
        for pkg, cfg in PACKAGE_CONFIGS.items():
            for path in cfg.paths:
                if path.endswith(".toml"):
                    if rel_path == path:
                        affected.add(pkg)
                else:
                    if rel_path == path or rel_path.startswith(f"{path}/"):
                        affected.add(pkg)
    return affected


def packages_to_bump(base_ref: str) -> Set[str]:
    changed = git_changed_files(base_ref)
    affected = packages_changed_from_paths(changed)
    affected |= detect_template_asset_changes(changed)
    affected |= detect_bundle_changes(base_ref)

    # If any of the component bundles changed, make sure meta gets bumped too
    if affected & {"core", "media_api", "media_image", "media_other", "media_video"}:
        affected.add("meta")
    return affected


def write_version(path: Path, new_version: str) -> None:
    text = path.read_text()
    updated, count = VERSION_RE.subn(rf'\1"{new_version}"', text, count=1)
    if count == 0:  # pragma: no cover - guard
        raise SystemExit(f"Failed to update version in {path}")
    path.write_text(updated)


def update_dependencies(pyproject_path: Path, versions: Mapping[str, str]) -> None:
    text = pyproject_path.read_text()
    for pkg, cfg in PACKAGE_CONFIGS.items():
        pattern = dependency_regex(cfg.pip_name)
        text = pattern.sub(rf"\g<1>{versions[pkg]}\g<3>", text)
    pyproject_path.write_text(text)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Bump package versions based on git diff")
    parser.add_argument(
        "--base-ref",
        help="Git ref/tag to diff against (defaults to last annotated tag)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show planned bumps without modifying files",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    base_ref = args.base_ref or default_base_ref()
    affected_packages = packages_to_bump(base_ref)

    if not affected_packages:
        print(f"No package changes detected relative to {base_ref}.")
        return

    current_versions = load_versions()
    next_versions = current_versions.copy()
    for pkg in affected_packages:
        next_versions[pkg] = bump_patch(current_versions[pkg])

    print(f"Base reference: {base_ref}")
    for pkg in sorted(affected_packages):
        print(f" - {pkg}: {current_versions[pkg]} -> {next_versions[pkg]}")

    if args.dry_run:
        print("Dry run requested; no files updated.")
        return

    for pkg in affected_packages:
        for pyproject in PACKAGE_CONFIGS[pkg].pyproject_paths:
            write_version(pyproject, next_versions[pkg])

    # Keep root/meta dependency constraints in sync with actual versions
    update_dependencies(ROOT / "pyproject.toml", next_versions)
    update_dependencies(ROOT / "packages/meta/pyproject.toml", next_versions)

    print("Updated pyproject files. Don't forget to commit the changes.")


if __name__ == "__main__":
    main()
