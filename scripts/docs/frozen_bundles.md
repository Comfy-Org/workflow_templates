# Frozen legacy media bundles

Legacy PyPI wheels `comfyui-workflow-templates-media-{api,image,video,other}` are **frozen**: version-pinned in root `pyproject.toml`, excluded from CI auto-bump, and not republished unless their package version is manually bumped.

This is separate from **hub archive** (`archived/`, `archive_templates.py`) — archiving removes templates from the active hub index; frozen-bundle policy governs **pip wheel churn**.

## Why these bundles are frozen

PyPI enforces a **~100 MB per-file** upload limit per wheel. The legacy media bundles are large; most pinned wheels are **85–99 MB** (queried from PyPI for versions in root `pyproject.toml`):

| Bundle | PyPI package | Pinned version | Wheel size (PyPI) | Notes |
|--------|--------------|----------------|-------------------|--------|
| `media-api` | `comfyui-workflow-templates-media-api` | 0.3.84 | **95.5 MB** | Near limit |
| `media-image` | `comfyui-workflow-templates-media-image` | 0.3.160 | **85.3 MB** | Near limit |
| `media-video` | `comfyui-workflow-templates-media-video` | 0.3.101 | **99.5 MB** | At limit |
| `media-other` | `comfyui-workflow-templates-media-other` | 0.3.229 | **85.0 MB** | Near limit |

Re-check sizes: `curl -s https://pypi.org/pypi/comfyui-workflow-templates-media-image/json` (wheel `size` field for the pinned version).

We freeze these wheels so routine template work does **not** rebuild or republish them (which would consume PyPI project quota and risks hitting the 100 MB ceiling). **New template media** goes to **`media-assets-01`** instead.

Unfreezing and shipping a new legacy wheel should be a **deliberate, rare** decision — e.g. a major split, asset cleanup, or architectural change — not part of normal template PRs.

## Config files

| File | Role |
|------|------|
| [`scripts/data/version_policy.json`](../data/version_policy.json) | `frozen_packages`, `frozen_bundles` map, `recommended_asset_bundle` (`media-assets-01`) |
| [`scripts/data/frozen_bundle_inventory.json`](../data/frozen_bundle_inventory.json) | Snapshot: which template IDs are assigned to each frozen bundle in `bundles.json` |

Regenerate inventory after editing frozen-bundle rows in `bundles.json`:

```bash
python scripts/sync/sync_frozen_inventory.py
```

## Scripts

| Script | Role |
|--------|------|
| [`scripts/sync/sync_frozen_inventory.py`](../sync/sync_frozen_inventory.py) | Write `frozen_bundle_inventory.json` from `bundles.json` + policy |
| [`scripts/ci/ci_version_manager.py`](../ci/ci_version_manager.py) | Auto-bump on release PRs; skips `frozen_packages` |
| [`scripts/ci/check_frozen_policy.py`](../ci/check_frozen_policy.py) | PR comment when frozen-bundle rules are violated |
| [`scripts/lib/version_policy.py`](../lib/version_policy.py) | Shared loaders and inventory builders |

CI: [`.github/workflows/version-check.yml`](../../.github/workflows/version-check.yml) (check + optional bump), [`.github/workflows/publish.yml`](../../.github/workflows/publish.yml) (PyPI).

## Design rules

### New templates

- Put **media assets** (thumbnails, etc.) in bundle **`media-assets-01`** in `bundles.json`.
- Do **not** add new templates to `media-api`, `media-image`, `media-video`, or `media-other`.

Workflow / index JSON ships via the **`json`** package regardless of bundle assignment.

### Archive / remove from frozen bundles

- **Removing** template IDs from frozen bundles in `bundles.json` is OK (e.g. after `archive_templates.py`).
- Does **not** require bumping legacy media package versions.
- Does **not** trigger the frozen-bundle PR warning.

Run `sync_frozen_inventory.py` after removals so the inventory matches `bundles.json`.

### Add or edit frozen-bundle content

CI posts a PR comment (informational, non-blocking) when a PR:

- **Adds** template IDs to a frozen bundle in `bundles.json`
- Changes `templates/{id}.json` or media assets for a template still assigned to a frozen bundle
- Modifies `packages/media_*` tree or frozen pins in root `pyproject.toml`

### Version bumps

[`ci_version_manager.py`](../ci/ci_version_manager.py) runs only when the PR author changes the **root** `pyproject.toml` version.

| PR type | Auto-bump |
|---------|-----------|
| Template / archive only (root version unchanged) | None |
| Release PR (root version bumped) | `json`, `media-assets-01`, `core`, etc. — **not** `frozen_packages` |

### Publishing

[`publish.yml`](../../.github/workflows/publish.yml) triggers on `pyproject.toml` changes on `main`, or manual dispatch.

- Normal merge **without** `release` label → GitHub release only, no PyPI.
- With `release` label → publishes packages whose versions changed in the merge commit.
- **Force publish** bypasses the label but still only uploads packages where **local version ≠ PyPI**.

Frozen `media-*` wheels are **not** republished if their version was not bumped.

See also: [`docs/PUBLISHING.md`](../../docs/PUBLISHING.md), [`docs/cicd/README.md`](../../docs/cicd/README.md).

## Intentional legacy media release

To ship a new frozen wheel:

1. Manually bump `packages/media_<bundle>/pyproject.toml`
2. Update the matching pin in root `pyproject.toml`
3. Optionally remove the package from `frozen_packages` for one release PR
4. Merge with `release` label (or force publish after merge)

## Local dry-run

```bash
python scripts/ci/check_frozen_policy.py --base-ref origin/main
```
