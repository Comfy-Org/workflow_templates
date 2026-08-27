---
name: managing-releases
description: "Manages releases for this repository: how version bumps, PyPI publishing, and GitHub releases work. Covers the release label, publish.yml / version-check.yml pipelines, auto-bump rules, frozen legacy media bundles, PyPI quota gates, and recovery/force-publish. Use when asked to: release, publish, cut a release, bump version, release label, PyPI publish, why was there no PyPI package, force publish, GitHub release, version bump PR, ship a version, check release status, frozen bundle, media wheel, PyPI quota. NOT for template content changes (see managing-templates). Triggers on: release, publish, version bump, PyPI, GitHub release, frozen bundle, quota."
---

# Managing Releases

How this repository turns template changes into **version bumps → PyPI packages → GitHub releases**. The short version: **version bumps happen on the PR (author-driven + CI auto-bump); publishing happens after merge (label-driven); every merge with a version change creates a GitHub Release, but PyPI publish requires the `release` label.**

## The two workflows (read these first)

| Workflow | Phase | Trigger | What it does |
|----------|-------|---------|--------------|
| `version-check.yml` | On the PR | PR touching `templates/**`, `bundles.json`, `blueprints/**`, `pyproject.toml`, version policy files | Syncs manifests, validates bundles, **auto-bumps package versions** (only when root version changed), posts PyPI quota + release-distribution comments, commits changes back to the PR branch |
| `publish.yml` | After merge | Push to `main` with `pyproject.toml` changes, **or** manual dispatch | Checks the merged PR for the `release` label, runs PyPI quota gate, builds & publishes affected packages in dependency order, **always creates a GitHub Release** |

## Version bump model (how versions move)

- **Root `pyproject.toml`** (the `meta` package) is **manually controlled by the PR author**. CI never auto-bumps it.
- **Sub-packages** (`core`, `json`, `media_api`, `media_video`, `media_image`, `media_other`, `media_assets_01`, `blueprints`) are **auto-bumped by `ci_version_manager.py`** — but only when the PR author has changed the root version.
- Template-only PRs (root version unchanged): **no version bumps at all** — manifests still get re-synced and committed.

| PR type | Auto-bump? | PyPI after merge? |
|---------|-----------|-------------------|
| Template / archive only (root version unchanged) | ❌ None | ❌ No (no version change → publish.yml not triggered on pyproject.toml) |
| Release PR (author bumps root version) **without** `release` label | ✅ Sub-packages | ❌ GitHub Release only |
| Release PR (author bumps root version) **with** `release` label | ✅ Sub-packages | ✅ Full PyPI publish + GitHub Release |
| Manual `workflow_dispatch` with `force_publish=true` | — | ✅ Bypasses label; publishes packages whose local version ≠ PyPI |

### Sub-package bump granularity

`ci_version_manager.py` compares each package's changed files since its last bump (or merge-base with main):
- `json` package ← any `templates/*.json` change or `manifest.json` JSON-asset hash change
- media packages ← non-JSON template assets (thumbnails, previews, media) mapped via `bundles.json` + `version_policy.json`
- `core` ← `packages/core/**`
- `blueprints` ← `blueprints/**`, `blueprints_bundles.json`, blueprint manifest
- `meta` ← always bumped when any non-meta package is bumped

## How to make a PyPI release (the happy path)

1. Make your template changes on a branch (follow `managing-templates`).
2. **Bump the root version** in `pyproject.toml` (e.g. `0.11.48` → `0.11.49`). Semantic `x.y.z` with optional `-prerelease` / `+build` metadata — no `v` prefix, no `1.2` shorthand. This matches the `publish.yml` validator.
3. Open the PR. `version-check.yml` runs: syncs manifests, auto-bumps affected sub-packages, pins them exactly in root `pyproject.toml`, posts quota + distribution comments, and commits everything back to your branch.
4. Add the **`release` label** to the PR:

   ```bash
   gh pr edit <PR-NUMBER> --add-label release
   ```

5. Merge to `main`. `publish.yml` runs: quota gate → builds & publishes sub-packages in dependency order → verifies all meta deps are on PyPI → publishes `meta` → creates GitHub Release with notes.

Result: `pip install comfyui-workflow-templates==<version>` works, and the GitHub Release notes show **Published to PyPI**.

## How to make a GitHub-Release-only merge (no PyPI)

Same as above but **skip the `release` label**. After merge, `publish.yml` still runs (pyproject.toml changed) but skips PyPI upload and creates the release with notes: **Not published to PyPI**.

Use case: hub-only / cloud-only template updates that don't need pip distribution.

## Force publish / recovery (label was missed, or publish failed)

```bash
gh workflow run "Publish to PyPI"   # manual dispatch
```

Then check **"Force publish to PyPI"** in the UI (or the equivalent input). Recovery mode:
- Bypasses the label check.
- Still only uploads packages where **local version ≠ PyPI version** (idempotent; `twine upload --skip-existing` also makes re-runs safe).

## Frozen legacy media bundles (why some packages never bump)

`media_api`, `media_image`, `media_video`, `media_other` are **frozen**:
- Version-pinned in root `pyproject.toml`, excluded from CI auto-bump (`scripts/data/version_policy.json` → `frozen_packages`).
- Reason: PyPI has a **~100 MB per-file** upload limit; these legacy wheels are 85–99 MB and would consume quota + risk rejection on every rebuild.
- **New template assets go to `media-assets-01`** — never add new templates/media to the frozen bundles.
- Full policy: [`scripts/docs/frozen_bundles.md`](../../../scripts/docs/frozen_bundles.md). `check_frozen_policy.py` posts a non-blocking PR comment if a PR violates it.

To deliberately ship a legacy wheel (rare): manually bump `packages/media_<bundle>/pyproject.toml`, update the root pin, optionally un-freeze for one release, merge with `release` label.

## PyPI quota gate

- Config: `.github/pypi-packages.json` — project quota **10 GB** (warn 80% / critical 90% / fail 95%), per-file limit **100 MB** (warn 85 MB / critical 95 MB).
- `check_pypi_quota.py` runs in two places:
  - **PR phase** (`version-check.yml`): posts a PR comment with quota status + delete-candidates when the root version differs from base.
  - **Publish phase** (`publish.yml`): a gate job **blocks the PyPI publish job** on critical/fail quota. GitHub Release creation is NOT blocked by quota.
- It also cross-checks ComfyUI's `requirements.txt` pins (`comfyui_reference_check`) so we don't delete versions ComfyUI still references.

## Release distribution report (pip vs cloud)

On version-bump PRs, `release_distribution_report.py` posts a comment summarizing how the release distributes: pip wheel content vs cloud-only vs custom-node-gated templates (the pip exclusion filter in `sync_bundles.py` keeps cloud-only / requiresCustomNodes templates out of pip wheels; `--no-filter` disables it).

## Common failure modes & fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| GitHub Release created but **no PyPI packages** | PR merged without `release` label | Manual dispatch with Force publish |
| Version-check says "no bump" on a template PR | Root version wasn't changed | That's expected; bump root version only if you want a release |
| "Invalid version format" | Non-semantic version in pyproject.toml | Use `x.y.z[-prerelease][+build]` (e.g. `0.11.49`) |
| Publish blocked / quota comment critical | PyPI quota ≥ 90% | Delete orphan versions (see delete-candidates in PR comment) or hold the release |
| `media-*` package never auto-bumps | Frozen by policy | Expected; move new assets to `media-assets-01` |
| "No associated PR found" in publish.yml | GitHub API race right after merge | Workflow retries 5×; if still missing, it creates the release without PyPI — force-publish after |

## Local status checks

```bash
# current version
grep -E '^\s*version\s*=' pyproject.toml | head -1
# sub-package versions vs PyPI (all releaseable sub-packages)
for pkg in core json media-api media-video media-image media-other media-assets-01 blueprints; do
  local=$(./scripts/ci/get_version.sh "packages/${pkg//-/_}/pyproject.toml")
  if [ "$pkg" = "blueprints" ]; then
    pypi_name="comfyui-subgraph-blueprints"
  else
    pypi_name="comfyui-workflow-templates-$pkg"
  fi
  pypi=$(./scripts/ci/get_pypi_version.sh "$pypi_name")
  echo "$pkg: local=$local pypi=$pypi"
done
# PyPI quota status
python scripts/ci/check_pypi_quota.py --release-packages --comfyui-ref
```

## References (source of truth)

- `.github/workflows/publish.yml` — publishing pipeline
- `.github/workflows/version-check.yml` — PR auto-bump pipeline
- `scripts/ci/ci_version_manager.py` — bump logic
- `scripts/ci/check_pypi_quota.py` — quota gate + delete-candidates
- `scripts/ci/release_distribution_report.py` — pip vs cloud report
- `scripts/docs/frozen_bundles.md` — frozen bundle policy
- `docs/PUBLISHING.md` — label workflow overview
- `docs/publishing-workflow-templates.md` — manual wheel publishing / recovery
- `docs/cicd/workflows.md` — workflow reference
- `docs/cicd/troubleshooting.md` — recovery commands
