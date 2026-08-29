# Shipping experiments on marketing surfaces

How to put an unpolished thing — an interactive demo, a teardown page, a page
that exists mainly to start earning ranking — in front of real traffic without
damaging the numbers GTM and growth steer by.

**Scope.** Every public surface we own: `comfy.org/workflows` (this repo),
`comfy.org` marketing (`ComfyUI_frontend/apps/website`), and anything routed
through `comfy-router`. Product surfaces behind a login are out of scope; they
have their own rollout tooling.

**Who this is for.** Anyone adding a page or a section to a marketing surface
that is not yet ready to be judged on its conversion rate. That includes
engineers shipping a demo for feedback and marketers shipping a page to start
ranking.

This is deliberately short. It is four rules and a checklist.

---

## Why this exists

A demo of MiniMax H3 multi-reference generation went onto `comfy.org/workflows`.
The work was good. How it was placed cost us more than it returned:

- Its "Try MiniMax H3" button became **the second brand-solid CTA on the hub's
  main browse page**, matching the tracked Cloud CTA in visual weight — so it
  competed for the same click.
- It sat **between the hero and the search/browse grid**, pushing the templates
  people come to `/workflows` for further down the page.
- The link carried **no `utm_*` and no `data-*` attributes**, unlike every other
  CTA on that page. Clicks into it were invisible in the funnel — we could not
  even measure the damage.
- The destination was `noindex`, so it earned **no ranking at all** — the thing
  it was partly there to do.
- `Run Workflow` returned 404 for **five days**, because the edge router had no
  rule for the demo's API path. Nothing tested the path end to end, so the first
  report came from a person clicking the button.

Every one of those is cheap to avoid in advance and expensive to discover in
production. Hence the rules.

---

## Rule 1 — Do not take a primary CTA slot

The primary conversion path on a page belongs to the primary conversion action.
An experiment gets a **visually subordinate** entry point.

**Do**

- Place it below the page's main content, not above or inside it.
- Use a secondary/outline treatment, never the same solid brand button as the
  page's real CTA.
- Reuse an existing card or grid pattern rather than inventing a full-width
  section that displaces what is already there.

**Don't**

- Add a second solid-brand button to a page that already has one.
- Insert a section between a hero and the browse/search UI beneath it.
- Auto-play video above the fold on a page whose job is browsing.

**Check:** screenshot the page before and after. If the experiment is the first
thing your eye lands on, it is in a primary slot.

---

## Rule 2 — Don't cannibalize keywords or navigation targets

An experiment must not compete with a page that already ranks or already
converts.

**Do**

- Pick the target keyword **before** building, and check Search Console for a
  page we already have on it. If one exists, improve that page instead.
- Give the experiment its own path (`/workflows/<slug>/`), never a variant of a
  ranking URL.
- Keep it `noindex` until it is stable. Ranking is earned by promoting a proven
  page in one reviewed commit — see Rule 4.

**Don't**

- Ship two pages targeting one query and let Google choose.
- Repoint an existing nav entry, internal link, or canonical at the experiment.
- Flip `noindex` automatically. Indexability that changes with backend uptime
  teaches crawlers the URL is unreliable, which is worse than never indexing it.

**Check:** search `site:comfy.org <your target keyword>`. If we already rank,
you are competing with yourself.

---

## Rule 3 — Instrument it, or you are guessing

An experiment nobody can measure cannot be evaluated, so it never gets removed.

**Do**

- Tag every outbound CTA with the shared helpers in `src/lib/urls.ts`
  (`getCloudLandingUrl`, `getCloudCtaUrl`) so `utm_source` / `utm_medium` /
  `utm_campaign` / `utm_content` match everything else in the funnel.
- Carry the same `data-*` attributes as neighbouring CTAs, so existing click
  tracking picks it up with no new dashboard.
- Write down, in the PR, the number that decides whether this stays, and when
  you will look at it.

**Don't**

- Ship a bare internal `<a>` as an experiment's main CTA.
- Rely on "we'll add analytics later". Later is after the data you needed.

**Check:** can you answer "how many people clicked this last week, and what did
they do next?" without writing new code? If not, it is not instrumented.

---

## Rule 4 — Ship it behind a flag, with a health check that flips it

Anything depending on a pre-alpha or private-beta backend ships switched off by
default and switches itself off when it breaks.

**Do**

- Add the flag to `src/data/experiment-flags.json` and read it through
  `src/config/experimentFlags.ts`.
- Branch in `.astro` frontmatter so the disabled state is **absent from the
  built HTML** — same bytes for crawlers and users.
- Give the off state a **real fallback**, shaped like the surrounding pages,
  with CTAs that go somewhere that works. A page whose only outcome is "try
  again later" is the dead end this policy exists to prevent.
- Add an integration test that drives the real user path against production, and
  a scheduled workflow that switches the flag off and posts to Slack when it
  fails. `.github/workflows/minimax-demo-integration.yml` is the worked example.

**Don't**

- Gate with `client:only`, CSS, or a runtime `fetch`. Crawlers then see a
  different page from users, which is cloaking, and an outage becomes a layout
  shift instead of a clean absence.
- Block the release pipeline on a pre-alpha dependency. Ship the feature off;
  don't hold up unrelated work.
- Switch an experiment back **on** automatically. A passing health check says it
  *can* run, not that it *should* be in front of users. That is a human call.
- Delete the code when you turn it off — that is the point of the flag.

**Check:** build with the flag off and grep the output. If the experiment's
markup, scripts, or media URLs are still in there, the gate is in the wrong place.

---

## Before you open the PR

- [ ] Target keyword chosen, and checked against what already ranks (Rule 2)
- [ ] Not the page's most prominent CTA; before/after screenshots in the PR (Rule 1)
- [ ] All CTAs tagged with the shared `utm_*` helpers and matching `data-*` (Rule 3)
- [ ] `noindex` until proven; not wired to any automatic toggle (Rule 2)
- [ ] Flag added, **default off**, read at build time (Rule 4)
- [ ] Static fallback exists, resembles neighbouring pages, CTAs go somewhere live (Rule 4)
- [ ] Integration test drives the real user path against production (Rule 4)
- [ ] Scheduled health check flips the flag off and notifies Slack (Rule 4)
- [ ] PR names the success metric and the date you will review it

## Turning one off

1. `pnpm experiment-flag <name> off --reason "..."` in `site/`
2. Commit `site/src/data/experiment-flags.json`
3. Run **Deploy Template Site**, or wait for the nightly rebuild

The code stays. Switching it back on is the same command with `on`, plus a
deploy — and should be a deliberate decision, not an automatic consequence of a
green health check.

## Related

- [`ab-testing-guide.md`](./ab-testing-guide.md) — for measuring variants of a
  surface that already works. This document is about surfaces that might not.
- [`seo-setup-guide.md`](./seo-setup-guide.md) — Search Console, sitemaps, and
  the monitoring loop referenced in Rule 2.
- [`design-integration-guide.md`](./design-integration-guide.md) — the SEO,
  i18n, and telemetry components never to drop when implementing a design.
