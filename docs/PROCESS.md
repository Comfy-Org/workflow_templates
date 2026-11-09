# Workflow Template Process

What a ComfyUI workflow template is, how one goes from "we want this" to "it ships in ComfyUI",
and which parts of the work someone who has never shipped a template can own on day one.

This page is the map, not the manual:

- step-by-step instructions: [README → Adding New Templates](../README.md#adding-new-templates)
- the data contract: [SPEC.md](SPEC.md)
- wheels, releases and PyPI: [PUBLISHING.md](PUBLISHING.md)
- workflow/package layout for agents: [AGENTS.md](../AGENTS.md), [`.claude/skills/managing-templates`](../.claude/skills/managing-templates/SKILL.md)

## 1. What a template actually is

Four artifacts that have to agree with each other:

| # | Artifact | Where | Rule |
|---|----------|-------|------|
| 1 | Workflow JSON | `templates/<name>.json` | `<name>` is `snake_case` and matches the `name` field in `index.json`; no spaces, dots or special characters |
| 2 | Thumbnail(s) | `templates/<name>-1.webp`, optional `<name>-2.webp` | webp; animated webp for video templates; `-2` only for `compareSlider` / `hoverDissolve` |
| 3 | Index entry | `templates/index.json`, inside one category's `templates[]` | title, description, tags, models, logos, `minComfyUIVersion`, date, thumbnail |
| 4 | Bundle row | `bundles.json` | every template must be assigned to exactly one media bundle; **new media goes to `media-assets-02`** |

Two delivery paths come out of the same source: the `comfyui-workflow-templates*` wheels on PyPI
(they ship with local ComfyUI installs) and the template catalog built from `index.json` (site + MCP index).

Current scale:

- 755 entries in `templates/index.json`, 756 workflow files
- 12 categories (`Image`, `Video`, `Audio`, `3D Model`, `LLM`, `Vector`, tools, marketing…)
- 6 media bundles, 11 locale index files

## 2. The pipeline

| Stage | What happens | How |
|-------|--------------|-----|
| 1. Intake | who asked, what it demonstrates, partner (API) or open-source, which model and node classes | — |
| 2. Build | clean graph whose defaults produce a usable output on first run | export from ComfyUI started with `--disable-all-custom-nodes` |
| 3. Assets | thumbnail from the real first run, sample inputs under `input/` | webp conversion + compression, `scripts/sync/generate_workflow_io.py` |
| 4. Register | index entry + bundle row | edit `templates/index.json`, `bundles.json` |
| 5. Translate | propagate technical fields, add `title`/`description` per locale | `python3 scripts/sync/sync_data.py --templates-dir templates` |
| 6. Validate | schema, JSON syntax, file sizes, thumbnails, bundle completeness | `python scripts/validate/validate_templates.py`, `python scripts/sync/sync_bundles.py` |
| 7. PR | branch → PR → CI → review | see guardrails below |
| 8. Ship | merge to `main` creates a GitHub Release; PyPI only on a version-bump PR that carries the `release` label | `.github/workflows/publish.yml` |

Template-only PRs do **not** bump the root `pyproject.toml` and do **not** regenerate the core
manifest: CI regenerates the derived index files and commits them back to the PR, while manifest +
SHA256 sync is deferred to version-bump/release PRs.

## 3. What to collect before starting

| Input | Why it blocks |
|-------|---------------|
| Workflow JSON exported from a ComfyUI with no custom nodes | extension metadata saved into the file ships to every user |
| Model download URLs whose filenames **exactly** match `widgets_values` | a renamed file means the node can't find the model on first load |
| The thumbnail source (the real first-run output) | the thumbnail has to be reproducible from the committed default prompt and seed |
| Title, one-paragraph description, tags, creator `username` | index entry + creator attribution ([CREATORS.md](CREATORS.md)) |
| Partner vs open-source | sets `openSource`, logos, and whether it can ship publicly |
| Category, and `minComfyUIVersion` if it uses a new node | new node classes break older frontends |
| Sample inputs, if the workflow needs them | inputs live in `input/` and are revision-pinned at publish time |

### Model links

The part that breaks most often. Download links live **on the loader node**, never at workflow level,
and never in `index.json` — `index.json`'s `models` array is display names for the model badge only.

```json
"properties": {
  "Node name for S&R": "UNETLoader",
  "models": [{
    "name": "wan2.1_t2v_1.3B_bf16.safetensors",
    "url": "https://huggingface.co/Comfy-Org/.../resolve/main/split_files/diffusion_models/wan2.1_t2v_1.3B_bf16.safetensors",
    "directory": "diffusion_models",
    "hash": "6f999b0d6cb9a72b3d98ac386ed96f57f8cecae13994a69232514ea4974ad5fd",
    "hash_type": "SHA256"
  }]
}
```

| Field | Rule |
|-------|------|
| `name` | byte-identical to the loader's widget string in `widgets_values`; a mismatch offers the user a file the loader never loads |
| `url` | direct `…/resolve/main/…` file link in a **public** repo — prefer the `Comfy-Org/*` mirror |
| `directory` | models subfolder: `diffusion_models`, `text_encoders`, `vae`, `loras`, `clip_vision`, `checkpoints`, `upscale_models`, `model_patches`, `background_removal`, `geometry_estimation`, `detection`, `latent_upscale_models`, `frame_interpolation`, `embeddings` |
| `hash`, `hash_type` | optional upstream convention (SHA256); nothing verifies it, so compute it from the published file rather than copying a stale value |

- one entry per file the graph actually loads; with `UNETLoader → LoraLoaderModelOnly`, link what the UNET
  loader is set to, not the newest file in the showcased LoRA repo
- probe the link before pushing: `curl -sI -H "Range: bytes=0-0" <url>` → `302` (CDN redirect) or `200`
  is good; `401`/`404` means anonymous users cannot download it
- non-HuggingFace hosts (civitai, docs pages, mirrors) need an entry in
  [`scripts/data/whitelist.json`](../scripts/data/whitelist.json) or the link check fails
- API/partner-node templates have no weights to link at all (index entry `openSource: false`)
- CI does gate this: `model-analysis.yml` (metadata present, `name` ↔ widget match, subgraph instances)
  and `link-checker.yml` (dead URLs) both fail the PR, they do not just comment

## 4. Who can own which stage

| Stage | New contributor alone? | Needs the owner |
|-------|------------------------|-----------------|
| Build the workflow, produce the thumbnail | yes | — |
| Index entry: title, description, tags | yes, following the existing category/tag list | category choice, marketing framing |
| `bundles.json` row | yes — always `media-assets-02` | frozen-bundle questions ([frozen_bundles.md](../scripts/docs/frozen_bundles.md)) |
| Translations | yes, the script does the mechanical part | English title wording |
| Model embedding, download URLs, `size` | no | owner |
| `minComfyUIVersion`, node-class compatibility | no | owner |
| Merge, `release` label, PyPI, archiving | no | maintainer |

## 5. Definition of done

- [ ] the workflow runs end-to-end in a fresh ComfyUI (no custom nodes, models and inputs deleted first) and produces the thumbnail
- [ ] filename, `index.json` `name`, thumbnail counter and bundle row all match
- [ ] locale index files synced and committed (not just `index.json`)
- [ ] `validate_templates.py` and `sync_bundles.py` both clean
- [ ] thumbnail is webp, reasonably sized, English text only if it has text at all
- [ ] PR description says what changed and links the request it came from

## 6. Guardrails

| Check | Workflow | Enforces |
|-------|----------|----------|
| Validate Templates | `validate-templates.yml` | `index.json` against schema, JSON syntax, file sizes, thumbnails, PR comment on failure |
| Build & Test | `build-test.yml` | all bundles build, tests pass |
| Version Check / Auto-bump | `version-check.yml` | derived index + MCP index commits; on version-bump PRs also manifest SHA256 and bundle completeness |
| Validate Manifests | `validate-manifests.yml` | committed manifest hashes on release PRs |
| I18N Validate | `i18n-validate.yml` | locale index files stay consistent with English |
| Spellcheck | `spellcheck.yml` | `index.json` copy and MarkdownNote text in workflows |
| Link Checker | `link-checker.yml` | links inside template JSONs |
| Node compatibility | `report-comfyui-node-compat.yml` | informational PR comment: node baseline vs templates |

## 7. Failure modes we keep hitting

- template added, `bundles.json` not updated → `sync_bundles.py` fails; the template would ship in no wheel
- model URL filename ≠ `widgets_values` filename → download lands under a different name and the node can't resolve it
- thumbnail not reproducible from the default prompt → nobody can re-shoot or verify it later
- locale index files forgotten → the template is missing for zh/ja/ko users
- custom nodes left enabled during export → metadata pins a node version no one else has
- renaming touches files + index + bundles + translations at once → always its own PR

## 8. Not documented yet

- an intake form or checklist for whoever requests a template (partner, marketing, docs), so the
  request arrives with the workflow, models, thumbnail source and copy
- a review rubric beyond "test it as a new user": what a reviewer actually looks at, and in what order
- a visual spec for thumbnails (resolution, frame choice, text overlay, brand logos) that a designer can follow
  without the template owner next to them
- per-template effort estimate, so the work can be planned and delegated by time rather than by vibe
- the Model Hub migration: template editing is expected to move there; today the repo is still the source of truth
- where weights should live (a `Comfy-Org/*` repackaged mirror vs the vendor's own repo) is convention, not a written rule
- `hash`/`hash_type` are never verified by CI, so a stale hash ships silently
- ModelScope / regional mirror conventions are not documented anywhere in the repo
