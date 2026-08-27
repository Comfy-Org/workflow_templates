import { describe, expect, it } from 'vitest';
import {
  buildHowToJsonLd,
  buildSoftwareApplicationJsonLd,
  buildCollectionPageJsonLd,
  buildWorkflowGraphJsonLd,
  serializeJsonLdForScript,
} from '../../src/lib/structured-data';
import type { WorkflowEntityGraph } from '../../src/data/workflow-entity-graphs';

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
  const sampleEntityGraph: WorkflowEntityGraph = {
    identifier: 'uuid-123',
    keywords: 'Image Generation, Test Workflow',
    isRelatedTo: [
      { name: 'Image Generation Workflows', url: 'https://comfy.org/workflows/category/image/' },
    ],
    coreTopics: [{ id: 'e-video', name: 'Video', sameAs: 'https://en.wikipedia.org/wiki/Video' }],
    categories: [{ id: 'cat-technology', name: 'Technology' }],
    entities: [
      {
        id: 'e-api',
        name: 'API',
        sameAs: 'https://en.wikipedia.org/wiki/API',
        categoryId: 'cat-technology',
      },
      {
        id: 'e-standalone',
        name: 'Standalone Term',
        sameAs: 'https://en.wikipedia.org/wiki/Standalone',
      },
    ],
  };

  const baseParams = {
    canonicalUrl: 'https://comfy.org/workflows/test-abc123/',
    title: 'Test Workflow',
    description: 'A test workflow description.',
    image: 'https://cdn/test.mp4',
    datePublished: '2026-08-12',
    inLanguage: 'en',
    breadcrumbItems: [
      { name: 'Home', item: 'https://comfy.org' },
      { name: 'Workflows', item: 'https://comfy.org/workflows/' },
      { name: 'Test Workflow', item: 'https://comfy.org/workflows/test-abc123/' },
    ],
    entityGraph: sampleEntityGraph,
  };

  it('emits one @context/@graph object containing the sitewide + page-specific nodes', () => {
    const result = buildWorkflowGraphJsonLd(baseParams);
    expect(result['@context']).toBe('https://schema.org');
    expect(Array.isArray(result['@graph'])).toBe(true);
    const types = result['@graph'].map((n: Record<string, unknown>) => n['@type']);
    expect(types).toEqual(
      expect.arrayContaining([
        'WebSite',
        'Organization',
        'SoftwareApplication', // ComfyUI
        'DefinedTerm',
        'DefinedTermSet',
        expect.arrayContaining(['SoftwareApplication', 'TechArticle']),
        'BreadcrumbList',
        'WebPage',
      ])
    );
  });

  it('derives page-specific @ids from canonicalUrl', () => {
    const result = buildWorkflowGraphJsonLd(baseParams);
    const webpage = result['@graph'].find(
      (n: Record<string, unknown>) => n['@type'] === 'WebPage'
    )!;
    const workflow = result['@graph'].find(
      (n: Record<string, unknown>) =>
        Array.isArray(n['@type']) && (n['@type'] as string[]).includes('TechArticle')
    )!;
    expect(webpage['@id']).toBe('https://comfy.org/workflows/test-abc123/#webpage');
    expect(workflow['@id']).toBe('https://comfy.org/workflows/test-abc123/#workflow');
    expect(webpage.mainEntity).toEqual({
      '@id': 'https://comfy.org/workflows/test-abc123/#workflow',
    });
  });

  it('about includes the workflow, core topics, and category refs; mentions includes every entity', () => {
    const result = buildWorkflowGraphJsonLd(baseParams);
    const webpage = result['@graph'].find(
      (n: Record<string, unknown>) => n['@type'] === 'WebPage'
    )!;
    expect(webpage.about).toEqual([
      { '@id': 'https://comfy.org/workflows/test-abc123/#workflow' },
      { '@id': 'https://comfy.org/workflows/test-abc123/#e-video' },
      { '@id': 'https://comfy.org/workflows/test-abc123/#cat-technology' },
    ]);
    expect(webpage.mentions).toEqual([
      { '@id': 'https://comfy.org/workflows/test-abc123/#e-api' },
      { '@id': 'https://comfy.org/workflows/test-abc123/#e-standalone' },
    ]);
  });

  it('only categorized entities appear in their DefinedTermSet.hasDefinedTerm, standalone entities get no inDefinedTermSet', () => {
    const result = buildWorkflowGraphJsonLd(baseParams);
    const category = result['@graph'].find(
      (n: Record<string, unknown>) => n['@type'] === 'DefinedTermSet'
    )!;
    expect(category.hasDefinedTerm).toEqual([
      { '@id': 'https://comfy.org/workflows/test-abc123/#e-api' },
    ]);

    const apiTerm = result['@graph'].find((n: Record<string, unknown>) => n.name === 'API')!;
    expect(apiTerm.inDefinedTermSet).toEqual({
      '@id': 'https://comfy.org/workflows/test-abc123/#cat-technology',
    });

    const standaloneTerm = result['@graph'].find(
      (n: Record<string, unknown>) => n.name === 'Standalone Term'
    );
    expect(standaloneTerm).not.toHaveProperty('inDefinedTermSet');
  });

  it('omits inDefinedTermSet when categoryId names a category not declared on the graph', () => {
    const result = buildWorkflowGraphJsonLd({
      ...baseParams,
      entityGraph: {
        ...sampleEntityGraph,
        entities: [
          {
            id: 'e-orphan',
            name: 'Orphan Term',
            sameAs: 'https://en.wikipedia.org/wiki/Orphan',
            categoryId: 'cat-undeclared',
          },
        ],
      },
    });
    const orphanTerm = result['@graph'].find(
      (n: Record<string, unknown>) => n.name === 'Orphan Term'
    )!;
    expect(orphanTerm).not.toHaveProperty('inDefinedTermSet');
    // No DefinedTermSet node for the undeclared category, either.
    expect(
      result['@graph'].find((n: Record<string, unknown>) =>
        n['@id']?.toString().endsWith('#cat-undeclared')
      )
    ).toBeUndefined();
  });

  it('includes an FAQPage node and WebPage.hasPart only when faqItems are given', () => {
    const withFaq = buildWorkflowGraphJsonLd({
      ...baseParams,
      faqItems: [{ question: 'Q1?', answer: 'A1.' }],
    });
    const faqNode = withFaq['@graph'].find(
      (n: Record<string, unknown>) => n['@type'] === 'FAQPage'
    )!;
    expect(faqNode).toBeTruthy();
    expect(faqNode.mainEntity).toEqual([
      { '@type': 'Question', name: 'Q1?', acceptedAnswer: { '@type': 'Answer', text: 'A1.' } },
    ]);
    const webpageWithFaq = withFaq['@graph'].find(
      (n: Record<string, unknown>) => n['@type'] === 'WebPage'
    )!;
    expect(webpageWithFaq.hasPart).toEqual([
      { '@id': 'https://comfy.org/workflows/test-abc123/#faq' },
    ]);

    const withoutFaq = buildWorkflowGraphJsonLd(baseParams);
    expect(
      withoutFaq['@graph'].find((n: Record<string, unknown>) => n['@type'] === 'FAQPage')
    ).toBeUndefined();
    const webpageNoFaq = withoutFaq['@graph'].find(
      (n: Record<string, unknown>) => n['@type'] === 'WebPage'
    );
    expect(webpageNoFaq).not.toHaveProperty('hasPart');

    const withEmptyFaq = buildWorkflowGraphJsonLd({ ...baseParams, faqItems: [] });
    expect(
      withEmptyFaq['@graph'].find((n: Record<string, unknown>) => n['@type'] === 'FAQPage')
    ).toBeUndefined();
    const webpageEmptyFaq = withEmptyFaq['@graph'].find(
      (n: Record<string, unknown>) => n['@type'] === 'WebPage'
    );
    expect(webpageEmptyFaq).not.toHaveProperty('hasPart');
  });

  it('every node in the graph has an @id, and every @id is unique', () => {
    const result = buildWorkflowGraphJsonLd({
      ...baseParams,
      faqItems: [{ question: 'Q1?', answer: 'A1.' }],
    });
    const ids = result['@graph'].map((n: Record<string, unknown>) => n['@id']);
    expect(ids.filter(Boolean)).toHaveLength(result['@graph'].length);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('produces valid JSON through serializeJsonLdForScript', () => {
    const result = buildWorkflowGraphJsonLd(baseParams);
    const json = serializeJsonLdForScript(result);
    expect(() =>
      JSON.parse(
        json
          .replace(/\\u003c/g, '<')
          .replace(/\\u003e/g, '>')
          .replace(/\\u0026/g, '&')
      )
    ).not.toThrow();
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
