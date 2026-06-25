#!/usr/bin/env python3
"""
Build a PR comment summarizing template distribution for version-bump releases.

Classifies every template as:
  - pip (local): shipped in comfyui-workflow-templates PyPI packages
  - cloud-only: includeOnDistributions is cloud-only — hub/cloud, not pip
  - custom-nodes: requiresCustomNodes — excluded from pip packages

Also lists templates changed vs a git base ref (PR base branch).
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

_CI_DIR = Path(__file__).resolve().parent
ROOT = _CI_DIR.parents[1]
if str(_CI_DIR) not in sys.path:
    sys.path.insert(0, str(_CI_DIR))

_sync_dir = ROOT / "scripts" / "sync"
if str(_sync_dir) not in sys.path:
    sys.path.insert(0, str(_sync_dir))

from sync_bundles import LOCAL_DISTRIBUTIONS, get_pip_excluded_template_names  # noqa: E402

COMMENT_MARKER = "<!-- release-distribution-report -->"


@dataclass(frozen=True)
class TemplateInfo:
    name: str
    title: str
    bundle: str | None
    category: str
    pip_status: str  # pip | cloud-only | custom-nodes
    distributions: list[str]
    requires_custom_nodes: list[str]


def load_templates() -> list[TemplateInfo]:
    index_path = ROOT / "templates" / "index.json"
    bundles_path = ROOT / "bundles.json"
    with index_path.open(encoding="utf-8") as f:
        categories = json.load(f)
    bundle_map: dict[str, str] = {}
    if bundles_path.exists():
        raw_bundles = json.loads(bundles_path.read_text(encoding="utf-8"))
        for bundle_name, names in raw_bundles.items():
            for name in names:
                bundle_map[name] = bundle_name

    excluded = get_pip_excluded_template_names()
    templates: list[TemplateInfo] = []
    for category in categories:
        cat_title = category.get("title", category.get("moduleName", "Unknown"))
        for tmpl in category.get("templates", []):
            name = tmpl["name"]
            distributions = tmpl.get("includeOnDistributions") or []
            custom_nodes = tmpl.get("requiresCustomNodes") or []
            if name in excluded:
                if distributions and not any(d in LOCAL_DISTRIBUTIONS for d in distributions):
                    pip_status = "cloud-only"
                else:
                    pip_status = "custom-nodes"
            else:
                pip_status = "pip"
            templates.append(
                TemplateInfo(
                    name=name,
                    title=tmpl.get("title", name),
                    bundle=bundle_map.get(name),
                    category=cat_title,
                    pip_status=pip_status,
                    distributions=list(distributions),
                    requires_custom_nodes=list(custom_nodes),
                )
            )
    return templates


def pip_status_label(status: str) -> str:
    return {
        "pip": "✅ Pip / local",
        "cloud-only": "☁️ Cloud only (not pip)",
        "custom-nodes": "🔌 Custom nodes (not pip)",
    }[status]


def changed_template_names(base_ref: str) -> set[str]:
    try:
        out = subprocess.check_output(
            ["git", "diff", "--name-only", f"{base_ref}...HEAD", "--", "templates/"],
            cwd=ROOT,
            text=True,
        )
    except subprocess.CalledProcessError:
        return set()
    names: set[str] = set()
    for line in out.splitlines():
        line = line.strip()
        if not line:
            continue
        path = Path(line)
        if path.name.startswith("index"):
            continue
        if path.suffix == ".json":
            names.add(path.stem.split("-")[0])
        elif path.suffix == ".webp":
            names.add(path.name.rsplit("-", 1)[0])
    return names


def build_markdown(
    *,
    new_version: str,
    base_version: str,
    base_ref: str,
    title: str,
) -> str:
    templates = load_templates()
    by_name = {t.name: t for t in templates}
    changed = changed_template_names(base_ref)

    counts = {"pip": 0, "cloud-only": 0, "custom-nodes": 0}
    for t in templates:
        counts[t.pip_status] += 1

    lines = [
        f"## {title}",
        "",
        f"**Meta version:** `{base_version}` → `{new_version}` (vs PR base branch)",
        "",
        "### Catalog summary",
        "",
        "| Destination | Count | Meaning |",
        "| --- | ---: | --- |",
        f"| ✅ Pip / local | {counts['pip']} | Shipped in `comfyui-workflow-templates` PyPI packages |",
        f"| ☁️ Cloud only | {counts['cloud-only']} | Hub / Comfy Cloud — excluded from pip |",
        f"| 🔌 Custom nodes | {counts['custom-nodes']} | Requires custom nodes — excluded from pip |",
        f"| **Total** | **{len(templates)}** | |",
        "",
    ]

    if changed:
        lines.extend(
            [
                "### Templates changed in this PR",
                "",
                "| Template | Title | Bundle | Distribution |",
                "| --- | --- | --- | --- |",
            ]
        )
        for name in sorted(changed):
            info = by_name.get(name)
            if info is None:
                lines.append(f"| `{name}` | — | — | ⚠️ Not in index.json |")
                continue
            bundle = info.bundle or "—"
            lines.append(
                f"| `{info.name}` | {info.title} | `{bundle}` | {pip_status_label(info.pip_status)} |"
            )
        lines.append("")
    else:
        lines.extend(
            [
                "### Templates changed in this PR",
                "",
                "_No template file changes detected vs PR base (version-only bump)._",
                "",
            ]
        )

    changed_not_pip = sorted(
        n
        for n in changed
        if (t := by_name.get(n)) and t.pip_status in {"cloud-only", "custom-nodes"}
    )
    if changed_not_pip:
        lines.extend(
            [
                "### ⚠️ Changed templates **not** in pip release",
                "",
                "These templates were touched in this PR but will **not** ship via PyPI:",
                "",
            ]
        )
        for name in changed_not_pip:
            info = by_name[name]
            lines.append(f"- `{info.name}` — {pip_status_label(info.pip_status)}")
        lines.append("")

    lines.extend(
        [
            "<details>",
            "<summary>Full cloud-only template list</summary>",
            "",
        ]
    )
    cloud_only = sorted(t.name for t in templates if t.pip_status == "cloud-only")
    if cloud_only:
        lines.extend(f"- `{n}`" for n in cloud_only)
    else:
        lines.append("_None_")
    lines.extend(["", "</details>", ""])

    lines.extend(
        [
            "<details>",
            "<summary>Full custom-nodes (pip excluded) template list</summary>",
            "",
        ]
    )
    custom = sorted(t.name for t in templates if t.pip_status == "custom-nodes")
    if custom:
        lines.extend(f"- `{n}`" for n in custom)
    else:
        lines.append("_None_")
    lines.extend(["", "</details>", ""])

    lines.append(
        "<sub>Pip exclusion follows "
        "`scripts/sync/sync_bundles.py` (cloud-only + requiresCustomNodes). "
        "Posted only when meta version differs from the PR base branch.</sub>"
    )
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--new-version", required=True)
    parser.add_argument("--base-version", required=True)
    parser.add_argument("--base-ref", required=True, help="Git ref for PR base (e.g. merge-base SHA)")
    parser.add_argument(
        "--comment-file",
        type=Path,
        help="Write PR comment body (with HTML marker) to this file",
    )
    parser.add_argument(
        "--title",
        default="Release distribution summary (version bump PR)",
    )
    args = parser.parse_args()

    body = build_markdown(
        new_version=args.new_version,
        base_version=args.base_version,
        base_ref=args.base_ref,
        title=args.title,
    )
    print(body)

    if args.comment_file:
        args.comment_file.write_text(COMMENT_MARKER + "\n" + body + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
