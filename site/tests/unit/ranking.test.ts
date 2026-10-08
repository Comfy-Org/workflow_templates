import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Algolia lite client is mocked so tests never hit the network. Each test drives
 * `search` to return canned index pages, then asserts the ranking map we build.
 */
const searchMock = vi.hoisted(() => vi.fn());
const liteClientMock = vi.hoisted(() => vi.fn(() => ({ search: searchMock })));

vi.mock('algoliasearch/lite', () => ({
  liteClient: liteClientMock,
}));

/** Build one Algolia `search` response page. */
function page(
  hits: Array<{ objectID: string; slug?: string; run_clicks?: number }>,
  opts: { page?: number; nbPages?: number } = {}
) {
  return {
    results: [
      {
        hits,
        page: opts.page ?? 0,
        nbPages: opts.nbPages ?? 1,
      },
    ],
  };
}

async function loadRanking() {
  vi.resetModules();
  vi.stubEnv('PUBLIC_ALGOLIA_APP_ID', '4E0RO38HS8');
  vi.stubEnv('PUBLIC_ALGOLIA_SEARCH_KEY', 'search-key');
  vi.stubEnv('PUBLIC_ALGOLIA_TEMPLATES_INDEX', 'templates_index');
  return import('../../src/lib/ranking');
}

afterEach(() => {
  searchMock.mockReset();
  liteClientMock.mockClear();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('fetchRankingMap', () => {
  beforeEach(() => {
    searchMock.mockReset();
  });

  it('builds a Map keyed by shareId (objectID) with runClicks', async () => {
    searchMock.mockResolvedValueOnce(
      page([
        { objectID: 'abc123', slug: 'seedance', run_clicks: 31879 },
        { objectID: 'def456', slug: 'nano_banana_2', run_clicks: 2021 },
      ])
    );
    const { fetchRankingMap } = await loadRanking();
    const map = await fetchRankingMap();

    expect(map.get('abc123')).toEqual({ runClicks: 31879 });
    expect(map.get('def456')).toEqual({ runClicks: 2021 });
    expect(map.size).toBe(2);
  });

  it('constructs the client with the configured app id + search key', async () => {
    searchMock.mockResolvedValueOnce(page([]));
    const { fetchRankingMap } = await loadRanking();
    await fetchRankingMap();
    expect(liteClientMock).toHaveBeenCalledWith('4E0RO38HS8', 'search-key');
  });

  it('paginates: merges hits across all index pages', async () => {
    searchMock
      .mockResolvedValueOnce(page([{ objectID: 'a', run_clicks: 10 }], { page: 0, nbPages: 2 }))
      .mockResolvedValueOnce(page([{ objectID: 'b', run_clicks: 20 }], { page: 1, nbPages: 2 }));
    const { fetchRankingMap } = await loadRanking();
    const map = await fetchRankingMap();

    expect(map.size).toBe(2);
    expect(map.get('a')?.runClicks).toBe(10);
    expect(map.get('b')?.runClicks).toBe(20);
    expect(searchMock).toHaveBeenCalledTimes(2);
  });

  it('caches: a second call does not re-query Algolia', async () => {
    searchMock.mockResolvedValueOnce(page([{ objectID: 'a', run_clicks: 1 }]));
    const { fetchRankingMap } = await loadRanking();
    await fetchRankingMap();
    await fetchRankingMap();
    expect(searchMock).toHaveBeenCalledTimes(1);
  });

  it('missing run_clicks coerces to 0', async () => {
    searchMock.mockResolvedValueOnce(page([{ objectID: 'a', slug: 'x' }]));
    const { fetchRankingMap } = await loadRanking();
    const map = await fetchRankingMap();
    expect(map.get('a')).toEqual({ runClicks: 0 });
  });

  it('defaults the index name to templates_index when unset', async () => {
    vi.resetModules();
    vi.stubEnv('PUBLIC_ALGOLIA_APP_ID', '4E0RO38HS8');
    vi.stubEnv('PUBLIC_ALGOLIA_SEARCH_KEY', 'search-key');
    vi.stubEnv('PUBLIC_ALGOLIA_TEMPLATES_INDEX', '');
    searchMock.mockResolvedValueOnce(page([{ objectID: 'a', run_clicks: 1 }]));
    const { fetchRankingMap } = await import('../../src/lib/ranking');
    await fetchRankingMap();
    expect(searchMock).toHaveBeenCalledWith({
      requests: [expect.objectContaining({ indexName: 'templates_index' })],
    });
  });

  it('returns an empty map (no throw) when no Algolia key is configured', async () => {
    vi.resetModules();
    vi.stubEnv('PUBLIC_ALGOLIA_APP_ID', '');
    vi.stubEnv('PUBLIC_ALGOLIA_SEARCH_KEY', '');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { fetchRankingMap } = await import('../../src/lib/ranking');

    const map = await fetchRankingMap();
    expect(map.size).toBe(0);
    expect(searchMock).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('returns an empty map (no throw) when Algolia query fails', async () => {
    searchMock.mockRejectedValueOnce(new Error('network down'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { fetchRankingMap } = await loadRanking();

    const map = await fetchRankingMap();
    expect(map.size).toBe(0);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe('applyRanking', () => {
  it('prefers Algolia runClicks when present for the shareId', async () => {
    const { applyRanking } = await loadRanking();
    const map = new Map([['abc', { runClicks: 5000 }]]);
    expect(applyRanking('abc', 999, map)).toBe(5000);
  });

  it('falls back to the provided usage when shareId is absent from the map', async () => {
    const { applyRanking } = await loadRanking();
    const map = new Map([['abc', { runClicks: 5000 }]]);
    expect(applyRanking('other', 999, map)).toBe(999);
  });

  it('falls back to usage when the map is undefined (no-key build)', async () => {
    const { applyRanking } = await loadRanking();
    expect(applyRanking('abc', 42, undefined)).toBe(42);
  });

  it('returns 0 when neither ranking nor usage is available', async () => {
    const { applyRanking } = await loadRanking();
    expect(applyRanking('abc', undefined, undefined)).toBe(0);
  });

  it('treats a run_clicks of 0 as no signal and keeps nonzero usage', async () => {
    const { applyRanking } = await loadRanking();
    const map = new Map([['abc', { runClicks: 0 }]]);
    expect(applyRanking('abc', 999, map)).toBe(999);
  });

  it('returns 0 when both run_clicks and usage are 0', async () => {
    const { applyRanking } = await loadRanking();
    const map = new Map([['abc', { runClicks: 0 }]]);
    expect(applyRanking('abc', 0, map)).toBe(0);
  });
});
