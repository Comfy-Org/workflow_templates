# PyPI Quota Check

CI safety net for the two PyPI limits that bite hardest as the project grows:

| Limit            | Value      | Why it matters                                                  |
| ---------------- | ---------- | --------------------------------------------------------------- |
| Project quota    | ~10 GB     | Cumulative across all releases. Once full, new uploads fail.    |
| Per-file upload  | ~100 MB    | Each wheel/sdist must fit under this; otherwise upload rejects. |

The check surfaces both numbers, plus the list of PyPI versions safe to delete
to reclaim space, on every version-bump PR.

## When it runs

| Trigger                                       | Where                            | What it does                                                                                                |
| --------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| PR auto-bumps root `pyproject.toml`           | `version-check.yml`              | Posts/updates a single PR comment with the full report. **No comment if version is not bumped.**            |
| Push to `main` that bumps the root version    | `publish.yml` → `pypi-quota-gate`| Fails the publish job if any package is at **CRITICAL** (≥90%) or **FAIL** (≥95%) quota, before any upload. |
| Manual `workflow_dispatch` of `publish.yml`   | `publish.yml` → `pypi-quota-gate`| Same gate behavior as above.                                                                                |

There are **no scheduled / cron runs**. The check piggybacks on the natural
version-bump cadence — no separate babysitting workflow to maintain.

## What gets reported

The PR comment (marker `<!-- pypi-quota-check -->`, updated in place on each
push) contains four sections:

1. **PyPI project quota table** — per package: PyPI latest, version count,
   cumulative stored bytes, % of quota, headroom.
2. **Local bundle size table** — per package: the local `packages/<x>/src/...`
   directory size, an estimate of the next wheel/sdist before upload.
3. **ComfyUI reference summary** — how many meta versions ComfyUI has ever
   pinned in `requirements.txt`, the newest one, and its sub-dep pins.
4. **Per-package orphan version list** (collapsed under `<details>`) — for each
   package, the PyPI versions never referenced by any ComfyUI pin, with sizes.
   These are the safe-to-delete candidates.

### Status thresholds

| Color  | Quota %   | Per-file MB | Meaning                                                |
| ------ | --------- | ----------- | ------------------------------------------------------ |
| 🟢 OK   | < 80%     | < 85 MB     | Healthy.                                               |
| 🟡 WARNING | ≥ 80%  | ≥ 85 MB     | Comment only — start planning cleanup.                 |
| 🔴 CRITICAL | ≥ 90% | ≥ 95 MB    | Publish gate fails. Must reclaim space before release. |
| ⛔ FAIL  | ≥ 95%    | —           | Publish gate fails. Upload likely to fail too.         |
| ⚪ MISSING | n/a    | —           | Package not yet on PyPI.                               |

Thresholds live in [`.github/pypi-packages.json`](../../.github/pypi-packages.json)
and can be tuned without code changes.

## How "safe to delete" is computed

The script cross-references each PyPI release against ComfyUI's
[`requirements.txt`](https://github.com/Comfy-Org/ComfyUI/blob/master/requirements.txt)
pin chain:

```
                            ┌─────────────────────────────────┐
                            │   ComfyUI requirements.txt      │
                            │   commit history (GitHub API)   │
                            └────────────────┬────────────────┘
                                             │ every commit that touched
                                             │ requirements.txt
                                             ▼
                            comfyui-workflow-templates==X.Y.Z   ← N meta pins
                                             │
                                             │ for each meta pin, fetch
                                             │ PyPI requires_dist
                                             ▼
              comfyui-workflow-templates-{core,media-api,…}==a.b.c
                                             │
                                             ▼
                              referenced version set (per package)
                                             │
                                             ▼
   Any other PyPI release of that package = orphan (safe to delete candidate)
```

If ComfyUI never pinned a given sub-package version directly or transitively,
no one ever installed it via the normal ComfyUI install chain — it can be
yanked / deleted on PyPI to free quota.

> Always verify manually before deleting. Once a `name==version` slot is
> deleted on PyPI it cannot be reused.

## Acting on the report

When `pypi-quota-gate` blocks a publish, or you just want to free space:

1. Open the latest PR comment from the bot.
2. Expand the `<details>` block for the package whose quota is high.
3. On PyPI, go to **Project → Manage → Releases → Yank/Delete** for each
   listed orphan version.
4. Re-run the publish workflow (or push another bump) — the gate will pass once
   stored quota drops below 90%.

Recent baseline (as of this doc): `media-other` 9.73 GB (97.3% FAIL),
`media-video` 8.72 GB (87.2% WARNING), meta 8.26 GB (82.6% WARNING).
Total reclaimable across orphan versions: ~13 GB.

## Implementation

### Files

| File                                                                                       | Role                                                                                              |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| [`scripts/ci/check_pypi_quota.py`](../../scripts/ci/check_pypi_quota.py)                   | Entry point. Discovers packages, queries PyPI, builds the markdown report.                        |
| [`scripts/ci/comfyui_reference.py`](../../scripts/ci/comfyui_reference.py)                 | Resolves the ComfyUI pin chain. Handles cache load / refresh / GitHub API rate-limit fallback.    |
| [`.github/pypi-packages.json`](../../.github/pypi-packages.json)                           | Thresholds, ComfyUI reference config, cache TTL. Edit here to tune without touching code.         |
| [`.github/workflows/version-check.yml`](../../.github/workflows/version-check.yml)         | Calls the script on PRs and posts the PR comment (only when root version bumps).                  |
| [`.github/workflows/publish.yml`](../../.github/workflows/publish.yml) → `pypi-quota-gate` | Pre-publish gate. Fails on CRITICAL/FAIL before any upload.                                       |

### Package discovery

Packages are auto-discovered from:

- Root `pyproject.toml` (meta package)
- Every `packages/*/pyproject.toml` (sub-packages / extensions)

To track an external PyPI project, add it to `extra_packages` in
`.github/pypi-packages.json`:

```jsonc
"extra_packages": [
  { "id": "extras", "pypi_name": "comfyui-extra-something",
    "local_dir": "packages/extras/src/...", "local_version": "0.1.0" }
]
```

### Caching

`scripts/ci/comfyui_reference.py` maintains a working cache at
`.github/cache/comfyui-requirements-pins.json` (git-ignored, see
[`.gitignore`](../../.gitignore)):

- Fresh cache (≤ `pins_cache_stale_days`, default 7) → reused, no API call.
- Stale or missing cache → incremental GitHub API refresh (only new commits
  since the last cached `head_commit_sha`), then rewritten on disk.
- API failure with a usable stale cache → falls back to the stale cache and
  notes "stale cache fallback" in the report.
- API failure with no cache → returns an empty pin set and surfaces a warning
  rather than silently producing a misleading "everything is orphan" report.

The cache is never committed — every CI run regenerates it. Locally, the
cache speeds up repeat invocations during development.

### GitHub API authentication

Unauthenticated GitHub API gives 60 req/hr per IP, which is not enough to
walk the requirements.txt commit history. Both workflows pass
`GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` to the quota-check step, which
lifts the limit to 5000 req/hr. Locally, set `GITHUB_TOKEN` or `GH_TOKEN` in
your shell to get accurate orphan analysis.

### Output channels

| Flag                      | Effect                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------- |
| `--comment-file PATH`     | Writes the PR comment body (with HTML marker) to `PATH`. Used by `version-check.yml`. |
| `--github-summary`        | Also writes the report to `$GITHUB_STEP_SUMMARY` for the Actions UI.                  |
| `--fail-on-critical`      | Exit 1 if any package is at CRITICAL/FAIL quota or per-file CRITICAL.                 |
| `--comfyui-ref`           | Include the orphan analysis (on by default via config).                               |
| `--no-comfyui-ref`        | Skip the orphan analysis (faster, but no delete candidates).                          |
| `--comfyui-repo-path DIR` | Use a local ComfyUI checkout instead of the GitHub API.                               |

## Running locally

```bash
# Full report including orphan analysis (set GITHUB_TOKEN for accuracy)
GITHUB_TOKEN=ghp_xxx python scripts/ci/check_pypi_quota.py --comfyui-ref

# Quick check, no API calls to ComfyUI
python scripts/ci/check_pypi_quota.py --no-comfyui-ref

# Generate the same comment file CI posts
python scripts/ci/check_pypi_quota.py --comfyui-ref \
    --comment-file /tmp/quota-comment.md \
    --title "Local quota check"
```

## Operational notes

- **First run per CI job is a "cold" run** (cache regenerated from scratch).
  Expected duration ≈ 30–60 s total, dominated by per-meta-version
  `requires_dist` lookups (~120 versions × ~200 ms).
- **No state is committed back** to the repo. Adding the quota check did not
  introduce any auto-commit beyond the existing manifest/version auto-bump.
- **The gate runs on every version bump, regardless of `release` label.**
  This matches the principle that quota pressure is independent of whether
  this specific PR is the one that triggers a PyPI publish.

## See also

- [`docs/cicd/workflows.md`](workflows.md) — Workflow-level overview.
- [`docs/PUBLISHING.md`](../PUBLISHING.md) — Label-based publish flow.
- [`docs/cicd/troubleshooting.md`](troubleshooting.md) — General CI/CD troubleshooting.
