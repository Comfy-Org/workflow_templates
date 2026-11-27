# Validating a workflow against the frontend's zod schema

Use when a graph fails to load, a template loads "wrong" (widgets or links not behaving), or before delivering any
hand-assembled workflow JSON. The frontend does not trust the file: it parses it with a zod schema and any mismatch
silently demotes the graph.

## Where the validation lives

- Schema and validator: `ComfyUI_frontend/packages/graph-model/src/workflowSchema.ts`
  (`zComfyWorkflow` for `version: 0.4`, `zComfyWorkflow1` for `version: 1`, `zLegacyLoadableWorkflow` as the
  degraded fallback).
- `validateComfyWorkflow()` returns the error text `Invalid workflow against zod schema:\n<zod-validation-error>`.
- Template loading (`src/platform/workflow/templates/composables/useTemplateWorkflows.ts`) validates strictly and,
  on failure, falls back to `zLegacyLoadableWorkflow` (id + type per node) while reporting
  `error_validating_workflow_template_schema` as a **warning**. That is exactly the "it loads, but something is
  off" symptom — the graph is not rejected, it is silently degraded.

## The field that actually bites: `slot_index`

```ts
const zSlotIndex = z.union([z.number().int(), z.string().transform((v) => parseInt(v)).refine(...)])
slot_index: zSlotIndex.optional()                    // number | numeric string | absent — NOT null
links: z.array(z.number()).nullable().optional()     // neighbours do accept null
```

**Omit `slot_index`; never write `null`.** A `null` produces one issue per output, in the form
`expected number, received null at "nodes[i].outputs[j].slot_index"`, including inside
`definitions.subgraphs[k].nodes[…]`.

A file with `"slot_index": null` was written by a hand-rolled generator, and its signature is unmistakable: every
optional slot property is materialised as null (`color_off`, `color_on`, `dir`, `label`, `locked`, `nameLocked`,
`removable`, `pos`, `slot_index`), while a normal app export omits all of them.

Lossless fix — no re-export needed:

```python
for node in nodes + [n for sg in wf.get("definitions", {}).get("subgraphs", []) for n in sg.get("nodes", [])]:
    for out in node.get("outputs") or []:
        if out.get("slot_index") is None:
            out.pop("slot_index")
```

## Verify with the real schema, not by eye

`scripts/validate_workflow_schema.mts` imports `validateComfyWorkflow()` from a frontend checkout and prints
`VALID` / `INVALID` per file plus the full zod error (exit 1 if any file fails):

```bash
cd /path/to/ComfyUI_frontend
./node_modules/.bin/tsx <this pack>/scripts/validate_workflow_schema.mts path/to/wf.json
```

`COMFYUI_FRONTEND=/path/to/ComfyUI_frontend` overrides the default clone location. Reproducing the error verbatim
before touching the file proves which fields offend, and lets you re-run after the fix.

## Corpus sweep (one file or a whole family?)

```python
import glob, os
bad = [os.path.basename(f) for f in glob.glob("templates/*.json") if '"slot_index": null' in open(f).read()]
```

If a handful of files carry the null signature while hundreds have no `slot_index` key at all, one authoring script
is at fault — fix the files and the generator together.

## Blind spot

`scripts/validate/validate_templates.py` does **not** check `slot_index` and does not run the zod schema, so a
null-carrying template passes repo CI and only surfaces in the app or in the template browser. Run this validator on
every new or regenerated template before opening the PR.
