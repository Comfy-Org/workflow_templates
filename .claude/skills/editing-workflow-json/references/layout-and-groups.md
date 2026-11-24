# Layout, groups and node sizing

How a template's canvas is arranged: module groups, row grids, gaps, node sizes, and the
pixel numbers the user has signed off on. Load this before laying out or re-grouping any graph.

## Template layout standards (partner / API workflows)

Shipped `api_*` audio templates (`api_fishaudio_voice_clone_tts`, `api_elevenlabs_v4_text_to_speech`) plus the user's corrections — "it runs" is not reviewable.

**Colors — a spotlight, not a legend**

The palette is closed. `LGraphCanvas.node_colors` maps nine names to a title/body/frame triple; nothing else is a
colour you may write.

| name | node `color` / `bgcolor` | group `color` |
|---|---|---|
| black | `#222` / `#000` | `#444` |
| pale_blue | `#2a363b` / `#3f5159` | `#3f789e` |
| red | `#322` / `#533` | `#A88` |
| yellow | `#432` / `#653` | `#b58b2a` |
| green | `#232` / `#353` | `#8A8` |
| blue | `#223` / `#335` | `#88A` |
| cyan | `#233` / `#355` | `#8AA` |
| purple | `#323` / `#535` | `#a1309b` |
| brown | `#332922` / `#593930` | `#b06634` |

How much colour a template may spend — **the default is none**, colour is only spent to point at one thing:

| element | value | why |
|---|---|---|
| group, ordinary module | omit `color` (renders `#335`) or `#3f789e`; `#444` when a frame must sit quieter than the core one | one visual weight for the whole graph |
| group, the one core group users must find first | `#A88` red — at most one per graph | a single focal frame |
| group, bypassed / optional path | `#444` + `mode: 4` on its nodes | "off", not a second accent |
| `Note` / `MarkdownNote` | `color "#222"`, `bgcolor "#000"` | see below — never yellow |
| node inside a group | no `color` / `bgcolor` keys at all | a tinted node pulls the eye out of its module |
| one hero node, genuinely complex graph only | `#322` / `#533` red — at most one | the graph is too big to read at a glance |

- **Never one colour per group.** Not per module, not per row, not green/purple/cyan frames to "separate" stages:
  separators are gaps and titles. Varied frames give the eye nothing to land on and compete with the wires the user
  is trying to follow; readers scan a template for *where do I start*, which one bright frame answers and nine tinted
  ones do not. The user's words: "在组里面不要使用不同的颜色 … 只给核心组添加一些比较显眼的颜色，对于其他组保持黑色或默认颜色".
  Exactly two exceptions exist: the core group (red, one only) and bypassed paths (grey).
- **Red is for the core group, and sparingly.** A second red frame demotes both to decoration. Red reads as the
  entry point, so it belongs where the user actually starts (the prompt / the single sampler), never on a stage that
  merely looks important.
- **Notes are black, never yellow.** `Note` and `MarkdownNote` are constructed with the **yellow** pair
  (`src/extensions/core/noteNode.ts`), and `litegraphService.ts` gives every `api_node` the same yellow — *"Mark API
  Nodes yellow by default to distinguish with other nodes"*. A yellow note therefore reads as a partner/API node, i.e.
  "this step costs credits". Write `color: "#222", bgcolor: "#000"` on every note; a note with no colour keys is yellow.
- **Node colour is off unless the graph is genuinely complex.** Only then, and only for the node the user must find
  first (the prompt box, the one sampler), use red `#322`/`#533`. Two coloured nodes is already one too many; a
  coloured `VAELoader`/`CLIPTextEncode` per module is clutter, not structure.
- **Never invent a hex value**, and never use `#432`/`#653` as an accent — it *is* the api_node pair, so a
  "highlighted" local node looks like a partner node. One-off frames (`#a1309b`, `#A88` on five groups) are the other trap.
- **Audit, don't eyeball:** `scripts/check_wf_colors.py <wf.json|dir> [--strict]` fails on a non-black note, two red
  groups, two accent colours among frames, two red hero nodes, and non-palette hexes; `--strict` also fails on a lone
  decorative accent or any coloured node. Run it on the file you touched — the repo still ships older graphs that
  predate the rule, so a directory-wide failure count is not a gate.

**Geometry**

- **Notes leftmost column**: `MarkdownNote`s flush on the canvas's left edge, edges aligned, stacked; groups to their right — never right of or below the groups.
- **Group = module, not chain**: modules (Loaders | Prompts | Sampling). One `Loaders` group holds **all** loaders (UNET / CLIP / VAE / LoRA, incl. control adapters); `ModelSamplingAuraFlow` / `SkipLayerGuidanceDiTSimple` / `TemporalScoreRescaling` in a sibling `Model Patches`. No "Core Pipeline" frame.
- **One band = LINEAR graphs only** (shipped `api_*`: aux/control group underneath; loop/branching in one band = 4000+ px) → **one band per dataflow row**, inputs/settings above, loop body and output below: SenseNova U1.6 `1 Load Models | 2 Prompts | 3 Resolution & Latent | 4 Sampling Settings` / `5 Loop Setup | 6 Self-Correction Loop | 7 Decode & Save`. Rows share ONE column grid: same widths, same `grid_x`, start/end on one x (±60), widths once (e.g. 800/900/900); a last group 900px wider is a mistake. Align within a row only.
- **No node outside a group**: a loose bridge node reads as floating in an empty gap once the real 30 px gaps exist → give it a narrow group in the same band (`MOSS Control`). Padding left ≥ 70, right ≥ 40, bottom ≥ 190; `group.x <= node.x`, `node.x + w <= group.x + group.w` for every non-note node ("the node is outside the group"). Tail: `SaveImage` + `ImageCompare` outside, right of `Sampling and Output` (its right column ends at `VAEDecode`).
- **Columns = data flow, left to right**: scheduler/sigma → sampler → `VAEDecode` in `Sampling and Output`; `Sampling` over `VAE Decode` over `Save` in one column reads as a confusing vertical stack. Internal columns evenly spaced between the side margins, never one x, one `size[0]` (group inner width) each, never content-sized.
- **Gaps** (`audio_ace_step_1_5_split`, signed off): group↔group **30**, note↔group **80**, node in group **L/R 70 / top 90** (bottom 30–50), stacked column nodes **47–70 (≈50)**, ungrouped column beside a group **80** horizontal / **60** between nodes; stacked nodes ~70, not 50 (an erroring node adds a banner row and closes a 50 px gap).
- **Frames align**: primary groups share one top edge, bottoms lined up (pad the shorter); optional/experimental groups underneath, same left/right edges. `y2 + gap <= y1` per band pair — node-only checks pass on frames 40px apart; aux top = `band_top + band_height + 30`. Centre columns vertically: `y0 = group_top + (group_h - content_h) / 2`, never from a fixed top margin (a stack that hugs the top reads as uneven margins).
- **`ImageCompare` for any input-image template** (image edit, control adapters, upscalers, style transfer): `image_a` = source, `image_b` = result, no widgets, ~300–500 wide, ~500x710, outside and right of `SaveImage`; 700+ tall nodes get their own frame (~400 px hole in Main Path). Registry `"thumbnailVariant": "compareSlider"`, `-1` = after, `-2` = before; text-to-image: none.
- **Never hand-place**: `scripts/layout_grid.py <workflow.json> <spec.json> [--write]` — notes leftmost; per-row column widths, shared top/bottom per row, margins 70/90/70/40, uniform centred columns; a third entry (`["Sampling and Output", 1200, 2]`) gives two equal internal columns. Prints overlap count, unplaced nodes, ragged columns; exits 1 without `--write`; groups must still contain their nodes.

**Node sizes**

- **`node.size` is NOT the rendered footprint in Nodes 2.0.** Box: top `pos[1] - 30`, height `size[1] + chrome`, width `size[0]` unless a min width. Vue sizes to content (`UNETLoader` 90→140, `ConditioningZeroOut` 30→88, `VAEDecodeAudio` 50→108, `KSampler` 270→312, `MarkdownNote` 680→710), so a 30px gap from `pos/size` renders as **zero** ("no gap at all between these nodes"). Chrome: 30 mostly (`KSampler` 270→300, `TextGenerate` 460→490, `ImageCompare` 710→740), 34–38 loaders (`CLIPLoader` 110→144, `VAELoader` 60→92, `VAEDecode` 50→84), 56 `ComfySwitchNode` (80→136); wrong chrome drifts gaps 4–8 px per node, and `VAEDecode` renders wider than stored (140→225), eating a 60 px gap. Author with `Comfy.VueNodes.Enabled = true`: read `[data-node-id]` `getBoundingClientRect()` at `ds.scale = 1`, write `size = [box.w, box.h - chrome]` back (frontend rounds, e.g. 196→200), space **effective** boxes (`size[1] + 30`). A `geo_*.json` from a zoomed-out canvas (stored `size` 270 as `dom.w` 127) is wrong; empty node bodies predate the paint.
- Node `size` = what `LiteGraph.createNode(type)` renders, never a hand-written larger box (a partner node with a few widgets stretched to 380x220 reads as a mistake); read back after `loadGraphData` (`HeyGenTextToSpeechNode` 400×240, `SaveAudioAdvanced` 270×140, `LoadAudio` 290×140, `HeyGenVoiceCloneNode` 320×160) — heights grow a few px on load.
- **`SaveAudioAdvanced` / `LoadAudio` are authored long (wide)**: ~**480px** (`SaveAudioAdvanced` 480×210, `LoadAudio` 480×140) with ≥80px clear right, for the player row and its widgets; the card renders **wider than `node.size`** once audio loads (`audio_ace_step_1_5_split` stores 290×210, draws ~3× a 330-wide KSampler).
- **Wires**: `.slot-dot` rect centres inside `.lg-slot--input` / `.lg-slot--output` are the real endpoints (input at `node.x`, output at `node.x + box.w`, y = box top + 42 + 20·i); sample each bezier (`c1 = (x0 + max(|dx|·0.5, 40), y0)`, `c2 = (x1 - same, y1)`) against every other box to count wires hidden behind a body. Loader column level with the main row keeps MODEL/VAE/clip lanes straight horizontals vanishing behind the first row node (links render *under* nodes); reference-image groups left of it at row height keep `LoadImage → images.image_1` and `LoadImage → Compare.image_a` horizontal.
- **`extra.ds.offset` is in GRAPH units**, not screen pixels: `screen = (graph + offset) * scale`, hence `offset = pad/scale - min` (`pad - min*scale` pushes bottom rows off-screen at a correct-looking scale). Fit a 1440px canvas: 2740 wide at `scale 0.54` clips 2 boxes at 1440x900, fine at 1680 — `scale ≈ (1440 - 100) / bboxWidth`, `offsetX = 50/scale - minX`, checked with `loadGraphData(json, true, true)` at 1440x900 and 1680x1050.
- **Row tops**: one `pos[1]` per row, nodes at `group.y + 80`; "node too close to the group title" is a padding < 60. Alternative order: note | optional group | main group, note → group ≈ 60, group → group ≈ 30 (`api_fishaudio_voice_clone_tts`: groups 180, note 210); note starts 30px below the group top: `note.height = group.height - 30`, near-equal heights snap to equal.

**Behaviour**

- An optional path (voice clone, alternate model) is a **bypassed** group: `mode: 4` on every node inside, **no link** into the main path; acceptance = `graphToPrompt()` returns only main-path nodes — wiring it costs users credits. The note says how to enable it (`Ctrl+B`) and which socket to wire.

## Audio-specific

- `SaveAudioAdvanced` widgets: `["audio/<name>", "mp3", "V0"]`; it and `LoadAudio` ship **long** (≈480 wide) for the player bar.
- Local-model audio: subgraph + two notes, no groups; partner/API audio: flat nodes with groups.

## Group and note geometry

Never hand-type a group's size; compute it from final node sizes: `grp.pos = [minX - 40, groupTop]`, `grp.size = [maxRight + 80, maxBottom - groupTop + 40]`, so every node sits inside the frame.

**Re-grouping a loose draft** (frames onto an existing graph): membership from the links, not the old ragged boxes; run *measure → rebuild* twice — rendered heights change with node width, so pass 1 lands gaps at 68–76 px instead of 70. Verify with `[data-node-id]` rects at `ds.scale = 1`; at runtime `g.pos` / `g.size` (`g.bounding` is serialized JSON only). **Retitle preset nodes ("Normal steps" / "Turbo CFG") rather than nesting a sub-group in a same-colour parent** (~46 px inner padding; two stacked blue frames read as a bug).

**Note height: measure it, don't inherit it.** A note shorter than its rendered copy is clipped; in Nodes 2.0 the body is `.comfy-markdown-content` with `size-full` + `overflow-y-auto`, so `scrollHeight == clientHeight` and the overflow probe is useless — required height = **last child's** `getBoundingClientRect().bottom` minus the container's `top`, ÷ `canvas.ds.scale`, plus the node's chrome (`node.size[1] - containerHeight/scale`). 21-line Model Links + storage-tree + Report Issue note: 520 wide → 655 tall, 560 wide → 645 (520x530 shipped, ~120px cut off). Off-screen nodes report `0` for every rect ("measurement is impossible on this build") — center the node (`canvas.ds.offset = [cw/2 - (pos[0]+size[0]/2)*scale, ch/2 - (pos[1]+size[1]/2)*scale]`) and budget ~30–60 px of bottom slack.

## Node sizing

Don't collapse media nodes to `computeSize()`: **Load Image / Load Video / Save Image / Save Video keep a large media area**, as do `PreviewImage` and `SaveAudioAdvanced`. Sizes: **350-470 wide x 420-520 tall** (`LoadVideo 370x496`, `SaveVideo 470x500`, `LoadImage 360x490`, `SaveImage 450x470`).

## Turning a raw export into the user's habitual form (ad-hoc / experiment workflows)

Trigger: a hand-made export plus sorting/grouping an export into the team's habitual shape. A **lighter spec than a shipping template**, same reading order:

1. **Group by content module, titled as shipped: `Step 1 - Load models` / `Step 2 - Upload image` / `Step 3 - Prompt` / `Sampling & Decoding`** — `Step 1` = UNET + CLIP + VAE, `Step 2` = `LoadImage`, `Step 3` = the prompt-carrying encoder, `Sampling & Decoding` = sampler + decode + save. Tall stage columns (`Inputs` / `Models` / `Conditioning` / `Sampling & output`) are **not** this user's habit ("four tall stage columns"). Frames hug their nodes (30–40 px), rows level, column pitch ~460–520 px; `Model Patches` / narrow `Control` only when needed. **"The habitual shape" is not inferable from earlier files** — offer pickable groupings first.
2. **Recompute every node's `order`** (topological); leave `id` alone (`links[]` references ids; renumbering drops or re-points wires).
3. **One English `MarkdownNote`** under the leftmost column: checkpoint / text-encoder / VAE filenames, sampler values, what the input image and prompt do, which autogrow slots are wired vs empty — same text in `widgets_values[0]` and `widgets_values_named["text"]`.
4. **Pin reproducibility**: `seed` = a concrete number + `control_after_generate: "fixed"`, `SaveImage.filename_prefix` = the workflow's own name, never `output`; several output files: name each after what it consumes, share a timestamp.
5. **A base/dev plus a distilled/turbo checkpoint becomes two files**, identical layout, differing only in `UNETLoader` and sampler values (Fibo 2.0: dev 50 steps / guidance 5.0, edit turbo 4 steps / guidance 1.0, both `euler` + `simple`; turbo ignores `negative_prompt`); each note says which checkpoint it loads.
6. **Verify**: `python3 a small instance-validation script (kept outside this repo) <wf.json> --oi /tmp/oi.json`, then one real run — `/usr/bin/python3 a small headless-run script (kept outside this repo) <wf.json> --out <dir>`. Never queued = not delivered.
