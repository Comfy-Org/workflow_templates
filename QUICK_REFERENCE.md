# Quick Reference - When You Return in a Few Months

## ⚡ TL;DR

**What it does**: Adds content hashes to filenames for infinite caching, zero consumer changes
**How it works**: Hash JSON → rename assets to match → update all index*.json files
**Build command**: `npm run build`
**Output**: `dist/` directory (403 files with hashes in names)

---

## 🚨 Critical Things to Remember

### 1. ALL Index Files Must Update
Not just `index.json` - also `index.ja.json`, `index.zh.json`, etc. (10 files total)
✅ **Auto-handled by build script**

### 2. Assets Renamed Based on JSON Hash
Thumbnail `default-1.webp` renamed to `default-5f65f4da-1.webp` (using JSON's hash)
⚠️ **Not the thumbnail's own hash!**

### 3. Publish dist/, Not templates/
```yaml
# CI must do this:
npm run build
cp -r dist/* comfyui_workflow_templates/templates/  # NOT templates/*
```

### 4. No Frontend Changes Needed
Frontend code unchanged - just different data in index.json
```javascript
// This still works:
const url = `/templates/${template.name}.json`
// Just now template.name includes hash
```

### 5. Rollback is Easy
```bash
git revert <commit>
# Changes publish.yml back to: cp templates/*
```

---

## 📝 Common Tasks

### Add a New Template
```bash
# 1. Add files to templates/
cp new-workflow.json templates/
cp new-workflow-1.webp templates/

# 2. Update templates/index.json
vim templates/index.json

# 3. Build
npm run build

# 4. Verify
ls dist/new-workflow-*.json
ls dist/new-workflow-*-1.webp

# 5. Commit
git add templates/ dist/  # If tracking dist/
git commit -m "Add new workflow"
```

### Update an Existing Template
```bash
# 1. Edit source
vim templates/default.json

# 2. Rebuild (hash will change!)
npm run build

# 3. Verify new hash
ls dist/default-*.json
# Output: default-NEW_HASH.json (different from before)

# 4. Commit
git add templates/ dist/
git commit -m "Update default workflow"
```

### Delete a Template
```bash
# 1. Delete from source
rm templates/old-workflow.json
rm templates/old-workflow-1.webp

# 2. Remove from index
vim templates/index.json

# 3. Rebuild (dist/ is emptied first)
npm run build

# 4. Verify gone
ls dist/old-workflow-*
# Should be empty

# 5. Commit
git add templates/ dist/
git commit -m "Remove old workflow"
```

### Test Locally
```bash
# Build
npm run build

# Serve
cd dist
python3 -m http.server 8080

# Test
curl http://localhost:8080/index.json
curl http://localhost:8080/default-HASH.json
```

### Check Build Is Working
```bash
npm run build
python3 test_dist_structure.py
# Should show: ✅ 339 successful checks
```

---

## 🐛 Troubleshooting

### Problem: Build fails with "Couldn't parse asset file"
**Cause**: Unusual filename (e.g., `file (2).json`, `file .json`)
**Fix**: Rename file to standard pattern: `basename-N.ext`

### Problem: Frontend shows 404 for template
**Cause**: Name in index.json doesn't match filename in dist/
**Fix**: Rebuild - the script auto-syncs them
```bash
npm run build
```

### Problem: Hash different between builds
**Cause**: JSON content changed (maybe whitespace in source?)
**Fix**: This is normal! Hashes are content-based. Check git diff:
```bash
git diff templates/filename.json
```

### Problem: Translation file shows wrong template
**Cause**: Names not synced across index*.json files
**Fix**: Rebuild - script updates ALL translation files
```bash
npm run build
```

### Problem: Old files still in dist/
**Cause**: emptyOutDir failed somehow
**Fix**: Manually clean and rebuild
```bash
rm -rf dist/
npm run build
```

### Problem: CI build failing
**Cause**: Missing npm ci step
**Fix**: Add to .github/workflows/publish.yml:
```yaml
- name: Install dependencies
  run: npm ci

- name: Build
  run: npm run build
```

---

## 📊 Expected Build Output

### Normal Build
```
🔍 Scanning templates directory...
📂 Step 1: Grouping files by template...
   Found 176 template groups

🔐 Step 2: Hashing JSON files and renaming assets...
✅ Processed 403 files
📊 Created 176 template groups with hashes

📝 Step 3: Updating all index*.json files...
   Found 10 index files to update
   ✓ index.json: Updated 171 template names
   [... 9 more translation files ...]

✅ All index files updated with hashed names
📄 Manifest saved to manifest.json

✨ Build completed successfully in 0.37s!
```

### File Count Check
```bash
# Source
ls templates/*.json | wc -l
# Should be ~180 (170 workflows + 10 index files)

# Output
ls dist/*.json | wc -l
# Should be ~180 (170 hashed workflows + 10 index files)

ls dist/*.webp | wc -l
# Should be ~220 (thumbnails, renamed to match JSON hashes)
```

---

## 🔍 Debugging Commands

### Verify Hash Matching
```bash
# Pick any template
TEMPLATE="01_qwen_t2i_subgraphed"

# Find its hashed files
ls dist/${TEMPLATE}-*.json
ls dist/${TEMPLATE}-*-1.webp

# Extract hashes
JSON_HASH=$(ls dist/${TEMPLATE}-*.json | sed 's/.*-\([a-f0-9]\{8\}\)\.json/\1/')
THUMB_HASH=$(ls dist/${TEMPLATE}-*-1.webp | sed 's/.*-\([a-f0-9]\{8\}\)-1\.webp/\1/')

# Should be identical
echo "JSON hash:  $JSON_HASH"
echo "Thumb hash: $THUMB_HASH"
# Both should print same hash
```

### Check Index Files Synced
```bash
# All index files should have same name for same template
for idx in dist/index*.json; do
  echo "$idx:"
  jq '.[] | .templates[]? | select(.name | startswith("01_qwen")) | .name' "$idx"
done
# All should print: "01_qwen_t2i_subgraphed-SAME_HASH"
```

### Verify Minification
```bash
# Source file has whitespace
cat templates/default.json | wc -c
# e.g., 10829 bytes

# Dist file minified
cat dist/default-*.json | wc -c
# e.g., 6307 bytes (smaller!)
```

### Check Manifest
```bash
# Manifest maps original → hashed names
jq . dist/manifest.json | head -20

# Example:
# {
#   "default": "default-5f65f4da",
#   "01_qwen_t2i": "01_qwen_t2i-214b7748"
# }
```

---

## 🎯 Key Files

### Source (Never Edit dist/)
```
templates/
├── index.json              # Main index (English)
├── index.ja.json           # Japanese
├── index.zh.json           # Chinese
├── [... 7 more languages]
├── default.json            # Workflow files
├── default-1.webp          # Thumbnails
└── [... 400+ more files]
```

### Output (Generated by Build)
```
dist/
├── index.json              # Updated with hashes
├── index.ja.json           # Updated with hashes
├── [... 8 more index files]
├── default-5f65f4da.json   # Hashed workflow
├── default-5f65f4da-1.webp # Renamed to match
├── manifest.json           # Hash mappings
└── [... 400+ more files]
```

### Build System
```
vite.config.js              # Build configuration (2 plugins)
scripts/build.js            # Build orchestration
package.json                # Dependencies (just vite)
```

### Documentation
```
PR_DESCRIPTION.md           # Full explanation (THIS IS THE MAIN DOC!)
COMPATIBILITY_ANALYSIS.md   # System compatibility analysis
IMPLEMENTATION_SUCCESS.md   # Technical details
QUICK_REFERENCE.md          # This file
```

---

## 🚀 Deployment Reminder

### CI Changes Needed
```yaml
# .github/workflows/publish.yml

# ADD THESE STEPS:
- name: Install build dependencies
  run: npm ci

- name: Build templates
  run: npm run build

# CHANGE THIS LINE:
# OLD: cp -r templates/* comfyui_workflow_templates/templates/
# NEW: cp -r dist/* comfyui_workflow_templates/templates/
```

### Cache Headers Update (Optional)
```javascript
// Simplify cache logic to:
if (path.startsWith('/templates/')) {
  res.setHeader('Cache-Control', 'public, immutable, max-age=31536000')
}
```

---

## 📞 When Things Go Wrong

### Immediate Rollback
```yaml
# In publish.yml, change ONE LINE:
cp -r templates/* comfyui_workflow_templates/templates/  # Back to templates/

# Redeploy
git revert <commit>
git push
```

### Partial Rollback (Serve Both)
```yaml
# Serve both versions during transition:
cp -r templates/* comfyui_workflow_templates/templates/
cp -r dist/* comfyui_workflow_templates/templates/

# Now both work:
# /templates/default.json          (non-hashed)
# /templates/default-5f65f4da.json (hashed)
```

---

## 📚 Read This First When You Return

1. **PR_DESCRIPTION.md** - Start here! Has everything explained in detail
2. **QUICK_REFERENCE.md** - This file, for quick tasks
3. **COMPATIBILITY_ANALYSIS.md** - If wondering what systems are affected
4. **IMPLEMENTATION_SUCCESS.md** - If need technical implementation details

---

**Remember**: The source of truth is `templates/`, output is `dist/`, build syncs them automatically! 🚀
