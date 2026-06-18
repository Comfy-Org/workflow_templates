import { describe, it, expect } from 'vitest';
import MiniSearch from 'minisearch';
import {
  SEARCH_FIELDS,
  STORE_FIELDS,
  tokenize,
  searchOptions,
  expandQuery,
  searchWithFallback,
} from '../../src/lib/search-config';

describe('tokenize', () => {
  it('lowercases and splits on whitespace', () => {
    expect(tokenize('Hello World')).toEqual(['hello', 'world']);
  });

  it('keeps a hyphenated term AND emits its sub-parts', () => {
    expect(tokenize('image-to-video')).toEqual(['image-to-video', 'image', 'to', 'video']);
  });

  it('keeps a snake_case term AND emits its sub-parts', () => {
    expect(tokenize('flux_dev_example')).toEqual(['flux_dev_example', 'flux', 'dev', 'example']);
  });

  it('handles mixed hyphen + underscore', () => {
    expect(tokenize('flux_image-to-video')).toEqual([
      'flux_image-to-video',
      'flux',
      'image',
      'to',
      'video',
    ]);
  });

  it('drops empty tokens from collapsed separators', () => {
    expect(tokenize('a__b')).toEqual(['a__b', 'a', 'b']);
  });
});

describe('expandQuery', () => {
  it('expands known abbreviations to their words', () => {
    expect(expandQuery('txt2img')).toBe('text to image');
    expect(expandQuery('i2v')).toBe('image to video');
    expect(expandQuery('t2i')).toBe('text to image');
  });

  it('is case-insensitive on the abbreviation', () => {
    expect(expandQuery('TXT2IMG')).toBe('text to image');
  });

  it('only expands whole tokens, not substrings', () => {
    expect(expandQuery('myi2vthing')).toBe('myi2vthing');
  });

  it('leaves unknown queries untouched', () => {
    expect(expandQuery('flux upscale')).toBe('flux upscale');
  });

  it('expands per-token within a multi-word query', () => {
    expect(expandQuery('fast i2v')).toBe('fast image to video');
  });
});

describe('searchOptions', () => {
  it('disables fuzzy for very short terms (avoids noise)', () => {
    expect(searchOptions('ab').fuzzy).toBe(false);
    expect(searchOptions('abc').fuzzy).toBe(false);
  });

  it('enables increasing fuzziness for longer terms', () => {
    expect(searchOptions('abcd').fuzzy).toBe(0.2);
    expect(searchOptions('abcdefg').fuzzy).toBe(0.3);
  });

  it('combines terms with AND so every term must match', () => {
    expect(searchOptions('image video').combineWith).toBe('AND');
  });

  it('boosts title above description', () => {
    const { boost } = searchOptions('anything');
    expect(boost.title).toBeGreaterThan(boost.description);
  });
});

// ── Integration: exercise the real index + real query options end to end ──

interface Doc {
  id: string;
  title: string;
  description: string;
  tags: string;
  models: string;
  mediaType: string;
  creatorName: string;
  name: string;
}

const DOCS: Doc[] = [
  {
    id: '1',
    title: 'Image to Video',
    description: 'Animate a still image into a short clip',
    tags: 'animation',
    models: 'wan',
    mediaType: 'video',
    creatorName: 'ComfyUI',
    name: 'image_to_video',
  },
  {
    id: '2',
    title: 'Text to Image',
    description: 'Generate an image from a text prompt',
    tags: 'generation',
    models: 'flux',
    mediaType: 'image',
    creatorName: 'ComfyUI',
    name: 'text_to_image',
  },
  {
    id: '3',
    title: 'Upscale Photo',
    description: 'Enhance and enlarge an existing image',
    tags: 'enhance',
    models: 'esrgan',
    mediaType: 'image',
    creatorName: 'Topaz',
    name: 'upscale_photo',
  },
];

function buildIndex(): MiniSearch<Doc> {
  const ms = new MiniSearch<Doc>({
    fields: [...SEARCH_FIELDS],
    storeFields: [...STORE_FIELDS],
    tokenize,
  });
  ms.addAll(DOCS);
  return ms;
}

function runQuery(ms: MiniSearch<Doc>, raw: string) {
  const q = expandQuery(raw);
  return ms.search(q, searchOptions(q));
}

describe('search integration (real index + shared options)', () => {
  it('ranks a title match above a description-only match (boost works)', () => {
    const ms = buildIndex();
    const results = runQuery(ms, 'image');
    // "Image to Video" / "Text to Image" (title) should outrank "Upscale Photo"
    // which only mentions image in its description.
    const ids = results.map((r) => r.id);
    expect(ids[ids.length - 1]).toBe('3');
    expect(ids).toContain('1');
    expect(ids).toContain('2');
  });

  it('requires every term to match (AND combine)', () => {
    const ms = buildIndex();
    const results = runQuery(ms, 'image video');
    // Only doc 1 contains both "image" and "video".
    expect(results.map((r) => r.id)).toEqual(['1']);
  });

  it('matches snake_case names via sub-token splitting', () => {
    const ms = buildIndex();
    // "upscale" appears in the title; ensure it resolves to doc 3.
    expect(runQuery(ms, 'upscale').map((r) => r.id)).toContain('3');
  });

  it('resolves abbreviations to the right workflow', () => {
    const ms = buildIndex();
    expect(runQuery(ms, 'i2v').map((r) => r.id)).toEqual(['1']);
    expect(runQuery(ms, 'txt2img').map((r) => r.id)).toEqual(['2']);
  });

  it('tolerates a typo on a longer term (fuzzy)', () => {
    const ms = buildIndex();
    // "animaton" → should still find the animation workflow (doc 1).
    expect(runQuery(ms, 'animaton').map((r) => r.id)).toContain('1');
  });
});

describe('searchWithFallback', () => {
  it('returns the precise AND result when every term matches', () => {
    const ms = buildIndex();
    // Only doc 1 has both image + video → AND succeeds, no OR fallback needed.
    expect(searchWithFallback<{ id: string }>(ms, 'image video').map((r) => r.id)).toEqual(['1']);
  });

  it('falls back to OR when AND yields nothing', () => {
    const ms = buildIndex();
    // No doc has BOTH "upscale" and "video"; AND = 0 results, so OR kicks in and
    // returns the docs matching either term (upscale → 3, video → 1).
    const ids = searchWithFallback<{ id: string }>(ms, 'upscale video').map((r) => r.id);
    expect(ids).toContain('3');
    expect(ids.length).toBeGreaterThan(0);
  });

  it('returns empty when no term matches at all', () => {
    const ms = buildIndex();
    expect(searchWithFallback<{ id: string }>(ms, 'zzzznomatch')).toEqual([]);
  });
});
