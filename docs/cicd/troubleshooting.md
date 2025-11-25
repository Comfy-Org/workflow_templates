# Troubleshooting Guide

## Common Issues

### ❌ Network/API Failures  
**Cause:** PyPI API timeouts, rate limiting, network issues  
**Symptoms:** "Could not fetch PyPI data", recovery mode failures  
**Fix:** Workflows now have timeouts, retries, and fallbacks to "0.0.0"  
**Manual:** Re-run publish workflow after network issues resolve

### ❌ Concurrent Workflow Conflicts
**Cause:** Multiple workflows running simultaneously  
**Symptoms:** Git conflicts, "failed to push" errors  
**Fix:** Added concurrency controls to prevent parallel runs  
**Manual:** Wait for other workflows to complete, then re-run

### ❌ Invalid Version Formats
**Cause:** Non-semantic versions (e.g., "1.2", "v1.0.0", "1.2.3-beta")  
**Symptoms:** "Invalid version format" in publish workflow  
**Fix:** Use semantic versioning (x.y.z format) in pyproject.toml files  
**Manual:** Fix version format and re-run version-check workflow

### ❌ "bundles.json missing template assignments"
**Cause:** Added templates without updating `bundles.json`  
**Fix:** Add template IDs to appropriate bundle:
```json
{
  "media-api": ["api_new_template"],
  "media-video": ["video_new_template"], 
  "media-image": ["image_new_template"],
  "media-other": ["other_new_template"]
}
```

### ❌ Package not found on PyPI
**Cause:** Publish workflow failed, package version skipped  
**Fix:** Trigger manual publish (has recovery mode)
```bash
gh workflow run "Publish to PyPI"
```

### ❌ Version check grep error
**Cause:** Multiple `version =` lines in pyproject.toml  
**Current fix:** Uses anchored regex `grep -E '^\\s*version\\s*='`

### ❌ Validation bypass (green checkmarks despite failures)
**Cause:** Auto-commits trigger new workflow runs  
**Fix:** Validation workflows now use `synchronize` trigger

## Recovery Commands

### Check PyPI Status
```bash
# Check all package versions vs PyPI
for pkg in core media-api media-video media-image media-other; do
  local=$(grep 'version = ' packages/${pkg//-/_}/pyproject.toml | cut -d'"' -f2)
  pypi=$(curl -s https://pypi.org/pypi/comfyui-workflow-templates-$pkg/json | jq -r '.info.version')
  echo "$pkg: local=$local pypi=$pypi"
done
```

### Force Rebuild Manifests
```bash
python scripts/sync_bundles.py
git add packages/*/src/*/manifest.json
git commit -m "Rebuild manifests"
```

### Manual Version Bump
```bash
# Bump specific package
sed -i 's/version = "0.3.5"/version = "0.3.6"/' packages/core/pyproject.toml
# Update meta dependencies  
python scripts/ci_version_manager.py
```

## Validation Flow
```
PR opened → validation runs → ✅/❌
  ↓
Auto-commit pushed → validation runs AGAIN → ✅/❌  
  ↓
Merge only if all validations ✅
```