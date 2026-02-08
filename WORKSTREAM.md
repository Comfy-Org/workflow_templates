# AI Content Generation — Knowledge Base Build-Out

> Parallel workstreams for assembling, organizing, and optimizing the knowledge
> base that powers AI content generation for templates.comfy.org.
>
> **Created**: 2026-02-07
> **Goal**: Production-ready knowledge base with progressive disclosure, ready
> for agent-driven content generation across 305 templates.

---

## Current State (as of 2026-02-07)

| Asset | Status | Location |
|-------|--------|----------|
| Model docs | 6 stub files (~280 lines total): flux, hunyuan, ltx-video, qwen, sdxl, wan | `site/knowledge/models/` |
| Content prompts | 5 files: system, tutorial, showcase, comparison, breakthrough | `site/knowledge/prompts/` |
| Workflow note extraction | ✅ Merged (PR #548) — extracts `Note`, `MarkdownNote`, `CM_NoteNode` | `site/scripts/lib/extract/author-notes.ts` |
| Tutorial sync script | ✅ Exists but `knowledge/tutorials/` dir is empty | `site/scripts/sync-tutorials.ts` |
| Concepts directory | ❌ Does not exist | — |
| Examples directory | ❌ Does not exist | — |
| Template count | 305 templates across all categories | `templates/index.json` |
| Unique models | 87 model names referenced across templates | `templates/index.json` |
| Deploy workflow | Manual-dispatch only, auto-trigger commented out | `.github/workflows/deploy-site.yml` |
| CI AI generation | All CI workflows set `SKIP_AI_GENERATION=true` | `.github/workflows/*.yml` |

---

## Repository Layout (for orientation)

```
workflow_templates/              ← repo root
├── templates/                   ← source workflow JSON files + index.json
│   ├── index.json               ← master template manifest (305 templates, 87 models)
│   ├── index.{lang}.json        ← localized manifests (11 languages)
│   ├── {template_name}.json     ← individual workflow JSON files
│   └── thumbnails/              ← template thumbnail images
├── site/                        ← Astro site (independent package)
│   ├── scripts/
│   │   ├── generate-ai.ts       ← main AI generation pipeline
│   │   ├── sync-tutorials.ts    ← syncs tutorials from docs repo
│   │   └── lib/extract/
│   │       ├── author-notes.ts  ← extracts Note/MarkdownNote/CM_NoteNode text
│   │       ├── model-metadata.ts← extracts model filenames from loader nodes
│   │       ├── required-nodes.ts← identifies custom node dependencies
│   │       └── estimate-time.ts ← estimates generation time from workflow
│   ├── knowledge/               ← ★ THIS IS WHAT WE'RE BUILDING OUT ★
│   │   ├── prompts/             ← system + content template prompts
│   │   └── models/              ← 6 stub model docs
│   ├── overrides/templates/     ← human-edited content (preserved over AI)
│   ├── src/
│   │   ├── content/templates/   ← generated content output (git-ignored)
│   │   └── lib/node-registry.ts ← maps custom node types → packages/URLs
│   └── .content-cache/          ← AI generation cache (git-ignored)
├── .github/workflows/
│   └── deploy-site.yml          ← manual-dispatch deploy (AI gen step included)
└── docs/                        ← project documentation
```

---

## WORKSTREAM 1: Docs Repo Tutorials

> Sync and organize tutorial content from `Comfy-Org/docs` for use as
> direct page content and verification context in AI prompts.

**Output directory**: `site/knowledge/tutorials/` and `site/knowledge/examples/`

**Blocked by**: WS 0 ✅ Complete — inventory data is at `/tmp/ai-gen-inventory/`
- `/tmp/ai-gen-inventory/template-tutorial-mapping.json` — template↔tutorial matches
- `/tmp/ai-gen-inventory/model-inventory.json` — all models and their template counts
- `/tmp/ai-gen-inventory/node-inventory.json` — all nodes, builtin vs custom
- `/tmp/ai-gen-inventory/text-richness-audit.json` — per-template embedded text stats
- `/tmp/ai-gen-inventory/INVENTORY-SUMMARY.md` — human-readable summary

**Source repo**: https://github.com/Comfy-Org/docs

### Context

The docs repo contains ~84 tutorial `.mdx` files covering many templates we
serve. These tutorials are the highest-quality, human-written content available.
They can serve two purposes:
1. **Direct content** — for templates that have a matching tutorial, we can
   use the tutorial text directly (or as a strong starting point)
2. **Verification context** — inject tutorial text into AI prompts so the LLM
   can cross-reference its output against known-good content

A sync script already exists at `site/scripts/sync-tutorials.ts` but the
output directory is currently empty. The script looks for the docs repo at
hardcoded paths — you may need to update `POSSIBLE_DOCS_PATHS` or clone
the repo to a known location.

### Tasks

- [x] **1.1 — Get docs repo accessible**
  - Clone `Comfy-Org/docs` to a stable path (e.g., `/tmp/comfy-docs` or a worktree)
  - Verify tutorials exist at `{docs_root}/tutorials/`
  - Update `POSSIBLE_DOCS_PATHS` in `site/scripts/sync-tutorials.ts` if needed
  - ```bash
    git clone https://github.com/Comfy-Org/docs.git /tmp/comfy-docs
    ls /tmp/comfy-docs/tutorials/  # verify structure
    ```

- [x] **1.2 — Run tutorial sync and verify output**
  - ```bash
    cd site && pnpm run sync:tutorials
    ls knowledge/tutorials/  # should have ~84 markdown files
    cat knowledge/tutorials/_index.json  # verify index was created
    ```
  - Fix any issues with the sync script (path resolution, MDX parsing errors)

- [x] **1.3 — Build template↔tutorial mapping**
  - Using the inventory from WS 0.1, create `knowledge/tutorials/_template-mapping.json`:
    ```json
    {
      "flux_schnell": { "tutorial": "flux-flux-text-to-image.md", "matchType": "direct" },
      "wan_video_t2v": { "tutorial": "wan-video-wan-video.md", "matchType": "partial" },
      "some_template": { "tutorial": null, "matchType": "none" }
    }
    ```
  - Match types: `direct` (same model+task), `partial` (same model, different task), `none`

- [x] **1.4 — Create gold-standard few-shot examples**
  - Pick 5-10 tutorials that best represent each content template type:
    - 2-3 **tutorial** examples (step-by-step guides)
    - 2-3 **showcase** examples (visual/output focused)
    - 1-2 **comparison** examples (vs alternatives)
    - 1-2 **breakthrough** examples (new model releases)
  - For each, create a file in `knowledge/examples/` showing:
    - The template metadata (input)
    - The ideal generated content (output)
  - Format: `knowledge/examples/{type}-{template-name}.md`

- [x] **1.5 — Extract structured sections from tutorials**
  - For each synced tutorial, extract into structured JSON:
    - `title`, `description`, `model`, `category`
    - `steps[]` — the numbered how-to steps
    - `tips[]` — any tips/notes/warnings
    - `models_mentioned[]` — model names
    - `nodes_mentioned[]` — ComfyUI node names referenced
  - Output: `knowledge/tutorials/_structured.json`
  - This structured data is used by `generate-ai.ts` → `findRelevantTutorial()`

### Key files to understand

- `site/scripts/sync-tutorials.ts` — the existing sync script (reads MDX, cleans content, writes MD)
- `site/scripts/generate-ai.ts` lines 222-270 — `loadKnowledgeBase()` reads from `knowledge/tutorials/`
- `site/scripts/generate-ai.ts` lines ~680-730 — `findRelevantTutorial()` matches templates to tutorials

---

## Quick Reference: Commands

```bash
# ---- Setup ----
cd site && pnpm install

# ---- Knowledge Base ----
pnpm run sync:tutorials          # sync docs repo tutorials → knowledge/tutorials/

# ---- AI Generation ----
pnpm run generate:ai -- --skip-ai                    # placeholder mode (no API key needed)
pnpm run generate:ai -- --template flux_schnell       # single template
pnpm run generate:ai -- --dry-run                     # show what would regenerate
pnpm run generate:ai -- --force                       # ignore cache, regenerate all
OPENAI_API_KEY=xxx pnpm run generate:ai               # full AI generation (top 50)
OPENAI_API_KEY=xxx pnpm run generate:ai:test          # first template only

# ---- Cache ----
pnpm run cache:status            # view cache stats
pnpm run cache:clear --force     # clear all cache

# ---- Quality ----
pnpm run lint                    # ESLint
pnpm run format:check            # Prettier check
pnpm run test:e2e                # Playwright E2E tests
pnpm run audit:seo               # SEO audit (requires build first)
pnpm run build                   # full build (runs prebuild + Astro)
```
