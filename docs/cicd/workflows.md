# GitHub Workflows Reference

## Core Workflows

### `version-check.yml` (PR Automation)
**Triggers:** PR with template changes  
**Purpose:** Auto-bump package versions, sync manifests, run PyPI quota check
```yaml
templates/** → sync_bundles.py → ci_version_manager.py → bump versions → commit
            ↘ (when root version bumps) → check_pypi_quota.py → PR comment
```
**Validates:** bundles.json completeness, template→package mapping  
**Commits:** Version bumps + updated manifests to PR branch  
**PR comment:** Posts a quota + safe-to-delete report only when the root version is bumped (see [pypi-quota-check.md](pypi-quota-check.md))

### `publish.yml` (Package Publishing)  
**Triggers:** Push to main with `pyproject.toml` changes  
**Purpose:** Publish packages to PyPI + create GitHub release
```yaml
version_check → pypi-quota-gate → determine_packages → build_packages → publish_pypi → github_release
```
**Recovery mode:** Checks PyPI vs local versions, publishes out-of-sync packages  
**Quota gate:** `pypi-quota-gate` runs on every version bump and blocks the publish job on CRITICAL/FAIL quota (see [pypi-quota-check.md](pypi-quota-check.md))

## Validation Workflows

### `validate-manifests.yml`
**Purpose:** Verify template files match manifest SHA256 hashes  
**Runs:** Every PR commit (`synchronize` trigger prevents bypass)

### `validate-templates.yml` 
**Purpose:** JSON syntax, thumbnail validation, node compatibility  
**Runs:** Every PR commit

### `build-test.yml`
**Purpose:** Package installation test, import validation

### `validate-blueprints.yml`
**Purpose:** Blueprint schema + sync validation

### `check_input_assets.yml`
**Purpose:** Input asset validation

### `lint.yml`
**Purpose:** Python linting

## Automation Workflows

### `sync-custom-nodes.yml`
**Purpose:** Auto-populates `requiresCustomNodes` in all `templates/index*.json` files by parsing workflow JSONs  
**Commits:** Updated index files to PR branch

### `generate-upload-json.yml`
**Purpose:** Generates upload JSON

### `model-analysis.yml`
**Purpose:** Model analysis

## Site Workflows

### `lint-site.yml`
**Triggers:** `site/**`  
**Purpose:** ESLint, Prettier, Astro check, unit tests, template validation

### `e2e-tests-site.yml`
**Triggers:** `site/**`  
**Purpose:** Playwright E2E tests

### `visual-regression-site.yml`
**Triggers:** `site/**`  
**Purpose:** Visual regression tests

### `seo-audit-site.yml`
**Triggers:** `site/**`  
**Purpose:** SEO audit on built site

### `lighthouse.yml`
**Triggers:** `site/**`  
**Purpose:** Lighthouse CI performance/a11y checks

### `deploy-site.yml`
**Purpose:** Manual Vercel production deploy

### `link-checker.yml`
**Purpose:** Link checking

## Manual Operations

### Force Publish Missing Packages
```bash
gh workflow run "Publish to PyPI"  # Triggers recovery mode
```

### Re-sync Manifests
```bash
python scripts/sync/sync_bundles.py
```

### Check Package Versions vs PyPI
```bash
curl -s https://pypi.org/pypi/comfyui-workflow-templates-core/json | jq -r '.info.version'
```