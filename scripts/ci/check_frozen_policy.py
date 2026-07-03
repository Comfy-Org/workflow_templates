#!/usr/bin/env python3
"""
Detect PR changes that touch templates assigned to frozen legacy media bundles.

See scripts/docs/frozen_bundles.md
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

_LIB_DIR = Path(__file__).resolve().parent.parent / "lib"
if str(_LIB_DIR) not in sys.path:
    sys.path.insert(0, str(_LIB_DIR))

from paths import (  # noqa: E402
    FROZEN_BUNDLE_INVENTORY_FILE,
    REPO_ROOT,
    VERSION_POLICY_FILE,
)
from version_policy import (  # noqa: E402
    build_frozen_bundle_inventory,
    frozen_template_membership,
    get_frozen_bundle_map,
    get_frozen_packages,
    is_media_template_asset_path,
    is_workflow_template_path,
    load_bundles,
    load_frozen_bundle_inventory,
    load_version_policy,
    template_id_from_asset_path,
)

COMMENT_MARKER = "<!-- frozen-policy-check -->"
MAX_TEMPLATES_LISTED = 30
MAX_CHANGE_LINES = 20


@dataclass(frozen=True)
class PolicyImpact:
    kind: str
    detail: str


def run_git(args: list[str]) -> str:
    return subprocess.check_output(["git", *args], cwd=REPO_ROOT).decode().strip()


def changed_files_since(base_ref: str) -> list[str]:
    output = run_git(["diff", "--name-only", f"{base_ref}..HEAD"])
    return [line.strip() for line in output.splitlines() if line.strip()]


def read_json_at_ref(path: str, ref: str) -> dict | list | None:
    try:
        run_git(["cat-file", "-e", f"{ref}:{path}"])
    except subprocess.CalledProcessError:
        return None
    raw = run_git(["show", f"{ref}:{path}"])
    return json.loads(raw)


def detect_impacts(base_ref: str) -> list[PolicyImpact]:
    policy = load_version_policy(VERSION_POLICY_FILE)
    frozen_packages = get_frozen_packages(policy)
    frozen_bundles = get_frozen_bundle_map(policy)
    if not frozen_packages:
        return []

    impacts: list[PolicyImpact] = []
    changed = changed_files_since(base_ref)
    if not changed:
        return []

    bundles = load_bundles(REPO_ROOT / "bundles.json")
    inventory = load_frozen_bundle_inventory(FROZEN_BUNDLE_INVENTORY_FILE)
    expected_inventory = build_frozen_bundle_inventory(
        bundles, policy, REPO_ROOT / "pyproject.toml"
    )
    if inventory.get("bundles") != expected_inventory.get("bundles"):
        impacts.append(
            PolicyImpact(
                kind="inventory_stale",
                detail=(
                    "`scripts/data/frozen_bundle_inventory.json` is out of date with `bundles.json`. "
                    "Run `python scripts/sync/sync_frozen_inventory.py`."
                ),
            )
        )

    membership = frozen_template_membership(expected_inventory)

    for file_path in changed:
        for pkg in frozen_packages:
            if file_path.startswith(f"packages/{pkg}/"):
                impacts.append(
                    PolicyImpact(
                        kind="frozen_package_tree",
                        detail=(
                            f"Modified frozen package tree `packages/{pkg}/` (`{file_path}`). "
                            "CI will not auto-bump or publish this wheel."
                        ),
                    )
                )

        template_id: str | None = None
        if is_workflow_template_path(file_path):
            template_id = Path(file_path).stem
        elif is_media_template_asset_path(file_path):
            template_id = template_id_from_asset_path(file_path, bundles)

        if template_id and template_id in membership:
            bundle_name = membership[template_id]
            pkg = frozen_bundles[bundle_name]
            file_kind = "workflow JSON" if is_workflow_template_path(file_path) else "media asset"
            impacts.append(
                PolicyImpact(
                    kind="frozen_bundle_template_file",
                    detail=(
                        f"Changed {file_kind} `{file_path}` for template `{template_id}`, "
                        f"which is assigned to frozen bundle `{bundle_name}` (`{pkg}`). "
                        f"Legacy `{pkg}` stays pinned; put new work in `{policy.get('recommended_asset_bundle', 'media-assets-01')}`."
                    ),
                )
            )

    if "bundles.json" in changed:
        old_bundles = read_json_at_ref("bundles.json", base_ref)
        if isinstance(old_bundles, dict):
            for bundle_name, pkg in frozen_bundles.items():
                old_ids = set(old_bundles.get(bundle_name, []))
                new_ids = set(bundles.get(bundle_name, []))
                added = sorted(new_ids - old_ids)
                if added:
                    impacts.append(
                        PolicyImpact(
                            kind="frozen_bundle_assignment_added",
                            detail=(
                                f"Added to frozen bundle `{bundle_name}` (`{pkg}`): "
                                f"{', '.join(f'`{name}`' for name in added)}. "
                                f"Use `{policy.get('recommended_asset_bundle', 'media-assets-01')}` for new templates instead."
                            ),
                        )
                    )

    if "pyproject.toml" in changed:
        old_text = run_git(["show", f"{base_ref}:pyproject.toml"])
        new_text = (REPO_ROOT / "pyproject.toml").read_text(encoding="utf-8")
        for pkg in sorted(frozen_packages):
            pip_name = f"comfyui-workflow-templates-{pkg.replace('_', '-')}"
            old_match = re.search(rf'"{re.escape(pip_name)}==([0-9.]+)"', old_text)
            new_match = re.search(rf'"{re.escape(pip_name)}==([0-9.]+)"', new_text)
            old_ver = old_match.group(1) if old_match else None
            new_ver = new_match.group(1) if new_match else None
            if old_ver != new_ver:
                impacts.append(
                    PolicyImpact(
                        kind="frozen_pin_changed",
                        detail=(
                            f"Root pin for `{pip_name}` changed: "
                            f"`{old_ver or 'missing'}` → `{new_ver or 'missing'}`."
                        ),
                    )
                )

    deduped: list[PolicyImpact] = []
    seen: set[tuple[str, str]] = set()
    for impact in impacts:
        key = (impact.kind, impact.detail)
        if key not in seen:
            seen.add(key)
            deduped.append(impact)
    return deduped


def build_comment(impacts: list[PolicyImpact]) -> str:
    policy = load_version_policy(VERSION_POLICY_FILE)
    bundles = load_bundles(REPO_ROOT / "bundles.json")
    inventory = build_frozen_bundle_inventory(
        bundles, policy, REPO_ROOT / "pyproject.toml"
    )
    recommended_bundle = policy.get("recommended_asset_bundle", "media-assets-01")
    inventory_path = policy.get(
        "frozen_bundle_inventory", "scripts/data/frozen_bundle_inventory.json"
    )

    lines = [
        COMMENT_MARKER,
        "## Frozen bundle policy reminder",
        "",
        "This PR changes files tied to **frozen legacy media bundles** in `bundles.json`. "
        "Those PyPI packages are pinned and excluded from CI auto-bump.",
        "",
        "### Changes detected in this PR",
    ]
    for impact in impacts[:MAX_CHANGE_LINES]:
        lines.append(f"- {impact.detail}")
    if len(impacts) > MAX_CHANGE_LINES:
        lines.append(f"- … and {len(impacts) - MAX_CHANGE_LINES} more impact(s)")

    lines.extend(
        [
            "",
            f"### Frozen bundle inventory (from `{inventory_path}`)",
            "",
        ]
    )
    for bundle_name in sorted(inventory.get("bundles", {})):
        entry = inventory["bundles"][bundle_name]
        pkg = entry["package"]
        version = entry.get("pinned_version") or "—"
        templates = entry.get("templates", [])
        lines.append(
            f"**`{bundle_name}`** → `{pkg}` @ `{version}` — {len(templates)} template(s)"
        )
        if templates:
            listed = templates[:MAX_TEMPLATES_LISTED]
            lines.append(", ".join(f"`{name}`" for name in listed))
            if len(templates) > MAX_TEMPLATES_LISTED:
                lines.append(
                    f"_…and {len(templates) - MAX_TEMPLATES_LISTED} more in `{inventory_path}`._"
                )
        lines.append("")

    lines.extend(
        [
            "### What to do",
            f"- Assign **new** templates to `{recommended_bundle}`, not `media-api` / `media-image` / `media-video` / `media-other`.",
            "- Workflow JSON still ships via the `json` package; legacy media wheels do not update automatically.",
            "- After editing frozen bundle assignments in `bundles.json`, run "
            "`python scripts/sync/sync_frozen_inventory.py`.",
            "- To intentionally release a legacy media wheel: see `scripts/docs/frozen_bundles.md`.",
            "",
            "<sub>Generated by `scripts/ci/check_frozen_policy.py`</sub>",
        ]
    )
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-ref", required=True, help="Git ref for the PR base commit (SHA or branch)")
    parser.add_argument("--comment-file", type=Path, help="Write PR comment body when impacts are found")
    parser.add_argument("--github-summary", action="store_true", help="Write report to GITHUB_STEP_SUMMARY")
    args = parser.parse_args()

    impacts = detect_impacts(args.base_ref)
    if not impacts:
        print("No frozen-bundle policy impacts detected.")
        return 0

    print(f"Detected {len(impacts)} frozen-bundle impact(s):")
    for impact in impacts:
        print(f"  [{impact.kind}] {impact.detail}")

    body = build_comment(impacts)
    if args.comment_file:
        args.comment_file.write_text(body, encoding="utf-8")
        print(f"Wrote PR comment to {args.comment_file}")

    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if args.github_summary and summary_path:
        Path(summary_path).write_text(body.replace(COMMENT_MARKER, "").strip() + "\n", encoding="utf-8")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
