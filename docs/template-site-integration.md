# Template Site — Integration Plan

## Current State

5 independent branches have been created, each with a working piece of the template site:

| Branch | What It Has | Depends On |
|--------|-------------|------------|
| `template-site/astro-pages` | Astro project, pages, components, mock data | Nothing |
| `template-site/sync-script` | `sync-templates.ts` script | Nothing |
| `template-site/ai-generation` | `generate-ai.ts`, knowledge base, overrides | Sync (for input files) |
| `template-site/preview-gen` | `generate-previews.ts` | Nothing |
| `template-site/cicd` | GitHub Actions, README, config | All scripts |

## The Problem

Each branch has its own `site/package.json`, `.gitignore`, etc. These will conflict on merge. We need a careful integration process.

---

## Integration Strategy

### Option A: Sequential Merge (Recommended)

Merge branches one at a time, resolving conflicts as we go.

```
main
  │
  ├── merge astro-pages (base project)
  │     └── site/ now exists with Astro
  │
  ├── merge sync-script
  │     └── Add scripts/sync-templates.ts
  │     └── Merge package.json (add tsx dep, sync script)
  │
  ├── merge ai-generation  
  │     └── Add scripts/generate-ai.ts, knowledge/, overrides/
  │     └── Merge package.json (add openai dep, generate:ai script)
  │     └── Merge .gitignore (add .content-cache/)
  │
  ├── merge preview-gen
  │     └── Add scripts/generate-previews.ts
  │     └── Merge package.json (add canvas dep, generate:previews script)
  │
  └── merge cicd
        └── Add .github/workflows/deploy-site.yml
        └── Merge package.json (add prebuild script)
        └── Merge README.md (combine content)
```

### Option B: Integration Branch

Create a fresh `template-site/integration` branch and cherry-pick/copy the relevant pieces.

---

## Step-by-Step Integration Process

### Phase 1: Create Integration Branch

```bash
cd /home/c_byrne/projects/comfyui-frontend-testing/workflow_templates
git checkout -b template-site/integration main
```

### Phase 2: Merge Astro Base (First)

```bash
git merge template-site/astro-pages -m "Merge astro-pages: base Astro project"
```

This gives us the foundation: Astro config, pages, components, mock data.

### Phase 3: Merge Sync Script

```bash
git merge template-site/sync-script -m "Merge sync-script: template sync"
```

**Expected conflicts in:**
- `site/package.json` — merge scripts and deps
- `site/.gitignore` — combine entries
- `site/tsconfig.json` — keep astro-pages version (more complete)

**Resolution:**
```json
// site/package.json - combined
{
  "scripts": {
    "dev": "astro dev",
    "sync": "tsx scripts/sync-templates.ts",  // from sync-script
    "build": "astro build",
    "preview": "astro preview"
  },
  "devDependencies": {
    "astro": "^5.x",
    "tsx": "^4.7.0",  // from sync-script
    "typescript": "^5.x"
  }
}
```

### Phase 4: Merge AI Generation

```bash
git merge template-site/ai-generation -m "Merge ai-generation: AI content pipeline"
```

**Expected conflicts in:**
- `site/package.json` — add openai, generate:ai script
- `site/.gitignore` — add .content-cache/, .env
- `site/README.md` — combine content

### Phase 5: Merge Preview Generation

```bash
git merge template-site/preview-gen -m "Merge preview-gen: workflow previews"
```

**Expected conflicts in:**
- `site/package.json` — add canvas, generate:previews script

### Phase 6: Merge CI/CD

```bash
git merge template-site/cicd -m "Merge cicd: deployment workflow"
```

**Expected conflicts in:**
- `site/package.json` — add prebuild script
- `site/README.md` — merge documentation
- `site/.gitignore` — merge entries

---

## Post-Merge Verification

### Step 1: Verify Package.json

Final `site/package.json` should have:

```json
{
  "name": "comfyui-template-site",
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "sync": "tsx scripts/sync-templates.ts",
    "generate:ai": "tsx scripts/generate-ai.ts",
    "generate:previews": "tsx scripts/generate-previews.ts",
    "prebuild": "npm run sync && npm run generate:ai && npm run generate:previews",
    "build": "astro build",
    "preview": "astro preview"
  },
  "dependencies": {
    "@astrojs/sitemap": "^3.x",
    "astro": "^5.x",
    "canvas": "^2.11.0",
    "openai": "^4.x"
  },
  "devDependencies": {
    "tsx": "^4.7.0",
    "typescript": "^5.x"
  }
}
```

### Step 2: Install and Test Each Script

```bash
cd site
npm install

# Test sync (should create 50 templates + thumbnails)
npm run sync
ls src/content/templates/ | wc -l  # Should be ~50
ls public/thumbnails/ | wc -l      # Should have webp files

# Test AI generation (skip mode)
SKIP_AI_GENERATION=true npm run generate:ai

# Test preview generation
npm run generate:previews
ls public/previews/ | wc -l  # Should have PNG files

# Test full build
npm run build

# Test dev server
npm run dev
# Visit http://localhost:4321/templates/
```

### Step 3: Replace Mock Data with Real Data

After sync runs, the mock templates from `astro-pages` branch should be replaced by real templates. Verify:

```bash
# Should see real template names, not mock ones
ls src/content/templates/ | head -10
```

### Step 4: Test Page Rendering

```bash
npm run dev
# Open http://localhost:4321/templates/
# Click on a template
# Verify:
# - Title renders
# - Description shows
# - Thumbnail displays
# - "Try on Cloud" button links correctly
# - Workflow preview image shows (if generated)
```

---

## Cleanup

After successful integration:

```bash
# Remove worktrees
cd /home/c_byrne/projects/comfyui-frontend-testing/workflow_templates
git worktree remove ../worktrees/astro-pages
git worktree remove ../worktrees/sync-script
git worktree remove ../worktrees/ai-generation
git worktree remove ../worktrees/preview-gen
git worktree remove ../worktrees/cicd

# Delete feature branches (optional)
git branch -d template-site/astro-pages
git branch -d template-site/sync-script
git branch -d template-site/ai-generation
git branch -d template-site/preview-gen
git branch -d template-site/cicd

# Merge integration to main (or create PR)
git checkout main
git merge template-site/integration -m "Merge template site implementation"
```

---

## Review Checklist

Before merging to main:

- [ ] All scripts run without errors
- [ ] `npm run build` succeeds
- [ ] Dev server shows template pages
- [ ] "Try on Cloud" links are correct format
- [ ] Thumbnails display on pages
- [ ] Workflow previews render
- [ ] GitHub Actions workflow is valid YAML
- [ ] README has complete setup instructions
- [ ] .gitignore excludes generated files
- [ ] No secrets committed

---

## Alternative: Manual Integration

If merge conflicts are too messy, do manual integration:

```bash
git checkout -b template-site/integration main

# Copy Astro project base
cp -r ../worktrees/astro-pages/site ./

# Copy scripts from each branch
cp ../worktrees/sync-script/site/scripts/sync-templates.ts site/scripts/
cp ../worktrees/ai-generation/site/scripts/generate-ai.ts site/scripts/
cp ../worktrees/preview-gen/site/scripts/generate-previews.ts site/scripts/

# Copy knowledge base
cp -r ../worktrees/ai-generation/site/knowledge site/
cp -r ../worktrees/ai-generation/site/overrides site/

# Copy GitHub workflow
cp ../worktrees/cicd/.github/workflows/deploy-site.yml .github/workflows/

# Manually merge package.json, .gitignore, README.md
# Then test everything
```

---

## Timeline Estimate

| Task | Time |
|------|------|
| Merge branches + resolve conflicts | 30-60 min |
| Test all scripts | 15 min |
| Fix integration issues | 30-60 min |
| Final verification | 15 min |
| **Total** | **1.5-2.5 hours** |
