import { describe, expect, it } from 'vitest';
import {
  buildHowToJsonLd,
  buildSoftwareApplicationJsonLd,
  buildCollectionPageJsonLd,
  buildEntityMentionsJsonLd,
  serializeJsonLdForScript,
} from '../../src/lib/structured-data';

describe('buildHowToJsonLd', () => {
  it('returns null when there are no steps', () => {
    expect(buildHowToJsonLd({ name: 'How to X', steps: undefined })).toBeNull();
    expect(buildHowToJsonLd({ name: 'How to X', steps: [] })).toBeNull();
    expect(buildHowToJsonLd({ name: 'How to X', steps: ['   ', ''] })).toBeNull();
  });

  it('maps each step to a positioned HowToStep', () => {
    const result = buildHowToJsonLd({
      name: 'How to use Flux',
      steps: ['Pick a workflow.', 'Open it on Comfy Cloud.', 'Run it.'],
    });
    expect(result).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'How to use Flux',
      step: [
        { '@type': 'HowToStep', position: 1, name: 'Pick a workflow.', text: 'Pick a workflow.' },
        {
          '@type': 'HowToStep',
          position: 2,
          name: 'Open it on Comfy Cloud.',
          text: 'Open it on Comfy Cloud.',
        },
        { '@type': 'HowToStep', position: 3, name: 'Run it.', text: 'Run it.' },
      ],
    });
  });

  it('drops blank steps and renumbers the survivors', () => {
    const result = buildHowToJsonLd({ name: 'How to X', steps: ['First.', '  ', 'Second.'] });
    expect(result?.step).toHaveLength(2);
    expect(result?.step.map((s) => s.position)).toEqual([1, 2]);
    expect(result?.step.map((s) => s.text)).toEqual(['First.', 'Second.']);
  });

  it('includes description only when provided', () => {
    const withDesc = buildHowToJsonLd({ name: 'X', steps: ['a'], description: 'why' });
    expect(withDesc).toHaveProperty('description', 'why');
    const without = buildHowToJsonLd({ name: 'X', steps: ['a'] });
    expect(without).not.toHaveProperty('description');
  });
});

describe('buildSoftwareApplicationJsonLd', () => {
  it('emits a MultimediaApplication with no price and no rating claim', () => {
    const result = buildSoftwareApplicationJsonLd({ name: 'Flux Workflows', description: 'desc' });
    expect(result).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Flux Workflows',
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Windows, macOS, Linux',
      description: 'desc',
    });
    // No rating data exists in the catalog, and Comfy Cloud is not free — the
    // schema must never claim an aggregateRating or a $0 Offer.
    expect(result).not.toHaveProperty('aggregateRating');
    expect(result).not.toHaveProperty('offers');
  });

  it('includes featureList only when non-empty', () => {
    expect(
      buildSoftwareApplicationJsonLd({ name: 'X', description: 'd', featureList: ['A', 'B'] })
    ).toHaveProperty('featureList', ['A', 'B']);
    expect(buildSoftwareApplicationJsonLd({ name: 'X', description: 'd' })).not.toHaveProperty(
      'featureList'
    );
    expect(
      buildSoftwareApplicationJsonLd({ name: 'X', description: 'd', featureList: ['  ', ''] })
    ).not.toHaveProperty('featureList');
  });
});

describe('buildCollectionPageJsonLd', () => {
  it('matches the prior shape when no items are passed', () => {
    expect(
      buildCollectionPageJsonLd({
        name: 'Models',
        description: 'desc',
        url: 'https://comfy.org/workflows/model/',
      })
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Models',
      description: 'desc',
      url: 'https://comfy.org/workflows/model/',
    });
  });

  it('nests an ItemList in mainEntity when items are passed', () => {
    const result = buildCollectionPageJsonLd({
      name: 'Models',
      description: 'desc',
      url: 'https://comfy.org/workflows/model/',
      items: [
        {
          name: 'Flux',
          url: 'https://comfy.org/workflows/model/flux/',
          image: 'https://cdn/flux.webp',
        },
        { name: 'Qwen', url: 'https://comfy.org/workflows/model/qwen/' },
      ],
    });
    expect(result.mainEntity).toEqual({
      '@type': 'ItemList',
      numberOfItems: 2,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Flux',
          url: 'https://comfy.org/workflows/model/flux/',
          image: 'https://cdn/flux.webp',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Qwen',
          url: 'https://comfy.org/workflows/model/qwen/',
        },
      ],
    });
  });

  it('omits mainEntity for an empty items array', () => {
    expect(
      buildCollectionPageJsonLd({
        name: 'X',
        description: 'd',
        url: 'https://comfy.org/',
        items: [],
      })
    ).not.toHaveProperty('mainEntity');
  });

  it('omits mainEntity when items is undefined (the gated-noindex path)', () => {
    expect(
      buildCollectionPageJsonLd({
        name: 'X',
        description: 'd',
        url: 'https://comfy.org/',
        items: undefined,
      })
    ).not.toHaveProperty('mainEntity');
  });

  it('carries both inLanguage and mainEntity for a localized page with items', () => {
    const result = buildCollectionPageJsonLd({
      name: 'Models',
      description: 'desc',
      url: 'https://comfy.org/ja/workflows/model/flux/',
      inLanguage: 'ja',
      items: [{ name: 'Flux', url: 'https://comfy.org/ja/workflows/flux-abc/' }],
    });
    expect(result).toHaveProperty('inLanguage', 'ja');
    expect(result.mainEntity).toMatchObject({ '@type': 'ItemList', numberOfItems: 1 });
  });
});

describe('buildEntityMentionsJsonLd', () => {
  it('returns null when nothing in the text matches the dictionary', () => {
    expect(
      buildEntityMentionsJsonLd({
        url: 'https://comfy.org/workflows/x/',
        text: ['A workflow that does a thing.'],
      })
    ).toBeNull();
  });

  it('emits only about for a Core-only match', () => {
    const result = buildEntityMentionsJsonLd({
      url: 'https://comfy.org/workflows/x/',
      text: ['Generate a video from an image.'],
    });
    expect(result).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      url: 'https://comfy.org/workflows/x/',
    });
    expect(result?.about).toEqual(
      expect.arrayContaining([
        { '@type': 'DefinedTerm', name: 'Video', sameAs: 'https://en.wikipedia.org/wiki/Video' },
        { '@type': 'DefinedTerm', name: 'Image', sameAs: 'https://en.wikipedia.org/wiki/Image' },
      ])
    );
    expect(result).not.toHaveProperty('mentions');
  });

  it('groups non-Core matches under mentions with inDefinedTermSet', () => {
    const result = buildEntityMentionsJsonLd({
      url: 'https://comfy.org/workflows/x/',
      text: ['Uses HDR, with full API access and MPEG-4 output.'],
    });
    expect(result?.mentions).toEqual(
      expect.arrayContaining([
        {
          '@type': 'DefinedTerm',
          name: 'High Dynamic Range',
          sameAs: 'https://en.wikipedia.org/wiki/High_dynamic_range',
          inDefinedTermSet: { '@type': 'DefinedTermSet', name: 'Technology' },
        },
        {
          '@type': 'DefinedTerm',
          name: 'API',
          sameAs: 'https://en.wikipedia.org/wiki/API',
          inDefinedTermSet: { '@type': 'DefinedTermSet', name: 'Technology' },
        },
        {
          '@type': 'DefinedTerm',
          name: 'MPEG-4',
          sameAs: 'https://en.wikipedia.org/wiki/MPEG-4',
          inDefinedTermSet: { '@type': 'DefinedTermSet', name: 'Audio & Video' },
        },
      ])
    );
    expect(result).not.toHaveProperty('about');
  });

  it('does not duplicate an entity matched by multiple phrases or repeated text', () => {
    const result = buildEntityMentionsJsonLd({
      url: 'https://comfy.org/workflows/x/',
      text: ['4K output. 4K preview. 4K everywhere.'],
    });
    const fourK = result?.mentions?.filter((m: { name: string }) => m.name === '4K Resolution');
    expect(fourK).toHaveLength(1);
  });

  it('ignores empty/undefined text entries', () => {
    expect(
      buildEntityMentionsJsonLd({
        url: 'https://comfy.org/workflows/x/',
        text: [undefined, '', '   '],
      })
    ).toBeNull();
  });
});

describe('serializeJsonLdForScript with the new builders', () => {
  it('escapes </script> and & inside HowTo step text', () => {
    const json = serializeJsonLdForScript(
      buildHowToJsonLd({ name: 'X', steps: ['Use <b>&amp;</b> then </script> break out'] })
    );
    expect(json).not.toContain('</script>');
    expect(json).toContain('\\u003c');
    expect(json).toContain('\\u0026');
  });
});
