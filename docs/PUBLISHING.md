# Publishing Guide

## Overview

This repository uses a **label-based publishing workflow** that separates GitHub releases from PyPI package publishing. This helps reduce unnecessary package builds and saves storage space.

## Two Types of Releases

### 1. GitHub Release Only (Default)
- **When**: PR merged to `main` without `release` label
- **What happens**:
  - ✅ GitHub Release is created with release notes
  - ⏭️ PyPI packages are **not** built or published
  - 💾 Saves storage space and avoids unnecessary builds

### 2. Full Release with PyPI Publish
- **When**: PR merged to `main` **with** `release` label
- **What happens**:
  - ✅ GitHub Release is created with release notes
  - ✅ Packages are built and published to PyPI
  - 📦 Users can install via `pip install comfyui-workflow-templates`

## Publishing Workflow

### For Regular Changes (No PyPI Publish Needed)

1. Create PR with your changes
2. **Do NOT add** the `release` label
3. Merge to `main`
4. Workflow creates GitHub Release only

**Use cases:**
- Internal template updates
- Development builds
- Cloud-only deployments
- Template metadata changes

### For PyPI Releases

1. Create PR with your changes
2. **Add the `release` label** to the PR
3. Merge to `main`
4. Workflow creates GitHub Release **and** publishes to PyPI

**Use cases:**
- Public releases for pip users
- Official version releases
- Breaking changes that need distribution
- New features for local ComfyUI installations

## Manual Publishing

If you need to publish to PyPI after a PR was already merged without the `release` label:

1. Go to **Actions** tab
2. Select **"Publish to PyPI"** workflow
3. Click **"Run workflow"**
4. Check **"Force publish to PyPI"**
5. Click **"Run workflow"**

This bypasses the label check. It still only uploads packages whose **local version differs from PyPI** (recovery mode). See [Frozen legacy media bundles](../scripts/docs/frozen_bundles.md).

## Version Bumping

See [Frozen legacy media bundles](../scripts/docs/frozen_bundles.md) for the full policy. Summary:

1. **Template-only PRs** (root `pyproject.toml` unchanged): no auto-bump.
2. **Release PRs** (author bumps root version + `release` label): CI auto-bumps non-frozen sub-packages.
3. **Frozen** `media-{api,image,video,other}`: never auto-bumped; pins stay fixed until a deliberate legacy release.

**Do not** bump root version for hub-only changes (archive, metadata) unless you intend a PyPI release.

## Label Management

### Creating the `release` Label

If the `release` label doesn't exist in your repository:

```bash
gh label create release \
  --description "Publish packages to PyPI when merged" \
  --color "0e8a16"
```

Or via GitHub web UI:
1. Go to **Issues** → **Labels**
2. Click **"New label"**
3. Name: `release`
4. Description: `Publish packages to PyPI when merged`
5. Color: Green (`#0e8a16`)

### Adding Label to PR

**Via GitHub UI:**
1. Open the PR
2. Click **"Labels"** in the right sidebar
3. Select `release`

**Via GitHub CLI:**
```bash
gh pr edit <PR-NUMBER> --add-label release
```

## Workflow Files

- `.github/workflows/version-check.yml` - Auto-bump versions on PR
- `.github/workflows/publish.yml` - Publish to PyPI and create GitHub releases

## Package layout (split bundles)

| PyPI package | Contents | Status |
|--------------|----------|--------|
| `comfyui-workflow-templates-json` | All workflow + index JSON | Active |
| `comfyui-workflow-templates-media-assets-01` | New template thumbnails/media | Active |
| `comfyui-workflow-templates-media-{api,image,video,other}` | Legacy assets only (JSON stripped) | Frozen — see [`scripts/docs/frozen_bundles.md`](../scripts/docs/frozen_bundles.md) |

JSON fixes bump only the `json` package (~28MB). New templates assign assets via `bundles.json` → `media-assets-01`.

## Package Size Considerations

PyPI has a **~100 MB per-file** upload limit. That is the main reason the legacy `media-*` wheels are **frozen** — see [`scripts/docs/frozen_bundles.md`](../scripts/docs/frozen_bundles.md).

Current approximate wheel sizes:

- `media_image`: ~47 MB
- `media_other`: ~93 MB (near limit)
- `media_video`: ~95 MB (near limit)
- `media_api`: ~79 MB

New template assets go to `media-assets-01`. Unfreezing a legacy wheel should only happen for a deliberate, larger change (split, cleanup, or redesign) — not routine template PRs.

Label-based publishing also avoids rebuilding wheels on every merge, which saves PyPI project quota (~10 GB per project).

## Troubleshooting

### Release created but packages not published?

**Cause**: PR was merged without the `release` label.

**Solution**: Use manual workflow dispatch with "Force publish to PyPI" option.

### How to unpublish from PyPI?

**You cannot** remove versions from PyPI once published. Use `pip install --force-reinstall` if you need to replace a version locally.

### Version mismatch between GitHub and PyPI?

This is expected if you merge PRs without the `release` label. GitHub releases will be ahead of PyPI versions. This is by design to support development workflows.

## Best Practices

1. **Use `release` label sparingly** - Only for public pip releases
2. **Test before labeling** - Merge without label first, test, then manually publish if needed
3. **Coordinate team** - Communicate when publishing to PyPI
4. **Monitor package sizes** - Check workflow logs for size warnings
5. **Document breaking changes** - Update CHANGELOG.md before adding `release` label

## Recovery Mode

The publish workflow includes **automatic recovery mode**:
- Detects packages out-of-sync with PyPI
- Publishes missing versions automatically
- Validates dependencies before publishing meta package
- Use `workflow_dispatch` to trigger recovery manually

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) - Repository overview
- [SPEC.md](SPEC.md) - Template specification
- [I18N_GUIDE.md](I18N_GUIDE.md) - Translation workflow
