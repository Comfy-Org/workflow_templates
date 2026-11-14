"""Restrict a validator to the files a pull request actually touched.

New gates have to be scoped to the change set: the repository already carries
debts that older gates never looked for (missing painter masks, for example).
Judging the whole tree on every PR would block unrelated work on day one, which
is how a useful check gets disabled.

Usage from a validator:

    changed = changed_template_files(templates_dir, args.base_sha, args.head_sha)
    files = [f for f in files if changed is None or f.name in changed]

`changed is None` means "no scoping requested, check everything". `changed` is a
set of file names (not paths) so callers can filter their own glob results.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

# Empty tree object: diffing against it lists every file in `head`, which is what
# a first push to a branch needs (the base commit may not exist locally).
_EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"


def _git(repo_root: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", "-C", str(repo_root), *args],
        capture_output=True,
        text=True,
        check=False,
    )


def changed_template_files(
    repo_root: Path,
    templates_relpath: str = "templates",
    base_sha: str | None = None,
    head_sha: str | None = None,
) -> set[str] | None:
    """Return the template file names changed between two commits.

    Returns `None` when neither revision was supplied, so callers fall back to a
    full scan. Raises `RuntimeError` when a revision was supplied but git cannot
    diff it, so a broken checkout never silently degrades into "nothing changed".
    """
    if not base_sha and not head_sha:
        return None

    base = base_sha or _EMPTY_TREE
    head = head_sha or "HEAD"

    # `--diff-filter=d` skips deletions (nothing to validate in a removed file).
    proc = _git(
        repo_root,
        "diff",
        "--name-only",
        "--diff-filter=d",
        f"{base}...{head}",
        "--",
        f"{templates_relpath}/",
    )
    if proc.returncode != 0:
        # A fork PR can be checked out without the base commit. Fall back to a
        # two-dot diff, then give up loudly.
        proc = _git(
            repo_root, "diff", "--name-only", "--diff-filter=d", base, head,
            "--", f"{templates_relpath}/",
        )
    if proc.returncode != 0:
        raise RuntimeError(
            "cannot diff "
            f"{base}...{head}: {proc.stderr.strip() or proc.stdout.strip()}"
        )

    names: set[str] = set()
    for line in proc.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        path = Path(line)
        # Only direct children: index*.json and *.mcp.json are filtered by the
        # caller's own glob, they do not need to be part of this set.
        if path.suffix == ".json":
            names.add(path.name)
    return names
