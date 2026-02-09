---
name: editing-site-content
description: "Edits, updates, rewrites, or adds content on the ComfyUI template site pages. Creates override JSON files so changes survive AI regeneration. Use when asked to: change text, update descriptions, fix wording, rewrite content, edit a template page, update SEO, add FAQ, change steps, modify use cases, update copy, fix typos, add sections, customize a page, write marketing copy, improve messaging, tweak headlines, adjust tone, replace placeholder text, personalize content, or manage any template page content. Triggers on: edit content, change description, update page, fix text, rewrite, add FAQ, update steps, site content, template text, page copy, SEO description, marketing copy, content manager, update wording, customize template."
---

# Editing Site Content

You are helping a **content manager or creative** edit template pages on the ComfyUI workflow template site. They should never need to understand JSON, code, or the build pipeline — you handle all of that.

## How It Works

Template pages on the site have AI-generated content. To override that content with human-written copy, you create a JSON file in `site/overrides/templates/{template-name}.json`. The build pipeline merges these overrides on top of AI output, preserving human edits across regenerations.

## Step 1: Identify the Template

The user may refer to a template by its display name, a partial name, a description of what it does, or a URL slug.

To find the right template:

1. Search `templates/index.json` for the template. It contains all templates grouped into bundles with `name`, `title`, and `description` fields.
2. The `name` field (e.g., `templates-sprite_sheet`) is the filename key used for the override file.
3. If the user's request is ambiguous, show them matching candidates with their titles and descriptions and ask them to confirm.

**Example: User says "the sprite sheet one"**
→ Search index.json → find `templates-sprite_sheet` with title "Sprite Sheet Generator"
→ Confirm with user: "I found **Sprite Sheet Generator** — is that the one you mean?"

## Step 2: Check for Existing Override

Read `site/overrides/templates/{template-name}.json` if it exists. If it does, you'll be editing the existing override. If not, you're creating a new one.

Also read the current generated output at `site/src/content/templates/{template-name}.json` (if it exists) to see what the current live content looks like. Show the user what's currently there before making changes.

## Step 3: Make the Changes

### Overridable Fields

These are the fields you can set in an override file:

| Field | Type | What It Is |
|---|---|---|
| `extendedDescription` | `string` | The main long-form description shown on the template detail page. Supports plain text. |
| `metaDescription` | `string` | SEO meta description shown in search results. Keep to 150-160 characters. |
| `howToUse` | `string[]` | Step-by-step instructions. Each array item is one step. |
| `suggestedUseCases` | `string[]` | List of use cases or scenarios where this template shines. |
| `faqItems` | `Array<{question, answer}>` | FAQ section. Each item has a `question` string and an `answer` string. |
| `humanEdited` | `boolean` | Set to `true` to fully replace AI content and prevent regeneration. |

### Writing the Override File

Create or update `site/overrides/templates/{template-name}.json`:

- **Only include fields the user wants to change.** Omitted fields fall back to AI-generated content.
- **Always set `"humanEdited": true`** when the user is providing complete custom content for one or more fields. This prevents the AI from overwriting their work.
- **Partial tweaks** (e.g., fixing a typo in one field) can omit `humanEdited` if the user wants AI to continue generating the other fields. But if in doubt, set it to `true` — it's safer.

### Override File Format

```json
{
  "extendedDescription": "Your custom description here...",
  "metaDescription": "Short SEO-friendly description under 160 chars",
  "howToUse": [
    "Step 1: Do this first",
    "Step 2: Then do this",
    "Step 3: Finally do this"
  ],
  "suggestedUseCases": [
    "Game development sprite animation",
    "Social media character assets"
  ],
  "faqItems": [
    {
      "question": "What image formats are supported?",
      "answer": "PNG and WebP are supported as input formats."
    }
  ],
  "humanEdited": true
}
```

## Step 4: Confirm with the User

After writing the file, show the user a readable summary of what changed:

- Which template was updated
- Which fields were changed
- A preview of the new content in plain English (not raw JSON)

## Guidelines for Content Quality

When helping the user write content:

- **extendedDescription**: Write in a clear, engaging tone. Explain what the template does, what makes it special, and what output to expect. 2-4 paragraphs.
- **metaDescription**: Must be 150-160 characters. Include the primary keyword/template purpose. Write as a compelling search result snippet.
- **howToUse**: Write actionable steps. Start each step with a verb. Be specific about what the user does and what happens. 4-8 steps is ideal.
- **suggestedUseCases**: Be specific and practical. Think about the end user's actual projects. 3-6 use cases.
- **faqItems**: Answer real questions a user would have. Address common concerns about requirements, compatibility, or output quality. 3-5 items.

## Common User Requests — How to Handle Them

| User Says | What to Do |
|---|---|
| "Change the description to say X" | Update `extendedDescription` |
| "Fix the SEO / meta description" | Update `metaDescription` (keep under 160 chars) |
| "Update the steps" / "Change how-to" | Update `howToUse` array |
| "Add a FAQ" / "Add a question" | Add to or create `faqItems` array |
| "Add a use case" | Add to `suggestedUseCases` array |
| "Rewrite everything for this template" | Update all fields, set `humanEdited: true` |
| "Make it sound more professional / casual / fun" | Rewrite relevant fields with the requested tone |
| "What does this page currently say?" | Read the generated output file and show them |
| "List all templates" / "What templates are there?" | Search `templates/index.json` and list them with titles |
| "Undo my changes" / "Go back to AI content" | Delete the override file from `site/overrides/templates/` |
| "Remove just my FAQ override" | Remove only the `faqItems` key from the override JSON |

## Important Rules

1. **Never edit files in `site/src/content/templates/`** — those are generated and git-ignored. Only edit files in `site/overrides/templates/`.
2. **Never modify the build scripts, content schema, or pipeline code** for a content change.
3. **Always use the template's `name` field** (e.g., `templates-sprite_sheet`) as the override filename, not the display title.
4. **Preserve existing override fields** when adding new ones — read the file first, merge your changes.
5. **The override directory is `site/overrides/templates/`** — it is checked into git and survives rebuilds.
