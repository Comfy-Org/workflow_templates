# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automated testing and validation.

## Workflows

### 1. Link Checker (`link-checker.yml`)

Automatically checks all URLs in workflow JSON files to ensure they are accessible.

**What it checks:**
- Model download URLs in `properties.models[].url` fields
- Documentation links in MarkdownNote and Note node `widgets_values`

**When it runs:**
- On push to `templates/**.json`, `scripts/check_links.py`, or `.github/workflows/link-checker.yml`
- On pull requests with the same file patterns

**How it works:**
1. Extracts all URLs from workflow JSON files using `scripts/check_links.py`
2. Checks each unique URL using [lychee](https://github.com/lycheeverse/lychee)
3. Comments on PRs if broken links are found
4. Fails the check if any links are broken

**Local testing:**
```bash
# Extract links from workflow files
python3 scripts/check_links.py extract

# Check extracted links manually
lychee links_to_check.txt

# Generate detailed report
python3 scripts/check_links.py report
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
