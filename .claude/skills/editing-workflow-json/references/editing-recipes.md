# Editing recipes: ratios, limits, filenames, model metadata

Small, self-contained edits that recur while repairing a workflow file.

## Reducing a size to the simplest ratio (gcd) with core nodes only

`Math Expression` (`comfy_extras/nodes_math.py`, simpleeval) takes ternary `x if cond else y` and `%` but has **no gcd**; output must be numeric (no string building). Loop:

```
Create List [w, h] -> Start Loop (mode simple, num_iterations 24)
  body: Get Item From List 0 -> a, Get Item From List 1 -> b
        Math Expression "a % b if b > 0 else 0"  -> r
        Math Expression "b if b > 0 else a"      -> next a
        Create List [next a, r]                  -> End Loop next_iteration_value + output_value
Get Item From List 0 (= gcd) -> Math Expression "a / b" x2 (w/gcd, h/gcd)
        -> Format Text "{a}:{b}, {c} × {d} px"
```

- `b > 0` guard terminates it (`a` freezes on the gcd at `b`=0); 24 iterations cover every size ComfyUI accepts (worst case Fibonacci pair ≤ 16384 → 20 steps).
- No extra metadata (`comfy_execution/validation.py` derives `_loop_body` / `_loop_end` from links). `Start Loop` → `widgets_values: ["simple", 24, false]` + `widgets_values_named: {"mode": "simple", "mode.num_iterations": 24, "cache_iterations": false}` (For mode `["For", start, max, step, false]`); `End Loop` → `[false]` / `{"accumulate": false}`.
- `Format Text.values.a` takes it; one slot feeds several inputs (`Get Image Size` → canvas, ratio, px text).

## Model download links: author them, then validate with a script

Link lives in `properties.models`.

```json
"properties": {"Node name for S&R": "UNETLoader",
  "models": [{"name": "fibo2_edit_turbo_int8_convrot.safetensors",
              "url": "https://huggingface.co/Comfy-Org/Fibo-2.0/resolve/main/diffusion_models/fibo2_edit_turbo_int8_convrot.safetensors",
              "hash": "1f6fa7c499191…c3b", "hash_type": "SHA256", "directory": "diffusion_models"}]}
```

- `name` == widget value verbatim (`unet_name` / `clip_name` / `vae_name` / `lora_name` / `ckpt_name`).
- `directory` by family: UNETLoader `diffusion_models`; CLIPLoader/DualCLIPLoader/TripleCLIPLoader/CLIPVisionLoader `text_encoders` (`clip_vision`); VAELoader `vae`; LoRA `loras`; `CheckpointLoaderSimple` `checkpoints`; ControlNet/Upscale/Style `controlnet`/`upscale_models`/`style_models`.
- `hash` = HF **LFS oid** (`GET https://huggingface.co/api/models/<repo>/tree/main?recursive=true` → `lfs.oid`) = `sha256sum`; never invent it or copy a sibling quant's unless bytes match (each quant: own hash + file, `…_bf16` ≠ `…_int8_convrot`).
- Multi-file loaders (`DualCLIPLoader`, `TripleCLIPLoader`): **one entry per file**, in load order.

Validate (from the repository root):

```bash
python3 .claude/skills/editing-workflow-json/scripts/validate_model_links.py wf.json [more.json]     # structure + HF hash + HEAD 200 + size
python3 .claude/skills/editing-workflow-json/scripts/validate_model_links.py wf.json --no-network    # fast structural pass (offline)
```

Checks: `properties.models` present + right entry count; `name` == widget (every multi-file loader entry); `directory` == family; `hash_type: SHA256` + 64-hex; `resolve/…` URL filename matches `name` (query/fragment ignored; remote path need not match `directory`); SHA256 == repo LFS oid at the URL's revision; `HEAD` 200 + byte size. Exit 0 clean / 1 wrong (values shown); `--strict` fails unmapped `*Loader`; gated repos: `~/.cache/huggingface/token`.

**Both scripts (`validate_model_links.py`, `audit_links.py`) walk TOP-LEVEL nodes only**: subgraph loaders print `(no model loader nodes)` / `files=0` and exit `PASS` / `0` (a false negative); check each `definitions.subgraphs[]` (`sg['nodes']` → `properties.models`, `name` vs widget, link invariant vs its `links[]`).

### Filename prefixes: which tokens actually expand

`folder_paths.get_save_image_path` → `compute_vars` expands exactly these for **every** node using it (`SaveImage`, `SaveVideo`, `SaveAudioAdvanced`, `SaveText`): `%year% %month% %day% %hour% %minute% %second% %width% %height%`.

`%date:yyyy-MM-dd%` / `%Empty Latent Image.width%` are **frontend**-expanded: fine from the UI, but `POST /api/prompt` writes them **literally into the filename**; use `%year%`-style tokens for both paths.

- **Multi-file runs** (one file per map / variant): `patina/%year%%month%%day%-%hour%%minute%_<what it is>`. Say which node writes what: a generic `output` or differing per-node prefixes defeats it.
- **Name each save node after the slot it consumes, not its neighbour.** Duplicated saves drift: measure from links (`[(n['id'], [l[2] for l in links if l[3]==n['id']])]`), compare to the producer's `output_name` list.
- Verify without a run: `env -u PYTHONPATH <venv>/bin/python -c "import folder_paths; print(folder_paths.get_save_image_path('x/%year%%month%%day%-%hour%%minute%_tex','output',1024,1024))"`; `graphToPrompt().output` shows the strings.

### Core text/JSON limits worth knowing (checked against a live server)

* `Convert Dictionary to String` / `Convert Array to String` = `json.dumps(..., indent=indent or None)` — real JSON for regexes.
* `Extract Text from JSON` (`JsonExtractString`) is **not** a nested-key reader: a nested key returns `''`, a nested object a Python `repr` (single quotes), not JSON. Feed a needed nested list directly (second wire).
* Audit loops: a computed count left unlinked (`links: []`) usually pairs with a hardcoded `For … max_iteration`, silently dropping items past the limit. Wire into `mode.max_iteration` / `mode.num_iterations` (both take links) or use `List` mode; verify with one extra item.

### Loop / array pitfalls (all hit for real)

Fuller log: `references/pitfalls.md`.

* **Option inputs are `mode.<key>`** (`mode.num_iterations`, `mode.max_iteration`, `mode.list`) in API prompt/UI sockets; both take **links** (count → `ceil(1.5*log2(max(w,h)))+2` for Euclid, bbox count per box).
* **A linked `initial_iteration_value` is dropped on load if `inputs[]` order is wrong**: canonical order `parent_iteration, initial_iteration_value, mode, <option inputs in schema order>, cache_iterations`; each link's `target_slot` = that index.
* **`ARRAY` outputs can't be iterated or indexed by generic nodes**: `List` mode runs **once** (`list_item` = whole array); `Get Item From List` raises `IndexError … list index out of range`; only `Convert Array to String`, `Build JSON Prompt (Ideogram)`, `Layers From Bounding Boxes` take `ARRAY`.
* **Hand-written nodes: the frontend is ground truth** — `sourceNode.connect(slot, targetNode, inputIndex)`, then `window.app.graph.serialize()`; copy its serialization (sockets, order, widgets).
