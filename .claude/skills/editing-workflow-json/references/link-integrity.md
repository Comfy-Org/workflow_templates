# Link integrity, sockets and hidden links

The wiring invariants that break templates, how to audit them with the frontend's own code, and where
presentation-only links live.

## Link integrity: the three-way invariant (the #1 source of "my template broke")

Every connection must exist in **three** places, in the same container (top level and each
`definitions.subgraphs[]` have independent `links`/node-id spaces):

| place | shape |
|---|---|
| container `links[]` | `[id, origin_id, origin_slot, target_id, target_slot, type]` at top level, `{id, origin_id, …}` object form inside subgraphs |
| origin node | `outputs[origin_slot].links` contains `id` |
| target node | `inputs[target_slot].link == id` |

Break any one of them and the frontend shows a **"Workflow Validation" toast on open**. That toast comes from
`src/utils/linkFixer.ts` (`fixBadLinks`, adapted from rgthree's link_fixer) via
`platform/workflow/validation/composables/useWorkflowValidation.ts`, which calls it with `fix: true` and pipes the log
lines into the toast. Message → meaning:

* `N is funky... target(T).inputs[K].link is NOT correct (is null), but origin(O).outputs[0].links contains it` — the link
  and the origin's output list have it, the target input lost it (stale `target_slot`, or an input array that was rebuilt).
* `N is funky... origin(O).outputs[0].links does NOT contain it, but target(...) does` — the reverse (origin's list lost it).
* `> [PATCH] target(...).inputs[K].link is not defined, will set to N` — it re-attaches by **slot index**.
* `> [PATCH] target(...) is defined, removing N from origin(...)` — that slot already holds another link; one gets dropped.
* `N is def invalid; BOTH origin node … and … target node …` — link deleted.
* `Made N node link patches, and M stale link removals.` — the summary line.

Three consequences that are easy to get wrong:

1. **The patch is in memory only.** It does not rewrite the file; opening the workflow again re-reports. Fix the file.
2. **It patches by index, so a stale `target_slot` gets attached to the WRONG socket and the toast disappears.** A real case:
   a 3D model path (`STRING`/`FILE_3D…`) landed on `camera_info` (`LOAD3D_CAMERA`) because the old socket lived at index 2.
   "No more funky" is not the same as "correct" — always also check link type vs socket type.
3. **Phantom ids are invisible to it**: `outputs[].links` keeping ids that no longer exist in `links[]` is wrong but
   `fixBadLinks` only iterates `links[]`, so it stays silent forever. Recompute `outputs[].links` from `links[]` in bulk
   (`[l.id for l in links if l.origin_id==n.id and l.origin_slot==s]`) whenever you touch a graph structure.

Also note `fixBadLinks` **only walks the top-level graph** — subgraph-internal links are never validated, so a subgraph bug
survives every toast-free open.

### Audit with the frontend's own code (authoritative, ~2 s for 700 templates)

`scripts/linkfixer_audit.test.ts` is a ready-made vitest harness. Copy it into
`the ComfyUI frontend checkout/src/utils/`, point `AUDIT_DIR` at a `templates/` directory and run:

```bash
cd the ComfyUI frontend checkout
env -u PYTHONPATH AUDIT_DIR=<dir> npx vitest run src/utils/linkfixer_audit.test.ts
head -30 /tmp/linkfix_audit.txt     # "AUDIT files=N withIssues=0 patched=0" is the pass condition
```

Use `fix: false` to only report (safe on a worktree) and `fix: true` to also prove the fixes are idempotent — with `fix: true`
an inconsistent graph throws `Error. Expected node to match patched data.`, which is a reliable signal that two links claim
one slot. Re-run **after** every structural edit; a green run plus `validate_templates.py` is the minimum bar for committing.

For a quick structural scan without the TS toolchain use `scripts/audit_links.py` (works per container, reports
`target_null / target_wrong / origin_missing / input_orphan / output_phantom / backref` plus link-type vs socket-type
mismatches; `--baseline <dir>` diffs against a `git archive HEAD` copy so upstream noise is separated from what you
introduced).

### Socket names: never guess, and never assume index 0

* A widget turned into a socket serializes as `{"name": X, "type": T, "widget": {"name": X}, "link": N}`.
  `X` is the **widget name as the schema exposes it**: top-level widget → `prompt`, `seed`; dynamic-combo branch widget →
  `model.prompt`, `model.seed`, `model.aspect_ratio`, `model.creativity`.
* An **autogrow** input that is connected must be `model.images.image_1` with `"type": "IMAGE"`. The suffix-less
  `{"name": "model.images", "type": "COMFY_AUTOGROW_V3"}` form loads without error but the frontend **silently drops the
  link** (measured: read back `node.inputs` after `loadGraphData` → `model.images.image_1:-`). Unconnected placeholders may
  keep the suffix-less form; anything with a link must be `…image_N`.
* Get ground truth from the live server: `curl -s http://127.0.0.1:8188/object_info`, then per type read the top-level
  `required/optional` keys **and** the `options[0].inputs` keys of every `COMFY_DYNAMICCOMBO_V3` input — those two sets are
  the only legal socket names (`model.<branch key>` for branch inputs).
* **Map by old socket NAME, then recompute `target_slot` from the final `inputs` order** — the serialized `inputs` array is
  positional, so reordering/inserting a socket without rewriting every `links[].target_slot` for that node silently
  re-points wires. Real example: `Preview3D`'s model path lives at `inputs[2].model_file`, not `inputs[0]` (that is
  `camera_info`), so code that assumed index 0 dropped the 3D preview connection for 11 templates.

- Sonilo 1.5: `references/sonilo-music-1_5.md`.
- Breeze TTS 2 / Breeze voice family (partner audio nodes: TTS, clone, design, remix, localize, selector): `references/breeze-voice-nodes.md`.

## Hidden links: presentation lives in `extra.linkPresentation`

Hiding a wire removes the stroke, not the connection. It is the no-install way to make a long stage-to-stage link
readable (unlike KJNodes Set/Get, which needs a custom pack and is never available on Cloud) — and it is never a
reason to delete a link and re-join it somewhere tidier.

- Wire form: `"extra": {"linkPresentation": {"12": {"hidden": true}}}` — one entry per hidden link, written on the
  **owning container's** `extra`: top level for top-level links, the subgraph's own `extra` inside
  `definitions.subgraphs[]` for a wire drawn inside it. `LGraph.serialize()` writes only non-default entries and only
  ids still present in `links`, so a stale entry disappears on the next save.
- The key is the link id as a canonical integer string (`"12"`, never `"012"` / `"1e0"` / `"1.5"`): the workflow
  schema rejects a non-canonical key and the **whole workflow** fails validation. On load an entry whose id is not in
  that container's `links` is skipped silently.
- `"label": "stage 1 image"` beside `hidden` is what the two end badges print; without it each badge shows the data
  type only (`IMAGE`, `LATENT`), which says nothing about why the wire is there.
- Topology stays byte-identical: `links[]`, `outputs[].links` and `inputs[].link` are untouched and `graphToPrompt()`
  never reads presentation, so the API prompt — and the run — is unchanged. Never "hide" by dropping one of the three.
- Frontend **1.55.5** is the first with it (the multi-select `Hide Selected Links` command lands in 1.58.0). An older
  frontend keeps the key in `extra` and draws the wire normally, so hiding can never break a handoff.
- Un-hide is user-side: right-click an end badge → Show Link, or hover the socket (it reveals the hidden wire).
- Source of truth in `the ComfyUI frontend checkout`: `src/lib/litegraph/src/canvas/linkVisibility.ts`
  (hide/show/rename + the link context menu), `src/stores/linkPresentationStore.ts` (state, per root graph),
  `LGraph.serialize()` / `configure()` (wire format + load path). Verify the behaviour instead of asserting it:
  `env -u PYTHONPATH npx vitest run src/lib/litegraph/src/canvas/linkVisibility.test.ts src/platform/workflow/validation/schemas/workflowSchema.test.ts`.
