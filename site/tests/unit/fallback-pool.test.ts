import { describe, expect, it } from 'vitest';
import { buildFallbackPool } from '../../src/lib/workflow-pages/fallback-pool';
import { GATED_SHARE_IDS, SEO_PAGES } from '../../src/lib/workflow-pages/use-cases';
import type { SerializedTemplate } from '../../src/lib/hub-api';

function tpl(shareId: string, usage = 100): SerializedTemplate {
  return { shareId, title: shareId, thumbnails: [`${shareId}-1.webp`], usage } as SerializedTemplate;
}

describe('GATED_SHARE_IDS', () => {
  it('collects every gated pin across all pages', () => {
    const expected = SEO_PAGES.flatMap((def) =>
      (def.pins ?? []).filter((pin) => pin.gate).map((pin) => pin.shareId)
    );
    expect([...GATED_SHARE_IDS].sort()).toEqual([...new Set(expected)].sort());
  });
});

describe('buildFallbackPool', () => {
  it('keeps ungated templates that have a still thumbnail', () => {
    const pool = buildFallbackPool([tpl('keep')]);
    expect(pool.map((t) => t.shareId)).toEqual(['keep']);
  });

  it('drops a template with no still thumbnail', () => {
    const videoOnly = { shareId: 'vid', thumbnails: ['vid-1.mp4'], usage: 1 } as SerializedTemplate;
    expect(buildFallbackPool([videoOnly])).toEqual([]);
  });

  // The pool feeds the landing-page image matcher, which draws from the whole
  // catalog. Without this a gated workflow surfaces as a capability card, with a
  // live CTA to it, on a page that never pinned it.
  it('drops every gated share id, so no section can surface one', () => {
    const gated = [...GATED_SHARE_IDS];
    const catalog = [tpl('ungated'), ...gated.map((id) => tpl(id))];
    const pool = buildFallbackPool(catalog);
    expect(pool.map((t) => t.shareId)).toEqual(['ungated']);
  });

  it('drops a gated id even when it is the only candidate', () => {
    const first = [...GATED_SHARE_IDS][0];
    // Skips itself once every gate is lifted, which is the intended end state.
    if (!first) return;
    expect(buildFallbackPool([tpl(first)])).toEqual([]);
  });
});
