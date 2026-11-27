# Contributing: template PRs and docs PRs

Two different reviews, two different rule sets. Pick the one that matches the change; do not mix them in a single
branch unless the template change *needs* the docs change to make sense (e.g. a new page section that explains the
new template).

## Template PRs

### Scope

- **One model family per PR.** Variants of the same model (t2v / i2v / r2v, text / image / multiview, avatar /
  reference) ship together, in one PR, as separate template entries. Different vendors, or different series of the
  same vendor, never share a PR — a reviewer cannot accept half of it.
- **One template = five things, all present:**
  `templates/<name>.json` · `templates/<name>-1.webp` (400×400, webp) · `input/<name>_input.*` ·
  `output/<name>.*` · an entry in `templates/index.json`.
- **Do not touch what CI generates.** `packages/**/manifest.json`, `packages/**/media/**` and the root
  `pyproject.toml` version are produced on release. A template-only PR leaves them alone; a PR that hand-edits them
  hides a real build break.
- **`bundles.json` membership is a human decision.** A new template has no bundle row by default; do not invent one
  unless the reviewer asked for it in the PR.

### The graph

House rules live in `SKILL.md` (node titles, groups, colour, deprecated nodes, `Text (Multiline)`, no `null`
`slot_index`). Two checks that are easy to skip and expensive to miss:

```bash
python3 scripts/validate/validate_templates.py            # JSON schema + cross-file consistency
python3 scripts/validate/validate_manifests.py            # package manifest vs templates/
python3 scripts/validate/validate_widget_types.py --object-info <live /object_info>   # wrong JSON types in widgets
```

Run them on `origin/main` first and keep that output: only **new** errors are yours. Known pre-existing failures on
`main` (a manifest SHA mismatch, `index.mcp` drift) are not caused by your PR and must not be "fixed" inside it.

### Copy and translations

Title and description are user-facing product copy, not a changelog. English is authoritative; all 13 non-English
locales are required before merge:

`zh`, `zh-TW`, `ja`, `ko`, `es`, `fr`, `ru`, `tr`, `ar`, `fa`, `pt-BR`, `it`, `he`

1. Add the entry to `templates/index.json` (English).
2. Run `python3 scripts/sync/sync_data.py --templates-dir ./templates`.
3. Fill every locale in `scripts/data/i18n.json` under `templates.<name>`.
4. Run the sync again so `index.<locale>.json` picks the translations up.

Never leave a locale holding the English string: it reads as a broken product in that market, and machine translation
gets product verbs wrong (`Video Translate` → "move the video"). Review the verb, not just the brand prefix.
See `docs/I18N_GUIDE.md`.

### Assets

- The demo input must be **new**: its sha256 cannot appear in `input/` or in another template. Reusing a shipped
  sample hides a missing asset and fails the input-asset gate.
- The demo output must be the real run of *this* graph, not a placeholder or a resized screenshot.
- Video outputs: the poster frame is part of the asset set; audio outputs ship the audio file.

### Review surface

Put the reviewer's evidence in the PR body so nobody has to open files: workflow graph screenshot, demo result
(video frame / output image / audio waveform) and the 400×400 thumbnail, plus one line per template stating the
content gate result and the sibling it was derived from.

Automated/generated PRs follow the same rules **plus**: they open as `--draft`, they start with a
"this is an automated draft, not a real PR" disclaimer naming the generation date, and they never self-merge.

### CI

| workflow | what it means |
| --- | --- |
| `validate-templates.yml` | JSON schema, names, thumbnails, cross-file consistency |
| `validate-manifests.yml` | package manifest ↔ templates tree |
| `validate-widget-types.yml` | widget values stored with the wrong JSON type (needs a live `/object_info`) |
| `version-check.yml` | automatic patch bump — do not bump versions by hand |
| `link-checker.yml` | dead URLs in notes/description |
| `preview-site.yml` | Astro preview build for the site |

A freshly pushed branch can sit at `action_required` with no Actions run at all; that means a maintainer still has
to approve the workflows, not that CI passed.

## Docs PRs

### Where docs live

- `docs/` — contributor-facing markdown: `SPEC.md`, `I18N_GUIDE.md`, `PUBLISHING.md`, `BLUEPRINTS.md`,
  `publishing-workflow-templates.md`, `CREATORS.md`, plus `docs/pictures/` for images referenced by them.
- `site/` — the Astro site. It has its own `site/AGENTS.md` and its own toolchain (`pnpm`); site changes do not
  belong in a template PR and are not reviewed with the template checklists.
- `.claude/skills/` — agent skills. A docs change to a skill is still a docs PR: English, no local absolute paths,
  every script it names must exist in the pack.

### Rules

- **Markdown only.** A docs PR does not regenerate `templates/index*.json`, `manifest.json`, bundles or the
  packages tree. If a docs change seems to need them, it is really a template PR.
- **Screenshots go in `docs/pictures/`**, referenced by relative path. Do not hotlink a personal CDN.
- **Relative links must resolve on `main`**, not only on your branch — the link checker runs against the merge
  result.
- **No secrets, no internal links.** Slack permalinks, internal boards and customer data are rejected by the
  public-content gate; describe the process instead of linking to where it was discussed.
- **Command examples must run as written** from the repo root. If a command needs a live backend, say so in the
  same line rather than making the reader discover it.

### Skill packs (`.claude/skills/<name>/`)

- `SKILL.md` is the hub: frontmatter (`name`, `description` with real trigger phrases), the rules every use must
  follow, a routing table, and the scripts to run. Keep it under ~15k characters; move detail into
  `references/<topic>.md` and add a routing row.
- Every reference and script named in `SKILL.md` must exist; a dangling reference is a review blocker.
- Scripts are runnable, deterministic, exit non-zero on a broken invariant, and take file paths as arguments — no
  hard-coded `/Users/<name>/...`.
- Skills are English. Workflow note copy is English. No dates or PR numbers in the body (that turns a skill into a
  log).

### PR body for docs

`## What` (one paragraph), `## Contents` (file list with one line each), `## Verified` (the commands you actually
ran and their real output). Screenshots for anything visual. No marketing summary.

## Review checklist (both kinds)

- [ ] The diff contains only what the PR claims; no formatting-only churn, no regenerated artifacts.
- [ ] Every new file is referenced by something (index, routing table, docs link) — no orphans.
- [ ] Names match the graph: template name, title, `filename_prefix` tokens, output file name.
- [ ] Validators run on `origin/main` and on the branch; only new errors are treated as failures.
- [ ] Translations cover all 13 non-English locales, and the verbs are right.
- [ ] Thumbnail is 400×400 webp and shows the actual result.
- [ ] The PR body carries the evidence a reviewer needs without opening the JSON.
