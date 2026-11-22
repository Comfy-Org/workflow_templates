# Subgraphs: structure, sockets, wrapping a chain

UUID-typed nodes are subgraphs; their definition lives in `definitions.subgraphs[]`. How to read one,
add/drop a promoted input, and wrap an existing chain into one — plus how to verify it for real.

### Subgraph (UUID node) Structure

New-style UUID nodes (comfy-core 0.30+) are usually **subgraphs**: their definition lives in the top-level `definitions.subgraphs[]` array (keyed by the same UUID as the node `type`). Subgraph fields: `id`, `version`, `state`, `revision`, `config`, `name`, `inputNode`, `outputNode`, `inputs`, `outputs`, `widgets`, `nodes`, `groups`, `links`, `extra`.

- `subgraph.name` — displayed as the node title (watch for default names like `New Subgraph`; rename to something descriptive like `First & Last Frame to Video (LTX-2.5)`)
- `subgraph.inputs[]` — the parameters exposed on the subgraph node, each with `label` (what the user sees), `name`, `type` (`STRING`/`INT`/`BOOLEAN`/`COMBO`/`IMAGE,MASK`/...)
- `subgraph.nodes[]` — internal graph node types (e.g. `SamplerCustomAdvanced`, `LTXVDualCFGGuider`, `VAEDecodeTiled`) — useful to know what advanced controls exist inside
- **How users enter a subgraph**: the subgraph node renders a full-width **Enter subgraph** button at its bottom (NodeFooter.vue, `data-testid="subgraph-enter-button"`); clicking it navigates into the internal graph. Document this in the workflow note so users know how to reach the internals.
- For parameter documentation, dump `subgraph.inputs[]` labels + types and write a markdown table explaining each parameter's purpose/effect.
- **Prompt-enhancer subgraphs**: a common recent pattern is an LLM rewrite step wired inside the subgraph: `CLIPLoader` (an LLM checkpoint, e.g. `qwen3.8_27b_w4a8.safetensors`) + `PrimitiveStringMultiline` holding the rewriter system prompt + `TextGenerate` + `ComfySwitchNode` (the `enable_PE` toggle) feeding `CLIPTextEncode`. Document the toggle, the enhancer checkpoint combo, and the fact that the shipped system prompt makes the LLM emit a structured caption rather than plain prose.
- Node-instance `inputs[]` only lists parameters that are linkable or exposed; the rest (steps, seed, checkpoint names) stay plain `widgets_values`. Read `widgets_values_named` to map widget order to names before writing docs, and check for extra nodes outside the subgraph (`ResolutionSelector` feeding width/height, `ModelAttentionBackend`, `ModelSamplingFlux` for shift patches).

### Adding or removing a subgraph input (e.g. bolting on a ManualSigmas switch)

Exposing a new control means touching **four** places that must stay consistent; the instance side is positional, so a
half-done edit silently shifts every later widget:

1. `sg.inputs[]` — append `{id, name, type, linkIds: [<new link>], label, pos}`, where `name` is the *internal* widget
   name (`sigmas`) and `label` is what the node shows (`manual_sigmas`). New wire: `{origin_id: -10, origin_slot: <index
   of the new input>, target_id: <inner node>, target_slot: <its widget slot>}`.
2. Every other link with `origin_id: -10` must keep pointing at the right input — **on removal, re-map `origin_slot` for
   all of them** (`index_map = {old_index: new_index}`), and shift each surviving input's `pos[1]` by 20 px per slot or
   the node's socket column drifts away from its labels.
3. The instance node mirrors the list: `widgets_values` is **positional in the same order as `sg.inputs`**, so append /
   remove at the same index; `widgets_values_named` uses the input `name`; `inputs[]` carries a socket only for widgets
   that are linkable (`{name, type, widget: {name}, link}`), and those entries are dropped with the input.
4. Widget slots on the inner node must exist for the value to land: a boolean belongs on a `PrimitiveBoolean`
   (`[{value}]`), the sigma string on `ManualSigmas` (`["1.0, 0.9, …"]`), and a `ComfySwitchNode` of type `SIGMAS` selects
   between them (`on_false` = scheduler, `on_true` = manual, `switch` = the boolean).

Verify by expanding the graph: load the file in the real frontend, call `graphToPrompt()`, and assert the API prompt has
**no** trace of the removed node/branch and the expected step source (`BasicScheduler` vs `ManualSigmas`) is what the
switch resolves to. With auto and manual fed the same schedule, the two renders are bit-identical (measured mean abs
diff 0.0) — that is the cheap proof the switch is wired to the right sockets.

**Do not restructure a graph the user exported — and never hand-splice `widgets_values` when you do.** The instance side is
positional, so removing a subgraph input and `pop()`-ing the instance array by a hand-typed name list desynchronises every
later widget: the signature is the run dying at validation with a *neighbouring* value delivered to the wrong socket
(`value_not_in_list … sampler_name: 697447143280`, i.e. the seed landed in `sampler_name`). It passes JSON loading and
`validate_templates.py` silently. Only restructure graphs you authored; when the user hands over a workflow to ship
(merge/PR), change the fields they asked for and leave topology alone.

**Never invent sigma values.** A hand-assembled list produced a posterised neon mess; the real sequence comes from the
model's own scheduler: run `BasicScheduler → SigmasToFloat → PreviewAny` on the instance and read the text output from
`/history/<id>`, then paste those numbers. List length = step count.

### Wrapping a chain into a subgraph (and verifying it for real)

When a computation is long but only produces one value, collapse it into a subgraph so the canvas keeps one node.
Serialization facts (mirror an existing subgraph in the same file):

* `definitions.subgraphs[]` = `{id, version, state:{lastGroupId,lastNodeId,lastLinkId,lastRerouteId}, revision, config,
  name, inputNode:{id:-10,bounding}, outputNode:{id:-20,bounding}, inputs[], outputs[], widgets, nodes, groups,
  links, extra}`. Inner nodes use the same shape as top-level nodes; inner links are `{id, origin_id, origin_slot,
  target_id, target_slot, type}`.
* Subgraph inputs are fed by links with `origin_id: -10` / `origin_slot: <input index>`; the output is a link with
  `target_id: -20` / `target_slot: <output index>`. Each `inputs[]`/`outputs[]` entry carries the matching
  `linkIds: [...]`.
* Keep inner link ids in a **collision-free range** (e.g. 9000+). Small ids make LiteGraph log
  `duplicate subgraph link ID n remapped to n+3` on load (it silently repairs them, but the warnings are noise).
* When wrapping an existing chain: walk back from the output node through the links to collect the body, move the
  matching `groups` in with it (keeps the ①②③ section titles), and put the note that documents the chain inside too.
  Rebuild **every** output's `links` array from the link list afterwards (`[l[0] for l in links if l[1]==id and l[2]==slot]`) —
  forgetting this leaves stale link ids on the boundary source nodes and a link pointing nowhere.
* **Verify a wrap by flatten-equivalence**, not by eye: load the before and after files into the frontend, call
  `graphToPrompt()` on both, strip the `<instance>:<inner>` prefix from every node id **and from every input link
  reference**, then diff `(class_type, inputs)`. Identical output = the rewrite preserved semantics exactly (87 nodes vs
  87, zero diffs, in the Ming caption wrap).
* Running the wrapped chain for real may need stubs: upload a placeholder via `POST /upload/image`
  (`-F image=@file.png -F type=input -F overwrite=true`) and point `Load Image` at it, or the executor silently prunes
  the branch you wanted to test (a removed `Load Image` upstream kills everything downstream of it). Delete the
  uploaded file from `<ComfyUI>/input/` afterwards.
* The instance node is just `{"type": <subgraph id>, "inputs": [names matching subgraph.inputs], "outputs":[...],
  "properties": {"previewExposures": []}}`; the subgraph `name` is what the user sees as the node title.
* Verify by **running the real frontend**, not by reasoning: `/usr/bin/python3` has playwright (and
  `the ComfyUI frontend checkout's node_modules/playwright` as a node fallback). Launch headless Chromium (its own
  profile — the user's Chrome can stay open), `wait_for_function("() => window.app && window.app.graphToPrompt")`, then
  `await window.app.loadGraphData(data, true, true)` and `await window.app.graphToPrompt()`; the returned `.output` is
  exactly what the queue button sends, so POST it to `/prompt` and read `/history/<id>` to execute it for real.
  Loading the whole workflow this way also surfaces broken nodes as `node.has_errors` (compare the list against the
  pre-edit file: missing models / missing input images show up there and are environment noise, anything else is yours).

* **Nested subgraphs work** (a subgraph definition whose `nodes` include another subgraph's instance). The frontend
  flattens recursively, so the API ids become `<outer>:<inner>:<node>` — when diffing before/after, strip **all**
  `<id>:` prefixes (`while ':' in x: x = x.split(':',1)[1]`), not just one.
* Moving a subgraph inside another means its former inputs become inputs of the outer subgraph: rebuild the outer
  `inputs[]` in the **slot order the instance declares** and re-point the boundary inner links (`origin_id: -10`,
  `origin_slot: <index>`) at that order, or the instance's wires land on the wrong sockets.
