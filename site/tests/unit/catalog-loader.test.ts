/**
 * The lazy catalog is fetched per locale.
 *
 * The grid paints a translated slice server-side and then swaps in this catalog,
 * so fetching the English one on a localized page would revert the cards in
 * front of the reader. English must keep its existing unprefixed URL, since that
 * route is unchanged and shared with the search island.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadCatalog, __resetCatalogCache } from '../../src/lib/catalog';

function mockFetch(payload: unknown = [{ shareId: 'a', title: 't' }], ok = true) {
  // Typed with the url parameter so `mock.calls` carries it; an argument-less
  // mock infers an empty tuple and the assertions below cannot index it.
  const fetchMock = vi.fn(async (_url: string) => ({
    ok,
    status: ok ? 200 : 500,
    json: async () => payload,
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  __resetCatalogCache();
});

describe('loadCatalog', () => {
  it('fetches the unprefixed catalog for English', async () => {
    const fetchMock = mockFetch();
    await loadCatalog('en');
    expect(fetchMock.mock.calls[0]![0]).toBe('/workflows/grid.json');
  });

  it('defaults to English when no locale is given', async () => {
    const fetchMock = mockFetch();
    await loadCatalog();
    expect(fetchMock.mock.calls[0]![0]).toBe('/workflows/grid.json');
  });

  it('fetches the locale-prefixed catalog for a translated page', async () => {
    const fetchMock = mockFetch();
    await loadCatalog('zh');
    expect(fetchMock.mock.calls[0]![0]).toBe('/zh/workflows/grid.json');
  });

  it('caches per locale rather than globally', async () => {
    const fetchMock = mockFetch();
    await loadCatalog('zh');
    await loadCatalog('zh');
    await loadCatalog('ja');
    // Two distinct locales, one fetch each, and the repeat is served from cache.
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      '/zh/workflows/grid.json',
      '/ja/workflows/grid.json',
    ]);
  });

  it('lets a failed locale retry instead of caching the rejection', async () => {
    const failing = mockFetch([], false);
    await expect(loadCatalog('zh')).rejects.toThrow();
    expect(failing).toHaveBeenCalledTimes(1);

    const recovered = mockFetch([{ shareId: 'a', title: '标题' }]);
    await expect(loadCatalog('zh')).resolves.toHaveLength(1);
    expect(recovered).toHaveBeenCalledTimes(1);
  });
});
