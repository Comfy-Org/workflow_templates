# Node titles

A custom `title` replaces the node type in the node header. The type is how a contributor recognises the node and
finds it again in the node search, so a title that hides it is a rejected graph. The default is **no title at all**;
add one only when the graph needs the hint.

## Shape

```
<ComfyUI display name> (<short hint>)
```

Examples: `Convert Array to String (boxes → text)`, `Replace Text (Regex) (count the boxes)`,
`Format Text (Ming coordinates)`, `Get Item From List (layers so far)`, `Int (Width)`, `Int (Turbo steps)`.

- Use the **display name the UI shows**, not the `node_id`:

  | node_id | shown as |
  | --- | --- |
  | `RegexExtract` | `Extract Text` |
  | `RegexReplace` | `Replace Text (Regex)` |
  | `StringFormat` | `Format Text` |
  | `ComfyMathExpression` | `Math Expression` |
  | `ComfyNumberConvert` | `Convert Number` |
  | `ImageCompare` | `Compare Images` |
  | `ResizeImageMaskNode` | `Resize Image/Mask` |
  | `BuildJsonPromptIdeogram` | `Build JSON Prompt (Ideogram)` |

  Resolve them from a core checkout by scanning for `node_id="X"` followed by `display_name="…"`. Nodes without a
  `display_name` (LoadImage, UNETLoader, PreviewAny, …) show the `node_id` verbatim, so the title is just that name.

- Serial numbers (`①`, `②`) are allowed *inside* a hint when order matters, never as the whole title.
- A hint that only repeats the node name (`End Loop (end loop)`) is dropped, leaving the bare node name.
- `MarkdownNote` renders as `Note` / `Markdown Note`, so `Note: Model Links`-style titles are already compliant.
- The stage belongs to the **group**, not the node: `Sampling` is a group title, not `KSampler (sampling)`.
- Typos in an inherited title (`Int (Setps)`) are fixed; the node type is never removed.

## Editing titles without churn

Edit text-level (`"title": "<old>"` → `"title": "<new>"`) so the rest of the file stays byte-identical. Verify by
comparing the parsed JSON with `title` stripped from every node — only titles may differ.
