import { describe, expect, it } from 'vitest';
import {
  buildHowToJsonLd,
  buildSoftwareApplicationJsonLd,
  buildCollectionPageJsonLd,
  buildWorkflowGraphJsonLd,
  serializeJsonLdForScript,
} from '../../src/lib/structured-data';
import { SITE_ORIGIN } from '../../src/config/site';

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

describe('buildWorkflowGraphJsonLd', () => {
  const baseParams = {
    name: 'LTX-2.5: Image to Video',
    description: 'Generate video from a single image using LTX-2.5.',
    url: 'https://comfy.org/workflows/ltx-2-5-i2v-abc123/',
    breadcrumbItems: [
      { name: 'Home', item: 'https://comfy.org' },
      { name: 'Workflows', item: 'https://comfy.org/workflows/' },
      { name: 'LTX-2.5: Image to Video' },
    ],
  };

  it('always builds the graph, even with no entity data', () => {
    for (const entities of [undefined, {}, { about: [], categories: [] }]) {
      const result = buildWorkflowGraphJsonLd({ ...baseParams, entities });
      expect(result).not.toBeNull();
      const graph = result!['@graph'];
      expect(graph.some((n: { '@type': unknown }) => n['@type'] === 'WebPage')).toBe(true);
      expect(
        graph.some(
          (n: { '@type': unknown }) =>
            Array.isArray(n['@type']) && n['@type'].includes('SoftwareApplication')
        )
      ).toBe(true);
      expect(graph.some((n: { '@type': unknown }) => n['@type'] === 'DefinedTerm')).toBe(false);
      const breadcrumb = graph.find((n: { '@type': unknown }) => n['@type'] === 'BreadcrumbList');
      expect(breadcrumb).toMatchObject({ '@id': `${baseParams.url}#breadcrumb` });
      expect(breadcrumb).not.toHaveProperty('@context');
    }
  });

  it('always includes the static org/site/app enrichment fields', () => {
    const result = buildWorkflowGraphJsonLd(baseParams);
    const graph = result!['@graph'];
    const website = graph.find((n: { '@type': unknown }) => n['@type'] === 'WebSite');
    const organization = graph.find((n: { '@type': unknown }) => n['@type'] === 'Organization');
    const softwareApp = graph.find(
      (n: { '@type': unknown }) => n['@type'] === 'SoftwareApplication'
    );
    expect(website).toMatchObject({
      publisher: { '@id': `${SITE_ORIGIN}/#organization` },
      hasPart: [{ '@type': 'Blog', name: 'Comfy Blog', url: 'https://blog.comfy.org' }],
    });
    expect(organization).toMatchObject({
      sameAs: expect.arrayContaining(['https://www.youtube.com/@comfyorg']),
      contactPoint: [
        { '@type': 'ContactPoint', contactType: 'customer support' },
        { '@type': 'ContactPoint', contactType: 'press' },
      ],
    });
    expect(softwareApp).toMatchObject({
      sameAs: expect.arrayContaining(['https://en.wikipedia.org/wiki/ComfyUI']),
      softwareHelp: { '@type': 'CreativeWork', url: 'https://docs.comfy.org' },
    });
  });

  it('includes isRelatedTo on the workflow node only when relatedLinks are passed', () => {
    const withLinks = buildWorkflowGraphJsonLd({
      ...baseParams,
      relatedLinks: [{ name: 'Video Workflows', url: 'https://comfy.org/workflows/tag/video/' }],
    });
    const workflowWithLinks = withLinks!['@graph'].find(
      (n: { '@type': unknown }) =>
        Array.isArray(n['@type']) && n['@type'].includes('SoftwareApplication')
    ) as { isRelatedTo?: unknown };
    expect(workflowWithLinks.isRelatedTo).toEqual([
      {
        '@type': 'WebPage',
        name: 'Video Workflows',
        url: 'https://comfy.org/workflows/tag/video/',
      },
    ]);

    const withoutLinks = buildWorkflowGraphJsonLd(baseParams);
    const workflowWithoutLinks = withoutLinks!['@graph'].find(
      (n: { '@type': unknown }) =>
        Array.isArray(n['@type']) && n['@type'].includes('SoftwareApplication')
    );
    expect(workflowWithoutLinks).not.toHaveProperty('isRelatedTo');
  });

  it('builds a @graph with the workflow as mainEntity of the WebPage', () => {
    const result = buildWorkflowGraphJsonLd({
      ...baseParams,
      entities: { about: [{ name: 'Video', sameAs: 'https://en.wikipedia.org/wiki/Video' }] },
    });
    expect(result).not.toBeNull();
    expect(result?.['@context']).toBe('https://schema.org');
    const graph = result!['@graph'];
    const webpage = graph.find((n: { '@type': string }) => n['@type'] === 'WebPage');
    const workflow = graph.find(
      (n: { '@type': unknown }) =>
        Array.isArray(n['@type']) && n['@type'].includes('SoftwareApplication')
    );
    expect(webpage).toMatchObject({
      '@id': `${baseParams.url}#webpage`,
      mainEntity: { '@id': `${baseParams.url}#workflow` },
      about: [{ '@id': `${baseParams.url}#workflow` }, { '@id': `${baseParams.url}#e-about-0` }],
    });
    const aboutTerm = graph.find(
      (n: { '@type': unknown; name?: unknown }) =>
        n['@type'] === 'DefinedTerm' && n.name === 'Video'
    );
    expect(aboutTerm).toMatchObject({
      '@id': `${baseParams.url}#e-about-0`,
      name: 'Video',
      sameAs: 'https://en.wikipedia.org/wiki/Video',
    });
    expect(workflow).toMatchObject({
      '@id': `${baseParams.url}#workflow`,
      name: baseParams.name,
      description: baseParams.description,
    });
  });

  it('emits a DefinedTermSet per category with terms cross-referenced via mentions', () => {
    const result = buildWorkflowGraphJsonLd({
      ...baseParams,
      entities: {
        categories: [
          { name: 'Technology', terms: [{ name: 'API' }, { name: 'Codec' }] },
          { name: 'Audio & Video', terms: [{ name: 'Frame Rate' }] },
        ],
      },
    });
    const graph = result!['@graph'];
    const termSets = graph.filter((n: { '@type': unknown }) => n['@type'] === 'DefinedTermSet');
    const terms = graph.filter((n: { '@type': unknown }) => n['@type'] === 'DefinedTerm');
    expect(termSets).toHaveLength(2);
    expect(terms).toHaveLength(3);
    const webpage = graph.find((n: { '@type': unknown }) => n['@type'] === 'WebPage') as
      | { mentions: Array<{ '@id': string }> }
      | undefined;
    expect(webpage?.mentions).toHaveLength(3);
    // Every mentioned @id must resolve to a DefinedTerm actually present in the graph.
    const termIds = new Set(terms.map((t: { '@id': string }) => t['@id']));
    for (const mention of webpage!.mentions) {
      expect(termIds.has(mention['@id'])).toBe(true);
    }
  });

  it('defaults WebPage headline to name, but uses an explicit headline when provided', () => {
    const withoutHeadline = buildWorkflowGraphJsonLd(baseParams);
    const webpageDefault = withoutHeadline!['@graph'].find(
      (n: { '@type': unknown }) => n['@type'] === 'WebPage'
    ) as { headline: string };
    expect(webpageDefault.headline).toBe(baseParams.name);

    const withHeadline = buildWorkflowGraphJsonLd({
      ...baseParams,
      headline: `${baseParams.name} - ComfyUI Workflow`,
    });
    const webpageCustom = withHeadline!['@graph'].find(
      (n: { '@type': unknown }) => n['@type'] === 'WebPage'
    ) as { headline: string };
    const workflowCustom = withHeadline!['@graph'].find(
      (n: { '@type': unknown }) =>
        Array.isArray(n['@type']) && n['@type'].includes('SoftwareApplication')
    ) as { headline: string };
    expect(webpageCustom.headline).toBe(`${baseParams.name} - ComfyUI Workflow`);
    // The workflow node's own headline is unaffected by the WebPage override.
    expect(workflowCustom.headline).toBe(baseParams.name);
  });

  it('includes standalone entities.mentions terms in mentions with no DefinedTermSet', () => {
    const result = buildWorkflowGraphJsonLd({
      ...baseParams,
      entities: {
        mentions: [{ name: 'Audio', sameAs: 'https://en.wikipedia.org/wiki/Sound' }],
        categories: [{ name: 'Technology', terms: [{ name: 'API' }] }],
      },
    });
    const graph = result!['@graph'];
    const mentionTerm = graph.find(
      (n: { '@type': unknown; name?: unknown }) =>
        n['@type'] === 'DefinedTerm' && n.name === 'Audio'
    ) as { inDefinedTermSet?: unknown; '@id': string };
    expect(mentionTerm).toBeDefined();
    expect(mentionTerm).not.toHaveProperty('inDefinedTermSet');

    const webpage = graph.find((n: { '@type': unknown }) => n['@type'] === 'WebPage') as {
      mentions: Array<{ '@id': string }>;
    };
    // Both the standalone mention term and the category term are cross-referenced.
    expect(webpage.mentions.map((m) => m['@id'])).toContain(mentionTerm['@id']);
    expect(webpage.mentions).toHaveLength(2);
  });

  it('includes a FAQPage node only when faqItems are non-empty', () => {
    const withFaq = buildWorkflowGraphJsonLd({
      ...baseParams,
      entities: { about: [{ name: 'Video' }] },
      faqItems: [{ question: 'Q?', answer: 'A.' }],
    });
    expect(withFaq!['@graph'].some((n: { '@type': string }) => n['@type'] === 'FAQPage')).toBe(
      true
    );

    const withoutFaq = buildWorkflowGraphJsonLd({
      ...baseParams,
      entities: { about: [{ name: 'Video' }] },
    });
    expect(withoutFaq!['@graph'].some((n: { '@type': string }) => n['@type'] === 'FAQPage')).toBe(
      false
    );
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
