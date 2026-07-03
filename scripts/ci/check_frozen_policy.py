#!/usr/bin/env python3
"""
Detect PR changes that would affect frozen legacy media packages or archived templates.

Writes a PR comment when impacts are found. Informational only (exit 0).
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

from paths import REPO_ROOT, VERSION_POLICY_FILE  # noqa: E402
from version_policy import (  # noqa: E402
    archived_index_path,
    get_frozen_bundle_map,
    get_frozen_packages,
    get_pinned_package_versions,
    is_media_template_asset_path,
    load_archived_template_names,
    load_version_policy,
    template_id_from_asset_path,
)

COMMENT_MARKER = "<!-- frozen-policy-check -->"
MAX_ARCHIVED_LISTED = 40
MAX_CHANGE_LINES = 25


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

    bundles_path = REPO_ROOT / "bundles.json"
    bundles = json.loads(bundles_path.read_text(encoding="utf-8")) if bundles_path.exists() else {}
    template_to_bundle: dict[str, str] = {}
    for bundle_name, template_ids in bundles.items():
        for template_id in template_ids:
            template_to_bundle[template_id] = bundle_name

    for file_path in changed:
        for pkg in frozen_packages:
            if file_path.startswith(f"packages/{pkg}/"):
                impacts.append(
                    PolicyImpact(
                        kind="frozen_package_tree",
                        detail=f"Modified `packages/{pkg}/` (`{file_path}`). "
                        "Frozen packages are not auto-bumped or published unless you release manually.",
                    )
                )

        if is_media_template_asset_path(file_path):
            template_id = template_id_from_asset_path(file_path, bundles)
            bundle_name = template_to_bundle.get(template_id)
            if bundle_name in frozen_bundles:
                pkg = frozen_bundles[bundle_name]
                impacts.append(
                    PolicyImpact(
                        kind="frozen_bundle_media_asset",
                        detail=(
                            f"Media asset `{file_path}` belongs to frozen bundle `{bundle_name}` "
                            f"(`{pkg}`). Legacy wheels stay pinned; use `media-assets-01` for new assets."
                        ),
                    )
                )

    archived_changes = [file_path for file_path in changed if file_path.startswith("archived/")]
    if archived_changes:
        workflow_or_asset = [
            f for f in archived_changes if f.startswith("archived/") and not f.startswith("archived/index")
            and not f.endswith("archived_i18n.json")
        ]
        index_changes = [f for f in archived_changes if "/index" in f or f.endswith("archived_i18n.json")]
        if workflow_or_asset:
            impacts.append(
                PolicyImpact(
                    kind="archived_templates",
                    detail=(
                        f"Changed {len(workflow_or_asset)} archived template file(s) under `archived/` "
                        f"(e.g. `{workflow_or_asset[0]}`)."
                    ),
                )
            )
        if index_changes:
            impacts.append(
                PolicyImpact(
                    kind="archived_index",
                    detail=(
                        f"Updated archived hub index/i18n ({len(index_changes)} file(s)). "
                        "Inventory lives in `archived/index.json`."
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
                removed = sorted(old_ids - new_ids)
                if added:
                    impacts.append(
                        PolicyImpact(
                            kind="frozen_bundle_assignment_added",
                            detail=(
                                f"Added to frozen bundle `{bundle_name}` (`{pkg}`): "
                                f"{', '.join(f'`{name}`' for name in added)}. "
                                "New templates should use `media-assets-01`, not legacy media bundles."
                            ),
                        )
                    )
                if removed:
                    impacts.append(
                        PolicyImpact(
                            kind="frozen_bundle_assignment_removed",
                            detail=(
                                f"Removed from frozen bundle `{bundle_name}` (`{pkg}`): "
                                f"{', '.join(f'`{name}`' for name in removed)}. "
                                "This does not bump or update the frozen PyPI wheel."
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
    frozen_packages = get_frozen_packages(policy)
    frozen_bundles = get_frozen_bundle_map(policy)
    pinned = get_pinned_package_versions(REPO_ROOT / "pyproject.toml", frozen_packages)
    archived_names = load_archived_template_names(archived_index_path(policy, REPO_ROOT))
    recommended_bundle = policy.get("recommended_asset_bundle", "media-assets-01")

    lines = [
        COMMENT_MARKER,
        "## Frozen package policy reminder",
        "",
        "This PR touches **frozen legacy media bundles** or **archived templates**. "
        "These packages are excluded from CI auto-bump; pinned versions only change when you release manually.",
        "",
        "### Changes detected in this PR",
    ]
    for impact in impacts[:MAX_CHANGE_LINES]:
        lines.append(f"- {impact.detail}")
    if len(impacts) > MAX_CHANGE_LINES:
        lines.append(f"- … and {len(impacts) - MAX_CHANGE_LINES} more impact(s)")

    lines.extend(["", "### Frozen packages (CI will not auto-bump)", ""])
    lines.append("| Bundle | PyPI package | Pinned version |")
    lines.append("| --- | --- | --- |")
    for bundle_name, pkg in sorted(frozen_bundles.items()):
        pip_name = f"`comfyui-workflow-templates-{pkg.replace('_', '-')}`"
        version = pinned.get(pkg, "—")
        lines.append(f"| `{bundle_name}` | {pip_name} | `{version}` |")

    lines.extend(["", f"### Archived templates ({len(archived_names)} total)", ""])
    if archived_names:
        listed = archived_names[:MAX_ARCHIVED_LISTED]
        lines.append(", ".join(f"`{name}`" for name in listed))
        if len(archived_names) > MAX_ARCHIVED_LISTED:
            lines.append("")
            lines.append(
                f"_…and {len(archived_names) - MAX_ARCHIVED_LISTED} more in "
                f"`{policy.get('archived_templates_index', 'archived/index.json')}`._"
            )
    else:
        lines.append("_No archived templates listed yet._")

    lines.extend(
        [
            "",
            "### What to do",
            f"- Put **new template media assets** in bundle `{recommended_bundle}`, not legacy `media-*` bundles.",
            "- Workflow/index JSON changes bump the `json` package only.",
            "- To intentionally ship legacy media wheels: manually bump `packages/<pkg>/pyproject.toml`, "
            "update root pins, and temporarily remove the package from "
            "`scripts/data/version_policy.json` → `frozen_packages`.",
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
        print("No frozen-package or archived-template policy impacts detected.")
        return 0

    print(f"Detected {len(impacts)} frozen-policy impact(s):")
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
