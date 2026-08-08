import { describe, expect, it, vi } from 'vitest';
import {
  resolveUseCasePageTemplates,
  assertCuratedSharesResolve,
  useCasePageHasGrid,
  type FilterableTemplate,
} from '../../src/lib/workflow-pages/use-case-resolver';
import type { SeoPageDef } from '../../src/lib/workflow-pages/use-cases';

function tpl(shareId: string, tags: string[], usage = 100): FilterableTemplate {
  return { shareId, tags, models: [], usage };
}

function page(overrides: Partial<SeoPageDef>): SeoPageDef {
  return {
    slug: 'test',
    title: 'Test',
    h1: 'Test',
    keywords: { primary: 'test', secondary: [] },
    filters: { tags: ['a'] },
    ...overrides,
  };
}

describe('resolveUseCasePageTemplates', () => {
  it('returns filter matches usage-sorted', () => {
    const catalog = [tpl('x', ['a'], 10), tpl('y', ['a'], 50), tpl('z', ['b'], 99)];
    const out = resolveUseCasePageTemplates(page({}), catalog);
    expect(out.map((t) => t.shareId)).toEqual(['y', 'x']);
  });

  it('drops excluded shares from the grid', () => {
    const catalog = [tpl('keep', ['a']), tpl('drop', ['a'])];
    const out = resolveUseCasePageTemplates(page({ excludeShareIds: ['drop'] }), catalog);
    expect(out.map((t) => t.shareId)).toEqual(['keep']);
  });

  it('never renders a pin carrying a brand-safety gate', () => {
    const catalog = [tpl('m', ['a']), tpl('gated', ['b'])];
    const out = resolveUseCasePageTemplates(
      page({ pins: [{ shareId: 'gated', gate: 'GATED' }] }),
      catalog
    );
    expect(out.map((t) => t.shareId)).toEqual(['m']);
  });

  it('drops a GATED-LITE pin too, and keeps the ungated pins beside it', () => {
    const catalog = [tpl('m', ['a']), tpl('ok', ['b']), tpl('lite', ['b'])];
    const out = resolveUseCasePageTemplates(
      page({ pins: [{ shareId: 'ok' }, { shareId: 'lite', gate: 'GATED-LITE' }] }),
      catalog
    );
    expect(out.map((t) => t.shareId)).toEqual(['ok', 'm']);
  });

  it('prepends pins ahead of matches', () => {
    const catalog = [tpl('m', ['a']), tpl('p', ['b'])];
    const out = resolveUseCasePageTemplates(page({ pins: [{ shareId: 'p' }] }), catalog);
    expect(out.map((t) => t.shareId)).toEqual(['p', 'm']);
  });

  it('keeps pins in registry order', () => {
    const catalog = [tpl('p1', ['b']), tpl('p2', ['b'])];
    const out = resolveUseCasePageTemplates(
      page({ pins: [{ shareId: 'p2' }, { shareId: 'p1' }] }),
      catalog
    );
    expect(out.map((t) => t.shareId)).toEqual(['p2', 'p1']);
  });

  it('deduplicates a share that is both pinned and filter-matched', () => {
    const catalog = [tpl('dup', ['a']), tpl('m', ['a'])];
    const out = resolveUseCasePageTemplates(page({ pins: [{ shareId: 'dup' }] }), catalog);
    expect(out.map((t) => t.shareId)).toEqual(['dup', 'm']);
  });

  it('deduplicates a share pinned twice', () => {
    const catalog = [tpl('p', ['b'])];
    const out = resolveUseCasePageTemplates(
      page({ pins: [{ shareId: 'p' }, { shareId: 'p' }] }),
      catalog
    );
    expect(out.map((t) => t.shareId)).toEqual(['p']);
  });

  it('silently drops an unresolved pin', () => {
    const catalog = [tpl('m', ['a'])];
    const out = resolveUseCasePageTemplates(page({ pins: [{ shareId: 'ghost' }] }), catalog);
    expect(out.map((t) => t.shareId)).toEqual(['m']);
  });

  it('applies the isApp override without mutating the catalog entry', () => {
    const entry = tpl('p', ['b']);
    const catalog = [entry];
    const out = resolveUseCasePageTemplates(
      page({ pins: [{ shareId: 'p', isApp: true }] }),
      catalog
    );
    expect(out[0].isApp).toBe(true);
    expect(entry.isApp).toBeUndefined();
  });

  it('pins bypass the exclude list', () => {
    const catalog = [tpl('p', ['b'])];
    const out = resolveUseCasePageTemplates(
      page({ pins: [{ shareId: 'p' }], excludeShareIds: ['p'] }),
      catalog
    );
    expect(out.map((t) => t.shareId)).toEqual(['p']);
  });

  it('keeps a shareId-less match through exclude and dedup', () => {
    const noId: FilterableTemplate = { tags: ['a'], models: [], usage: 100 };
    const catalog = [noId, tpl('p', ['a'])];
    const out = resolveUseCasePageTemplates(
      page({ pins: [{ shareId: 'p' }], excludeShareIds: ['whatever'] }),
      catalog
    );
    expect(out).toContain(noId);
  });
});

describe('assertCuratedSharesResolve', () => {
  const catalog = [tpl('aaa', ['a']), tpl('bbb', ['a'])];

  it('passes when pins and excludes resolve', () => {
    expect(() =>
      assertCuratedSharesResolve(
        page({ pins: [{ shareId: 'aaa' }], excludeShareIds: ['bbb'] }),
        catalog
      )
    ).not.toThrow();
  });

  it('warns but does not throw on a well-formed pin absent from the catalog', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(() =>
        assertCuratedSharesResolve(page({ pins: [{ shareId: 'deadbeef' }] }), catalog)
      ).not.toThrow();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('deadbeef'));
    } finally {
      warn.mockRestore();
    }
  });

  it('allows a well-formed exclude not in the catalog (best-effort defensive curation)', () => {
    expect(() =>
      assertCuratedSharesResolve(page({ excludeShareIds: ['eeee'] }), catalog)
    ).not.toThrow();
  });

  it('throws on a malformed share id', () => {
    expect(() => assertCuratedSharesResolve(page({ appShareId: 'NOT-HEX' }), catalog)).toThrow(
      /malformed/
    );
    expect(() =>
      assertCuratedSharesResolve(page({ excludeShareIds: ['NOT-HEX'] }), catalog)
    ).toThrow(/malformed/);
  });

  it('allows a well-formed appShareId absent from the catalog (cloud-save share)', () => {
    expect(() =>
      assertCuratedSharesResolve(page({ appShareId: 'deadbeef' }), catalog)
    ).not.toThrow();
  });
});

describe('useCasePageHasGrid', () => {
  // The sitemap reads the on-disk snapshot, whose entries carry no shareId, so
  // pins cannot resolve there even though the routes resolve them from the hub.
  const snapshotWithoutShareIds: FilterableTemplate[] = [
    { tags: ['a'], models: [], usage: 10 },
    { tags: ['b'], models: [], usage: 20 },
  ];

  it('counts a filter match', () => {
    expect(useCasePageHasGrid(page({ filters: { tags: ['a'] } }), snapshotWithoutShareIds)).toBe(
      true
    );
  });

  it('counts a curated page whose pins cannot resolve against the snapshot', () => {
    expect(
      useCasePageHasGrid(
        page({ filters: {}, pins: [{ shareId: 'aaaa' }] }),
        snapshotWithoutShareIds
      )
    ).toBe(true);
  });

  it('rejects a page with neither matches nor pins', () => {
    expect(useCasePageHasGrid(page({ filters: {} }), snapshotWithoutShareIds)).toBe(false);
  });

  it('still judges a filtered page on its filters, so a stale tag is not masked', () => {
    expect(
      useCasePageHasGrid(
        page({ filters: { tags: ['gone'] }, pins: [{ shareId: 'aaaa' }] }),
        snapshotWithoutShareIds
      )
    ).toBe(false);
  });
});
