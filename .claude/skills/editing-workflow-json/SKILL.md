---
name: editing-workflow-json
description: "Edits an existing ComfyUI workflow JSON safely and lays it out the way this repo ships templates. Use when asked to: group a workflow, add groups to a workflow, tidy or re-group a workflow, lay out a workflow, fix broken links in a workflow, repair a workflow JSON, edit a note in a workflow, change a workflow parameter, wrap a chain into a subgraph, audit a template's wiring, explain why a template will not load. Triggers on: group workflow, workflow groups, layout workflow, workflow json edit, broken link, link integrity, subgraph, node size, note copy, template layout."
---

# ComfyUI Workflow Editing

Maintaining, updating and repairing ComfyUI workflow files (`.json`, the graph format the frontend exports):
adding/updating Note nodes, changing parameters, re-grouping a loose draft, removing switch branches,
re-wiring after a node change.

**This file is the hub: the rules that decide whether a graph is acceptable, the safe edit/verify loop, and a
routing table. Everything else lives in `references/` and is loaded on demand — read the one that matches the
task instead of guessing.**

> **Language rule: ALL workflow note copy and every update to this skill is written in English** — shipped templates
> are English-only, so never ask whether a Chinese version is wanted.

## House rules for workflow edits

- **Never replace a node's own name.** A custom `title` must keep the UI display name and may only add a
  parenthetical hint — `Int (Turbo steps)`, `Replace Text (Regex) (count the boxes)`, `Int (Setps)`-style typos
  get fixed, the node type does not disappear. A title that hides the type makes the node unfindable in search;
  the stage name belongs to the **group**, not the node.
- **Groups, not sentences.** Group titles in one graph share one style: short noun phrases (`Models` /
  `Conditioning` / `Sampling` / `Mask & Output`). Never a full sentence ("Decoding and applying mask to source
  image"). Every non-note node sits inside some group; no floating nodes, no single "Core Pipeline" frame.
- **Socket names carry meaning.** Don't ship one output as `image` with a `_image` suffix and the next as `MASK`
  (the type badge already says IMAGE/MASK), don't mix naming styles, and drop outputs that nothing consumes.
- **Model-intrinsic widgets stay at their default.** Fixed training resolution (`TextEncodeFibo2` `width/height`)
  and a model's fixed prompt are not user parameters — exposing them only lets the user break the template.
- **Colour is a spotlight, not a legend.** Every group keeps the default frame (omit `color`, or `#3f789e`);
  at most the one core group a newcomer must find first may be red `#A88`, and `#444` marks a bypassed path.
  Never one colour per module — varied frames scatter attention instead of aiming it. Notes are black
  `#222`/`#000`, never yellow (`#432`/`#653` **is** the api_node pair, so a yellow note reads as a partner
  node). Node accents are off unless the graph is genuinely complex, then at most one hero node in red
  `#322`/`#533`. Palette names, table and rationale: `references/layout-and-groups.md`.
- **Never ship a deprecated node.** Zero tolerance — a graph that queues is not a graph that ships. Before adding a
  node, read its flag from a running instance (`curl /object_info/<Class> | jq '.[].deprecated'`) or from source
  (`grep -n 'is_deprecated=True' comfy_api_nodes/*.py`), and re-check the finished graph. Known swaps:
  `ImageBatch` → `BatchImagesNode` (inputs become autogrow `images.image0`, `images.image1`; extra empty slots carry
  `"shape": 7`), `ImageCrop` → `ImageCropV2` (one `crop_region` widget `{x,y,width,height}`, not four ints),
  `PrimitiveString` → `PrimitiveStringMultiline`, `Preview3D` → `Preview3DAdvanced` (widgets `["", 1024, 1024]`,
  and feed `model_3d` from the 3D-file output, not from the path STRING). A bypassed (`mode: 4`) node still ships —
  the rule covers it.
- **A standing string is `Text (Multiline)`, never `Text`.** Prompts, instructions and ids the user reads belong in
  `PrimitiveStringMultiline`; the single-line `PrimitiveString` box cuts the copy off. Use the single-line node only
  for a value that is genuinely short and never grows (a file suffix, a numeric token).
- **One note per purpose.** "What this model is / what the graph does" is its own `MarkdownNote`; repo links,
  download tree and `Report Issue` stay in the existing `Model Links` note. Two notes carrying the same table cannot
  be told apart. Note copy is English, and a note never replaces an existing one's job.
- **Never write `null` into a schema-typed slot field.** `"slot_index": null` (signature: every optional slot prop
  materialised as null) fails the frontend's zod schema, and the template loader silently degrades the graph to
  legacy mode instead of failing loudly. Omit the key; index comes from array position. Check with
  `scripts/validate_workflow_schema.mts` — repo CI does **not** catch this one.

## Routing table

| task | load |
|---|---|
| lay out or re-group a graph: module frames, row grids, gaps, node sizes, first-view fit, colour restraint | `references/layout-and-groups.md` |
| a template broke after an edit — links, ids, slots, socket names, hidden presentation links | `references/link-integrity.md` |
| UUID-typed nodes, promoted subgraph inputs, wrapping a chain into a subgraph | `references/subgraphs.md` |
| gcd ratio with core nodes, filename-prefix tokens, core text/JSON limits, loop + array pitfalls, model download metadata | `references/editing-recipes.md` |
| note copy conventions for a shipped template (length, structure, numbers from the schema) | skill `/managing-templates`, plus the note rules above |
| the graph loads "wrong" / fails zod (`expected number, received null`), or a hand-assembled file needs validating | `references/workflow-schema-validation.md` |
| naming a node's `title`, display-name table, serial numbers, byte-safe title edits | `references/node-titles.md` |
| a bug that cost a real round-trip (read before "simplifying" a working chain) | `references/pitfalls.md` |
| opening the PR: template vs docs rules, translations, assets, validators, CI, what the body must contain | `references/contributing-prs.md` |

Scripts (run them, don't eyeball):
`scripts/check_wf_links.py` (links/slots of one workflow, exits non-zero on a broken invariant),
`scripts/check_wf_colors.py` (colour restraint: notes, group frames, node accents; `--strict` also fails on warnings),
`scripts/layout_grid.py` (deterministic grid layout for a whole graph),
`scripts/audit_links.py` (structural scan across a directory of workflows),
`scripts/validate_model_links.py` (model download metadata: HF URL ↔ `properties.models` ↔ loader widget),
`scripts/validate_workflow_schema.mts` (frontend zod schema — run it on every hand-assembled or regenerated workflow),
`scripts/linkfixer_audit.test.ts` (vitest harness that reuses the frontend's own link checker).

## Core Principle (explicitly corrected by the user — always follow)

**Check for existing nodes BEFORE deciding to add new ones.** Many workflows already ship with placeholder Note nodes (titles like `Note: About XXX`, `Note: Model Links`) whose `widgets_values` is just empty. Simply update the widget value — don't invent new nodes and don't over-research. Just update the widget value — new nodes and extra research are the wrong answer here.

## Safe Editing Workflow

1. List all `*.json` in the target folder; `json.load` each to confirm it's a valid workflow
2. Find existing Note nodes: `grep -c '"type": "Note"'`, then use Python to print each Note's id / title / widgets_values to spot the empty shells
3. **Only change `widgets_values[0]`** (and `title` if needed) — leave every other field untouched
4. Before writing back, verify lossless formatting: `json.dumps(data, indent=2, ensure_ascii=False) == original` (ComfyUI-exported files are 2-space indent + LF; the roundtrip should be byte-identical; if not, diff first, then decide)
5. Write back with `json.dump(data, f, indent=2, ensure_ascii=False)` + trailing `f.write("\n")`
6. Re-load after writing to verify the JSON is valid, and print each Note's new content to confirm
7. **Verify markdown actually renders** (cheap, real check): the frontend ships `marked` in
   `the ComfyUI frontend checkout's node_modules`. Run
   `node -e 'const {marked}=require("marked"); …'` on the note text and assert the heading/bullet/fence/link
   counts you expect, plus no leftover literal ``` fences. This catches malformed lists, unclosed fences and
   dead-copy glitches without launching the app.

For batch edits across files, do it in one Python script (ABOUT dict keyed by filename, shared MODEL_LINKS).

## Verifying a workflow change for real against a local ComfyUI

A local server is usually on `http://127.0.0.1:8188` — check `curl -s --noproxy '*' .../system_stats`. The `--noproxy '*'`
is **required**: the proxy env otherwise swallows localhost.

* `POST /prompt` with `{"prompt": <API format>, "client_id": "..."}`, then poll `/history/<prompt_id>`; a
  `Preview as Text` node's value comes back as `outputs[<id>]['text']`, and `status.messages` carries the real error
  when it fails.
* API-format naming: dynamic combo = flat dotted keys (`{"mode": "simple", "mode.num_iterations": 24}`), autogrow =
  `inputs.input0` / `values.a`, MatchType inputs are a plain link.
* To test an edit without loading any model, extract only the nodes you touched from the workflow JSON, convert them to
  API format with a short script, and feed the upstream values with `Primitive Int` nodes. This exercises the
  serialized node ids, links and **slot indices** for real — a wrong output slot (e.g. reading slot 1 off a
  single-output `Primitive Int`) is rejected with `list index out of range` in the matchtype validator.

## Workflow JSON Structure Cheatsheet

Top-level fields: `id`, `revision`, `last_node_id`, `last_link_id`, `nodes`, `links`, `groups`, `config`, `extra`, `version`.

Node fields: `id`, `type`, `pos` [x,y], `size`, `flags`, `order`, `mode`, `inputs`, `outputs`, `properties`, `widgets_values`, optional `title`.

- **Legacy nodes**: `type` is a name, e.g. `SaveVideo`, `LoadImage`, `KSampler`
- **New UUID nodes** (comfy-core 0.30+): `type` is a UUID string (e.g. `8b4f085c-1bb3-4ecd-aeed-603a8d6d3970`), `properties.cnr_id` names the source (e.g. `"comfy-core"`). Node definitions come from the backend server registry and are fetched at runtime by the frontend — you do **NOT** need to resolve the UUID→name mapping locally; infer purpose from inputs/outputs/widgets instead
- **SaveVideo** `widgets_values[0]` is the output path — useful for confirming the workflow kind (e.g. `video/LTX_2.5_t2v` → T2V)
- **LoadImage** `title` can distinguish roles (`Load First Frame` / `Load Last Frame`)

## Node Titles

A custom `title` hides the node type in the header, so the node becomes unfindable in search. Keep the node's own
name and put any hint in parentheses — `Replace Text (Regex) (count the boxes)`, `Int (Width)` — using the display
name the UI shows, never the raw `node_id`. The default is no title at all. Naming table, serial-number rules and the
safe text-level edit procedure: `references/node-titles.md`.

## Submitting a prompt for review

**Always ship the full UI graph.** When queueing programmatically (`POST /prompt`), pass the canvas in
`extra_data.extra_pnginfo.workflow` alongside the API prompt:

```python
body = {"prompt": api_prompt, "extra_data": {"extra_pnginfo": {"workflow": ui_graph}}}
```

The API prompt alone (`class_type` + `inputs`) is enough to execute but leaves the queue entry with no canvas, so the
frontend's "Open as workflow in new tab" does nothing and the user cannot review the run. Never skip this to save
keystrokes — the user reviews every run in the UI and will call it out. Symptom when it was skipped: the saved PNG
contains only a `prompt` text chunk and opens as a flat API node list; after a correct submission the PNG carries both
`prompt` and `workflow`, and `workflow` must have non-empty `nodes` + `links` (plus `definitions.subgraphs` when the
graph uses one) — assert that on the downloaded file, not on the request you sent. Build one UI graph (nodes with
`pos`/`size`/`widgets_values`, plus `links`) and submit both halves.

## Self-update protocol (do this without being asked)

> A dedicated single-model variant (one adapter/checkpoint) is one straight path: no `ComfySwitchNode` +
> `PrimitiveBoolean` + fallback scheduler — that pattern belongs to general templates. Verify the rewrite with
> `scripts/check_wf_links.py`.

This skill is the project's memory for workflow-JSON work. The moment you finish a task and you learned something that
would have saved you a round trip — a new node family, a serialization quirk, a validator behaviour, a safe editing
order, a user preference about workflow files, a dead end — patch the skill **in the same turn**, before reporting back.
Don't ask whether to update it; don't wait to be told.

| what you learned | where it goes |
|---|---|
| serialization/structure fact, node family, validator behaviour, editing order, note-copy preference | the `references/<topic>.md` that owns it; SKILL.md keeps only rules every edit must follow |
| a one-line gotcha | `references/editing-recipes.md` (`Loop / array pitfalls`), or a new row in this table |
| repo-level flow (index/bundles/manifest/CI/PR/archive/publish, `minComfyUIVersion` sweeps, deprecated-node migration sweeps) | sibling skill `workflow-templates-maintenance` (§19 for migrations) |
| a check or transform you ran more than once | ship it as a script: `scripts/` of the owning skill, then name it in the body so future runs find it |

**Budget: SKILL.md ≤ ~15k chars** — it is loaded whole on every trigger. Past that, the lesson goes into the matching
reference (new `references/<topic>.md` if none fits) and SKILL.md gains a routing row instead of a section.

Entry format — no session narration:

```
<trigger / symptom> -> <root cause> -> <fix that worked> -> <how to verify>
```

Keep the hard numbers that make it checkable (counts, node ids, socket names, file names). Never write PR numbers, dates,
"today I…", or a narrative of what happened — that turns the skill into a log.

Rules:

* Patch the section that already owns the topic; add a new section only when nothing fits.
* One fact per bullet; past ~4 lines, move the detail to `references/<topic>.md` and keep a pointer.
* If the skill told you something wrong and you found the correction, **rewrite that text in place** instead of appending a
  contradicting note — two versions of a rule is worse than one stale rule.
* Cross-link only for common traps: one line in the sibling skill pointing at the section that owns the detail.
* Skill text and workflow note copy stay English.

## Maintenance Reminder (important)

**Templates live in `this repo` (often a `template-update-*` branch); a file pasted from `a local export` is often byte-identical (`diff` first). Names and registrations live in `index*.json` plus `bundles.json`; flag name-vs-graph mismatches and pending translations in `scripts/data/i18n.json`.**



This skill is a living document: every use that taught you something must leave a trace behind — follow the
**Self-update protocol** at the top of this file (patch in place, no session narration, ship repeatable checks as
`scripts/`).
