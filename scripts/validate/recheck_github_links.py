#!/usr/bin/env python3
"""Recheck lychee's 5xx errors on github.com links through the GitHub API.

GitHub throttles bulk anonymous page fetches with 500/502/503 even for files that
exist, and lychee keeps that status for file paths inside a repository. This reads
lychee's markdown report, rechecks each 5xx github.com error through the REST API
(file contents, pull request, issue or repository), and exits 0 only when every
error in the report was such a link that the API confirms exists. Any other error,
a 404, a link the API cannot confirm, or a report with no error entries exits 1.
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

ERROR_LINE = re.compile(r"^\* \[(?P<status>[^\]]+)\] <(?P<url>[^>]+)>")
GITHUB_PAGE = re.compile(
    r"^https://github\.com/(?P<owner>[^/]+)/(?P<repo>[^/#?]+)"
    r"(?:/(?P<kind>blob|tree|pull|issues)/(?P<rest>[^#?]+))?/?(?:[#?].*)?$"
)


def report_errors(report: str) -> list[tuple[str, str]]:
    """``(status, url)`` for each error bullet under an "Errors in" section."""
    errors: list[tuple[str, str]] = []
    in_errors = False
    for line in report.splitlines():
        if "Errors in" in line:
            in_errors = True
            continue
        if line.startswith("## "):
            in_errors = False
        match = ERROR_LINE.match(line) if in_errors else None
        if match:
            errors.append((match["status"], match["url"]))
    return errors


def api_path(url: str) -> str | None:
    """The REST path that confirms ``url`` exists, or None if it is not a page we know."""
    match = GITHUB_PAGE.match(url)
    if not match:
        return None
    owner, repo, kind, rest = match["owner"], match["repo"], match["kind"], match["rest"]
    base = f"/repos/{owner}/{repo}"
    if kind is None:
        return base
    if kind in ("pull", "issues"):
        number = rest.split("/")[0]
        if not number.isdigit():
            return None
        return f"{base}/{'pulls' if kind == 'pull' else 'issues'}/{number}"
    ref, _, path = rest.partition("/")
    query = urllib.parse.urlencode({"ref": ref})
    return f"{base}/contents/{urllib.parse.quote(path)}?{query}"


def exists(path: str, token: str) -> bool:
    request = urllib.request.Request(
        f"https://api.github.com{path}",
        headers={"Accept": "application/vnd.github+json", "Authorization": f"Bearer {token}"},
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return response.status == 200 and json.load(response) is not None
    except (urllib.error.URLError, TimeoutError, ValueError):
        return False


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("usage: recheck_github_links.py lychee-report.md", file=sys.stderr)
        return 2
    token = os.environ.get("GITHUB_TOKEN", "")
    with open(argv[1], encoding="utf-8") as handle:
        errors = report_errors(handle.read())
    if not errors:
        # Called because lychee failed; without error bullets there is nothing to
        # excuse, so the failure stands (lychee crashed, or a format we do not read).
        print("No error entries found in the report; keeping the failure.")
        return 1
    remaining = 0
    for status, url in errors:
        path = api_path(url) if status.startswith("5") else None
        if path and token and exists(path, token):
            print(f"OK via GitHub API (lychee saw {status}): {url}")
        else:
            print(f"Still broken [{status}]: {url}")
            remaining += 1
    return 1 if remaining else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
