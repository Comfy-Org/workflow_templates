#!/usr/bin/env python3
"""
Check PyPI project storage quota (~10 GB per project) and local bundle sizes
(per-file upload limit ~100 MB).

Package list is auto-discovered from:
  - root pyproject.toml (meta)
  - packages/*/pyproject.toml (sub-packages / extensions)

Thresholds live in .github/pypi-packages.json (extensible via extra_packages).
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path

from comfyui_reference import (
    build_comfyui_referenced_versions,
    canonical_pypi_name,
    collect_comfyui_meta_pins_auto,
    delete_candidates_for_package,
    ver_key,
)

_CI_DIR = Path(__file__).resolve().parent
if str(_CI_DIR) not in sys.path:
    sys.path.insert(0, str(_CI_DIR))

ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = ROOT / ".github" / "pypi-packages.json"
PYPROJECT_NAME_RE = re.compile(r'^name\s*=\s*"([^"]+)"', re.MULTILINE)


@dataclass
class PackageSpec:
    package_id: str
    pypi_name: str
    local_dir: Path | None
    local_version: str | None


@dataclass
class QuotaResult:
    spec: PackageSpec
    pypi_latest: str | None
    pypi_version_count: int
    pypi_file_count: int
    pypi_total_bytes: int
    pypi_missing: bool
    local_bytes: int | None
    quota_status: str
    local_status: str


@dataclass
class PackageReferenceInfo:
    pypi_name: str
    referenced_versions: set[str]
    keep: list[tuple[str, int]]
    delete_candidates: list[tuple[str, int]]
    reclaimable_bytes: int


@dataclass
class ComfyUIReferenceReport:
    enabled: bool
    error: str | None = None
    pins_source: str | None = None
    pins_cache_file: str | None = None
    pins_cache_changed: bool = False
    repo_path: Path | None = None
    meta_pins: set[str] = field(default_factory=set)
    current_meta: str | None = None
    current_subdeps: dict[str, str] = field(default_factory=dict)
    packages: list[PackageReferenceInfo] = field(default_factory=list)
    total_reclaimable_bytes: int = 0


def load_config() -> dict:
    with CONFIG_PATH.open(encoding="utf-8") as f:
        return json.load(f)


def parse_pyproject_name_version(path: Path) -> tuple[str, str]:
    text = path.read_text(encoding="utf-8")
    name_match = PYPROJECT_NAME_RE.search(text)
    if not name_match:
        raise ValueError(f"Could not parse name from {path}")
    name = name_match.group(1)
    version_match = re.search(r'^version\s*=\s*"([^"]+)"', text, re.MULTILINE)
    version = version_match.group(1) if version_match else "unknown"
    return name, version


def find_local_data_dir(package_dir: Path, project_name: str) -> Path | None:
    src = package_dir / "src"
    if not src.is_dir():
        return None
    underscored = project_name.replace("-", "_")
    candidate = src / underscored
    if candidate.is_dir():
        return candidate
    for child in src.iterdir():
        if child.is_dir():
            return child
    return None


def discover_packages() -> list[PackageSpec]:
    specs: list[PackageSpec] = []

    root_py = ROOT / "pyproject.toml"
    if root_py.exists():
        name, version = parse_pyproject_name_version(root_py)
        specs.append(
            PackageSpec(
                package_id="meta",
                pypi_name=name,
                local_dir=None,
                local_version=version,
            )
        )

    packages_root = ROOT / "packages"
    if packages_root.is_dir():
        for pkg_dir in sorted(packages_root.iterdir()):
            pyproject = pkg_dir / "pyproject.toml"
            if not pyproject.is_file():
                continue
            name, version = parse_pyproject_name_version(pyproject)
            specs.append(
                PackageSpec(
                    package_id=pkg_dir.name,
                    pypi_name=name,
                    local_dir=find_local_data_dir(pkg_dir, name),
                    local_version=version,
                )
            )

    config = load_config()
    for extra in config.get("extra_packages", []):
        specs.append(
            PackageSpec(
                package_id=extra["id"],
                pypi_name=extra["pypi_name"],
                local_dir=(ROOT / extra["local_dir"]).resolve() if extra.get("local_dir") else None,
                local_version=extra.get("local_version"),
            )
        )

    # De-duplicate by pypi_name (extra_packages may override)
    by_name: dict[str, PackageSpec] = {}
    for spec in specs:
        by_name[spec.pypi_name] = spec
    return list(by_name.values())


def parse_package_ids(raw: str | None) -> set[str] | None:
    if not raw or not raw.strip():
        return None
    return {part.strip() for part in raw.replace(" ", ",").split(",") if part.strip()}


def resolve_release_package_ids(base_ref: str | None = None) -> set[str]:
    """Packages whose version differs from base_ref (via ci_version_manager)."""
    cmd = [sys.executable, str(ROOT / "scripts" / "ci" / "ci_version_manager.py"), "--list-publish-packages"]
    if base_ref:
        cmd.extend(["--base-ref", base_ref])
    try:
        output = subprocess.check_output(cmd, cwd=ROOT, text=True, stderr=subprocess.DEVNULL).strip()
    except subprocess.CalledProcessError:
        return set()
    return parse_package_ids(output) or set()


def filter_package_specs(specs: list[PackageSpec], package_ids: set[str] | None) -> list[PackageSpec]:
    if not package_ids:
        return specs
    filtered = [spec for spec in specs if spec.package_id in package_ids]
    missing = package_ids - {spec.package_id for spec in filtered}
    if missing:
        print(
            f"Warning: unknown package id(s) ignored: {', '.join(sorted(missing))}",
            file=sys.stderr,
        )
    return filtered


def fetch_pypi_release_stats(pypi_name: str) -> tuple[str | None, int, int, int, bool]:
    url = f"https://pypi.org/pypi/{pypi_name}/json"
    try:
        with urllib.request.urlopen(url, timeout=30) as response:
            data = json.load(response)
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return None, 0, 0, 0, True
        raise
    except urllib.error.URLError:
        return None, 0, 0, 0, True

    total = 0
    file_count = 0
    for files in data.get("releases", {}).values():
        for file_info in files:
            total += int(file_info.get("size", 0))
            file_count += 1
    latest = data.get("info", {}).get("version")
    version_count = len(data.get("releases", {}))
    return latest, version_count, file_count, total, False


def dir_size_bytes(path: Path) -> int:
    return sum(f.stat().st_size for f in path.rglob("*") if f.is_file())


def classify_quota(used_bytes: int, quota_bytes: int, warn_pct: float, crit_pct: float, fail_pct: float) -> str:
    if quota_bytes <= 0:
        return "UNKNOWN"
    pct = used_bytes / quota_bytes * 100
    if pct >= fail_pct:
        return "FAIL"
    if pct >= crit_pct:
        return "CRITICAL"
    if pct >= warn_pct:
        return "WARNING"
    return "OK"


def classify_local(size_bytes: int, warn_mb: float, crit_mb: float, limit_mb: float) -> str:
    size_mb = size_bytes / (1024 * 1024)
    if size_mb >= crit_mb:
        return "CRITICAL"
    if size_mb >= warn_mb:
        return "WARNING"
    return "OK"


def status_emoji(status: str) -> str:
    return {
        "OK": "🟢",
        "WARNING": "🟡",
        "CRITICAL": "🔴",
        "FAIL": "⛔",
        "MISSING": "⚪",
        "UNKNOWN": "❔",
    }.get(status, "❔")


def format_bytes(num: int) -> str:
    if num >= 1024**3:
        return f"{num / 1024**3:.2f} GB"
    if num >= 1024**2:
        return f"{num / 1024**2:.1f} MB"
    if num >= 1024:
        return f"{num / 1024:.1f} KB"
    return f"{num} B"


def run_checks(package_ids: set[str] | None = None) -> tuple[list[QuotaResult], dict]:
    config = load_config()
    quota_gb = float(config.get("project_quota_gb", 10))
    quota_bytes = int(quota_gb * 1024**3)
    warn_pct = float(config.get("warn_quota_percent", 80))
    crit_pct = float(config.get("critical_quota_percent", 90))
    fail_pct = float(config.get("fail_quota_percent", 95))
    per_file_warn = float(config.get("per_file_warn_mb", 85))
    per_file_crit = float(config.get("per_file_critical_mb", 95))
    per_file_limit = float(config.get("per_file_limit_mb", 100))

    specs = filter_package_specs(discover_packages(), package_ids)
    if package_ids:
        print(
            f"Checking {len(specs)} package(s): {', '.join(sorted(package_ids))}",
            file=sys.stderr,
        )

    results: list[QuotaResult] = []
    for spec in specs:
        latest, version_count, file_count, total_bytes, missing = fetch_pypi_release_stats(spec.pypi_name)
        if missing:
            quota_status = "MISSING"
        else:
            quota_status = classify_quota(total_bytes, quota_bytes, warn_pct, crit_pct, fail_pct)

        local_bytes: int | None = None
        local_status = "OK"
        if spec.local_dir and spec.local_dir.is_dir():
            local_bytes = dir_size_bytes(spec.local_dir)
            local_status = classify_local(local_bytes, per_file_warn, per_file_crit, per_file_limit)

        results.append(
            QuotaResult(
                spec=spec,
                pypi_latest=latest,
                pypi_version_count=version_count,
                pypi_file_count=file_count,
                pypi_total_bytes=total_bytes,
                pypi_missing=missing,
                local_bytes=local_bytes,
                quota_status=quota_status,
                local_status=local_status,
            )
        )

    results.sort(key=lambda r: (r.quota_status != "OK", -r.pypi_total_bytes))
    meta = {
        "quota_gb": quota_gb,
        "warn_pct": warn_pct,
        "crit_pct": crit_pct,
        "fail_pct": fail_pct,
        "per_file_warn_mb": per_file_warn,
        "per_file_crit_mb": per_file_crit,
        "per_file_limit_mb": per_file_limit,
    }
    return results, meta


def run_comfyui_reference_check(
    results: list[QuotaResult],
    config: dict,
    *,
    enabled: bool,
    repo_path_override: str | None,
) -> ComfyUIReferenceReport:
    ref_cfg = dict(config.get("comfyui_reference_check") or {})
    report = ComfyUIReferenceReport(enabled=enabled and bool(ref_cfg.get("enabled", True)))
    if not report.enabled:
        return report

    cache_rel = ref_cfg.get("pins_cache_file")
    if cache_rel:
        report.pins_cache_file = cache_rel

    meta_pins, source, cache_changed = collect_comfyui_meta_pins_auto(
        ref_cfg,
        os.environ,
        repo_path_override=str(repo_path_override) if repo_path_override else None,
        repo_root=ROOT,
    )
    report.pins_source = source
    report.pins_cache_changed = cache_changed
    report.meta_pins = meta_pins

    if not report.meta_pins:
        report.error = (
            "No comfyui-workflow-templates pins found. "
            "CI uses GitHub API (commits?path=requirements.txt); "
            "locally set COMFYUI_REPO_PATH or check github_repo / default_branch."
        )
        return report

    referenced_map, _, current_subdeps = build_comfyui_referenced_versions(report.meta_pins)
    report.current_subdeps = current_subdeps
    if report.meta_pins:
        report.current_meta = max(report.meta_pins, key=ver_key)

    track = ref_cfg.get("track_packages") or []
    if track:
        track_names = {canonical_pypi_name(n) for n in track}
    else:
        track_names = {canonical_pypi_name(r.spec.pypi_name) for r in results}

    list_candidates = bool(ref_cfg.get("list_delete_candidates", True))
    max_listed = int(ref_cfg.get("max_delete_candidates_listed", 40))

    for pypi_name in sorted(track_names):
        ref_versions = referenced_map.get(pypi_name, set())
        if pypi_name == "comfyui-workflow-templates":
            ref_versions = ref_versions | referenced_map.get("comfyui_workflow_templates", set())
        keep, delete, reclaimable = delete_candidates_for_package(pypi_name, ref_versions)
        if not keep and not delete:
            continue
        pkg_info = PackageReferenceInfo(
            pypi_name=pypi_name,
            referenced_versions=ref_versions,
            keep=keep,
            delete_candidates=delete if list_candidates else [],
            reclaimable_bytes=reclaimable,
        )
        report.packages.append(pkg_info)
        report.total_reclaimable_bytes += reclaimable

    return report


def build_comfyui_reference_markdown(report: ComfyUIReferenceReport, max_listed: int) -> list[str]:
    if not report.enabled:
        return []

    lines = [
        "",
        "### ComfyUI reference (safe to delete vs keep)",
        "",
        "Versions **referenced** = ever pinned in "
        "[ComfyUI requirements.txt](https://github.com/Comfy-Org/ComfyUI/blob/master/requirements.txt) "
        "via `comfyui-workflow-templates==…` and that meta release’s sub-package pins. "
        "Other PyPI releases are **not** in ComfyUI’s install chain and are usual deletion candidates.",
        "",
    ]

    if report.error:
        lines.append(f"⚠️ {report.error}")
        return lines

    meta_s = report.current_meta or "?"
    subdep_bits = ", ".join(f"`{n}=={v}`" for n, v in sorted(report.current_subdeps.items()))
    lines.extend(
        [
            f"- ComfyUI history pins **{len(report.meta_pins)}** meta version(s); "
            f"newest in history: **`comfyui-workflow-templates=={meta_s}`**",
            f"- Pin source: `{report.pins_source or 'unknown'}`"
            + (
                f" · cache: `{report.pins_cache_file}`"
                if report.pins_cache_file
                else " (no ComfyUI clone in CI)"
            ),
            f"- That meta’s sub-deps: {subdep_bits or '_(none parsed)_'}",
            "",
            "| Package | Referenced | Orphan | Reclaimable |",
            "|---------|------------|--------|-------------|",
        ]
    )
    for pkg in report.packages:
        lines.append(
            f"| `{pkg.pypi_name}` "
            f"| {len(pkg.keep)} "
            f"| {len(pkg.delete_candidates)} "
            f"| {format_bytes(pkg.reclaimable_bytes)} |"
        )
    lines.append("")
    lines.append(
        f"**Total reclaimable (orphan versions): {format_bytes(report.total_reclaimable_bytes)}**"
    )

    packages_with_orphans = [pkg for pkg in report.packages if pkg.delete_candidates]
    if packages_with_orphans:
        lines.extend(
            [
                "",
                "<details>",
                "<summary><b>Per-package orphan version lists (click to expand)</b></summary>",
                "",
            ]
        )
        for pkg in packages_with_orphans:
            lines.extend(
                [
                    "",
                    f"#### Orphan versions — `{pkg.pypi_name}` "
                    f"({len(pkg.delete_candidates)} version(s), "
                    f"{format_bytes(pkg.reclaimable_bytes)} reclaimable)",
                    "",
                ]
            )
            shown = pkg.delete_candidates[-max_listed:]
            omitted = len(pkg.delete_candidates) - len(shown)
            for version, size in shown:
                lines.append(f"- `{version}` — {format_bytes(size)}")
            if omitted > 0:
                lines.append(f"- _…and {omitted} older version(s) not listed_")
            lines.extend(
                [
                    "",
                    f"**Keep** ({len(pkg.referenced_versions)} referenced): "
                    + ", ".join(f"`{v}`" for v, _ in pkg.keep[-15:])
                    + (f" _(+{len(pkg.keep) - 15} more)_" if len(pkg.keep) > 15 else ""),
                ]
            )
        lines.extend(["", "</details>"])

    lines.extend(
        [
            "",
            "<sub>Request deletion at PyPI (project settings → Release → yank/delete). "
            "After freeing quota, publish missing sub-packages before meta.</sub>",
        ]
    )
    return lines


def build_markdown(
    results: list[QuotaResult],
    meta: dict,
    title: str,
    ref_report: ComfyUIReferenceReport | None = None,
    max_delete_listed: int = 40,
) -> str:
    lines = [
        f"## {title}",
        "",
        f"PyPI enforces about **{meta['quota_gb']:.0f} GB total storage per project** "
        f"(all releases). Per-file upload limit is about **{meta['per_file_limit_mb']:.0f} MB**.",
        "",
        "### PyPI project quota (cumulative storage)",
        "",
        "| Status | Package | PyPI latest | Versions | Stored | % of quota | Headroom |",
        "|--------|---------|-------------|----------|--------|------------|----------|",
    ]
    quota_bytes = int(meta["quota_gb"] * 1024**3)
    for row in results:
        if row.pypi_missing:
            pct_s = "n/a"
            headroom_s = "n/a"
            stored_s = "not on PyPI"
        else:
            pct = row.pypi_total_bytes / quota_bytes * 100 if quota_bytes else 0
            pct_s = f"{pct:.1f}%"
            headroom_s = format_bytes(max(0, quota_bytes - row.pypi_total_bytes))
            stored_s = format_bytes(row.pypi_total_bytes)
        lines.append(
            f"| {status_emoji(row.quota_status)} {row.quota_status} "
            f"| `{row.spec.pypi_name}` "
            f"| {row.spec.local_version or row.pypi_latest or '-'} "
            f"| {row.pypi_version_count} "
            f"| {stored_s} "
            f"| {pct_s} "
            f"| {headroom_s} |"
        )

    lines.extend(
        [
            "",
            f"<sub>Quota thresholds: 🟡 ≥{meta['warn_pct']:.0f}% · "
            f"🔴 ≥{meta['crit_pct']:.0f}% · ⛔ ≥{meta['fail_pct']:.0f}%</sub>",
            "",
            "### Local bundle size (estimated next wheel/sdist)",
            "",
            "| Status | Package | Local dir | Estimated | Limit |",
            "|--------|---------|-----------|-----------|-------|",
        ]
    )
    for row in results:
        if row.local_bytes is None:
            lines.append(
                f"| — | `{row.spec.pypi_name}` | — | — | {meta['per_file_limit_mb']:.0f} MB |"
            )
        else:
            try:
                local_path = row.spec.local_dir.relative_to(ROOT)
            except ValueError:
                local_path = row.spec.local_dir
            lines.append(
                f"| {status_emoji(row.local_status)} {row.local_status} "
                f"| `{row.spec.pypi_name}` "
                f"| `{local_path}` "
                f"| {format_bytes(row.local_bytes)} "
                f"| {meta['per_file_limit_mb']:.0f} MB |"
            )
    lines.extend(
        [
            "",
            f"<sub>Local thresholds: 🟡 ≥{meta['per_file_warn_mb']:.0f} MB · "
            f"🔴 ≥{meta['per_file_crit_mb']:.0f} MB</sub>",
            "",
            "Add future extension packages under `packages/<name>/pyproject.toml`; "
            "they are picked up automatically. For external PyPI projects, add an entry to "
            "`.github/pypi-packages.json` → `extra_packages`.",
        ]
    )
    if ref_report is not None:
        lines.extend(build_comfyui_reference_markdown(ref_report, max_delete_listed))
    return "\n".join(lines)


def worst_status(statuses: list[str]) -> str:
    order = ["OK", "WARNING", "CRITICAL", "FAIL", "MISSING", "UNKNOWN"]
    return max(statuses, key=lambda s: order.index(s) if s in order else 99)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--fail-on-critical",
        action="store_true",
        help="Exit 1 if any package hits CRITICAL/FAIL quota or local CRITICAL",
    )
    parser.add_argument(
        "--github-summary",
        action="store_true",
        help="Write report to GITHUB_STEP_SUMMARY when set",
    )
    parser.add_argument(
        "--comment-file",
        type=Path,
        help="Write PR comment body (with HTML marker) to this file",
    )
    parser.add_argument(
        "--title",
        default="PyPI package quota report",
        help="Markdown title for the report",
    )
    parser.add_argument(
        "--comfyui-ref",
        action="store_true",
        default=None,
        help="Include ComfyUI requirements.txt reference analysis (default: from config)",
    )
    parser.add_argument(
        "--no-comfyui-ref",
        action="store_true",
        help="Skip ComfyUI reference analysis",
    )
    parser.add_argument(
        "--comfyui-repo-path",
        type=Path,
        help="Local ComfyUI clone (overrides COMFYUI_REPO_PATH)",
    )
    parser.add_argument(
        "--packages",
        help="Comma-separated package ids to check (e.g. core,json,meta). Default: all packages.",
    )
    parser.add_argument(
        "--release-packages",
        action="store_true",
        help="Only check packages whose version differs from --base-ref (or merge-base on PRs).",
    )
    parser.add_argument(
        "--base-ref",
        help="Git ref for --release-packages (default: merge-base with origin/main). "
        "Use HEAD~1 on main after a version-bump merge.",
    )
    args = parser.parse_args()

    package_ids = parse_package_ids(args.packages)
    if args.release_packages:
        release_ids = resolve_release_package_ids(args.base_ref)
        if not release_ids:
            print("No release package version changes detected; skipping quota check.", file=sys.stderr)
            return 0
        package_ids = release_ids if package_ids is None else (package_ids & release_ids)
        if not package_ids:
            print("No packages matched the requested release filter; skipping quota check.", file=sys.stderr)
            return 0

    config = load_config()
    results, meta = run_checks(package_ids)

    ref_cfg = config.get("comfyui_reference_check") or {}
    if args.no_comfyui_ref:
        comfyui_enabled = False
    elif args.comfyui_ref:
        comfyui_enabled = True
    else:
        comfyui_enabled = bool(ref_cfg.get("enabled", False))

    ref_report: ComfyUIReferenceReport | None = None
    if comfyui_enabled:
        ref_report = run_comfyui_reference_check(
            results,
            config,
            enabled=True,
            repo_path_override=str(args.comfyui_repo_path) if args.comfyui_repo_path else None,
        )
        github_output = os.environ.get("GITHUB_OUTPUT")
        if github_output and ref_report.pins_cache_changed:
            with open(github_output, "a", encoding="utf-8") as out:
                out.write("pins_cache_changed=true\n")

    max_listed = int(ref_cfg.get("max_delete_candidates_listed", 40))
    body = build_markdown(results, meta, args.title, ref_report, max_listed)
    print(body)

    if args.github_summary:
        summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
        if summary_path:
            Path(summary_path).write_text(body + "\n", encoding="utf-8")

    if args.comment_file:
        marker = "<!-- pypi-quota-check -->"
        args.comment_file.write_text(marker + "\n" + body + "\n", encoding="utf-8")

    quota_statuses = [r.quota_status for r in results]
    local_statuses = [r.local_status for r in results if r.local_bytes is not None]
    overall = worst_status(quota_statuses + local_statuses)

    has_blocking = any(s in {"CRITICAL", "FAIL"} for s in quota_statuses) or any(
        s == "CRITICAL" for s in local_statuses
    )

    print(f"\nOverall status: {overall}", file=sys.stderr)
    if has_blocking:
        print("Blocking issues detected (quota CRITICAL/FAIL or local size CRITICAL).", file=sys.stderr)
        if args.fail_on_critical:
            return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
