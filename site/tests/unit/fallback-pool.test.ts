import { describe, expect, it } from 'vitest';
import { buildFallbackPool } from '../../src/lib/workflow-pages/fallback-pool';
import {
  GATED_SHARE_IDS,
  gatedPinsMissingFromWithheldSet,
} from '../../src/lib/workflow-pages/use-cases';
import type { SerializedTemplate } from '../../src/lib/hub-api';

function tpl(shareId: string, usage = 100): SerializedTemplate {
  return {
    shareId,
    title: shareId,
    thumbnails: [`${shareId}-1.webp`],
    usage,
  } as SerializedTemplate;
}

// The three the keyword sheet gates today: Video Face Swap, Face Swap and
// Clothes Changer. Named literally rather than derived, so deleting a `gate`
// field fails this test instead of quietly passing. Publishing one is meant to be
// a deliberate, reviewable change, so updating this list is part of that change.
const EXPECTED_GATED_SHARE_IDS = ['8ce4aa90e8af', 'bed989744195', 'c2aae816fe63'];

describe('GATED_SHARE_IDS', () => {
  it('holds exactly the share ids gated today', () => {
    expect([...GATED_SHARE_IDS].sort()).toEqual(EXPECTED_GATED_SHARE_IDS);
  });

  // One direction only, and deliberately. Gating a pin without withholding the
  // workflow puts it back on the site through the fallback pool, so that must
  // fail. The reverse is legitimate: a workflow can be withheld catalog-wide
  // without any page pinning it, which is the whole point of declaring the set
  // separately.
  it('withholds every share id that a page gates', () => {
    expect(gatedPinsMissingFromWithheldSet()).toEqual([]);
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
  // live CTA to it, on a page that never pinned it. Written against the literal
  // ids rather than GATED_SHARE_IDS, so emptying that set fails here instead of
  // making the assertion vacuous.
  it('drops every gated share id, so no section can surface one', () => {
    const catalog = [tpl('ungated'), ...EXPECTED_GATED_SHARE_IDS.map((id) => tpl(id))];
    expect(buildFallbackPool(catalog).map((t) => t.shareId)).toEqual(['ungated']);
  });
});
