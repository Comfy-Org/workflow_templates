# GitHub Workflows Reference

## Core Workflows

### `version-check.yml` (PR Automation)
**Triggers:** PR with template changes  
**Purpose:** Auto-bump package versions, sync manifests
```yaml
templates/** → ci_version_manager.py → bump versions → sync_bundles.py → commit
```
**Validates:** bundles.json completeness, template→package mapping  
**Commits:** Version bumps + updated manifests to PR branch

### `publish.yml` (Package Publishing)  
**Triggers:** Push to main with `pyproject.toml` changes  
**Purpose:** Publish packages to PyPI + create GitHub release
```yaml
version_check → determine_packages → build_packages → publish_pypi → github_release
```
**Recovery mode:** Checks PyPI vs local versions, publishes out-of-sync packages

## Validation Workflows

### `validate-manifests.yml`
**Purpose:** Verify template files match manifest SHA256 hashes  
**Runs:** Every PR commit (`synchronize` trigger prevents bypass)

### `validate-templates.yml` 
**Purpose:** JSON syntax, thumbnail validation, node compatibility  
**Runs:** Every PR commit

### `build-test.yml`
**Purpose:** Package installation test, import validation

## Manual Operations

### Force Publish Missing Packages
```bash
gh workflow run "Publish to PyPI"  # Triggers recovery mode
```

### Re-sync Manifests
```bash
python scripts/sync_bundles.py
```

### Check Package Versions vs PyPI
```bash
curl -s https://pypi.org/pypi/comfyui-workflow-templates-core/json | jq -r '.info.version'
```