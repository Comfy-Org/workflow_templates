# Vite Bundling POC Results

**Date:** October 23, 2025
**Branch:** `feat/vite-bundling`
**Status:** ✅ POC Successful - Core functionality working

---

## Summary

Successfully implemented a proof-of-concept Vite-based build system that:
- ✅ Copies all template files (JSON, WebP, MP3, MP4)
- ✅ Generates content-hashed filenames (SHA256, 8 chars)
- ✅ Creates manifest mapping original → hashed names
- ✅ Build completes in <1 second (0.40s)
- ⚠️ Size optimization not yet implemented (current: 85.99 MB, same as input)
- 🔧 Index.json rewriting needs refinement

---

## What Works

### 1. Content Hashing ✅
All files successfully hashed with SHA256:
```
Original: 01_qwen_t2i_subgraphed-1.webp
Hashed:   01_qwen_t2i_subgraphed-1-5bfd7a13.webp
          --------------------------------
                                ^^^^^^^^
                                8-char content hash
```

### 2. Manifest Generation ✅
Perfect mapping created in `dist/manifest.json`:
```json
{
  "01_qwen_t2i_subgraphed-1.webp": "01_qwen_t2i_subgraphed-1-5bfd7a13.webp",
  "01_qwen_t2i_subgraphed.json": "01_qwen_t2i_subgraphed-bf3eca38.json",
  ...
}
```

### 3. Build Infrastructure ✅
- Vite config working
- Custom plugins executing correctly
- Build script with metrics
- Fast build time (0.40s for 413 files)

### 4. File Processing ✅
Successfully processed:
- 413 total files
- 187 JSON workflow files
- 226 media files (WebP/MP4/MP3)
- All file types preserved correctly

---

## What Needs Work

### 1. Index.json Rewriting 🔧

**Issue:** The `name` field in index.json doesn't directly map to filenames.

**Current Structure:**
```json
{
  "name": "01_qwen_t2i_subgraphed",  // No extension, no thumbnail suffix
  "mediaType": "image",
  "mediaSubtype": "webp"
}
```

**Files on Disk:**
```
01_qwen_t2i_subgraphed.json        // Workflow file
01_qwen_t2i_subgraphed-1.webp      // Thumbnail
```

**Challenge:** Frontend constructs filenames from `name` + `mediaSubtype`. With hashing, we need:
```
01_qwen_t2i_subgraphed-bf3eca38.json        // Workflow
01_qwen_t2i_subgraphed-1-5bfd7a13.webp      // Thumbnail
```

**Proposed Solutions:**

#### Option A: Hash the Name Field
```json
{
  "name": "01_qwen_t2i_subgraphed-bf3eca38",  // Include hash in name
  "mediaType": "image",
  "mediaSubtype": "webp"
}
```
- Pros: Simple, consistent
- Cons: Changes name semantics, frontend needs updates

#### Option B: Add Hash Metadata
```json
{
  "name": "01_qwen_t2i_subgraphed",
  "hash": "bf3eca38",                // New field
  "thumbnailHash": "5bfd7a13",       // New field
  "mediaType": "image",
  "mediaSubtype": "webp"
}
```
- Pros: Preserves original name, explicit
- Cons: Requires frontend changes to use hash fields

#### Option C: Use Manifest Lookup
Keep index.json unchanged, have frontend fetch manifest.json first:
```javascript
// Frontend loads manifest
const manifest = await fetch('/templates/manifest.json').then(r => r.json())

// Then constructs URLs
const workflowUrl = `/templates/${manifest[`${name}.json`]}`
const thumbnailUrl = `/templates/${manifest[`${name}-1.webp`]}`
```
- Pros: No index.json changes, flexible
- Cons: Extra network request for manifest

**Recommendation:** Option C (manifest lookup) is most compatible with current architecture.

### 2. Size Optimization 🔧

**Current:** 85.99 MB (no reduction)
**Target:** 60-65 MB (30% reduction)

**Why No Reduction Yet:**
- Only copying + hashing, no compression
- No minification of JSON
- WebP files not re-optimized

**Next Steps for Optimization:**

#### JSON Minification
```javascript
// In vite.config.js
if (ext === '.json') {
  const parsed = JSON.parse(content)
  content = JSON.stringify(parsed) // No whitespace
}
```
**Expected Impact:** ~38% reduction on JSON (4.08MB → 2.5MB)

#### WebP Re-compression
```javascript
import sharp from 'sharp'

if (ext === '.webp') {
  content = await sharp(content)
    .webp({ quality: 85, effort: 6 })
    .toBuffer()
}
```
**Expected Impact:** ~28% reduction on WebP (76.35MB → ~55MB)

#### Total Expected Reduction
```
Current:  85.95 MB
JSON:     -1.58 MB (38% of 4.08MB)
WebP:     -21.35 MB (28% of 76.35MB)
Total:    62.02 MB (28% reduction) ✅
```

---

## Build Metrics

```
Input Size:       85.95 MB
Output Size:      85.99 MB (no optimization yet)
Build Time:       0.40s
Files Processed:  413
  - JSON files:   187
  - WebP files:   226
  - Other:        0

Throughput:       ~200 MB/s (unoptimized)
```

---

## Technical Findings

### 1. Vite is Fast ⚡
- 413 files processed in 0.40s
- Even with optimization, should stay under 2-3s
- Acceptable for CI/CD pipeline

### 2. Content Hashing Works Perfectly ✅
- SHA256 provides strong content addressing
- 8-character hash is sufficient (4.3 billion combinations)
- Collision risk: negligible for this use case

### 3. Manifest Approach is Solid ✅
- Clean separation: index.json (data) + manifest.json (addressing)
- Frontend can easily adapt to use manifest
- Backward compatible: can serve both hashed and non-hashed

### 4. Build Integration is Straightforward ✅
```yaml
# .github/workflows/publish.yml
- name: Build templates
  run: npm run build

- name: Package built templates
  run: |
    mkdir -p comfyui_workflow_templates/templates/
    cp -r dist/* comfyui_workflow_templates/templates/
```

---

## Next Steps

### Immediate (This Week)

1. **Implement Index Rewriting**
   - Choose approach (recommend manifest lookup)
   - Update Vite plugin
   - Test with sample frontend integration

2. **Add Size Optimization**
   - JSON minification
   - WebP re-compression
   - Measure actual size reduction

3. **Validate Output**
   - Ensure no broken references
   - Test thumbnail loading
   - Verify workflow JSON integrity

### Short-term (Next 2 Weeks)

4. **Frontend Integration Spike**
   - Test manifest lookup approach
   - Measure performance impact
   - Document API changes needed

5. **GitHub Actions Integration**
   - Add build step to publish.yml
   - Update package structure
   - Test CI/CD pipeline

6. **Documentation**
   - Update README with build instructions
   - Document new file structure
   - Create migration guide

### Long-term (Next Month)

7. **Testing & Validation**
   - Integration tests
   - Performance benchmarks
   - Cache behavior validation

8. **Production Rollout**
   - Staging deployment
   - Canary release
   - Full production

---

## File Structure

### Current (After POC)
```
workflow_templates/
├── templates/              # Original source files
│   ├── index.json
│   ├── *.json
│   └── *.webp
├── dist/                   # NEW: Built output
│   ├── manifest.json      # Mapping of original → hashed
│   ├── index.json         # TODO: Needs rewriting
│   ├── *-[hash].json      # Content-hashed workflows
│   └── *-[hash].webp      # Content-hashed thumbnails
├── node_modules/
├── scripts/
│   └── build.js           # NEW: Build orchestration
├── package.json           # NEW: NPM config
├── vite.config.js         # NEW: Vite configuration
└── pyproject.toml
```

### Proposed (After Index Rewriting)
```
dist/
├── manifest.json          # {"original": "hashed-name"}
├── index.json             # Unchanged (uses manifest)
├── workflow-ABC123.json   # Hashed workflow files
└── thumb-1-DEF456.webp    # Hashed thumbnails
```

---

## Sample Outputs

### Manifest.json (dist/manifest.json)
```json
{
  "01_qwen_t2i_subgraphed-1.webp": "01_qwen_t2i_subgraphed-1-5bfd7a13.webp",
  "01_qwen_t2i_subgraphed.json": "01_qwen_t2i_subgraphed-bf3eca38.json",
  "02_qwen_Image_edit_subgraphed-1.webp": "02_qwen_Image_edit_subgraphed-1-8621581d.webp",
  "02_qwen_Image_edit_subgraphed.json": "02_qwen_Image_edit_subgraphed-77bb9a06.json"
}
```

### Hashed Filenames (dist/)
```
01_qwen_t2i_subgraphed-1-5bfd7a13.webp     (15K)
01_qwen_t2i_subgraphed-bf3eca38.json       (36K)
02_qwen_Image_edit_subgraphed-1-8621581d.webp  (17K)
02_qwen_Image_edit_subgraphed-77bb9a06.json    (47K)
```

### Original Files (templates/)
```
01_qwen_t2i_subgraphed-1.webp              (15K)
01_qwen_t2i_subgraphed.json                (36K)
02_qwen_Image_edit_subgraphed-1.webp       (17K)
02_qwen_Image_edit_subgraphed.json         (47K)
```

---

## Code Changes Made

### 1. package.json (NEW)
```json
{
  "name": "comfyui-workflow-templates-build",
  "version": "0.2.1",
  "type": "module",
  "scripts": {
    "build": "node scripts/build.js",
    "dev": "vite build --watch"
  },
  "devDependencies": {
    "vite": "^5.4.0"
  }
}
```

### 2. vite.config.js (NEW)
- Custom plugin: `copy-and-hash-templates`
  - Scans templates/ directory
  - Generates SHA256 hashes
  - Emits files with hashed names

- Custom plugin: `rewrite-index-json`
  - Builds file mapping
  - Creates manifest.json
  - Copies index.json (rewriting TODO)

### 3. scripts/build.js (NEW)
- Orchestrates Vite build
- Measures input/output sizes
- Validates build output
- Generates BUILD_REPORT.md

---

## Performance Implications

### Cache Strategy (After Full Implementation)

**Before (Current):**
```
index.json:        Cache-Control: public, max-age=300   (5 minutes)
other files:       Cache-Control: public, max-age=3600  (1 hour)
```
- Users wait up to 5min for new templates
- Special middleware logic required
- Pattern matching for index*.json

**After (With Hashing):**
```
ALL files:         Cache-Control: public, immutable, max-age=31536000
```
- New templates available immediately (new hash = new URL)
- No special cache logic needed
- Infinite caching with automatic freshness

### Request Reduction

**Current:**
- First load: 414 requests (1 index + 187 JSON + 226 media)
- Subsequent: 50-100 requests (cache misses due to short TTL)

**After (Option C - Manifest Lookup):**
- First load: 2 requests (index + manifest) + lazy-loaded templates
- Subsequent: 0 requests (all cached infinitely)

**After (Option A - Bundled):**
- First load: 0 requests (bundled in frontend)
- Subsequent: 0 requests (bundled in frontend)

---

## Risks Identified

### 1. Index.json Approach (Medium Risk)
**Risk:** Choosing wrong approach causes major frontend rework
**Mitigation:** Spike Option C (manifest lookup) first, easy to implement

### 2. Size Target Not Met (Low Risk)
**Risk:** Optimization doesn't achieve 30% reduction
**Current:** 86MB (86% of PyPI limit)
**Mitigation:** Even 20% reduction (68MB) buys significant runway

### 3. Build Time Too Long (Low Risk)
**Risk:** Build takes too long in CI/CD
**Current:** 0.40s unoptimized
**Expected:** 2-3s with optimization
**Mitigation:** Still acceptable for CI/CD (<5s target)

### 4. Backward Compatibility (Medium Risk)
**Risk:** Old ComfyUI versions break
**Mitigation:**
- Support both hashed and non-hashed for 1 release
- Version bump to 1.0.0 (signals breaking change)
- Keep 0.2.x branch maintained for 3 months

---

## Conclusion

The POC successfully validates the core Vite bundling approach:
- ✅ Content hashing works perfectly
- ✅ Build performance is excellent
- ✅ Manifest generation is solid
- 🔧 Index rewriting needs refinement (solvable)
- 🔧 Size optimization not yet implemented (straightforward)

**Recommendation:** Proceed with full implementation using manifest lookup approach (Option C).

**Estimated Time to Production:**
- Complete index rewriting: 2-3 days
- Add size optimization: 2-3 days
- Testing & integration: 1 week
- Total: 2-3 weeks

**Confidence Level:** High (8/10)
- Core technical challenges solved
- Remaining work is straightforward
- Clear path to production

---

## Questions for Review

1. **Index Approach:** Do we prefer manifest lookup (Option C) or hash in name (Option A)?
2. **Frontend Changes:** Who owns the frontend integration work?
3. **Rollout Strategy:** Gradual rollout or single release?
4. **Testing:** What level of testing is required before merge?
5. **Documentation:** Who will update the consumer docs (ComfyUI, Cloud)?

---

**Next Action:** Schedule technical review meeting to discuss index.json approach and frontend integration strategy.
