import { describe, expect, it } from 'vitest';
import { buildLocalizedModelJsonLd } from '../../src/lib/workflow-pages/model-page-jsonld';
import { buildSoftwareApplicationJsonLd } from '../../src/lib/structured-data';

function typesOf(blocks: object[]): string[] {
  return blocks.map((block) => (block as { '@type': string })['@type']);
}

describe('buildLocalizedModelJsonLd', () => {
  const localized = {
    h1: 'Flux Comfy ワークフロー',
    description: 'Flux を使った 36 件のすぐに使える ComfyUI ワークフローテンプレート。',
    hasQualityContent: true,
  };

  it('emits the SoftwareApplication node the English route emits', () => {
    expect(typesOf(buildLocalizedModelJsonLd(localized))).toEqual(['SoftwareApplication']);
  });

  it('carries the localized name and description, not English', () => {
    const [node] = buildLocalizedModelJsonLd(localized) as Record<string, unknown>[];
    expect(node.name).toBe(localized.h1);
    expect(node.description).toBe(localized.description);
  });

  it('emits nothing when the page is too thin for its editorial copy', () => {
    expect(buildLocalizedModelJsonLd({ ...localized, hasQualityContent: false })).toEqual([]);
  });

  it('never carries a featureList, which exists only in English', () => {
    for (const block of buildLocalizedModelJsonLd(localized)) {
      expect(block).not.toHaveProperty('featureList');
    }
  });

  it('never emits the FAQ or how-to nodes, whose copy exists only in English', () => {
    const types = typesOf(buildLocalizedModelJsonLd(localized));
    expect(types).not.toContain('FAQPage');
    expect(types).not.toContain('HowTo');
  });

  it('omits featureList by choice, not because the builder drops it', () => {
    // Guards the reasoning above: if the shared builder ignored featureList the
    // previous test would pass for the wrong reason and keep passing if someone
    // started passing English highlights in.
    const withFeatures = buildSoftwareApplicationJsonLd({
      name: localized.h1,
      description: localized.description,
      featureList: ['Open weights', 'Speed or quality'],
    });
    expect(withFeatures).toHaveProperty('featureList', ['Open weights', 'Speed or quality']);
  });
});
