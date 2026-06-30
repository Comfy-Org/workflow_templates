#!/usr/bin/env python3
"""Check workflow templates against a ComfyUI node baseline.

Local (default): requires a running ComfyUI server and reads /object_info.
CI / automation: pass --static-scan (optionally with --clone-comfyui) — no server or torch.

Examples:
  npm run validate:comfyui-nodes
  python scripts/comfyui_node_compat/check.py --static-scan --clone-comfyui --no-fail
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import asdict
from pathlib import Path
from typing import Any

_PKG_DIR = Path(__file__).resolve().parent
if str(_PKG_DIR) not in sys.path:
    sys.path.insert(0, str(_PKG_DIR))

_lib_dir = _PKG_DIR.parent / "lib"
if str(_lib_dir) not in sys.path:
    sys.path.insert(0, str(_lib_dir))

from clone import clone_comfyui_repo, git_head_info, resolve_comfyui_checkout  # noqa: E402
from models import DEFAULT_OBJECT_INFO_URL, COMFYUI_OBJECT_INFO_URL_ENV  # noqa: E402
from registry import build_specs_from_object_info, load_object_info_from_url, probe_object_info_url  # noqa: E402
from report import (  # noqa: E402
    format_log_report,
    format_markdown_report,
    print_summary,
    write_log_reports,
)
from static_registry import build_specs_static  # noqa: E402
from workflow import scan_templates  # noqa: E402
from paths import COMFYUI_NODE_COMPAT_LATEST_LOG, COMFYUI_NODE_COMPAT_LOG, TEMPLATES_DIR  # noqa: E402

LOCAL_START_HINT = """
ComfyUI is not reachable for a live node baseline check.

Start ComfyUI locally, then re-run:
  npm run validate:comfyui-nodes

Or pass an explicit endpoint:
  python scripts/comfyui_node_compat/check.py \\
    --object-info-url http://127.0.0.1:8188/object_info

For CI-style static scanning (no running server):
  python scripts/comfyui_node_compat/check.py --static-scan --clone-comfyui
""".strip()


def resolve_local_object_info_url(explicit: str | None) -> str:
    return explicit or os.environ.get(COMFYUI_OBJECT_INFO_URL_ENV, DEFAULT_OBJECT_INFO_URL)


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Scan workflow templates for ComfyUI node compatibility issues. "
            "Local default uses a running ComfyUI /object_info endpoint. "
            "Use --static-scan for CI-style source scanning."
        )
    )
    parser.add_argument(
        "--static-scan",
        action="store_true",
        help="Scan ComfyUI Python sources without importing nodes or requiring a running server.",
    )
    parser.add_argument(
        "--clone-comfyui",
        action="store_true",
        help="Shallow-clone Comfy-Org/ComfyUI master for --static-scan (CI default).",
    )
    parser.add_argument(
        "--comfyui-dir",
        type=Path,
        default=None,
        help="ComfyUI checkout for --static-scan (overrides COMFYUI_REPO_PATH).",
    )
    parser.add_argument(
        "--object-info-url",
        help=f"Live ComfyUI /object_info URL (local default: ${COMFYUI_OBJECT_INFO_URL_ENV}).",
    )
    parser.add_argument(
        "--object-info-json",
        type=Path,
        help="Optional saved /object_info JSON (local debugging only).",
    )
    parser.add_argument(
        "--templates-dir",
        type=Path,
        default=TEMPLATES_DIR,
        help=f"Workflow templates directory (default: {TEMPLATES_DIR})",
    )
    parser.add_argument(
        "--strict-unknown",
        action="store_true",
        help="Report unknown non-core/custom nodes as warnings.",
    )
    parser.add_argument(
        "--json-output",
        type=Path,
        help="Optional path to write a machine-readable JSON report.",
    )
    parser.add_argument(
        "--markdown-output",
        type=Path,
        help="Optional path to write a Markdown report (for CI PR comments).",
    )
    parser.add_argument(
        "--log-file",
        type=Path,
        help=(
            f"Write plain-text report to this path (default local: {COMFYUI_NODE_COMPAT_LATEST_LOG}). "
            "Also appends each run to comfyui-node-compat.log."
        ),
    )
    parser.add_argument(
        "--no-log-file",
        action="store_true",
        help="Do not write comfyui-node-compat.log files (CI uses --markdown-output instead).",
    )
    parser.add_argument(
        "--no-fail",
        action="store_true",
        help="Always exit 0 even when errors are found (for informational CI runs).",
    )
    args = parser.parse_args()

    warnings: list[str] = []
    meta: dict[str, Any] = {}
    comfyui_dir: Path | None = None

    if args.static_scan:
        if args.object_info_url or args.object_info_json:
            raise SystemExit("--static-scan cannot be combined with --object-info-url/json.")
        comfyui_dir = resolve_comfyui_checkout(args.comfyui_dir)
        if comfyui_dir is None and args.clone_comfyui:
            comfyui_dir = clone_comfyui_repo()
        if comfyui_dir is None:
            raise SystemExit(
                "Static scan needs a ComfyUI checkout. Pass --clone-comfyui, --comfyui-dir, "
                "or set COMFYUI_REPO_PATH."
            )
        specs, warnings = build_specs_static(comfyui_dir)
        meta = git_head_info(comfyui_dir)
        meta["node_count"] = len(specs)
        meta["scan_mode"] = "static"
    elif args.object_info_json:
        specs = build_specs_from_object_info(json.loads(args.object_info_json.read_text(encoding="utf-8")))
        meta = {"object_info_json": str(args.object_info_json), "node_count": len(specs), "scan_mode": "runtime"}
    else:
        object_info_url = resolve_local_object_info_url(args.object_info_url)
        if not probe_object_info_url(object_info_url):
            print(LOCAL_START_HINT, file=sys.stderr)
            print(f"\nTried: {object_info_url}", file=sys.stderr)
            return 1
        specs = build_specs_from_object_info(load_object_info_from_url(object_info_url))
        meta = {"source_url": object_info_url, "node_count": len(specs), "scan_mode": "runtime"}

    issues, workflow_files = scan_templates(
        args.templates_dir,
        specs,
        strict_unknown=args.strict_unknown,
        static_baseline=args.static_scan,
    )

    log_content = format_log_report(
        issues,
        warnings,
        total_workflows=len(workflow_files),
        meta=meta,
    )

    write_log = not args.no_log_file and not os.environ.get("CI")
    latest_log = args.log_file or COMFYUI_NODE_COMPAT_LATEST_LOG
    history_log = COMFYUI_NODE_COMPAT_LOG

    if write_log:
        write_log_reports(log_content, latest_log=latest_log, history_log=history_log)
        print_summary(
            issues,
            warnings,
            total_workflows=len(workflow_files),
            latest_log=latest_log,
            history_log=history_log,
        )
    else:
        from report import print_report

        print_report(issues, warnings, total_workflows=len(workflow_files))

    if args.markdown_output:
        args.markdown_output.parent.mkdir(parents=True, exist_ok=True)
        args.markdown_output.write_text(
            format_markdown_report(
                issues,
                warnings,
                total_workflows=len(workflow_files),
                meta=meta,
            ),
            encoding="utf-8",
        )

    if args.json_output:
        report = {
            "scan_mode": meta.get("scan_mode"),
            "comfyui_dir": str(comfyui_dir) if comfyui_dir else None,
            "object_info_url": meta.get("source_url"),
            "object_info_json": str(args.object_info_json) if args.object_info_json else None,
            "templates_dir": str(args.templates_dir),
            "checked_workflows": len(workflow_files),
            "warnings": warnings,
            "issues": [asdict(issue) for issue in issues],
            "meta": meta,
        }
        args.json_output.parent.mkdir(parents=True, exist_ok=True)
        args.json_output.write_text(json.dumps(report, indent=2), encoding="utf-8")

    if args.no_fail:
        return 0
    return 1 if any(issue.severity == "error" for issue in issues) else 0


if __name__ == "__main__":
    raise SystemExit(main())
