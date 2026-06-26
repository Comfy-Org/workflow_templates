"""Format compatibility reports."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from models import (
    ISSUE_KIND_HELP,
    ISSUE_KIND_PRIORITY,
    ISSUE_TIER_LABELS,
    ERROR_ISSUE_KINDS,
    CRITICAL_ISSUE_KINDS,
    Issue,
    issue_kind_label,
)


def issue_kind_rank(kind: str) -> int:
    try:
        return ISSUE_KIND_PRIORITY.index(kind)
    except ValueError:
        return len(ISSUE_KIND_PRIORITY)


def sort_issues_by_priority(issues: list[Issue]) -> list[Issue]:
    return sorted(
        issues,
        key=lambda issue: (issue_kind_rank(issue.kind), issue.workflow, issue.node_id),
    )


def workflow_tier(workflow_issues: list[Issue]) -> str:
    kinds = {issue.kind for issue in workflow_issues}
    if kinds & CRITICAL_ISSUE_KINDS:
        return "critical"
    if kinds & ERROR_ISSUE_KINDS:
        return "errors"
    return "warnings"


def group_workflows_by_tier(issues: list[Issue]) -> dict[str, list[str]]:
    by_workflow = group_issues_by_workflow(issues)
    tiers: dict[str, list[str]] = {"critical": [], "errors": [], "warnings": []}
    for workflow, workflow_issues in by_workflow.items():
        tiers[workflow_tier(workflow_issues)].append(workflow)
    for tier_workflows in tiers.values():
        tier_workflows.sort()
    return tiers


def group_issues_by_kind(issues: list[Issue]) -> dict[str, list[Issue]]:
    grouped: dict[str, list[Issue]] = {}
    for issue in sort_issues_by_priority(issues):
        grouped.setdefault(issue.kind, []).append(issue)
    return grouped


def _workflow_issue_summary(workflow: str, workflow_issues: list[Issue]) -> str:
    kind_counts: dict[str, int] = {}
    for issue in workflow_issues:
        kind_counts[issue.kind] = kind_counts.get(issue.kind, 0) + 1
    parts = [
        f"{count} {issue_kind_label(kind).lower()}"
        for kind, count in sorted(kind_counts.items(), key=lambda item: issue_kind_rank(item[0]))
    ]
    return f"templates/{workflow}  ({', '.join(parts)})"


def _append_tier_template_section(
    lines: list[str],
    tier: str,
    workflows: list[str],
    by_workflow: dict[str, list[Issue]],
) -> None:
    if not workflows:
        return
    lines.extend(["", ISSUE_TIER_LABELS[tier], ""])
    for workflow in workflows:
        lines.append(f"  {_workflow_issue_summary(workflow, by_workflow[workflow])}")


def _append_tier_detail_section(lines: list[str], tier: str, issues: list[Issue]) -> None:
    if not issues:
        return
    lines.extend(["", ISSUE_TIER_LABELS[tier], ""])
    current_workflow = ""
    for issue in sort_issues_by_priority(issues):
        if issue.workflow != current_workflow:
            current_workflow = issue.workflow
            lines.append(f"\n{current_workflow}")
        lines.append(
            f"  [{issue.severity}] {issue_kind_label(issue.kind)} ({issue.kind}): "
            f"node {issue.node_id} `{issue.node_type}` - {issue.message}"
        )


def summarize_issues_by_kind(issues: list[Issue]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for issue in issues:
        counts[issue.kind] = counts.get(issue.kind, 0) + 1
    return counts


def group_issues_by_workflow(issues: list[Issue]) -> dict[str, list[Issue]]:
    grouped: dict[str, list[Issue]] = {}
    for issue in issues:
        grouped.setdefault(issue.workflow, []).append(issue)
    return grouped


def format_markdown_report(
    issues: list[Issue],
    warnings: list[str],
    total_workflows: int,
    *,
    meta: dict[str, Any] | None = None,
) -> str:
    meta = meta or {}
    error_count = sum(1 for issue in issues if issue.severity == "error")
    warning_count = sum(1 for issue in issues if issue.severity == "warning")
    affected_templates = len(group_issues_by_workflow(issues))
    clean_templates = total_workflows - affected_templates

    lines = [
        "## ComfyUI Node Compatibility Report",
        "",
        "_Informational only — this check does not block merging._",
        "",
    ]

    scan_mode = meta.get("scan_mode")
    if scan_mode == "static":
        lines.append(
            "_Baseline: static scan of ComfyUI source — reports removed/deprecated core "
            "nodes only._"
        )
    elif scan_mode == "runtime":
        lines.append("_Baseline: live ComfyUI /object_info (full accuracy)._")

    if not issues:
        lines.append("")
        lines.append("**Status: all checked templates look compatible with the ComfyUI baseline.**")
    else:
        lines.append("")
        lines.append(
            "**Status: review suggested** — some templates may use removed, deprecated, "
            "or outdated node settings."
        )

    lines.extend(
        [
            "",
            f"- Checked workflows: **{total_workflows}** (`templates/*.json`, "
            "excluding index files)",
            f"- Clean workflows: **{clean_templates}**",
            f"- Templates with findings: **{affected_templates}**",
            f"- Total findings: **{len(issues)}** ({error_count} error(s), "
            f"{warning_count} warning(s))",
        ]
    )

    baseline_bits: list[str] = []
    if scan_mode:
        baseline_bits.append(f"mode `{scan_mode}`")
    if meta.get("comfyui_branch"):
        baseline_bits.append(f"branch `{meta['comfyui_branch']}`")
    if meta.get("comfyui_ref"):
        baseline_bits.append(f"commit `{meta['comfyui_ref'][:12]}`")
    if meta.get("node_count"):
        baseline_bits.append(f"{meta['node_count']} node specs")
    if meta.get("source_url"):
        baseline_bits.append(f"source `{meta['source_url']}`")
    if baseline_bits:
        lines.extend(["", f"- Baseline: {', '.join(baseline_bits)}"])

    if warnings:
        lines.extend(["", "### Scan warnings", ""])
        for warning in warnings[:10]:
            lines.append(f"- {warning}")
        if len(warnings) > 10:
            lines.append(f"- ... {len(warnings) - 10} more")

    if not issues:
        lines.extend(
            ["", "No compatibility findings for comfy-core nodes, inputs, or combo values."]
        )
        return "\n".join(lines)

    kind_counts = summarize_issues_by_kind(issues)
    lines.extend(["", "### What may need updating (by priority)", ""])
    for kind in sorted(kind_counts, key=issue_kind_rank):
        lines.append(
            f"- **{issue_kind_label(kind)}** ({kind_counts[kind]}): {ISSUE_KIND_HELP.get(kind, '')}"
        )

    by_workflow = group_issues_by_workflow(issues)
    tiers = group_workflows_by_tier(issues)
    for tier in ("critical", "errors", "warnings"):
        workflows = tiers[tier]
        if not workflows:
            continue
        lines.extend(["", f"### {ISSUE_TIER_LABELS[tier]}", ""])
        for workflow in workflows:
            workflow_issues = by_workflow[workflow]
            wf_errors = sum(1 for issue in workflow_issues if issue.severity == "error")
            wf_warnings = sum(1 for issue in workflow_issues if issue.severity == "warning")
            lines.append(f"- `{workflow}` ({wf_errors} error(s), {wf_warnings} warning(s))")

    lines.extend(["", "### Detailed findings (by priority)", ""])
    for tier in ("critical", "errors", "warnings"):
        tier_list = _issues_by_tier(issues)[tier]
        if not tier_list:
            continue
        lines.extend(["", f"#### {ISSUE_TIER_LABELS[tier]}", ""])
        current_workflow = ""
        for issue in sort_issues_by_priority(tier_list):
            if issue.workflow != current_workflow:
                current_workflow = issue.workflow
                lines.extend([f"**`{current_workflow}`**", ""])
            lines.append(
                f"- **[{issue.severity}]** {issue_kind_label(issue.kind)} (`{issue.kind}`) — "
                f"node `{issue.node_id}` (`{issue.node_type}`): {issue.message}"
            )

    return "\n".join(lines).rstrip() + "\n"


def _issues_by_tier(issues: list[Issue]) -> dict[str, list[Issue]]:
    return {
        "critical": [issue for issue in issues if issue.kind in CRITICAL_ISSUE_KINDS],
        "errors": [
            issue
            for issue in issues
            if issue.kind in ERROR_ISSUE_KINDS and issue.kind not in CRITICAL_ISSUE_KINDS
        ],
        "warnings": [issue for issue in issues if issue.kind not in ERROR_ISSUE_KINDS],
    }


def format_log_report(
    issues: list[Issue],
    warnings: list[str],
    total_workflows: int,
    *,
    meta: dict[str, Any] | None = None,
) -> str:
    """Plain-text report for comfyui-node-compat.log (easy to search in an editor)."""
    meta = meta or {}
    error_count = sum(1 for issue in issues if issue.severity == "error")
    warning_count = sum(1 for issue in issues if issue.severity == "warning")
    by_workflow = group_issues_by_workflow(issues)
    affected_templates = len(by_workflow)
    clean_templates = total_workflows - affected_templates

    lines = [
        "ComfyUI node compatibility check",
        f"Scan mode: {meta.get('scan_mode', 'unknown')}",
    ]
    if meta.get("source_url"):
        lines.append(f"Baseline URL: {meta['source_url']}")
    if meta.get("comfyui_branch"):
        lines.append(f"ComfyUI branch: {meta['comfyui_branch']}")
    if meta.get("comfyui_ref"):
        lines.append(f"ComfyUI commit: {meta['comfyui_ref']}")
    if meta.get("node_count"):
        lines.append(f"Node specs loaded: {meta['node_count']}")

    lines.extend(
        [
            f"Checked workflows: {total_workflows}",
            f"Clean workflows: {clean_templates}",
            f"Templates with findings: {affected_templates}",
            f"Total findings: {len(issues)} ({error_count} error(s), {warning_count} warning(s))",
            "",
        ]
    )

    if warnings:
        lines.append("Scan warnings:")
        for warning in warnings:
            lines.append(f"  - {warning}")
        lines.append("")

    if not issues:
        lines.append("No compatibility issues found.")
        return "\n".join(lines)

    kind_counts = summarize_issues_by_kind(issues)
    lines.append("Findings by type (most urgent first):")
    for kind in sorted(kind_counts, key=issue_kind_rank):
        lines.append(
            f"  - {issue_kind_label(kind)} ({kind_counts[kind]}): "
            f"{ISSUE_KIND_HELP.get(kind, '')}"
        )
    lines.append("")

    tiers = group_workflows_by_tier(issues)
    lines.append("Templates to review (paths relative to repo root):")
    for tier in ("critical", "errors", "warnings"):
        _append_tier_template_section(lines, tier, tiers[tier], by_workflow)
    lines.append("")

    lines.append("Detailed findings (by priority):")
    tier_issues = _issues_by_tier(issues)
    for tier in ("critical", "errors", "warnings"):
        _append_tier_detail_section(lines, tier, tier_issues[tier])

    return "\n".join(lines).rstrip() + "\n"


def write_log_reports(
    content: str,
    *,
    latest_log: Path,
    history_log: Path,
) -> None:
    latest_log.write_text(content, encoding="utf-8")
    with history_log.open("a", encoding="utf-8") as handle:
        from datetime import datetime

        handle.write("\n")
        handle.write("=" * 72 + "\n")
        handle.write(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - run\n")
        handle.write("=" * 72 + "\n")
        handle.write(content)
        if not content.endswith("\n"):
            handle.write("\n")


def print_summary(
    issues: list[Issue],
    warnings: list[str],
    total_workflows: int,
    *,
    latest_log: Path | None = None,
    history_log: Path | None = None,
) -> None:
    error_count = sum(1 for issue in issues if issue.severity == "error")
    warning_count = sum(1 for issue in issues if issue.severity == "warning")
    affected_templates = len(group_issues_by_workflow(issues))
    critical_count = sum(1 for issue in issues if issue.kind in CRITICAL_ISSUE_KINDS)

    print("ComfyUI node compatibility check")
    print(f"Checked workflows: {total_workflows}")
    print(f"Templates with findings: {affected_templates}")
    print(f"Issues found: {len(issues)} ({error_count} error(s), {warning_count} warning(s))")
    if critical_count:
        print(f"Critical compatibility issues: {critical_count} (see top of log file)")
    print(f"Scan warnings: {len(warnings)}")

    if latest_log:
        print(f"\nFull report: {latest_log}")
    if history_log:
        print(f"History log: {history_log}")
    if issues:
        print("Open the latest log file to see which templates/ nodes need updates.")
    else:
        print("\nNo compatibility issues found.")


def print_report(issues: list[Issue], warnings: list[str], total_workflows: int) -> None:
    print("ComfyUI node compatibility check")
    print(f"Checked workflows: {total_workflows}")
    print(f"Scan warnings: {len(warnings)}")
    print(f"Issues found: {len(issues)}")

    if warnings:
        print("\nScan warnings:")
        for warning in warnings[:50]:
            print(f"  - {warning}")
        if len(warnings) > 50:
            print(f"  ... {len(warnings) - 50} more")

    if not issues:
        print("\nNo compatibility issues found.")
        return

    by_workflow = group_issues_by_workflow(issues)
    print("\nTemplates that need review/update:")
    for workflow in sorted(by_workflow):
        workflow_issues = by_workflow[workflow]
        error_count = sum(1 for issue in workflow_issues if issue.severity == "error")
        warning_count = sum(1 for issue in workflow_issues if issue.severity == "warning")
        print(f"  - {workflow} ({error_count} error(s), {warning_count} warning(s))")

    print("\nCompatibility issues:")
    for workflow in sorted(by_workflow):
        print(f"\n{workflow}")
        for issue in by_workflow[workflow]:
            print(
                f"  [{issue.severity}] {issue.kind}: node {issue.node_id} "
                f"`{issue.node_type}` - {issue.message}"
            )
