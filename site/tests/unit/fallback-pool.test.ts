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

// Named literally, not derived, so publishing one has to change this line.
const EXPECTED_GATED_SHARE_IDS = ['8ce4aa90e8af', 'bed989744195', 'c2aae816fe63'];

describe('GATED_SHARE_IDS', () => {
  it('holds exactly the share ids gated today', () => {
    expect([...GATED_SHARE_IDS].sort()).toEqual(EXPECTED_GATED_SHARE_IDS);
  });

  // One direction only: gating a pin without withholding it puts the workflow back
  // on the site through the fallback pool. Withholding something no page pins is fine.
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

  // Against the literal ids, so emptying GATED_SHARE_IDS fails here rather than
  // making this vacuous.
  it('drops every gated share id, so no section can surface one', () => {
    const catalog = [tpl('ungated'), ...EXPECTED_GATED_SHARE_IDS.map((id) => tpl(id))];
    expect(buildFallbackPool(catalog).map((t) => t.shareId)).toEqual(['ungated']);
  });
});
