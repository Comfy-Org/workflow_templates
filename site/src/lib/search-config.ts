/**
 * Shared MiniSearch configuration — imported by BOTH the build-time indexer
 * (`scripts/lib/search/build-index.ts`) and the client-side query layer
 * (`src/lib/search.ts`).
 *
 * Why shared: MiniSearch serializes the index data and field config when you
 * `JSON.stringify()` it, but it does NOT serialize `searchOptions`. So query-time
 * options (boost, fuzzy, prefix, combineWith) must be re-specified on the client
 * at `.search()` time. Keeping them here guarantees the index tokenizer and the
 * query options never drift apart.
 */

/** Fields that are tokenized and searched. */
export const SEARCH_FIELDS = [
  'title',
  'description',
  'tags',
  'models',
  'mediaType',
  'creatorName',
] as const;

/** Fields stored verbatim for display (not searched). */
export const STORE_FIELDS = [
  'title',
  'mediaType',
  'mediaTypeLabel',
  'name',
  'slug',
  'thumbnail',
  'username',
  'creatorName',
  'usage',
  'tagsArray',
] as const;

/**
 * Common search abbreviations users type, expanded to the words that actually
 * appear in titles/tags. Applied at QUERY time only (see `expandQuery`), so e.g.
 * "txt2img" or "t2i" finds "Text to Image" workflows.
 */
const QUERY_SYNONYMS: Record<string, string> = {
  txt2img: 'text to image',
  t2i: 'text to image',
  img2img: 'image to image',
  i2i: 'image to image',
  txt2vid: 'text to video',
  t2v: 'text to video',
  img2vid: 'image to video',
  i2v: 'image to video',
  t2a: 'text to audio',
  cn: 'controlnet',
  lora: 'lora',
};

/**
 * Expand known abbreviations in a raw query before searching. Whole-token
 * matches only (so "i2v" expands but "vi2vid" doesn't). Returns the original
 * query when nothing matches.
 */
export function expandQuery(query: string): string {
  return query
    .split(/\s+/)
    .map((word) => QUERY_SYNONYMS[word.toLowerCase()] ?? word)
    .join(' ');
}

/**
 * Tokenizer used at BOTH index and query time — they must match exactly or
 * lookups fail. Splits on whitespace, then also emits sub-parts of hyphen- and
 * underscore-joined terms so snake_case/kebab-case names are searchable:
 * "flux_image-to-video" → ["flux_image-to-video", "flux", "image", "to", "video"]
 */
export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  for (const word of words) {
    tokens.push(word);
    if (/[-_]/.test(word)) {
      for (const part of word.split(/[-_]/)) {
        if (part) tokens.push(part);
      }
    }
  }
  return tokens;
}

/**
 * Query-time search options. Length-aware fuzziness: exact/prefix for very short
 * terms (avoids noise), increasing typo tolerance for longer terms. `combineWith
 * AND` means every term must match — "image video" returns image-AND-video
 * workflows, not the OR-flood of either word.
 */
export function searchOptions(term: string, combineWith: 'AND' | 'OR' = 'AND') {
  const len = term.trim().length;
  const fuzzy = len <= 3 ? false : len <= 6 ? 0.2 : 0.3;
  return {
    boost: { title: 3, models: 2, tags: 2, creatorName: 1.5, mediaType: 1, description: 0.5 },
    prefix: true,
    fuzzy,
    combineWith,
    tokenize,
  };
}

/** Minimal surface of MiniSearch needed for the AND→OR fallback search. */
interface Searchable {
  search(query: string, options: ReturnType<typeof searchOptions>): unknown[];
}

/**
 * Search AND-first (every term must match → precise), then OR (any term →
 * forgiving), then — if both miss — the un-expanded `raw` query. The raw tier
 * rescues documents whose title carries an abbreviation verbatim (e.g. "Wan2.1
 * Alpha T2V"): `expandQuery` rewrites `t2v` → `text to video`, which those docs
 * don't contain, so without this fallback they'd be unfindable. Keeps multi-word
 * queries tight without ever dead-ending on "0 results" when a literal match exists.
 */
export function searchWithFallback<T>(index: Searchable, query: string, raw = query): T[] {
  const and = index.search(query, searchOptions(query, 'AND')) as T[];
  if (and.length > 0) return and;
  const or = index.search(query, searchOptions(query, 'OR')) as T[];
  if (or.length > 0) return or;
  if (raw === query) return or;
  return index.search(raw, searchOptions(raw, 'OR')) as T[];
}
