#!/usr/bin/env python3
"""Check that `properties.models[]` download URLs point at the file the loader expects.

Why this exists (issue #1373): the frontend only attaches a download URL to a
missing model when `models[].name` equals the filename the loader widget holds,
and it saves the download under that name. So if a template declares
`name = moss_image_sft_int8_convrot.safetensors` but its `url` points at
`moss_image_base_int8_convrot.safetensors`, the user downloads Base weights,
they land on disk as the SFT filename, and the template silently runs the wrong
model. Nothing in CI looked at the URL before.

The rule is deliberately narrow, because "url basename != name" is *usually*
fine (Comfy-Org renames files on download, civitai URLs carry a model id):

  ERROR  the URL basename is the declared name of a *different* model in the
         same Hugging Face repository. That is the copy-paste signature: the
         URL was taken from a sibling template and never updated.

Run locally:

    python scripts/validate/check_model_download_urls.py            # whole tree
    python scripts/validate/check_model_download_urls.py --base-sha X --head-sha Y
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from urllib.parse import urlparse

_lib_dir = Path(__file__).resolve().parent.parent / "lib"
if str(_lib_dir) not in sys.path:
    sys.path.insert(0, str(_lib_dir))

from changed_files import changed_template_files  # noqa: E402
from locale_index_files import TEMPLATES_NON_WORKFLOW_FILES  # noqa: E402


def iter_nodes(workflow: dict) -> list[dict]:
    """Yield every node in the graph, including nodes inside subgraph definitions.

    Loaders in templates such as image_moss_image_t2i_bboxes live inside
    `definitions.subgraphs[]`; scanning only the top level hides them and was
    part of why #1373 went unnoticed.
    """
    nodes = [n for n in workflow.get("nodes") or [] if isinstance(n, dict)]
    for subgraph in (workflow.get("definitions") or {}).get("subgraphs") or []:
        if isinstance(subgraph, dict):
            nodes.extend(n for n in subgraph.get("nodes") or [] if isinstance(n, dict))
    return nodes


def normalize_url(url: str) -> str:
    return url.split("?", 1)[0].split("#", 1)[0].rstrip("/")


def url_basename(url: str) -> str | None:
    path = urlparse(normalize_url(url)).path
    name = path.rsplit("/", 1)[-1]
    return name or None


def hf_repo_id(url: str) -> str | None:
    """Return `owner/repo` for a huggingface.co file URL, else None."""
    parsed = urlparse(normalize_url(url))
    if parsed.netloc not in {"huggingface.co", "www.huggingface.co"}:
        return None
    parts = [p for p in parsed.path.split("/") if p]
    if len(parts) < 3:
        return None
    return f"{parts[0]}/{parts[1]}"


def load_entries(templates: list[Path]) -> list[dict]:
    entries: list[dict] = []
    for path in templates:
        try:
            workflow = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as exc:
            print(f"⚠️  warning: cannot read {path.name}: {exc}")
            continue
        for node in iter_nodes(workflow):
            models = (node.get("properties") or {}).get("models") or []
            for model in models:
                if not isinstance(model, dict):
                    continue
                entries.append(
                    {
                        "template": path.name,
                        "node_type": node.get("type"),
                        "node_id": node.get("id"),
                        "name": (model.get("name") or "").strip(),
                        "url": (model.get("url") or "").strip(),
                        "directory": model.get("directory"),
                    }
                )
    return entries


def find_errors(entries: list[dict]) -> list[str]:
    # Every declared model name, mapped to the repositories that declare it.
    name_repos: dict[str, set[str]] = {}
    for entry in entries:
        repo = hf_repo_id(entry["url"])
        if entry["name"] and repo:
            name_repos.setdefault(entry["name"], set()).add(repo)

    errors: list[str] = []
    for entry in entries:
        where = f"{entry['template']} · {entry['node_type']} #{entry['node_id']}"
        name, url = entry["name"], entry["url"]

        if not name and not url:
            continue
        if not name:
            errors.append(f"{where}: models[] entry has a url but no name")
            continue
        if not url:
            errors.append(f"{where}: `{name}` has no download url")
            continue
        if not url.lower().startswith(("http://", "https://")):
            errors.append(f"{where}: `{name}` url is not http(s): {url}")
            continue

        basename = url_basename(url)
        if not basename or basename == name:
            continue

        repo = hf_repo_id(url)
        declares_elsewhere = name_repos.get(basename, set())
        same_repo = repo is None or repo in declares_elsewhere
        if declares_elsewhere and same_repo:
            errors.append(
                f"{where}: `{name}` downloads `{basename}`, which this repository "
                f"declares as a different model ({repo or 'external host'})"
            )
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base-sha",
        help="only check templates changed since this commit (CI: pull_request base)",
    )
    parser.add_argument(
        "--head-sha",
        help="head commit for --base-sha (defaults to HEAD)",
    )
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[2]
    templates_dir = repo_root / "templates"
    if not templates_dir.is_dir():
        print(f"❌ templates directory not found: {templates_dir}")
        return 1

    try:
        changed = changed_template_files(repo_root, "templates", args.base_sha, args.head_sha)
    except RuntimeError as exc:
        print(f"❌ {exc}")
        return 1

    all_files = sorted(
        p
        for p in templates_dir.glob("*.json")
        if p.name not in TEMPLATES_NON_WORKFLOW_FILES
    )
    scoped = [p for p in all_files if changed is None or p.name in changed]

    print("=" * 60)
    print("Model download URL validation")
    print("=" * 60)
    scope = "whole tree" if changed is None else f"{len(scoped)} changed template(s)"
    print(f"Repository: {repo_root}")
    print(f"Scope: {scope}")
    print()

    if not scoped:
        print("✅ Nothing to check: no template files changed.")
        return 0

    entries = load_entries(scoped)
    errors = find_errors(entries)

    if not errors:
        print(f"✅ {len(entries)} model URL(s) checked, no mismatched download URLs.")
        return 0

    # A scoped run must say what it is *not* judging, so existing debt stays
    # visible without blocking the PR that happens to touch a nearby file.
    if changed is not None:
        everything = find_errors(load_entries(all_files))
        untouched = len(everything) - len(errors)
        if untouched > 0:
            print(
                f"ℹ️  {untouched} pre-existing finding(s) outside this change set "
                "are not failing this run (full tree scan: --base-sha omitted)."
            )
            print()

    print(f"❌ {len(errors)} problem(s) found:")
    for error in errors:
        print(f"   - {error}")
    print()
    print(
        "Fix: point url at the file named by `name` (same repository directory), "
        "or rename `name` and the loader widget value to match the download."
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
