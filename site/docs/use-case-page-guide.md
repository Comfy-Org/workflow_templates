# Use-Case Page Guide

How to add or edit an SEO use-case landing page on `comfy.org/workflows/use-cases/`.

This guide is the reference. The companion Claude Code skill `managing-use-case-pages`
(in `.claude/skills/` at the repo root) automates the mechanics for you: with it, adding a
page is a guided conversation, and you never edit JSON or TypeScript by hand. Read this
guide to understand the rules the skill enforces, or to do the work manually.

Audience: content managers, growth/SEO folks, and engineers reviewing use-case page PRs.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Pipeline Overview](#pipeline-overview)
- [Where the Facts Come From](#where-the-facts-come-from)
- [What a Page Is Made Of](#what-a-page-is-made-of)
- [Step by Step](#step-by-step)
- [The Quality Bar](#the-quality-bar)
- [Brand Safety](#brand-safety)
- [Assets](#assets)
- [QA and PR](#qa-and-pr)
- [Editing an Existing Page](#editing-an-existing-page)
- [Out of Scope](#out-of-scope)

---

## Prerequisites

To ship a page you need:

1. **Repo access**: push rights to a branch on `Comfy-Org/workflow_templates`.
2. **A way to run Claude Code**: locally (any editor or terminal) or in the browser.
   Local runs also want Node 20 (`site/.nvmrc`) and pnpm 9 (`corepack enable`), but a
   browser-only flow works too: open a draft PR and let CI and the Vercel preview do the
   checking. Both paths are documented below.
3. **The keyword facts** for your page (see [Where the Facts Come From](#where-the-facts-come-from)).
4. **A cloud.comfy.org login**, to verify App Mode links with your own eyes.

Who to ask: the pod lead (priorities, unblocking), the Hub workflow team (workflows and
apps), the SEO owner (keywords and brand-safety clearance), the creative owner (use-case
picks and assets), and the QA owner.

## Pipeline Overview

The growth funnel these pages serve: **search result → use-case page → "Try on Cloud" → running workflow → signup**. Each page targets one search keyword cluster and shows a
grid of live workflows that serve it.

Ownership of the moving parts:

| Step | Owner |
| --- | --- |
| Keyword research and clearance | the SEO owner |
| Picking use cases, supplying assets | the creative owner |
| Building workflows and apps on the Hub | the Hub workflow team |
| The page itself: wiring plus editorial copy | page author (this guide) |
| QA before live | the QA owner |

**The one architectural fact everyone trips over: there are two data sources.**

| Source | What it is | Who fills it |
| --- | --- | --- |
| `templates/*.json` in this repo | Open-source templates | engineers, via git |
| The Hub API (`cloud.comfy.org/api/hub/*`) | What the site actually renders | publishing through the Hub |

The site is Hub-API-driven; the on-disk JSON is a build-time fallback. A workflow can be
live on the Hub and absent from this repo. When counting supply for a page, always check
the live API, not the repo files.

**Apps vs node graphs**: every workflow opens either as a form (App Mode) or as the node
canvas. The author's choice is stored in the workflow itself as
`workflow_json.extra.linearMode` (readable per workflow at
`/api/hub/workflows/<shareId>`). When authoring a page, that flag plus a human check is
the only valid app signal: do not infer app-ness from a `.app` filename suffix or from
the presence of `linearData`; both guesses are wrong in practice. (The site's own list
code still carries the legacy suffix inference; a fix is in flight, and it does not
change the authoring rule.)

## Where the Facts Come From

**This section is the single place that describes the planning source. If the process
moves (new tab, new tool), update this section only; the skill and the rest of this guide
refer to it. This section is maintained by the SEO owner.**

Current source of truth: an **internal keyword planning sheet** maintained by the SEO
owner. It is deliberately not linked or named here (this is a public repo); ask the SEO
owner for access. The fields that matter per keyword row:

| Field | Meaning |
| --- | --- |
| keyword | the primary search term the page targets |
| priority | build priority |
| volume | monthly US search volume |
| gate | brand-safety status: `OK` or a blocking value (see [Brand Safety](#brand-safety)) |
| published workflow | link to the workflow/app built for this keyword, if any |
| app status | built / in progress / not started / not applicable |

Claude Code cannot open the sheet itself. Paste the row (or state the same facts) into
the conversation. A page request without these facts gets asked for them; a keyword with
no row needs the SEO owner's explicit confirmation before it can proceed, because "not
in the sheet" means "nobody cleared it", not "no rules apply".

Note: a keyword is not one-to-one a page. One page serves a primary keyword plus around
six secondary ones; check whether an existing page already covers your keyword before
proposing a new page.

## What a Page Is Made Of

Exactly two files. Nothing else changes when a page is added.

### 1. The Registry Entry

`site/src/lib/workflow-pages/use-cases.ts` exports `SEO_PAGES`. One entry per page:

| Field | Required | Meaning |
| --- | --- | --- |
| `slug` | yes | kebab-case URL segment, used verbatim. Convention: `ai-<use case>` (e.g. `ai-headshot-generator`); drop the `ai-` prefix only when the keyword itself has no "ai" (e.g. `restore-old-photos`, `image-to-3d`) |
| `title` | yes | browser/meta title. Fixed pattern: `<Use Case> \| Comfy Workflows` |
| `h1` | yes | on-page heading. Fixed pattern: `<Use Case> Workflows` |
| `keywords.primary` | yes | the sheet row's keyword, lowercase |
| `keywords.secondary` | yes | ~6 related terms from the keyword cluster |
| `filters.tags` / `filters.models` | yes (may be `{}`) | selects the grid from the live catalog. OR semantics, usage-sorted. Exact tag/model strings |
| `appShareId` | no | App Mode share the hero and closing CTAs open. Only after human verification in cloud (see [quality bar](#the-quality-bar)) |
| `pins` | no | share ids force-included at the top of the grid; `isApp: true` additionally files the pin under the "Comfy Apps" tab, again only after human verification |
| `excludeShareIds` | no | filter matches dropped because they do not serve the page. **Pins bypass excludes**: listing the same share id in both still renders it, so drop the pin rather than trying to exclude it |

A page whose filters and pins resolve to **zero** live workflows is silently skipped: not
routed, not in the sitemap. That is a build-time supply check, and it is why the supply
question comes before anything else.

The title and h1 patterns are site-wide conventions; follow them exactly, a reviewer
will bounce a title that deviates. The `<Use Case>` wording may differ slightly between
the title and the h1 where clarity requires it (two existing pages do this); the
suffixes are fixed.

### 2. The Content JSON

`site/src/content/landing/use-cases/<slug>.json`, validated against the `seoUseCases`
collection schema (`site/src/content/config.ts`). Fields:

| Field | Required | Target |
| --- | --- | --- |
| `extendedDescription` | yes | 2-4 paragraphs. What the use case is, what our workflows do, what to expect |
| `howToUse` | yes | 4-8 steps, each starting with a verb |
| `metaDescription` | yes | 150-160 characters, contains the primary keyword, written as a search snippet |
| `faqItems` | yes | 6-8 `{question, answer}` pairs answering real search questions |
| `subheading` | no | one sentence under the h1, ~120 characters |
| `styles` | no | ~5 `{title, description}` capability cards |
| `capabilitiesIntro` | no | one short line above the capability cards |
| `whyComfy` | no | 4 `{title, description, cloudOnly?}` reasons |
| `applicationsIntro` | no | one short line above the applications section |
| `suggestedUseCases` | no | ~5 strings (or `{title, subtitle}` objects) |

Content rules:

- **Every page's copy is unique.** Read two or three existing files in the same folder to
  match structure and tone, then write fresh for your keyword. Never reuse sentences;
  keep similarity with any existing page low. Duplicate copy across pages is an SEO
  failure that defeats the purpose of the program.
- **FAQs must be factually true of the workflows on the page.** They are emitted as
  FAQPage structured data that search engines read. No claimed capability that the grid
  cannot deliver.
- The content file must have a matching registry entry; an orphaned JSON fails the build.

## Step by Step

The skill walks these phases conversationally; manually, they are:

1. **Facts**: get the keyword row ([source](#where-the-facts-come-from)). No cleared
   keyword, no page.
2. **Gate check**: `gate` must be `OK` (see [Brand Safety](#brand-safety)). Anything else
   stops here until the SEO owner clears it.
3. **Supply check**: query the live catalog for workflows matching a candidate tag:
   `curl -s 'https://cloud.comfy.org/api/hub/workflows/index?status=approved'` and count
   entries whose `tags` include your tag. Zero matches = no page is possible; report
   "blocked on workflow supply" (the Hub workflow team) instead of padding the grid with
   off-topic tags.
4. **App verification**: if the page will have `appShareId` or an `isApp` pin, a human
   opens `https://cloud.comfy.org/?share=<shareId>` and confirms it opens in App Mode
   with its sample assets working. API data alone is not sufficient.
5. **Registry entry**: append to `SEO_PAGES` following the field table above and the
   comment style of the existing entries (each pin/exclude gets a short reason comment).
6. **Content JSON**: create the file per the field table. If a Figma design exists for
   the page, its copy is the source: lift the words, then fill only the gaps (usually
   `metaDescription` and extra FAQs) and label which parts were drafted. If the design
   shows a section the shared page template does not render, stop: that is an engineering
   change, not a content task.
7. **Checks and preview**: see [QA and PR](#qa-and-pr).
8. **Screenshots and PR**: one page per PR, Conventional Commit title
   (`feat(site): add the <slug> use-case page`), desktop and mobile screenshots, and a PR
   body that records the keyword, its volume, the supply counts, where the facts came
   from, and who verified the app link.

## The Quality Bar

A page ships only if all of these hold:

1. **On-topic grid.** Every visible workflow serves the keyword. Tighten filters and use
   `excludeShareIds` rather than accepting drift. An off-topic grid is worse than a
   smaller grid.
2. **At least one App and at least one node graph** in the grid, as the target. Do not
   pad with adjacent topics to fake it.

   This one is a target rather than a hard gate, and the difference matters: several
   live pages ship with no App because none exists on-topic yet. So a page with node
   graphs and no App is a **requester decision**, not an automatic block. Ship it with an
   honestly empty "Comfy Apps" tab and say so in the PR, or hold it until the Hub
   workflow team publishes one. What is never acceptable is implying an App exists when
   it does not. Zero on-topic workflows of any kind remains a hard stop.
3. **Verified CTAs.** `appShareId` and `isApp: true` are set only after a human opened
   the share in Comfy Cloud and saw a working App Mode form with bundled samples. If no
   verified app exists, omit `appShareId` (the grid's top item leads the CTA) and say so
   in the PR. An honestly empty "Comfy Apps" tab is acceptable; a dishonest one is not.
4. **Unique, truthful copy** per the content rules above.
5. **Conventions followed**: slug, title, h1 patterns; one page per PR.

## Brand Safety

Two layers, and the second one is on you:

1. **The build-time denylist** (`site/src/lib/workflow-pages/governance.ts`). A page
   whose slug, primary keyword, h1, or secondary keywords contain a denied term (face
   swap, deepfake, nsfw, and the rest of `BRAND_SAFETY_DENY` in that file, which is the
   authoritative list) fails the build. This is a hard stop by design.
2. **The keyword gate.** A `gate` value other than `OK` (gated, skip, review, or
   blank/unknown) means the keyword must not ship without the brand-safety approver's
   explicit clearance, whatever the denylist says. The denylist only inspects the page's
   own metadata, so it cannot see a **pinned workflow** whose content is the problem.

   The two gate values in use, and what each requires before anything ships:

   | Value | Meaning | Condition to clear |
   | --- | --- | --- |
   | `GATED` | the use case is blocked outright | a consent flow, no celebrity presets, output filters, and C2PA provenance |
   | `GATED-LITE` | the use case ships only in a narrowed framing | outfit / try-on framing only |

   A pin may carry that value so the page records the intent without rendering it:

   ```ts
   pins: [{ shareId: '<id>', gate: 'GATED' }], // recorded, not rendered
   ```

   A gated pin must also appear in the catalog-wide `GATED_SHARE_IDS` set in the same
   file. That pairing is asserted by the resolver tests, so gating a pin without
   withholding it fails; withholding something no page pins is fine. Deleting the `gate`
   field is what publishes the pin, so treat its removal as the approval step itself.

**A gate is about the keyword and the workflow, not about whether the workflow is
reachable.** A gated workflow can be publicly browsable on the Hub and still be barred
from a curated page, because a page endorses and ranks for a search term in a way that
browsing does not.

If you are unsure whether something is gated, it is. Ask the brand-safety approver.

## Assets

Use-case pages own no image files, and there is no upload step:

- The **hero** is the grid's lead workflow's own thumbnail: its still image if it has
  one, or its video when the lead only has a video thumbnail. For curated pages the lead
  is the first pin (provided it has a thumbnail), so choosing pin order chooses the hero.
  A video hero currently renders with no poster frame, so a heavy file leaves the hero
  blank while it downloads. If the intended lead's thumbnail is a large video and another
  on-topic workflow has a still, leading with the still gives a faster first paint.
- **Grid cards** show their own workflows' Hub thumbnails.
- A **broken or missing thumbnail** is a Hub-side problem: flag it to the Hub workflow
  team; never work around it in page code.
- A **custom hero from a design** is not supported by the page template. Either have the
  desired image set as the workflow's thumbnail on the Hub, or treat it as a template
  change for an engineer.

## QA and PR

**If you can run things locally** (Node 20, pnpm 9):

```bash
cd site
pnpm install
pnpm exec vitest run use-case          # resolver tests
pnpm exec eslint src/lib/workflow-pages/use-cases.ts --max-warnings 0
pnpm run check                          # astro type check
pnpm exec astro dev --port 4390         # preview
```

Open `http://localhost:4390/workflows/use-cases/<slug>/` and check: grid on topic, hero
image renders, CTA opens the intended share, FAQ section renders, meta description in the
page source. (If a full `pnpm run build` fails locally on the prebuild templates sync,
use `mkdir -p src/content/templates && pnpm exec astro build`; CI does the full build.)

**If you cannot run things locally**: open the PR as a **draft**. CI runs the same
checks, and the preview deployment posted on the PR shows the real rendered page. Verify
the page on the preview URL, then mark the PR ready.

**PR mechanics**:

- Branch `feat/site-use-case-<slug>`, squash-merge repo, never merge your own PR.
- Screenshots: desktop and mobile of the rendered page, attached to the PR description.
- Pushing new commits after an approval dismisses the approval; batch review fixes into
  one push.
- Reviewers: a site maintainer for code (CODEOWNERS auto-requests them), plus the QA
  owner before launch.

## Editing an Existing Page

Content edits are ordinary file edits, safe by construction:

1. Find the page: slug from the URL (`/workflows/use-cases/<slug>/`).
2. Copy lives in `site/src/content/landing/use-cases/<slug>.json`; wiring (grid, CTAs,
   pins) in that slug's `SEO_PAGES` entry. Nothing regenerates these files; git is the
   only writer.
3. Edit, run the same checks as above, PR with
   `fix(site): <what changed> on the <slug> use-case page`.
4. The brand-safety and orphan checks run on every build, so an edit cannot silently
   bypass them.

## Out of Scope

- **Hub model pages** (`/workflows/model/<slug>`): same content mechanism (the
  `seoModels` collection), different registry; not covered here yet.
- **Marketing-site model launch pages** (`comfy.org/<model>`): different repo and
  process entirely.
- **Localized use-case page content**: the localization pipeline handles translation
  separately; write pages in English.
