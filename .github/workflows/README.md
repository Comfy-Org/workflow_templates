# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automated testing and validation.

## Workflows

### 1. Link Checker (`link-checker.yml`)

Automatically checks all URLs in workflow JSON files to ensure they are accessible.

**What it checks:**
- Model download URLs in `properties.models[].url` fields
- Documentation links in MarkdownNote and Note node `widgets_values`

**When it runs:**
- On push to `templates/**.json`, `scripts/validate/check_links.py`, or `.github/workflows/link-checker.yml`
- On pull requests with the same file patterns

**How it works:**
1. Extracts all URLs from workflow JSON files using `scripts/validate/check_links.py`
2. Checks each unique URL using [lychee](https://github.com/lycheeverse/lychee)
3. Comments on PRs if broken links are found
4. Fails the check if any links are broken

**Local testing:**
```bash
# Extract links from workflow files
python3 scripts/validate/check_links.py extract

# Check extracted links manually
lychee links_to_check.txt

# Generate detailed report
python3 scripts/validate/check_links.py report
```

**Excluding links:**

To exclude certain URLs from checking, add patterns to `.lycheeignore`:
```
# One pattern per line
^https://example\.com
^https://linkedin\.com
```

### 2. Model Analysis (`model-analysis.yml`)

Validates model specifications in workflow templates.

### 3. Validate Templates (`validate-templates.yml`)

Validates template JSON structure, thumbnails, and checks for third-party nodes.

### 4. Publish (`publish.yml`)

Publishes approved templates to the registry.

### 5. ComfyUI Node Compatibility Report (`report-comfyui-node-compat.yml`)

Informational check — **never blocks PR merges**. Compares changed `templates/*.json` against ComfyUI `master` via static source scan (no torch, no running server).

**What it checks (static mode):**
- Deprecated nodes (display name contains `DEPRECATED`)

**When it runs:**
- On pull requests that change `templates/**.json`, `scripts/comfyui_node_compat/**`, or the workflow file itself
- Manual dispatch

**How it works:**
1. Sparse-checkout template JSON + compat scripts only
2. Shallow-clone `Comfy-Org/ComfyUI` and run `scripts/comfyui_node_compat/check.py --static-scan --clone-comfyui`
3. Post or update a single PR comment with the Markdown report
4. Upload `compat_report.md` / `.json` as a workflow artifact

**Local testing (full coverage — needs running ComfyUI):**
```bash
npm run validate:comfyui-nodes
# Reports: comfyui-node-compat.latest.log, comfyui-node-compat.log (gitignored)
```

**Local testing (CI-style static scan):**
```bash
python3 scripts/comfyui_node_compat/check.py --static-scan --clone-comfyui --no-fail
```

See [`scripts/README.md`](../scripts/README.md#comfyui-node-compatibility-check) for issue types, log tiers, and flags.
