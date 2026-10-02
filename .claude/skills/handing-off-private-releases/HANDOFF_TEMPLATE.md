# Handoff: publish workflow templates <VERSION>, then bump ComfyUI

You are taking over a local branch that is not on GitHub. Apply the git bundle below, open a pull request, add the `release` label so PyPI publish runs, wait until the publish succeeds, then bump the pin in ComfyUI.

Do not bump any versions. Do not create a git tag named `release`: the publish switch is a GitHub pull request **label** named `release`.

## Files you were given

One zip, `<BRANCH>-handoff.zip`, which unzips to:

```
<BRANCH>-handoff/
├── <BRANCH>.bundle   # git bundle (<SIZE>)
└── HANDOFF.md        # this file
```

The bundle contains <N> commits on top of workflow_templates `main` at `<BASE_SHA>`. Binary assets are inside the bundle.

## Version bump (already committed, do not change)

| Package | `main` | This release |
|---------|--------|--------------|
| `comfyui-workflow-templates` (root) | <OLD_VERSION> | <VERSION> |
<SUB_PACKAGE_ROWS>

Packages not listed (the frozen `media-api`, `media-image`, `media-video`, `media-other`, `media-assets-01`) keep their current versions. The root `pyproject.toml` already pins the new sub-package versions with `==`.

Commits that carry the bump:

- `<BUMP_SHA>` Bump version to <VERSION> (root `pyproject.toml`)
- `<AUTOBUMP_SHA>` Auto-bump package versions and sync manifests for template changes (sub-packages, manifests, MCP index)

Because the sub-package auto-bump and manifest sync are already committed, `version-check` should not push another commit. Expect one CI pass.

## Repositories

- Templates: https://github.com/Comfy-Org/workflow_templates (default branch `main`)
- ComfyUI: https://github.com/Comfy-Org/ComfyUI (default branch `master`)
- ComfyUI pin today: `comfyui-workflow-templates==<COMFYUI_CURRENT_PIN>` in `requirements.txt`

## 1. Apply the bundle

```bash
unzip /path/to/<BRANCH>-handoff.zip -d /tmp
BUNDLE=/tmp/<BRANCH>-handoff/<BRANCH>.bundle

cd workflow_templates
git fetch origin
git checkout main
git pull origin main
git bundle verify "$BUNDLE"
git fetch "$BUNDLE" HEAD:<BRANCH>
git checkout <BRANCH>
git log --oneline origin/main..HEAD
```

`verify` must say the bundle is okay and require `<BASE_SHA>`. If the prerequisite is missing, fetch `origin` again. Do not recreate commits by hand.

Expected commits, newest first:

<COMMIT_LIST>

Check that the versions match the "Version bump" table and that `<VERSION>` is not on PyPI yet:

```bash
rg '^version' pyproject.toml packages/*/pyproject.toml
curl -fsS -o /dev/null -w "%{http_code}\n" https://pypi.org/pypi/comfyui-workflow-templates/<VERSION>/json   # expect 404
```

If a version differs, or `<VERSION>` already returns 200, stop and ask the sender. Do not bump on your own.

If `origin/main` has moved past `<BASE_SHA>`, rebase onto the latest `origin/main` and resolve conflicts without changing any versions.

## 2. Open the pull request and add the release label

Keep the title short. Do not put model or template names in the title.

```bash
git push -u origin HEAD
gh pr create --repo Comfy-Org/workflow_templates --base main --head <BRANCH> --title "Update templates" --body "$(cat <<'EOF'
## Summary
- Template updates
- Bump version to <VERSION> (sub-packages already auto-bumped: <SUB_PACKAGE_SUMMARY>)

## Test plan
- [ ] CI passes
- [ ] Publish to PyPI succeeds after merge
EOF
)"
gh pr edit --repo Comfy-Org/workflow_templates --add-label release
gh pr view --repo Comfy-Org/workflow_templates --json labels,url
```

The `release` label is required. Without it the merge creates a GitHub Release only and uploads nothing to PyPI.

If a bot push leaves workflows in `action_required`, approve them:

```bash
gh run list --repo Comfy-Org/workflow_templates --branch <BRANCH> --limit 20 --json databaseId,conclusion,headSha,name
gh api -X POST repos/Comfy-Org/workflow_templates/actions/runs/<RUN_ID>/approve
```

Wait for the GitHub Actions checks on the PR head to pass, then merge to `main`.

## 3. Confirm <VERSION> is on PyPI

```bash
gh run list --repo Comfy-Org/workflow_templates --workflow "Publish to PyPI" --branch main --limit 5
gh run watch <RUN_ID> --repo Comfy-Org/workflow_templates --exit-status
curl -fsS https://pypi.org/pypi/comfyui-workflow-templates/<VERSION>/json >/dev/null && echo "<VERSION> is on PyPI"
```

The GitHub Release `v<VERSION>` must not say "Not published to PyPI". If it does, the label was missing. Run `gh workflow run "Publish to PyPI" --repo Comfy-Org/workflow_templates -f force_publish=true` after confirming with the owner.

Do not touch ComfyUI until the curl check succeeds.

## 4. Bump the ComfyUI dependency

```bash
cd ComfyUI
git fetch origin
git checkout -b chore/workflow-templates-<VERSION> origin/master
# requirements.txt: comfyui-workflow-templates==<COMFYUI_CURRENT_PIN>  ->  ==<VERSION>
git add requirements.txt
git commit -m "chore: update workflow templates to v<VERSION>"
git push -u origin HEAD
gh pr create --repo Comfy-Org/ComfyUI --base master --title "Update workflow templates to v<VERSION>" --body "$(cat <<'EOF'
## Update workflow templates to v<VERSION>

- PyPI: https://pypi.org/project/comfyui-workflow-templates/<VERSION>/
- Release: https://github.com/Comfy-Org/workflow_templates/releases/tag/v<VERSION>

Updated `requirements.txt`: `comfyui-workflow-templates==<COMFYUI_CURRENT_PIN>` to `==<VERSION>`.
EOF
)"
```

Change only that one line. ComfyUI does not use the `release` label.

## Done when

- workflow_templates `main` is at version `<VERSION>`
- PyPI has `comfyui-workflow-templates` `<VERSION>`
- GitHub Release `v<VERSION>` exists and is published to PyPI
- A ComfyUI PR pins `comfyui-workflow-templates==<VERSION>`
