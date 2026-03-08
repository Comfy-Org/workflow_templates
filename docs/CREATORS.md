# Creator System — Authorship & Attribution

## Overview

Every workflow template has a **creator** (who built the workflow) and optionally a **model brand** (the AI model it uses). These are independent concepts:

- **Creator** = the person/team who made the workflow (stored as `username`)
- **Model brand** = the AI provider logo shown on thumbnails (stored in `logos[]`)

## Data Model

### `templates/creators.json`

The single source of truth for creator profiles. Keyed by username:

```json
{
  "ComfyUI": {
    "displayName": "ComfyUI",
    "handle": "ComfyUI",
    "summary": "Official ComfyUI workflow templates created by the Comfy team.",
    "social": "x.com/comaboratory"
  },
  "hellorob": {
    "displayName": "RobTheMan",
    "handle": "hellorob",
    "summary": "Rob is a core member of the ComfyUI creative team...",
    "social": "x.com/hellorob"
  }
}
```

Fields:
- `displayName` — Shown on cards, profile pages, spotlights
- `handle` — Used in URLs and @mentions (usually matches the key)
- `summary` — Bio text for profile pages and creator spotlights
- `social` — Social link (without `https://` prefix)
- `avatarUrl` — (optional) URL to avatar image; if absent, an initial-based avatar is generated
- `coverUrl` — (optional) Profile cover image

### `templates/index.json` — The `username` Field

Every template entry has a `username` field linking it to a creator:

```json
{
  "name": "flux_text_to_image",
  "title": "Flux Text to Image",
  "username": "ComfyUI",
  "logos": [{ "provider": "Flux" }],
  ...
}
```

- `username` maps to a key in `creators.json`
- Default is `"ComfyUI"` for official templates (322 of 333 as of Feb 2026)
- Community creators get their own username (e.g. `"hellorob"`, `"PurzBeats"`)
- The `logos[].provider` field is for **model branding only** (thumbnail overlay), NOT authorship

## Data Flow

```
templates/index.json (username field)
    │
    ├─→ site/scripts/sync-templates.ts
    │     Syncs to site/src/content/templates/*.json
    │     username is included via TemplateInfo spread
    │
    └─→ templates/creators.json (profile data)
          │
          ├─→ Astro pages resolve displayName at build time
          │     index.astro: serializes creatorDisplayName for Vue island
          │     [username].astro: generates profile pages from creators.json keys
          │
          ├─→ Vue components receive creatorDisplayName as prop
          │     HubBrowse → WorkflowGrid → HubWorkflowCard
          │
          ├─→ CreatorsSection.astro: groups templates by username
          │     Looks up displayName, handle, bio from creators.json
          │     Excludes "ComfyUI" (too many templates to spotlight)
          │
          └─→ WorkflowCard.astro: imports creators.json directly
                Resolves author from username prop
```

## URL Structure

- `/templates/` — Hub page with all templates (creator shown on each card)
- `/templates/{username}/` — Creator profile page (e.g. `/templates/hellorob/`)
- `/templates/{template-name}/` — Individual template detail page

Profile pages are statically generated from `creators.json` keys via `getStaticPaths()` in `[username].astro`.

## Component Architecture

### Serialization Boundary (Astro → Vue)

Vue islands can't import server-side JSON. The Astro pages pre-resolve the display name:

```
Astro page (index.astro)
  → imports creators.json
  → resolves creatorDisplayName per template
  → passes serialized array to Vue island

Vue island (HubBrowse.vue)
  → receives templates with creatorDisplayName
  → passes through WorkflowGrid → HubWorkflowCard
```

### Card Components

| Component | Type | How it gets author |
|-----------|------|--------------------|
| `HubWorkflowCard.vue` | Vue | `creatorDisplayName` prop (from parent Vue component) |
| `WorkflowCard.astro` | Astro | Imports `creators.json`, resolves from `username` prop |
| `CreatorWorkflowCard.astro` | Astro | Receives `authorName` prop from `CreatorSpotlight` |

All cards show:
- **Author avatar**: Green gradient circle with first initial (consistent across all cards)
- **Author name**: Resolved display name from creators.json
- **Logo overlay on thumbnail**: Model brand logo (separate from author — this is `logos[].provider`)

### CreatorsSection

Groups templates by `username`, excludes `"ComfyUI"`, sorts by total usage. Requires `>= 2` templates to appear. Shows top 3 creators with their top 3 workflows each.

## Adding a New Creator

1. Add entry to `templates/creators.json`:
   ```json
   "newuser": {
     "displayName": "New User",
     "handle": "newuser",
     "summary": "Description of the creator.",
     "social": "x.com/newuser"
   }
   ```

2. Set `"username": "newuser"` on their templates in `templates/index.json`

3. Run `pnpm run sync` in `site/` to propagate changes

4. A profile page at `/templates/newuser/` is automatically generated

## Key Files

| File | Purpose |
|------|---------|
| `templates/creators.json` | Creator profile data (source of truth) |
| `templates/index.json` | Template metadata with `username` field |
| `site/scripts/lib/types.ts` | `TemplateInfo.username` type definition |
| `site/src/content/config.ts` | Content collection schema (includes `username`) |
| `site/src/pages/templates/index.astro` | Hub page, serializes `creatorDisplayName` |
| `site/src/pages/templates/[username].astro` | Creator profile page |
| `site/src/components/hub/HubWorkflowCard.vue` | Vue card (receives `creatorDisplayName` prop) |
| `site/src/components/hub/WorkflowCard.astro` | Astro card (imports creators.json directly) |
| `site/src/components/hub/CreatorsSection.astro` | Creator spotlight section |
| `site/src/components/hub/CreatorSpotlight.astro` | Individual creator row |

## Common Mistakes to Avoid

- **Don't use `logos[0].provider` as the author.** That's model branding (e.g. "Grok", "Flux"), not who made the workflow.
- **Don't forget the serialization boundary.** Vue islands can't import JSON — resolve display names in Astro and pass as props.
- **Don't hardcode creator data in components.** Always resolve from `creators.json` via username.
- **Remember to run sync** after changing `index.json` — the content collection won't update automatically.
