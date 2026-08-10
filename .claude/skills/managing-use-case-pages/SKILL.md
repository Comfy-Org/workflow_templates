---
name: managing-use-case-pages
description: "Creates and edits SEO use-case landing pages at comfy.org/workflows/use-cases. Guides keyword clearance, workflow supply checks, App Mode verification, the page registry entry, editorial content, quality gates, and the PR. Use when asked to: add a use case page, create a landing page for a keyword, publish a new use case, build a page for <keyword>, edit a use case page, update the FAQ on a use case page, change use case page content, address review feedback on a use case page PR. Triggers on: use case page, use-case page, landing page, SEO page, new page for keyword, page for workflows."
---

# Managing Use-Case Pages

You are helping someone ship or update an SEO use-case landing page on the workflow site
(`comfy.org/workflows/use-cases/<slug>/`). The requester may be a content manager, a
growth person, or an engineer; they should never need to understand JSON, TypeScript, or
the build pipeline. You handle all of that. They contribute facts, judgment, and
approval.

The full rules live in [site/docs/use-case-page-guide.md](../../site/docs/use-case-page-guide.md).
This skill is the procedure; when it says "per the guide", follow that document.

## How to interact with the requester

These rules apply to every step below, whether you run interactively (a person in the
conversation) or non-interactively (triggered from a Slack thread or a PR comment):

1. **Decisions are theirs, mechanics are yours.** Never invent a keyword, a clearance,
   or an app link. Never ask them to write JSON. Site-wide conventions (slug, title, h1
   patterns) are *presented* for correction, not asked as questions; decisions and
   content require an explicit yes.
2. **If you cannot ask the requester directly** (no interactive session), post your
   question where the request came from (the Slack thread or the PR) and **stop until a
   named human answers**. Do not proceed on assumptions.
3. **Silence is not approval.** Every approval point below requires an explicit yes.
4. **Never merge a PR**, never mark your own PR ready without the requester's go-ahead,
   and never push extra commits to an approved PR (pushing dismisses approvals; batch
   fixes into one push).

## Entry point A: create a new page

### Step 1: Collect the facts

Ask the requester for the keyword's row from the planning source named in the guide's
"Where the Facts Come From" section (currently an internal keyword sheet; they paste the
row or state the values). You need:

- the **keyword** (e.g. "ai logo generator")
- the **gate** value (brand-safety clearance)
- the **published workflow / app links** for it, if any
- search volume if available (goes in the PR body)

If the keyword has no row, ask whether the SEO owner has cleared it. No confirmed
clearance means stop (see Step 2). Record where the facts came from; the PR body will
state it.

Also check whether an existing page already serves this keyword: read the
`keywords.primary` and `keywords.secondary` of every entry in
`site/src/lib/workflow-pages/use-cases.ts`. If one matches, propose extending that page
instead of creating a near-duplicate.

### Step 2: Gate check (hard stop)

If `gate` is anything other than `OK`, or clearance cannot be confirmed, stop and tell
the requester the keyword needs the SEO owner's sign-off first. Additionally run the guide's
brand-safety denylist against the keyword yourself and stop on a hit; the build would
fail on it anyway, but fail early and explain why.

### Step 3: Supply check (hard stop on zero)

Find out what the grid would contain before promising a page. Query the live catalog:

```bash
HUB_INDEX=$(mktemp)
curl -s 'https://cloud.comfy.org/api/hub/workflows/index?status=approved' -o "$HUB_INDEX"
python3 - "$HUB_INDEX" <<'EOF'
import json, sys, urllib.request
raw = json.load(open(sys.argv[1]))
entries = raw if isinstance(raw, list) else raw.get('workflows', raw)
TAG = 'REPLACE WITH CANDIDATE TAG'
hits = [e for e in entries if TAG in (e.get('tags') or [])]
print(len(hits), 'tag matches')
# The index carries NO reliable app signal; the truth is per workflow. Sweep the
# matches' detail records for workflow_json.extra.linearMode (slow-ish, ~1s each).
apps = []
for e in hits:
    sid = e.get('shareId')
    try:
        with urllib.request.urlopen(f'https://cloud.comfy.org/api/hub/workflows/{sid}', timeout=30) as r:
            detail = json.load(r)
        if ((detail.get('workflow_json') or {}).get('extra') or {}).get('linearMode') is True:
            apps.append((sid, e.get('title')))
    except Exception as err:
        print(' ', sid, 'detail fetch failed:', err)
print(len(apps), 'of', len(hits), 'are App Mode')
for sid, title in apps:
    print('  APP', sid, '|', title)
for e in hits[:15]:
    print(' ', e.get('shareId'), '|', e.get('title'))
EOF
```

Try the tags that plausibly match the keyword (tags are exact strings; list the catalog's
tags if unsure). Rules:

- **Zero on-topic matches**: no page is possible. The build silently drops a page with an
  empty grid. Report "blocked on workflow supply, this needs the Hub workflow team" and
  stop. Never pad the grid with off-topic tags to fake supply.
- A page wants **at least one App and at least one node graph** in its grid (guide,
  "The Quality Bar"). The sweep above gives you both counts; they go in the PR body.
- **Workflows exist but none of the on-topic ones is an App**: this is a requester
  decision, not yours. Ask explicitly: ship now with an honestly empty "Comfy Apps" tab
  (noting "no on-topic App exists yet" in the PR body), or hold the page until the Hub
  workflow team publishes one. Wait for the answer.

### Step 4: App verification (human eyes required)

If the page should have a "Try on Cloud" button opening an App (`appShareId`), or a pin
marked `isApp: true`, ask the requester (or the person they delegate) to open
`https://cloud.comfy.org/?share=<shareId>` and confirm: it opens in **App Mode** (a form,
not the node canvas) and its sample assets load. Only after that confirmation may you set
those fields. API data alone (`linearMode`) says it is an app, not that it works.

If no verified app exists, omit `appShareId` entirely and note it in the PR. An empty
"Comfy Apps" tab is honest; a broken button is not.

### Step 5: Apply the conventions and show them

Derive and present, without asking (they are site-wide conventions, per the guide):

- slug: kebab-case, usually `ai-<use case>` (e.g. `ai-logo-generator`)
- title: `<Use Case> | Comfy Workflows`
- h1: `<Use Case> Workflows`

Show the requester: "Your page will be `/workflows/use-cases/ai-logo-generator/`, titled
'AI Logo Generator | Comfy Workflows'." They only need to speak up if the use-case
*name* is wrong. Propose ~6 secondary keywords from the cluster and get a yes.

### Step 6: Content

Sources, in order of preference:

1. **A Figma design for the page**: extract the copy from it (if you cannot access
   Figma, ask the requester to paste the text or drop screenshots and read the text from
   those). The design's words win. Fill only the gaps, usually `metaDescription` and
   extra FAQs, and label which parts you drafted. **If the design shows a section the
   page template does not render, stop and say that part needs an engineer; do not
   improvise template changes.**
2. **Copy the requester provides**: format it into the fields.
3. **Nothing provided**: draft everything yourself.

Before drafting, read two or three existing files in
`site/src/content/landing/use-cases/` to match structure and tone. Then write fresh copy
for this keyword; never reuse sentences from other pages. Field targets are in the
guide's content table (metaDescription 150-160 chars containing the primary keyword;
howToUse 4-8 verb-first steps; 6-8 FAQs answering real search questions and claiming
nothing the grid cannot do).

**Review checkpoint (mandatory):** present the draft to the requester section by section
in plain English, not JSON: headline, subheading, description, each FAQ, the workflows
the grid will show, and what the button opens. Apply their edits verbatim. Do not write
any file until they approve the content.

### Step 7: Write the two files

1. Append the entry to `SEO_PAGES` in `site/src/lib/workflow-pages/use-cases.ts`,
   following the existing entries' comment style (each pin and exclude gets a short
   reason comment).
2. Create `site/src/content/landing/use-cases/<slug>.json` with the approved content.

Touch nothing else. Never edit the resolver, governance, templates, or generated
directories for a page addition.

### Step 8: Checks and preview

If the environment can run them (Node 20, pnpm 9):

```bash
cd site
pnpm install
pnpm exec vitest run use-case
pnpm exec eslint src/lib/workflow-pages/use-cases.ts --max-warnings 0
pnpm run check
pnpm exec astro dev --port 4390
```

Check `http://localhost:4390/workflows/use-cases/<slug>/`: on-topic grid, hero image
renders, CTA target correct, FAQs render, meta description present in the page source.

If the environment cannot run them: commit, push the branch, and open a **draft** PR.
CI runs the same checks and a preview deployment gets posted on the PR; verify the page
on the preview URL instead. Either path is valid.

**Second review checkpoint:** show the requester the rendered page (local URL,
screenshots, or the PR preview link) and get an explicit yes before the PR leaves draft.

### Step 9: The PR

- Branch: `feat/site-use-case-<slug>`. Commit: `feat(site): add the <slug> use-case page`.
- One page per PR.
- Screenshots: desktop and mobile of the rendered page in the PR description.
- PR body states: the keyword and volume, where the facts came from, the supply counts
  (apps / node graphs in the grid), who verified the App Mode link, and which content
  came from a design or the requester versus drafted.
- Request review from a site maintainer; QA per the guide. Then hand the PR link to the
  requester. Your job ends there: humans review and merge.

## Entry point B: edit an existing page

1. Identify the page from the URL or name; slug = the last segment of
   `/workflows/use-cases/<slug>/`. Confirm with the requester if ambiguous.
2. Copy lives in `site/src/content/landing/use-cases/<slug>.json`; grid/CTA wiring in
   that slug's `SEO_PAGES` entry. Show the requester the current content of the sections
   they want changed, in plain English, before touching anything.
3. Apply their changes (the brand-safety rules still apply to new text; a gate-relevant
   change stops per Step 2). Keep all other fields untouched.
4. Same checks as Step 8, then a PR:
   `fix(site): <what changed> on the <slug> use-case page`.

## Entry point C: address review feedback on an open page PR

1. Ask which PR (or take it from the thread). Check out its branch; read the review
   comments (`gh pr view <number> --comments` and the review threads).
2. Propose the changes to the requester first, in plain English, even when the
   instruction came from a reviewer; they are accountable for the page.
3. Apply all agreed fixes, re-run the Step 8 checks, and push everything as **one**
   batch (pushing dismisses approvals in this repo, so never trickle commits). Reply to
   the review threads with what changed.

## Common requests

| Requester says | What to do |
| --- | --- |
| "Add a page for <keyword>" | Entry point A from Step 1 |
| "Here's the sheet row / the keyword is cleared" | That is Step 1 input; continue |
| "Here's the Figma for the page" | Step 6, source 1 |
| "Change the FAQ on the <x> page" | Entry point B |
| "Reviewer wants changes on PR #N" | Entry point C |
| "Why is my page not showing?" | Check supply: its grid probably resolves to zero (Step 3) |
| "Make the hero image different" | Explain hero = the lead pin's own thumbnail; reorder pins or route a thumbnail change to the Hub workflow team (guide, "Assets") |
| "Add this extra section from the design" | If the template has no such section, stop: engineering change |

## Important rules

1. Gate not `OK`, or unclear: **stop**. Zero supply: **stop**. Unverified app: **do not
   set `appShareId` or `isApp`**.
2. Never edit files outside the two page files for a page task.
3. Every page's copy is unique; never copy sentences between pages.
4. FAQs and descriptions claim nothing the page's workflows cannot actually do.
5. The requester sees and approves content before files are written, and the rendered
   page before the PR leaves draft.
6. Never merge; never push to an approved PR except as one agreed batch.
7. When the planning source seems to have moved, check the guide's "Where the Facts
   Come From" section rather than guessing.
