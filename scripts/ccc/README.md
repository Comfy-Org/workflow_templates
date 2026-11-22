# CCC draft sync

Uploads template metadata + graphs to the Comfy Content Catalog (CCC) as **drafts**, from
`templates/index.json` + `templates/<stem>.json`.

```bash
# refresh the committed snapshot of the catalog's long-form copy (GETs only)
python scripts/ccc/pull_records.py --dry-run      # report what moved
python scripts/ccc/pull_records.py                # write scripts/ccc/records.json

# what CI runs on every template change
python scripts/ccc/sync_to_ccc.py --stems api_foo_bar api_baz_qux --change-id ci-sync-1234

# one template, no writes
python scripts/ccc/sync_to_ccc.py --stems api_foo_bar --dry-run

# every template in the index (775 stems, ~5 min at 8 workers)
python scripts/ccc/sync_to_ccc.py --all --jobs 8 --change-id ci-full-sync

# split a long run across several invocations (writes still need one job at a time)
python scripts/ccc/sync_to_ccc.py --all --shard 1/4 --jobs 8
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
3. Uploads the graph pair as `src: r2` (`<slug>/workflow-ui-v1.json`, `<slug>/workflow-api-v1.json`).
   Three WebP covers from `templates/<stem>-1.webp` (downscaled to ≤960 px and ≤160 KiB, the
   ceilings the publication rules enforce) are written **only when the record has none**, or with
   `--refresh-covers`. A cover is content a person can replace in the admin, so a graph change
   never costs the published hero/thumbnail.
4. Writes one full document: `title`, `description` (≤160 chars), `tags`, `model_labels` (from
   `models`), `template_category` (the index section), `io`, and `output_type`/`generation_type`
   when the `io.outputs` media type makes them unambiguous — all from `templates/index.json`.
   `long_description`, `faq`, `use_cases`, `runnable` and `compatibility` come **only** from
   `scripts/ccc/records.json`; when the snapshot has no value the field is omitted, so the
   catalog keeps what it holds.
5. Leaves a record alone when the composed document already equals the stored one: no media
   upload, no `PUT`, status `unchanged`. `--force-media` re-uploads the graph pair when only the
   template file changed.
6. Verifies every pinned media reference serves bytes at
   `/preview-media/<draft_rev>/<id>/<file_version_uid>` and fails the run otherwise.

## Copy: two authoring surfaces, one direction each

| what | authored where | written by |
|---|---|---|
| `title`, `description`, `tags`, `model_labels` | `templates/index.json` (the site renders it) | `sync_to_ccc.py` |
| `long_description`, `faq`, `use_cases`, `runnable`, `compatibility` | the catalog, snapshotted into `scripts/ccc/records.json` | `pull_records.py` → `sync_to_ccc.py` |
| `template_category`, `io`, `output_type`, `generation_type` | derived from the index, never replaced by an empty value | `sync_to_ccc.py` |

`records.json` is the reason long copy survives: the sync used to write the 160-character index
blurb into `long_description`, which is lossy for the ~450 mapped records that carry 1 KB+ of
prose, FAQ and use cases. Editing `long_description` in `records.json` and running the sync is
now how that copy changes in the catalog; the pull is idempotent, so a scheduled refresh leaves
the file byte-identical (and `_source.pulled_at` untouched) when nothing moved.

## Ownership: the same ledger decides which fields the repo may write

Identity alone is not enough. `description`, `tags`, `title`, `model_labels` and the workflow pair
also exist on records a person has edited in `comfy.org/admin`, and the repo's text is often the
*older* of the two — it kept `Sbugraph Guide` where the catalog says `Subgraph`, and `Tuotrial`
where the catalog says `Tutorial`. Writing those fields again would undo that work.

A map entry may therefore carry `catalog_owned`, a list of fields this tool must never write:

```json
"image_netayume_lumina_t2i": {
  "uid": "…",
  "slug": "…",
  "catalog_owned": ["description", "tags"]
}
```

- The default is the opposite of "hold": a field not listed is repo-owned and gets written, so
  nothing freezes unless the ledger says so.
- `graph` holds the whole workflow pair (`workflow-ui-v1.json` + `workflow-api-v1.json`), because
  a media file cannot be merged field by field. A held graph is never re-uploaded, whatever
  `--force-media` says.
- `template_name` is identity and cannot be held.
- Each run prints `held <fields>` next to the record it touched; a typo in a field name is
  reported at startup instead of silently holding nothing.

Where the 2026-11-22 seed came from: a read-only drift audit of all 494 mapped records compared
every copy field and every UI-graph string against the repo, then ran `git log -S<literal>` on
each of the 662 deltas to establish which side had moved later. 403 deltas proved the **repo**
was newer (stale catalog → the field stays repo-owned), 12 were pulled back into the repo by
hand, and 126 stems got `catalog_owned` for the fields whose catalog text never appears in the
repo's history (`tags` 99, `description` 25, `model_labels` 6, `title` 3) plus one held graph.
Delete an entry once the two sides are reconciled: the ledger is the record of that decision,
not a permanent veto.

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
   ledger (`new-mappings.json`, also in the job summary). No human gate: a stem the ledger does
   not name is a template the catalog does not have.

The sync itself adopts nothing by similarity — that heuristic can silently pair the wrong
record, which is how duplicates got created before. `audit_map.py` is the one place where
evidence (including exact titles) is allowed to pick a record, and it writes the answer into the
ledger; `--adopt-unmapped` remains for a one-time bootstrap only.

Why a ledger and not a heuristic: of 775 template files and 704 live records, **4** records carry
`template_name`, and most public slugs still end in a legacy 12-hex share id that the repo does
not store anywhere. The slugs are the public URLs (`/hub/workflows/<slug>`), so this file is
also what a future migration must consume to keep those URLs alive — preserve the slug, or emit
a redirect from it.

### Current ledger state

`scripts/ccc/template-map.json` holds **494 entries** (494 distinct records) against 775 template
files and 704 live records:

| evidence | entries |
|---|---|
| `template_name` — the record was written for this stem | 2 |
| carried over from the committed ledger (record still live) | 461 |
| exact slug after stripping the legacy 12-hex share id | 17 |
| exact normalized title, unique across the live set | 11 |
| graph fingerprint only (slug renamed, graph identical) | 1 |
| version successor (`"version_successor": true`) | 2 |

The two version successors are `api_ideogram_v4_5_t2i` and
`api_google_gemini_omni_flash_1_2_t2v`: the catalog's newest record of their title family is an
older version, so the sync updates that record instead of creating a duplicate. A successor only
fires when that older record is not already owned by another template file — when both versions
exist in the repo, the older one keeps its record and the newer one becomes a new record.

Left for a human in `.ccc-work/pending.json` (gitignored, gates nothing — an unmapped stem is
created as a new record): 95 `ambiguous` (best candidate not clearly ahead of the runner-up, or
the graph disagrees) and 186 `none` (no live record matched: new models, or records with no API
graph).

`audit_map.py` rebuilds the ledger in place:

```bash
python3 scripts/ccc/audit_map.py --all --jobs 8   # 775 conversions + 704 record graphs, read-only
```

It claims records with five rules, strongest first:

1. **`template_name == stem`** — the record was written by this tool for this template;
2. **exact slug** — a live slug minus its trailing `-<12 hex>` share id equals the template
   title's slug (`qwen-image-2-1-image-edit-5fbe136ba6f9` → `image_qwen_image_2_1_image_edit`);
3. **exact title** — normalized titles equal, and only one live record has that title (when the
   catalog holds duplicate titles, the graph fingerprint has to pick one);
4. **graph fingerprint** — node class-type multiset + model weight filenames, for records whose
   slug and title were both renamed;
5. **version successor** — same title family once version tokens are stripped (`1.1` vs `1.2`,
   `2.5` vs `2.6`, `3.5` vs `4`), same output modality, and the family's newest record is older
   than the template.

Claims are resolved globally: one record belongs to one stem, and an entry already committed in
the ledger outranks a fresh heuristic. Anything unresolved lands in `.ccc-work/pending.json`;
`scripts/ccc/template-map.proposed.json` is no longer produced. Conversion happens in-process via
`comfy_cli.workflow_to_api` against one cached `object_info` (1-3 ms per template instead of
2-20 s through the CLI, byte-identical output). That plus `--jobs` is what lets `--all` finish
inside the 60-minute job.

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
- `--jobs N` (default 4) parallelises only the read/convert phase — graph conversion, record
  lookup, document composition. Every catalog write stays in one sequential loop, because
  `expected_draft_rev` is a single token for the whole draft.
- `--shard 2/4` processes a deterministic slice of the sorted stems, so a long run can be split
  across invocations. Shards cannot write at the same time (same CAS token): run one at a time,
  or run them dry and write once.
- An unchanged record costs one `GET` and no write, so re-running `--all` is safe: the second
  run reports `unchanged` for every record the first one wrote. A template edit that only changes
  the graph leaves every field identical, so CI passes `--force-media` for the files a push or PR
  touched; `--all` does not, because re-uploading 775 graph pairs is not something to do by
  accident.

## Open follow-ups

- Templates whose graph only emits a GLB (3D) have no viewable artefact, so they publish without
  an example.
- `output_type`/`generation_type` are inferred from `io.outputs`; templates without `io` keep
  whatever the record had (or nothing), and can be corrected in the admin.
- Records created by older imports carry `template_name: null` until the first sync adopts them;
  until then a second record for the same workflow can still be created by a different tool.
