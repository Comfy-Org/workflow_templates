---
name: handing-off-private-releases
description: "Packages an unpushed template branch into a git bundle plus an English handoff file so a colleague (or their agent) can apply it and run the release without the branch ever being pushed by the author. Use for private / embargoed model releases where changes must not go to GitHub until a colleague publishes them, or when the user says: hand off branch, handoff to colleague, git bundle, pack the changes, 交接, 打包分支, send changes without git. Also covers the receiving side: applying a handoff bundle, opening the PR with the release label, publishing to PyPI, and bumping ComfyUI requirements.txt."
---

# Handing Off Private Releases

Use when a template branch (often a private / embargoed model) has to reach a colleague **without pushing it to GitHub yourself**. You send one zip over chat, containing a git bundle and a handoff markdown (`HANDOFF.md`). The colleague's agent applies the bundle, opens the PR with the `release` label, publishes to PyPI, then bumps ComfyUI.

Related: `/managing-releases` (label, publish pipeline), `/managing-templates` (template content).

## Sender workflow

```
Task Progress:
- [ ] 1. Inspect branch vs origin/main
- [ ] 2. Bump the root version and commit it
- [ ] 3. Run the local CI sync + sub-package auto-bump and commit it
- [ ] 4. Record the version bump summary (old to new)
- [ ] 5. Create and verify the bundle
- [ ] 6. Write the handoff file from HANDOFF_TEMPLATE.md
- [ ] 7. Zip the bundle and handoff into one file
- [ ] 8. Tell the user which zip to send
```

### 1. Inspect

```bash
git fetch origin main
git status -sb                      # must be clean
git log --oneline origin/main..HEAD
git merge-base --is-ancestor origin/main HEAD && echo "based on current main"
git show HEAD:pyproject.toml | awk '/^version/{print; exit}'
```

If the branch is not based on current `origin/main`, rebase first. Check ComfyUI's current pin so the handoff states the right "from" version:

```bash
gh api repos/Comfy-Org/ComfyUI/contents/requirements.txt --jq .content | base64 -d | rg comfyui-workflow-templates
```

### 2. Bump the root version

The handoff is only publishable if the bundle already carries the new version. The receiver must not bump anything.

```bash
git show origin/main:pyproject.toml | awk '/^version/{print; exit}'   # main
awk '/^version/{print; exit}' pyproject.toml                          # branch
curl -fsS https://pypi.org/pypi/comfyui-workflow-templates/json | python3 -c "import json,sys; print(json.load(sys.stdin)['info']['version'])"
```

- If the branch version is not above **both** `origin/main` and the latest PyPI version, bump the patch version in root `pyproject.toml` only (e.g. `0.11.75` to `0.11.76`). The result must be above both baselines.
- Do not edit `packages/*/pyproject.toml` or the `==` pins by hand. Step 3 does that.
- Commit it: `git commit -am "Bump version to <NEW_VERSION>"`.

### 3. Pre-run the CI write-back steps locally

On the PR, several workflows commit back to the branch (locale sync, custom nodes, upload JSON, MCP index, manifests, sub-package auto-bump). Each bot push restarts every check. Running them locally first means the colleague normally waits for a single CI pass.

Run in this order (mirrors the workflows):

```bash
python3 scripts/sync/sync_data.py --templates-dir ./templates --index-only
python3 scripts/sync/sync_custom_nodes.py --templates-dir ./templates
python3 scripts/validate/check_input_assets.py --generate-upload-json
python3 scripts/mcp/sync_index.py --no-scan
python3 scripts/sync/sync_bundles.py
python3 scripts/sync/sync_blueprints.py
PYTHONUNBUFFERED=1 python3 scripts/ci/ci_version_manager.py
git status --short
```

Review the diff (sub-package versions in `packages/*/pyproject.toml` and the pins in root `pyproject.toml`), then commit with the same message CI uses:

```bash
git add -A pyproject.toml packages templates scripts/data/mcp workflow_template_input_files.json
git commit -m "Auto-bump package versions and sync manifests for template changes"
```

Do not stage generated reports such as `asset_validation_report.md`. Re-run `ci_version_manager.py` once more. It must report every package up to date and leave the tree clean. If it bumps again, something is still unsynced: fix and repeat.

### 4. Record the version bump summary

Print every package whose version changed against `origin/main`. This goes verbatim into the handoff's "Version bump" table:

```bash
python3 - <<'EOF'
import re, subprocess
from pathlib import Path

def ver(text):
    return re.search(r'^version\s*=\s*"([^"]+)"', text, re.M).group(1)

def at_main(path):
    r = subprocess.run(["git", "show", f"origin/main:{path}"], capture_output=True, text=True)
    return r.stdout if r.returncode == 0 else None

files = ["pyproject.toml"] + sorted(str(p) for p in Path("packages").glob("*/pyproject.toml"))
for f in files:
    text = Path(f).read_text()
    name = re.search(r'^name\s*=\s*"([^"]+)"', text, re.M).group(1)
    old = at_main(f)
    old_v = ver(old) if old else "(new)"
    new_v = ver(text)
    if old_v != new_v:
        print(f"| `{name}` | {old_v} | {new_v} |")
EOF
```

Expect the root package plus the active sub-packages (usually `core`, `json`, `media-assets-02`, and `comfyui-subgraph-blueprints` if blueprints changed). The frozen bundles (`media-api`, `media-image`, `media-video`, `media-other`, `media-assets-01`) should not appear. If one does, stop and check `scripts/docs/frozen_bundles.md` before handing off.

### 5. Create the bundle

Bundle only the commits on top of `origin/main` (the colleague already has main):

```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
SLUG=${BRANCH//\//-}               # file-safe name, e.g. feature/x -> feature-x
STAGE=~/Downloads/$SLUG-handoff
mkdir -p "$STAGE"
OUT=$STAGE/$SLUG.bundle
git bundle create "$OUT" origin/main..HEAD
git bundle verify "$OUT"
ls -lh "$OUT"
```

`verify` must say "is okay" and list exactly one required ref: the current `origin/main` SHA. Note that SHA, the HEAD SHA, and the commit list for the handoff. Binary assets (webp, png, mp4) are included in the bundle.

If the branch gains commits later, recreate the bundle and update the handoff. Never send an old bundle with a new handoff.

### 6. Write the handoff

Copy [HANDOFF_TEMPLATE.md](HANDOFF_TEMPLATE.md) to `$STAGE/HANDOFF.md` and fill every `<...>` placeholder, including the version bump table from step 4. `<BRANCH>` is the git branch name, `<SLUG>` is the file-safe name used for the zip and bundle. Fill `<PUBLISH_AFTER>` with when the release may go public (a date, or "now"), as stated by the user. Write it entirely in English. Keep these points explicit, since receiving agents get them wrong:

- `release` is a **GitHub PR label**, not a git tag. Without it the merge creates a GitHub Release only, with no PyPI upload.
- Do not bump the root version or the sub-packages again. The table lists the exact versions already committed, and the receiver checks them after applying the bundle.
- `Comfy-Org/workflow_templates` is a **public** repo. Pushing the branch or opening the PR publishes the template contents to anyone, whatever the title says. The receiver must not push until publication is authorized (`<PUBLISH_AFTER>` has passed, or the owner confirms). Until then the bundle stays in private storage only.
- PR title stays short and generic (e.g. "Update templates"). No model or template names.
- Do not touch ComfyUI until the new version is actually on PyPI.

### 7. Zip it

Pack both files into one zip so the colleague receives a single attachment. The `.bundle` is already compressed, so `-0` (store only) is fine.

```bash
ZIP=~/Downloads/$SLUG-handoff.zip
rm -f "$ZIP"
(cd ~/Downloads && zip -r -0 "$ZIP" "$SLUG-handoff")
unzip -l "$ZIP"
```

`unzip -l` must list exactly two files: `<slug>-handoff/<slug>.bundle` and `<slug>-handoff/HANDOFF.md`. If the branch changes later, regenerate the bundle and the handoff, then rebuild the zip. Never ship a zip whose bundle and handoff come from different runs.

### 8. Report to the user

Give the absolute zip path and say: send this one zip to the colleague; their agent should unzip it and follow `HANDOFF.md`.

## Receiver workflow

When the user gives you a handoff zip, unzip it (`unzip <slug>-handoff.zip`) and follow `HANDOFF.md` step by step. The core sequence:

1. `git fetch origin && git checkout main && git pull`, then `git bundle verify <bundle>`. If the prerequisite is missing, fetch again. Never recreate commits by hand.
2. `git fetch "<bundle>" "HEAD:<branch>" && git checkout "<branch>"`. Confirm the commit list matches the handoff, and that every row of the handoff's "Version bump" table matches the files (`rg '^version' pyproject.toml packages/*/pyproject.toml`). Also confirm the new root version is not already on PyPI. If anything differs, stop and ask the sender instead of bumping yourself.
3. **Publication gate.** The repo is public, so pushing ends the embargo. Do not push or open the PR until `<PUBLISH_AFTER>` in the handoff has passed or the release owner confirms in writing. Until then keep the bundle and local branch private.
4. Push, open the PR against `main`, then `gh pr edit --add-label release`. Confirm the label with `gh pr view --json labels`.
5. If bot pushes leave runs in `action_required`, approve them: `gh api -X POST repos/Comfy-Org/workflow_templates/actions/runs/<id>/approve`. Wait for green checks, then merge.
6. Watch the `Publish to PyPI` run on `main`. Confirm with `curl -fsS https://pypi.org/pypi/comfyui-workflow-templates/<version>/json` and check that the GitHub Release `v<version>` does **not** say "Not published to PyPI".
7. In `Comfy-Org/ComfyUI` (base `master`), change only `comfyui-workflow-templates==<old>` to `==<new>` in `requirements.txt`. Title: `Update workflow templates to v<new>`, with PyPI and release links in the body.

## Recovery

| Situation | Fix |
|-----------|-----|
| `git bundle verify` says a prerequisite is missing | Receiver's `main` is stale: `git fetch origin`. If the sender's base is gone (force-pushed main), the sender rebases and re-bundles |
| `origin/main` moved before the receiver opened the PR | Fetch the bundle as normal, rebase onto latest `origin/main`, keep the root version, rerun step 3 of the sender workflow if manifests or sub-package versions conflict |
| Someone else published the same root version first (already on PyPI) | Receiver stops and asks the sender. The sender bumps the root patch version again, reruns sender steps 3 to 7, and sends a new zip. The receiver never bumps versions |
| Merged without the `release` label (release notes say "Not published to PyPI") | Ask the user, then `gh workflow run "Publish to PyPI" -f force_publish=true` and watch it. It only uploads versions not already on PyPI |
| Checks fail with "branch could not be found" or "issue is locked" after merge | The PR was merged and the branch deleted. Those runs are noise, not code failures |
