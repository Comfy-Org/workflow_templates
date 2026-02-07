# AI Content Generation Roadmap

> Actionable roadmap for the ComfyUI template site AI content generation pipeline.

**Last Updated**: 2026-02-04  
**Status**: Phase 1 in progress

---

## Overview

This roadmap consolidates items from:

- [ai-content-generation-strategy.md](./ai-content-generation-strategy.md) - Original strategy
- [ai-content-generation-research.md](./ai-content-generation-research.md) - Industry research
- [PRD.md](./PRD.md) - Product requirements

---

## Launch Checklist (One-Time)

| Task                                                | Status  | Notes                                      |
| --------------------------------------------------- | ------- | ------------------------------------------ |
| Verify `templates.comfy.org` in Google Search Console | 🔲 Todo | URL prefix method; see `docs/seo-setup-guide.md` |
| Submit sitemap in GSC (`/sitemap-index.xml`)         | 🔲 Todo | One-time manual submission                 |
| Register with Bing Webmaster Tools                   | 🔲 Todo | Optional; enables IndexNow for Bing/DuckDuckGo |
| Set `OPENAI_API_KEY` secret on Vercel                | 🔲 Todo | Required for production AI content builds  |
| First production deploy via `deploy-site.yml`        | 🔲 Todo | Manual dispatch after secrets are set      |

---

## Phase 1: Foundation ✅ (In Progress)

**Goal**: Basic AI content generation pipeline with knowledge base

| Task                                                                        | Status  | Notes                     |
| --------------------------------------------------------------------------- | ------- | ------------------------- |
| Create content template prompts (tutorial/showcase/comparison/breakthrough) | ✅ Done | `../knowledge/prompts/`   |
| Add CLI flags to generate-ai.ts (--test, --template, --skip-ai)             | ✅ Done |                           |
| Sync tutorials from docs repo                                               | ✅ Done | 84 tutorials synced       |
| Template selection logic based on metadata                                  | ✅ Done | `selectContentTemplate()` |
| Tutorial context injection for matching templates                           | ✅ Done | `findRelevantTutorial()`  |
| Quality validation (word count, steps, FAQs, keywords)                      | ✅ Done | `checkContentQuality()`   |
| Expand model documentation in knowledge base                                | 🔲 Todo | Extract from tutorials    |
| Add concept documentation (inpainting, controlnet, etc.)                    | 🔲 Todo |                           |

**Deliverable**: Working pipeline that generates quality content for top 50 templates

---

## Phase 2: Retrieval Quality

**Goal**: Improve context retrieval accuracy using research findings

| Task                                        | Status  | Priority | Notes                                                              |
| ------------------------------------------- | ------- | -------- | ------------------------------------------------------------------ |
| Implement contextual chunking for tutorials | 🔲 Todo | High     | Prepend 50-100 token context summaries (49% retrieval improvement) |
| Add hybrid search (BM25 + embeddings)       | 🔲 Todo | High     | Better than embeddings-only for technical terms                    |
| Implement reranking step                    | 🔲 Todo | Medium   | Filter top 150 → top 20 chunks                                     |
| Add uncertainty prompting to templates      | 🔲 Todo | High     | "If unsure about node names, say so" (52% hallucination reduction) |
| Source attribution in prompts               | 🔲 Todo | Medium   | "Specify source for each claim" (43% reduction)                    |
| Lower temperature for factual content       | 🔲 Todo | Low      | 0.3-0.5 instead of 0.7                                             |

**Research basis**: Anthropic Contextual Retrieval, NVIDIA chunking study

---

## Phase 3: Quality Assurance

**Goal**: Production-grade content quality pipeline

| Task                                          | Status  | Priority | Notes                                               |
| --------------------------------------------- | ------- | -------- | --------------------------------------------------- |
| Human review queue for low-confidence content | 🔲 Todo | High     | Route quality score <60 to review                   |
| Brand voice consistency checks                | 🔲 Todo | Medium   | Check for AI artifacts ("In today's fast-paced...") |
| Hallucination detection for technical claims  | 🔲 Todo | High     | Cross-reference node names against workflow         |
| Plagiarism/originality scoring                | 🔲 Todo | Low      | Compare against existing content                    |
| SEO validation (keyword density, meta length) | 🔲 Todo | Medium   | Automated Surfer-style checks                       |
| Content freshness tracking                    | 🔲 Todo | Low      | Flag stale content for regeneration                 |

**Target**: <20% of content requires human review

---

## Phase 4: A/B Testing Infrastructure

**Goal**: Test content variants to optimize for CTR and conversions

| Task                             | Status  | Priority | Notes                          |
| -------------------------------- | ------- | -------- | ------------------------------ |
| URL-based variant routing        | 🔲 Todo | High     | `?v=tutorial` vs `?v=showcase` |
| Cookie-based variant persistence | 🔲 Todo | High     | Consistent experience per user |
| Vercel Edge Middleware for A/B   | 🔲 Todo | Medium   | Zero-latency variant serving   |
| GA4 event tracking for variants  | 🔲 Todo | High     | Track CTR by variant           |
| GSC integration for SEO metrics  | 🔲 Todo | Medium   | Impressions, clicks, position  |
| Experiment dashboard             | 🔲 Todo | Low      | View active tests, results     |

**First test**: Tutorial vs Showcase for high-traffic templates

---

## Phase 5: Scale & Optimization

**Goal**: Full catalog coverage with automated quality

| Task                                    | Status  | Priority | Notes                              |
| --------------------------------------- | ------- | -------- | ---------------------------------- |
| Generate content for all 200+ templates | 🔲 Todo | High     | After QA pipeline ready            |
| Automated content refresh schedule      | 🔲 Todo | Medium   | Regenerate when templates update   |
| i18n support (Chinese, Japanese)        | 🔲 Todo | Low      | Use existing localized index files |
| Performance optimization                | 🔲 Todo | Medium   | Batch API calls, caching           |
| Cost tracking and optimization          | 🔲 Todo | Low      | Monitor OpenAI spend               |

---

## Backlog (Future Considerations)

| Item                                          | Notes                                     |
| --------------------------------------------- | ----------------------------------------- |
| RAG with vector database                      | Milvus/Pinecone for larger knowledge base |
| LLM fine-tuning on ComfyUI content            | Brand voice consistency                   |
| Automated fact-checking against workflow JSON | Verify node references                    |
| User feedback integration                     | Learn from corrections                    |
| Multi-model comparison (GPT-4o vs Claude)     | Quality/cost tradeoffs                    |

---

## Success Metrics

| Metric                    | Current | Phase 1 Target | Phase 5 Target |
| ------------------------- | ------- | -------------- | -------------- |
| Templates with AI content | 0       | 50             | 200+           |
| Avg quality score         | N/A     | 70+            | 85+            |
| Human review rate         | 100%    | 50%            | <20%           |
| Indexed pages             | 0       | 50+            | 200+           |
| Organic traffic           | 0       | 1k/mo          | 5k/mo          |
| Cloud CTR                 | N/A     | 2%+            | 3%+            |

---

## Quick Reference: Key Files

| File                             | Purpose                      |
| -------------------------------- | ---------------------------- |
| `../scripts/generate-ai.ts`      | Main generation pipeline     |
| `../scripts/sync-tutorials.ts`   | Tutorial sync from docs repo |
| `../knowledge/prompts/system.md` | Base GPT-4o system prompt    |
| `../knowledge/prompts/*.md`      | Content template prompts     |
| `../knowledge/tutorials/`        | Synced tutorial content      |
| `../overrides/templates/`        | Human-edited content         |

---

## Commands

```bash
# Sync tutorials from docs repo
pnpm run sync:tutorials

# Test generation (first template, no API)
pnpm run generate:ai:test -- --skip-ai

# Generate for specific template
pnpm run generate:ai -- --template flux --skip-ai

# Full AI generation
OPENAI_API_KEY=xxx pnpm run generate:ai
```

---

_See also_:

- [ai-content-generation-strategy.md](./ai-content-generation-strategy.md)
- [ai-content-generation-research.md](./ai-content-generation-research.md)
- [PRD.md](./PRD.md)
