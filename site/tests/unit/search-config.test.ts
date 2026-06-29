import { describe, it, expect } from 'vitest';
import MiniSearch from 'minisearch';
import {
  SEARCH_FIELDS,
  STORE_FIELDS,
  tokenize,
  termFuzziness,
  searchOptions,
  expandAbbreviation,
  expandQuery,
  searchWorkflows,
} from '../../src/lib/search-config';

describe('tokenize', () => {
  it('lowercases and splits on whitespace', () => {
    expect(tokenize('Hello World')).toEqual(['hello', 'world']);
  });

  it('keeps a hyphenated term AND emits its sub-parts', () => {
    expect(tokenize('image-to-video')).toEqual(['image-to-video', 'image', 'to', 'video']);
  });

  it('keeps a snake_case term AND emits its sub-parts', () => {
    expect(tokenize('video_ltx2_3_t2v')).toEqual(['video_ltx2_3_t2v', 'video', 'ltx2', '3', 't2v']);
  });

  it('drops empty tokens from collapsed separators', () => {
    expect(tokenize('a--b')).toEqual(['a--b', 'a', 'b']);
    expect(tokenize('a__b')).toEqual(['a__b', 'a', 'b']);
  });

  it('returns an empty array for empty / whitespace-only input', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('   ')).toEqual([]);
  });

  it('collapses runs of whitespace', () => {
    expect(tokenize('a   b\t c')).toEqual(['a', 'b', 'c']);
  });

  it('splits a name+version so "wan 2.1" and "wan2.1" match alike', () => {
    expect(tokenize('Wan2.1')).toEqual(['wan2.1', 'wan', '2.1']);
    expect(tokenize('LTX-2.3')).toEqual(['ltx-2.3', 'ltx', '2.3']);
  });

  it('leaves a mid-digit abbreviation (t2v) whole', () => {
    expect(tokenize('t2v')).toEqual(['t2v']);
  });
});

describe('termFuzziness', () => {
  it('disables fuzzy for ≤3-char terms (noise)', () => {
    expect(termFuzziness('ab')).toBe(false);
    expect(termFuzziness('abc')).toBe(false);
  });

  it('disables fuzzy for any term with a digit (so "2.5" never matches "3.5")', () => {
    expect(termFuzziness('2.5')).toBe(false);
    expect(termFuzziness('wan2.7')).toBe(false);
  });

  it('enables fuzzy 0.3 for longer alphabetic terms', () => {
    expect(termFuzziness('abcd')).toBe(0.3);
    expect(termFuzziness('controlnet')).toBe(0.3);
  });
});

describe('searchOptions', () => {
  it('enables prefix matching and per-term fuzziness', () => {
    const opts = searchOptions();
    expect(opts.prefix).toBe(true);
    expect(opts.fuzzy('controlnet')).toBe(0.3);
    expect(opts.fuzzy('wan2.7')).toBe(false);
  });

  it('defaults to AND combine, and honours an explicit OR', () => {
    expect(searchOptions().combineWith).toBe('AND');
    expect(searchOptions('OR').combineWith).toBe('OR');
  });

  it('shares the index tokenizer so query terms split the same way', () => {
    expect(searchOptions().tokenize).toBe(tokenize);
  });
});

describe('expandAbbreviation', () => {
  // Every spelling users type, mapped to its modality words (no connecting "to").
  const CASES: [string, string][] = [
    ['t2i', 'text image'],
    ['txt2img', 'text image'],
    ['txt2image', 'text image'],
    ['text2image', 'text image'],
    ['text2img', 'text image'],
    ['i2i', 'image image'],
    ['img2img', 'image image'],
    ['t2v', 'text video'],
    ['txt2vid', 'text video'],
    ['text2video', 'text video'],
    ['txt2video', 'text video'],
    ['i2v', 'image video'],
    ['img2vid', 'image video'],
    ['img2video', 'image video'],
    ['v2v', 'video video'],
    ['s2v', 'audio video'],
    ['t2a', 'text audio'],
    ['t2m', 'text music'],
    ['cn', 'controlnet'],
  ];

  it.each(CASES)('expands "%s" → "%s"', (input, expected) => {
    expect(expandAbbreviation(input)).toBe(expected);
  });

  it('is case-insensitive and trims', () => {
    expect(expandAbbreviation('  T2V ')).toBe('text video');
    expect(expandAbbreviation('TXT2IMG')).toBe('text image');
  });

  it('returns null for non-shorthand tokens', () => {
    for (const token of ['flux', 'upscale', 'x2y', 'myt2ithing', '']) {
      expect(expandAbbreviation(token)).toBeNull();
    }
  });
});

describe('expandQuery', () => {
  it('expands a shorthand token, dropping the connecting "to"', () => {
    expect(expandQuery('txt2img')).toBe('text image');
  });

  it('expands each shorthand token within a multi-word query', () => {
    expect(expandQuery('wan i2v')).toBe('wan image video');
  });

  it('returns null when nothing expands (caller skips the extra search)', () => {
    expect(expandQuery('flux upscale')).toBeNull();
    expect(expandQuery('')).toBeNull();
  });
});

// ── Integration: exercise the real index + the query end to end ──

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

// Fixture spanning every media type, the concept each abbreviation resolves to,
// an accented creator, and a literal-vs-expansion pair (docs 11/12) for ranking.
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
  {
    id: '4',
    title: 'Image to Image Restyle',
    description: 'Re-render an image in a new style',
    tags: 'restyle',
    models: 'flux',
    mediaType: 'image',
    creatorName: 'Studio',
    name: 'image_to_image_restyle',
  },
  {
    id: '5',
    title: 'LTX-2.3: Text to Video',
    description: 'Cinematic generation',
    tags: 'cinematic',
    models: 'ltx lightricks',
    mediaType: 'video',
    creatorName: 'José Núñez',
    name: 'video_ltx2_3_t2v',
  },
  {
    id: '6',
    title: 'Stable Audio: Text to Music',
    description: 'Generate music from a text prompt',
    tags: 'audio music',
    models: 'stable-audio',
    mediaType: 'audio',
    creatorName: 'ComfyUI',
    name: 'stable_audio_t2a',
  },
  {
    id: '7',
    title: 'Flux ControlNet Canny',
    description: 'Guided generation with a control image',
    tags: 'controlnet control',
    models: 'flux',
    mediaType: 'image',
    creatorName: 'ComfyUI',
    name: 'flux_controlnet_canny',
  },
  {
    id: '8',
    title: 'Wan VACE Video to Video',
    description: 'Restyle an existing clip',
    tags: 'restyle',
    models: 'wan vace',
    mediaType: 'video',
    creatorName: 'ComfyUI',
    name: 'video_wan_vace_14B_v2v',
  },
  {
    id: '9',
    title: 'Wan2.2 Audio to Video',
    description: 'Audio-driven video generation',
    tags: 'audio driven',
    models: 'wan',
    mediaType: 'video',
    creatorName: 'ComfyUI',
    name: 'video_wan2_2_14B_s2v',
  },
  {
    id: '10',
    title: 'Sonilo Text to Music',
    description: 'Generate a track from a prompt',
    tags: 'music',
    models: 'sonilo',
    mediaType: 'audio',
    creatorName: 'ComfyUI',
    name: 'api_sonilo_t2m',
  },
  {
    // Literal "t2v" — ranks above expansion-only doc 12.
    id: '11',
    title: 'Wan2.1 Alpha T2V',
    description: 'Fast text-to-video',
    tags: 'video',
    models: 'wan',
    mediaType: 'video',
    creatorName: 'ComfyUI',
    name: 'wan21_alpha_t2v',
  },
  {
    // "Text to Video" prose, no literal "t2v" — expansion-only.
    id: '12',
    title: 'Mochi Text to Video',
    description: 'Generate video from a text prompt',
    tags: 'generation',
    models: 'mochi',
    mediaType: 'video',
    creatorName: 'Genmo',
    name: 'mochi_text_to_video',
  },
  {
    // Boost pair (13/14): "nebula" in a long title vs. a one-word description.
    // Without the title boost, BM25 length-norm ranks 14 first; with it, 13 wins.
    id: '13',
    title: 'Nebula Quantum Cinematic Render Studio Pipeline Kit',
    description: 'staged walkthrough',
    tags: 'walkthrough',
    models: 'quantum',
    mediaType: 'image',
    creatorName: 'Aurora',
    name: 'q13',
  },
  {
    id: '14',
    title: 'Helios',
    description: 'nebula',
    tags: 'composite',
    models: 'helios',
    mediaType: 'image',
    creatorName: 'Orion',
    name: 'q14',
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

function ids(ms: MiniSearch<Doc>, raw: string): string[] {
  return searchWorkflows<{ id: string }>(ms, raw).map((r) => r.id);
}

describe('search — single term (field coverage)', () => {
  it('matches across title and description', () => {
    expect(ids(buildIndex(), 'image')).toEqual(expect.arrayContaining(['1', '2', '3']));
  });

  it('matches on tags, models, mediaType and creatorName', () => {
    expect(ids(buildIndex(), 'cinematic')).toContain('5'); // tags
    expect(ids(buildIndex(), 'esrgan')).toContain('3'); // models
    expect(ids(buildIndex(), 'audio')).toContain('6'); // mediaType + tags
    expect(ids(buildIndex(), 'Topaz')).toContain('3'); // creatorName
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(ids(buildIndex(), '  IMAGE ')).toEqual(ids(buildIndex(), 'image'));
  });

  it('matches an accented creator name', () => {
    expect(ids(buildIndex(), 'Núñez')).toContain('5');
  });
});

describe('search — typo tolerance (length-aware fuzzy)', () => {
  it('forgives a transposition on a longer term (conrtol → control)', () => {
    expect(ids(buildIndex(), 'conrtol')).toContain('7');
  });

  it('forgives a single-character typo', () => {
    expect(ids(buildIndex(), 'animaton')).toContain('1');
    expect(ids(buildIndex(), 'upscalr')).toContain('3');
  });

  it('does not fuzzy-match very short noise terms', () => {
    expect(ids(buildIndex(), 'xz')).toEqual([]);
  });
});

describe('search — multi-word (AND precise, OR fallback)', () => {
  it('requires all words when several match (only doc 7 has both)', () => {
    expect(ids(buildIndex(), 'flux controlnet')).toEqual(['7']);
  });

  it('does not flood with docs matching only one word', () => {
    expect(ids(buildIndex(), 'flux controlnet')).not.toContain('2');
  });

  it('falls back to OR when AND matches nothing', () => {
    // No doc has both; OR returns each: upscale (3), audio (6).
    const r = ids(buildIndex(), 'upscale audio');
    expect(r).toContain('3');
    expect(r).toContain('6');
  });

  it('still prefix-matches a partial single term', () => {
    expect(ids(buildIndex(), 'anim')).toContain('1');
  });
});

describe('search — abbreviations (literal first, expansion below)', () => {
  it('ranks literal matches (11, 5) above the expansion-only match (12)', () => {
    const r = ids(buildIndex(), 't2v');
    expect(r).toEqual(expect.arrayContaining(['11', '5', '12']));
    expect(r.indexOf('11')).toBeLessThan(r.indexOf('12'));
    expect(r.indexOf('5')).toBeLessThan(r.indexOf('12'));
  });

  it('resolves shorthand and spelling variants to the concept', () => {
    expect(ids(buildIndex(), 'txt2img')).toContain('2'); // Text to Image
    expect(ids(buildIndex(), 'txt2image')).toContain('2');
    expect(ids(buildIndex(), 'i2v')).toContain('1'); // Image to Video
    expect(ids(buildIndex(), 'i2i')).toContain('4'); // Image to Image
  });

  it('resolves the name-driven abbreviations (v2v, s2v, t2m)', () => {
    expect(ids(buildIndex(), 'v2v')).toContain('8'); // Video to Video
    expect(ids(buildIndex(), 's2v')).toContain('9'); // Audio to Video
    expect(ids(buildIndex(), 't2m')).toContain('10'); // Text to Music
  });

  it('falls back to the expansion when no literal exists (cn → controlnet)', () => {
    expect(ids(buildIndex(), 'cn')).toContain('7');
  });

  it('returns a deduplicated result set', () => {
    const r = ids(buildIndex(), 't2v');
    expect(r.length).toBe(new Set(r).size);
  });
});

describe('search — field boost (title outranks incidental mention)', () => {
  it('ranks a title match above a description mention despite a longer title', () => {
    const r = ids(buildIndex(), 'nebula');
    expect(r).toEqual(expect.arrayContaining(['13', '14']));
    expect(r.indexOf('13')).toBeLessThan(r.indexOf('14'));
  });
});

describe('search — edge cases', () => {
  it('returns nothing for a term that matches no document', () => {
    expect(ids(buildIndex(), 'zzzznomatch')).toEqual([]);
  });

  it('returns nothing for empty / whitespace input', () => {
    expect(ids(buildIndex(), '')).toEqual([]);
    expect(ids(buildIndex(), '   ')).toEqual([]);
  });

  it('does not throw on punctuation-only input', () => {
    expect(() => ids(buildIndex(), '!!!')).not.toThrow();
  });

  it('does not throw on a very long query and still finds the match', () => {
    const longQuery = 'image '.repeat(200).trim();
    expect(() => ids(buildIndex(), longQuery)).not.toThrow();
    expect(ids(buildIndex(), longQuery)).toContain('1');
  });
});
