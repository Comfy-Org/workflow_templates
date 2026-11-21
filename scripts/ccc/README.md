# CCC draft sync

Uploads template metadata + graphs to the Comfy Content Catalog (CCC) as **drafts**, from
`templates/index.json` + `templates/<stem>.json`.

```bash
# what CI runs on every template change
python scripts/ccc/sync_to_ccc.py --stems api_foo_bar api_baz_qux --change-id ci-sync-1234

# one template, no writes
python scripts/ccc/sync_to_ccc.py --stems api_foo_bar --dry-run

# every template in the index (slow: one conversion each)
python scripts/ccc/sync_to_ccc.py --all --change-id ci-full-sync
```

## Repository configuration

| kind | name | value |
|---|---|---|
| secret | `CCC_API_KEY` | the catalog key (`comfyui-…`). Also passed to `comfy` as `COMFY_CLOUD_API_KEY` for the UI→API conversion. |
| var | `CCC_API_BASE_URL` | default `https://cloud.comfy.org` |
| var | `CCC_PUBLIC_ORIGIN` | default `https://comfy.org` (only used for human-readable output) |

## What it does per template

1. Converts `templates/<stem>.json` to an API graph with `comfy --json run --print-prompt`
   (prints only — no job, no credits). An empty/failed conversion ships `api: null` and is
   reported, never faked.
2. Finds the record that owns this template (see *Identity* below), creating a draft if there is
   none: `schema_version 2`, `visibility: public`, `enabled`, `source_locale: en`,
   `available_surfaces: ["hub"]`, `template_name = <stem>`. New slugs are derived from the
   template **title** (`ideogram-4-5-text-to-image`), matching how the existing public URLs are
   built; existing records keep whatever slug they have.
3. Uploads the graph pair as `src: r2` (`<slug>/workflow-ui-v1.json`, `<slug>/workflow-api-v1.json`)
   and three WebP covers from `templates/<stem>-1.webp`, downscaled to ≤960 px and ≤160 KiB —
   the ceilings the publication rules enforce.
4. Writes one full document with `title`, `description` (≤160 chars), long description `tags`,
   `model_labels` (from `models`), `template_category` (the index section), `io`, and
   `output_type`/`generation_type` when the `io.outputs` media type makes them unambiguous.
5. Verifies every pinned media reference serves bytes at
   `/preview-media/<draft_rev>/<id>/<file_version_uid>` and fails the run otherwise.

## Identity: the committed ledger decides, the script just writes

`scripts/ccc/template-map.json` is the single source of truth for *which catalog record a
template is*:

```json
{
  "api_ideogram_v4_5_t2i": { "uid": "46a8ce16-…", "slug": "ideogram-4-5-text-to-image" },
  "utility_topaz_illustration_upscale": "08b94833-…"
}
```

Lookup is deterministic, in this order:

1. **map entry** for the stem → write to that record, whatever its slug or title is;
2. **`template_name == stem`** — records this tool already wrote are found by exact field match,
   through the catalog's search filters (`search` on staging, `q` on items; a full live sweep
   only on bulk runs);
3. **create** a new draft, with `template_name` stamped on it, and print the new entry for the
   ledger (`new-mappings.json`, also in the job summary).

Nothing is adopted by slug or title similarity any more — that heuristic can silently pair the
wrong record, which is how duplicates got created before. `--adopt-unmapped` still exists for
the one-time bootstrap, and `audit_map.py` produces the evidence a human needs to write those
ledger entries in the first place.

Why a ledger and not a heuristic: of 775 template files and 703 live records, **3** records carry
`template_name`, **0** derived slugs equal a live slug, and **667** live slugs still end in a
legacy 12-hex share id that the repo does not store anywhere. The slugs are the public URLs
(`/hub/workflows/<slug>`), so this file is also what a future migration must consume to keep
those URLs alive — preserve the slug, or emit a redirect from it.

### Current ledger state

`scripts/ccc/template-map.json` was generated from the catalog on 2026-11-20 and holds **461
entries** (461 distinct records), against 775 template files and 703 live records:

| evidence | entries |
|---|---|
| exact slug match after stripping the legacy 12-hex share id | 413 |
| graph fingerprint only (slug renamed, graph identical or near) | 48 |
| moved to `template-map.pending.json` because two stems claim one record | 16 |

Left for a human in `template-map.pending.json`: 94 `ambiguous` (best candidate not clearly ahead
of the runner-up, or graph disagrees), 204 `none` (no live record — usually a template that only
exists as a draft, or whose record predates the API graph), and the 16 duplicate claims above.
83 live records carry no API graph at all, so they can only be matched by slug.

`audit_map.py` builds the evidence once:

```bash
python3 scripts/ccc/audit_map.py --all          # ~775 conversions + 703 record graphs, read-only
```

It matches two ways:

1. **exact slug** — a live slug minus its trailing `-<12 hex>` share id equals the template
   title's slug (`qwen-image-2-1-image-edit-5fbe136ba6f9` → `image_qwen_image_2_1_image_edit`);
2. **graph fingerprint** — node class-type multiset + model weight filenames, for records whose
   slug was renamed.

and writes `scripts/ccc/template-map.proposed.json` with `confident` / `ambiguous` / `none`
buckets. Conversion happens in-process via `comfy_cli.workflow_to_api` with one cached
`object_info` (2 ms per template instead of ~30 s through the CLI; output verified identical).
Copy the entries you trust into `template-map.json`, commit. That is a one-time cost: after the
first sync every record carries `template_name`, so step 2 finds it without any evidence
gathering.

## What it deliberately does not do

- **Publish.** The catalog refuses API keys on `/draft/staging` and `/draft/publish`
  (`403 API keys cannot stage or publish catalog changes`). A human opens
  `https://comfy.org/admin/catalog`, filters by the change ID, then Approve (staging) →
  Final review → Publish. Publish applies the **whole** shared draft, not a selection.
- **Examples.** An honest example is a real output of that graph, i.e. a paid Cloud run. Existing
  `examples` are preserved untouched on update; new examples still need a run.
- **Deletions.** Nothing is discarded or archived here.

## Concurrency and limits

- `expected_draft_rev` is one global CAS token for the whole draft, so the workflow uses a single
  concurrency group (`ccc-catalog-draft`, `cancel-in-progress: false`) and the tool retries
  409/503 with backoff. Two syncs running at once would 409 each other; do not remove the group.
- Media: one uid and one `name` per field (`thumbnail` and `hero` cannot share an upload), ~8 MiB
  per upload, `.svg`/`.wav`/`.flac` are refused by the catalog.
- A batch never aborts on one record: failures are collected and reported, and the summary is
  written to the job's step summary (and a PR comment on dry runs).

## Open follow-ups

- Templates whose graph only emits a GLB (3D) have no viewable artefact, so they publish without
  an example.
- `output_type`/`generation_type` are inferred from `io.outputs`; templates without `io` keep
  whatever the record had (or nothing), and can be corrected in the admin.
- Records created by older imports carry `template_name: null` until the first sync adopts them;
  until then a second record for the same workflow can still be created by a different tool.
