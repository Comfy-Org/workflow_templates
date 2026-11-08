# Proposed workflow updates (manifest sync deferred to release)

These files are the intended replacements for:

| Proposed file | Install to |
|---|---|
| `validate-manifests.yml` | `.github/workflows/validate-manifests.yml` |
| `version-check.yml` | `.github/workflows/version-check.yml` |
| `build-test.yml` | `.github/workflows/build-test.yml` |
| `publish.yml` | `.github/workflows/publish.yml` |

## Why they are under `scripts/ci/proposed-workflows/`

The bot token that opened this PR has GitHub OAuth scopes `repo, read:org, gist` but **not** `workflow`, so GitHub refuses pushes that modify `.github/workflows/*`. The live workflow paths are unchanged until a maintainer applies these files (or re-auths with the `workflow` scope and pushes them).

## Apply locally

```bash
cp scripts/ci/proposed-workflows/validate-manifests.yml .github/workflows/validate-manifests.yml
cp scripts/ci/proposed-workflows/version-check.yml .github/workflows/version-check.yml
cp scripts/ci/proposed-workflows/build-test.yml .github/workflows/build-test.yml
cp scripts/ci/proposed-workflows/publish.yml .github/workflows/publish.yml
git add .github/workflows
git commit -m "ci: apply deferred-manifest-sync workflows"
```

Or ask the bot to push after: `gh auth refresh -h github.com -s workflow -s repo -s read:org -s gist`
