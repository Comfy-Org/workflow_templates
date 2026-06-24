/**
 * Shared MiniSearch config for both the build-time indexer and the client query
 * layer. MiniSearch serializes the index but NOT the search options, so the
 * tokenizer and field list must be defined once here or index and query drift.
 */

/** Searched fields. `name` (e.g. `video_ltx2_3_t2v`) surfaces filename literals. */
export const SEARCH_FIELDS = [
  'title',
  'description',
  'tags',
  'models',
  'mediaType',
  'creatorName',
  'name',
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
 * Emits the whole term plus sub-parts so an identifier matches however it's typed:
 * hyphen/underscore splits (`video_ltx2_3_t2v` → `t2v`), and a trailing version
 * splits off its name (`wan2.7` → `wan`, `2.7`, so `wan 2.7` matches too). A
 * mid-digit abbreviation like `t2v` stays whole. Used at index AND query time.
 */
export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  for (const word of text.toLowerCase().split(/\s+/).filter(Boolean)) {
    tokens.push(word);
    const parts = new Set<string>();
    for (const part of word.split(/[-_]/)) {
      if (part) parts.add(part);
    }
    const version = word.match(/^([a-z][a-z.]*?)(\d+(?:\.\d+)*)$/);
    if (version) {
      parts.add(version[1].replace(/\.$/, ''));
      parts.add(version[2]);
    }
    parts.delete(word);
    tokens.push(...parts);
  }
  return tokens;
}

/** Per-term fuzziness: 0.3 (≈2 edits, forgives "conrtol" → "control"), but exact
 *  for ≤3-char terms (noise) and any term with a digit (so "2.5" ≠ "3.5"). */
export function termFuzziness(term: string): number | false {
  return term.length <= 3 || /\d/.test(term) ? false : 0.3;
}

/** Prefix matching + per-term fuzziness; AND by default so multi-word stays precise.
 *  `boost` tiers fields by signal: title > curated metadata (models/tags) >
 *  creator > mediaType, with description demoted below default so an incidental
 *  prose mention never outranks a real title/model match. */
export function searchOptions(combineWith: 'AND' | 'OR' = 'AND') {
  return {
    boost: { title: 3, models: 2, tags: 2, creatorName: 1.5, mediaType: 1, description: 0.5 },
    prefix: true,
    fuzzy: (term: string) => termFuzziness(term),
    combineWith,
    tokenize,
  };
}

// Modality shorthand → word, expanding `{X}2{Y}` by structure (t2i, txt2img, …)
// rather than one entry per spelling.
const MODALITY_STEMS: Record<string, string> = {
  t: 'text',
  txt: 'text',
  text: 'text',
  i: 'image',
  img: 'image',
  image: 'image',
  v: 'video',
  vid: 'video',
  video: 'video',
  a: 'audio',
  s: 'audio',
  m: 'music',
};

// Acronyms that aren't an `{X}2{Y}` pattern.
const ACRONYMS: Record<string, string> = {
  cn: 'controlnet',
};

/**
 * Expand one shorthand token to its modality words ("t2i" → "text image"), or
 * null. "to" is dropped — it carries no signal and matches every "X to Y" title.
 */
export function expandAbbreviation(token: string): string | null {
  const lower = token.trim().toLowerCase();
  if (ACRONYMS[lower]) return ACRONYMS[lower];

  const match = lower.match(/^([a-z]+)2([a-z]+)$/);
  if (!match) return null;
  const left = MODALITY_STEMS[match[1]];
  const right = MODALITY_STEMS[match[2]];
  return left && right ? `${left} ${right}` : null;
}

/** Expand shorthand tokens ("wan i2v" → "wan image video"); null if none expand. */
export function expandQuery(query: string): string | null {
  let changed = false;
  const out = query
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      const expansion = expandAbbreviation(token.toLowerCase());
      if (expansion) changed = true;
      return expansion ?? token;
    })
    .join(' ');
  return changed ? out : null;
}

/** Minimal surface of MiniSearch the query needs. */
interface Searchable {
  search(query: string, options: ReturnType<typeof searchOptions>): SearchHit[];
}

interface SearchHit {
  id: string;
  [key: string]: unknown;
}

/** AND for precision, falling back to OR only when AND finds nothing. */
function andThenOr(index: Searchable, query: string): SearchHit[] {
  const and = index.search(query, searchOptions('AND'));
  return and.length > 0 ? and : index.search(query, searchOptions('OR'));
}

/**
 * Literal matches first, expansion matches below (deduped). So "t2v" ranks a
 * workflow titled "...T2V" on top, then "text video" matches; when no literal
 * exists (e.g. "cn", "txt2img"), the expansion is the whole result.
 */
export function searchWorkflows<T extends SearchHit>(index: Searchable, query: string): T[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const results: SearchHit[] = [];
  const seen = new Set<string>();
  const collect = (hits: SearchHit[]) => {
    for (const hit of hits) {
      if (!seen.has(hit.id)) {
        seen.add(hit.id);
        results.push(hit);
      }
    }
  };

  collect(andThenOr(index, trimmed));

  const expanded = expandQuery(trimmed);
  if (expanded) collect(andThenOr(index, expanded));

  return results as T[];
}
