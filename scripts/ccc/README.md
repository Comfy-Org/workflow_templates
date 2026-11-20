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
   `available_surfaces: ["hub"]`, `template_name = <stem>`.
3. Uploads the graph pair as `src: r2` (`<slug>/workflow-ui-v1.json`, `<slug>/workflow-api-v1.json`)
   and three WebP covers from `templates/<stem>-1.webp`, downscaled to ≤960 px and ≤160 KiB —
   the ceilings the publication rules enforce.
4. Writes one full document with `title`, `description` (≤160 chars), long description `tags`,
   `model_labels` (from `models`), `template_category` (the index section), `io`, and
   `output_type`/`generation_type` when the `io.outputs` media type makes them unambiguous.
5. Verifies every pinned media reference serves bytes at
   `/preview-media/<draft_rev>/<id>/<file_version_uid>` and fails the run otherwise.

## Identity: `template_name`, never the slug

`template_name` is the template file stem and the only key this tool trusts. Lookup order:

1. a record (live or draft) whose `template_name` equals the stem — the normal case after the
   first sync;
2. a legacy record with `template_name: null` whose slug starts with the derived slug or whose
   title matches exactly — **adopted**, and `template_name` is written onto it, because a second
   record for one workflow is a defect (the catalog does not dedupe slugs);
3. otherwise create a new draft.

A record that already carries a *different* `template_name` is never touched. When slug and title
have both drifted (renames, old imports), add an override to `scripts/ccc/template-map.json`:

```json
{ "api_old_stem": "some-live-slug-0123456789ab" }
```

The override only has to exist once — the sync writes `template_name` onto the mapped record.

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
