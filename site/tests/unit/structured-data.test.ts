import { describe, expect, it } from 'vitest';
import {
  buildHowToJsonLd,
  buildSoftwareApplicationJsonLd,
  buildCollectionPageJsonLd,
  buildWorkflowGraphJsonLd,
  serializeJsonLdForScript,
} from '../../src/lib/structured-data';
import type { WorkflowEntityGraph } from '../../src/data/workflow-entity-graphs';
import { WORKFLOW_ENTITY_GRAPHS } from '../../src/data/workflow-entity-graphs';
import { buildSiteEntityNodes } from '../../src/lib/site-entities';

// Every node id ends in a `#fragment`; collapse to that fragment for order
// assertions (site nodes hang off the origin, page nodes off the canonical).
const fragOf = (id: unknown) =>
  typeof id === 'string' && id.includes('#') ? id.slice(id.indexOf('#')) : String(id);

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

describe('buildWorkflowGraphJsonLd — LTX-2.5: Image to Video matches the client schema recommendation', () => {
  const CANONICAL = 'https://comfy.org/workflows/b37902cee452-b37902cee452/';
  const frag = (n: Record<string, unknown>) => fragOf(n['@id']);

  const result = buildWorkflowGraphJsonLd({
    canonicalUrl: CANONICAL,
    title: 'LTX-2.5: Image to Video',
    pageHeadline: 'LTX-2.5: Image to Video - ComfyUI Workflow',
    description:
      'Generate video from a single image using LTX-2.5, producing a high-fidelity clip with industry-leading pixel quality and native multishot capability that holds character, environment, and lighting across connected scenes. Ideal for cinematic production, VFX shot creation, and content pipelines requiring fast, locally deployable video generation.',
    image: 'https://comfy-hub-assets.comfy.org/uploads/3797af8e-2d26-4c76-a61a-138647979889.mp4',
    datePublished: '2026-08-11',
    inLanguage: 'en',
    breadcrumbItems: [
      { name: 'Home', item: 'https://comfy.org' },
      { name: 'Workflows', item: 'https://comfy.org/workflows/' },
      { name: 'LTX-2.5: Image to Video', item: CANONICAL },
    ],
    faqItems: [
      {
        question: 'Why does the workflow use ResolutionSelector and multiples of 32?',
        answer: 'a',
      },
      { question: 'How long can my clip be, and what affects render time?', answer: 'b' },
      { question: 'How do I keep the subject stable and avoid jitter?', answer: 'c' },
      { question: 'Does this support multishot timelines?', answer: 'd' },
    ],
    entityGraph: WORKFLOW_ENTITY_GRAPHS.video_ltx2_5_i2v,
  });
  const graph = result['@graph'] as Record<string, unknown>[];
  const byFrag = (f: string) => graph.find((n) => frag(n) === f)!;

  it('emits every node in the exact order of the recommendation', () => {
    expect(graph.map(frag)).toEqual([
      '#website',
      '#organization',
      '#comfyui',
      '#webpage',
      '#workflow',
      '#e-video',
      '#e-image',
      '#cat-technology',
      '#e-api',
      '#e-open-source',
      '#e-codec',
      '#e-data',
      '#e-accessibility',
      '#e-hdr',
      '#e-motion-interp',
      '#e-image-format',
      '#cat-business',
      '#e-footage',
      '#e-camera',
      '#e-rendering',
      '#e-quality',
      '#e-manufacturing',
      '#cat-software',
      '#e-prompt-eng',
      '#e-library',
      '#e-hardware',
      '#e-gpu',
      '#e-load',
      '#cat-audiovideo',
      '#e-display-res',
      '#e-pixel',
      '#e-frame-rate',
      '#e-aspect-ratio',
      '#e-subtitles',
      '#e-sound',
      '#e-1080p',
      '#e-motion-blur',
      '#e-mpeg4',
      '#breadcrumb',
      '#faq',
    ]);
  });

  it('WebPage carries the suffixed headline, pinned date, and the recommendation about/mentions order', () => {
    const webpage = byFrag('#webpage');
    expect(webpage['@type']).toBe('WebPage');
    expect(webpage.headline).toBe('LTX-2.5: Image to Video - ComfyUI Workflow');
    expect(webpage.datePublished).toBe('2026-08-12');
    expect(webpage.inLanguage).toBe('en');
    expect(webpage.isPartOf).toEqual({ '@id': 'https://comfy.org/#website' });
    expect(webpage.publisher).toEqual({ '@id': 'https://comfy.org/#organization' });
    expect(webpage.mainEntity).toEqual({ '@id': `${CANONICAL}#workflow` });
    expect(webpage.hasPart).toEqual([{ '@id': `${CANONICAL}#faq` }]);
    expect((webpage.about as Record<string, unknown>[]).map((r) => frag(r))).toEqual([
      '#workflow',
      '#e-video',
      '#e-image',
      '#cat-technology',
      '#cat-business',
      '#cat-software',
      '#cat-audiovideo',
    ]);
    expect((webpage.mentions as Record<string, unknown>[]).map((r) => frag(r))).toEqual([
      '#e-api',
      '#e-open-source',
      '#e-codec',
      '#e-data',
      '#e-accessibility',
      '#e-hdr',
      '#e-motion-interp',
      '#e-hardware',
      '#e-gpu',
      '#e-prompt-eng',
      '#e-library',
      '#e-load',
      '#e-footage',
      '#e-camera',
      '#e-rendering',
      '#e-quality',
      '#e-manufacturing',
      '#e-image-format',
      '#e-display-res',
      '#e-pixel',
      '#e-frame-rate',
      '#e-aspect-ratio',
      '#e-subtitles',
      '#e-sound',
      '#e-1080p',
      '#e-motion-blur',
      '#e-mpeg4',
    ]);
  });

  it('the workflow node keeps the bare title and the pinned identifier/date/keywords', () => {
    const workflow = byFrag('#workflow');
    expect(workflow['@type']).toEqual(['SoftwareApplication', 'TechArticle']);
    expect(workflow.name).toBe('LTX-2.5: Image to Video');
    expect(workflow.headline).toBe('LTX-2.5: Image to Video');
    expect(workflow.identifier).toBe('6e397a2b-68f7-48f6-8930-f3a5491a163c');
    expect(workflow.datePublished).toBe('2026-08-12');
    expect(workflow.keywords).toBe('Image Generation, Image to Video, LTX-2.5, ComfyUI Workflow');
    expect(workflow.creator).toEqual({ '@id': 'https://comfy.org/#organization' });
    expect(workflow.runtimePlatform).toEqual({ '@id': 'https://comfy.org/#comfyui' });
    expect(workflow.isRelatedTo).toEqual([
      {
        '@type': 'WebPage',
        name: 'Image Generation Workflows',
        url: 'https://comfy.org/workflows/category/image/',
      },
      {
        '@type': 'WebPage',
        name: 'Image to Video Workflows',
        url: 'https://comfy.org/workflows/tag/image-to-video/',
      },
    ]);
  });

  it('each DefinedTermSet lists its members in the recommendation order', () => {
    const members = (f: string) =>
      (byFrag(f).hasDefinedTerm as Record<string, unknown>[]).map((r) => frag(r));
    expect(members('#cat-technology')).toEqual([
      '#e-api',
      '#e-open-source',
      '#e-codec',
      '#e-data',
      '#e-accessibility',
      '#e-hdr',
      '#e-motion-interp',
      '#e-image-format',
    ]);
    expect(members('#cat-business')).toEqual([
      '#e-footage',
      '#e-camera',
      '#e-rendering',
      '#e-quality',
      '#e-manufacturing',
    ]);
    expect(members('#cat-software')).toEqual([
      '#e-prompt-eng',
      '#e-library',
      '#e-hardware',
      '#e-gpu',
      '#e-load',
    ]);
    expect(members('#cat-audiovideo')).toEqual([
      '#e-display-res',
      '#e-pixel',
      '#e-frame-rate',
      '#e-aspect-ratio',
      '#e-subtitles',
      '#e-sound',
      '#e-1080p',
      '#e-motion-blur',
      '#e-mpeg4',
    ]);
  });

  it('every categorized DefinedTerm points back at its set; core topics do not', () => {
    expect(byFrag('#e-api').inDefinedTermSet).toEqual({ '@id': `${CANONICAL}#cat-technology` });
    expect(byFrag('#e-image-format').inDefinedTermSet).toEqual({
      '@id': `${CANONICAL}#cat-technology`,
    });
    expect(byFrag('#e-load').inDefinedTermSet).toEqual({ '@id': `${CANONICAL}#cat-software` });
    expect(byFrag('#e-video')).not.toHaveProperty('inDefinedTermSet');
    expect(byFrag('#e-image')).not.toHaveProperty('inDefinedTermSet');
  });

  it('the Organization node keeps its logo (for the Google logo rich result)', () => {
    expect(byFrag('#organization')).toHaveProperty('logo');
    const org = buildSiteEntityNodes().find((n) => n['@type'] === 'Organization')!;
    expect(org.logo).toBe('https://comfy.org/favicon-96x96.png');
  });

  it('serializes to valid JSON', () => {
    const json = serializeJsonLdForScript(result)
      .replace(/\\u003c/g, '<')
      .replace(/\\u003e/g, '>')
      .replace(/\\u0026/g, '&');
    expect(() => JSON.parse(json)).not.toThrow();
  });
});

// Every curated workflow @graph, transcribed from the client "Comfy Schema &
// Content Recommendations" doc: the exact node order, the WebPage about/mentions
// order, each DefinedTermSet's member order, the pinned datePublished, and the
// "- ComfyUI Workflow" headline suffix.
describe('buildWorkflowGraphJsonLd — every curated workflow matches the recommendation doc', () => {
  const SITE = 'https://comfy.org';

  interface ExpectedGraph {
    key: string;
    slug: string;
    title: string;
    datePublished: string;
    identifier?: string;
    nodeOrder: string[];
    about: string[];
    mentions: string[];
    sets: Record<string, string[]>;
  }

  const EXPECTED: ExpectedGraph[] = [
    {
      key: 'api_seedance2_5_r2v',
      slug: 'cd0c4f9f61a4-cd0c4f9f61a4',
      title: 'Seedance 2.5: Reference to Video',
      datePublished: '2026-08-08',
      nodeOrder: [
        '#website',
        '#organization',
        '#comfyui',
        '#webpage',
        '#workflow',
        '#e-reference',
        '#e-video',
        '#e-audio',
        '#e-motion',
        '#e-style',
        '#e-rhythm',
        '#e-ecommerce',
        '#e-product',
        '#e-advertising',
        '#cat-audiovideo',
        '#e-video-editing',
        '#e-sound-effect',
        '#e-cinematic',
        '#e-1080p',
        '#e-motion-blur',
        '#e-microphone',
        '#cat-business',
        '#e-camera',
        '#e-footage',
        '#e-quality',
        '#e-business-process',
        '#cat-technology',
        '#e-display-res',
        '#e-aspect-ratio',
        '#e-image-stabilization',
        '#e-frame-rate',
        '#e-4k',
        '#cat-marketing',
        '#e-branding',
        '#e-personalization',
        '#e-product-demo',
        '#e-digital-marketing',
        '#e-target-market',
        '#e-distribution',
        '#breadcrumb',
        '#faq',
      ],
      about: [
        '#workflow',
        '#e-reference',
        '#e-video',
        '#cat-audiovideo',
        '#cat-business',
        '#cat-technology',
        '#cat-marketing',
      ],
      mentions: [
        '#e-audio',
        '#e-motion',
        '#e-style',
        '#e-rhythm',
        '#e-ecommerce',
        '#e-product',
        '#e-advertising',
        '#e-video-editing',
        '#e-sound-effect',
        '#e-cinematic',
        '#e-1080p',
        '#e-motion-blur',
        '#e-microphone',
        '#e-camera',
        '#e-footage',
        '#e-quality',
        '#e-business-process',
        '#e-display-res',
        '#e-aspect-ratio',
        '#e-image-stabilization',
        '#e-frame-rate',
        '#e-4k',
        '#e-branding',
        '#e-personalization',
        '#e-product-demo',
        '#e-digital-marketing',
        '#e-target-market',
        '#e-distribution',
      ],
      sets: {
        '#cat-audiovideo': [
          '#e-video-editing',
          '#e-sound-effect',
          '#e-cinematic',
          '#e-1080p',
          '#e-motion-blur',
          '#e-microphone',
        ],
        '#cat-business': ['#e-camera', '#e-footage', '#e-quality', '#e-business-process'],
        '#cat-technology': [
          '#e-display-res',
          '#e-aspect-ratio',
          '#e-image-stabilization',
          '#e-frame-rate',
          '#e-4k',
        ],
        '#cat-marketing': [
          '#e-branding',
          '#e-personalization',
          '#e-product-demo',
          '#e-digital-marketing',
          '#e-target-market',
          '#e-distribution',
        ],
      },
    },
    {
      key: 'video_minimax_h3_i2v',
      slug: 'a781503cf508-a781503cf508',
      title: 'MiniMax H3: Image to Video',
      datePublished: '2026-08-03',
      nodeOrder: [
        '#website',
        '#organization',
        '#comfyui',
        '#webpage',
        '#workflow',
        '#e-workflow',
        '#e-video',
        '#e-image',
        '#e-audio',
        '#e-resolution',
        '#e-mp4',
        '#e-clip',
        '#e-model',
        '#e-input',
        '#e-reference',
        '#cat-audiovideo',
        '#e-video-editing',
        '#e-1080p',
        '#e-motion-graphics',
        '#e-digital-audio',
        '#e-stereo-sound',
        '#e-aspect-ratio',
        '#cat-technology',
        '#e-api',
        '#e-point-click',
        '#e-data',
        '#e-infosec',
        '#e-pixel',
        '#e-frame-rate',
        '#e-4k',
        '#cat-business',
        '#e-webcam',
        '#e-website',
        '#cat-files',
        '#e-jpeg',
        '#e-png',
        '#e-download',
        '#e-url',
        '#e-data-center',
        '#e-file-system',
        '#breadcrumb',
        '#faq',
      ],
      about: [
        '#workflow',
        '#e-workflow',
        '#e-video',
        '#e-image',
        '#cat-audiovideo',
        '#cat-technology',
        '#cat-business',
        '#cat-files',
      ],
      mentions: [
        '#e-audio',
        '#e-resolution',
        '#e-mp4',
        '#e-clip',
        '#e-model',
        '#e-input',
        '#e-reference',
        '#e-video-editing',
        '#e-1080p',
        '#e-motion-graphics',
        '#e-digital-audio',
        '#e-stereo-sound',
        '#e-aspect-ratio',
        '#e-api',
        '#e-point-click',
        '#e-data',
        '#e-infosec',
        '#e-pixel',
        '#e-frame-rate',
        '#e-4k',
        '#e-webcam',
        '#e-website',
        '#e-jpeg',
        '#e-png',
        '#e-download',
        '#e-url',
        '#e-data-center',
        '#e-file-system',
      ],
      sets: {
        '#cat-audiovideo': [
          '#e-video-editing',
          '#e-1080p',
          '#e-motion-graphics',
          '#e-digital-audio',
          '#e-stereo-sound',
          '#e-aspect-ratio',
        ],
        '#cat-technology': [
          '#e-api',
          '#e-point-click',
          '#e-data',
          '#e-infosec',
          '#e-pixel',
          '#e-frame-rate',
          '#e-4k',
        ],
        '#cat-business': ['#e-webcam', '#e-website'],
        '#cat-files': [
          '#e-jpeg',
          '#e-png',
          '#e-download',
          '#e-url',
          '#e-data-center',
          '#e-file-system',
        ],
      },
    },
    {
      key: 'video_wan_animate2',
      slug: '9394f9968da3-9394f9968da3',
      title: 'Wan Animate 2: Motion Transfer',
      datePublished: '2026-08-08',
      nodeOrder: [
        '#website',
        '#organization',
        '#comfyui',
        '#webpage',
        '#workflow',
        '#e-motion',
        '#e-character',
        '#e-camera',
        '#e-extraction',
        '#e-frames',
        '#e-skeleton',
        '#e-reference',
        '#e-identity',
        '#cat-computervision',
        '#e-computer-vision',
        '#e-rendering',
        '#e-gpu',
        '#e-image-stabilization',
        '#e-display-res',
        '#cat-business',
        '#e-workflow',
        '#e-footage',
        '#e-quality',
        '#e-communication',
        '#e-control',
        '#cat-audiovideo',
        '#e-sound',
        '#e-surround-sound',
        '#e-high-fidelity',
        '#e-video-editing',
        '#e-frame-rate',
        '#breadcrumb',
        '#faq',
      ],
      about: ['#workflow', '#e-motion', '#cat-computervision', '#cat-business', '#cat-audiovideo'],
      mentions: [
        '#e-character',
        '#e-camera',
        '#e-extraction',
        '#e-frames',
        '#e-skeleton',
        '#e-reference',
        '#e-identity',
        '#e-computer-vision',
        '#e-rendering',
        '#e-gpu',
        '#e-image-stabilization',
        '#e-display-res',
        '#e-workflow',
        '#e-footage',
        '#e-quality',
        '#e-communication',
        '#e-control',
        '#e-sound',
        '#e-surround-sound',
        '#e-high-fidelity',
        '#e-video-editing',
        '#e-frame-rate',
      ],
      sets: {
        '#cat-computervision': [
          '#e-computer-vision',
          '#e-rendering',
          '#e-gpu',
          '#e-image-stabilization',
          '#e-display-res',
        ],
        '#cat-business': [
          '#e-workflow',
          '#e-footage',
          '#e-quality',
          '#e-communication',
          '#e-control',
        ],
        '#cat-audiovideo': [
          '#e-sound',
          '#e-surround-sound',
          '#e-high-fidelity',
          '#e-video-editing',
          '#e-frame-rate',
        ],
      },
    },
  ];

  for (const exp of EXPECTED) {
    describe(exp.title, () => {
      const canonical = `${SITE}/workflows/${exp.slug}/`;
      const g = buildWorkflowGraphJsonLd({
        canonicalUrl: canonical,
        title: exp.title,
        pageHeadline: `${exp.title} - ComfyUI Workflow`,
        description: 'desc',
        image: 'https://cdn/x.mp4',
        // A stale page date must lose to the pinned datePublished on the graph.
        datePublished: '1999-01-01',
        inLanguage: 'en',
        breadcrumbItems: [
          { name: 'Home', item: SITE },
          { name: 'Workflows', item: `${SITE}/workflows/` },
          { name: exp.title, item: canonical },
        ],
        faqItems: [{ question: 'Q?', answer: 'A.' }],
        entityGraph: WORKFLOW_ENTITY_GRAPHS[exp.key],
      });
      const graph = g['@graph'] as Record<string, unknown>[];
      const node = (frag: string) => graph.find((n) => fragOf(n['@id']) === frag)!;

      it('emits every node in the documented order', () => {
        expect(graph.map((n) => fragOf(n['@id']))).toEqual(exp.nodeOrder);
      });

      it('WebPage carries the suffixed headline, pinned date, and documented about/mentions order', () => {
        const wp = node('#webpage');
        expect(wp.headline).toBe(`${exp.title} - ComfyUI Workflow`);
        expect(wp.datePublished).toBe(exp.datePublished);
        expect((wp.about as Record<string, unknown>[]).map((r) => fragOf(r['@id']))).toEqual(
          exp.about
        );
        expect((wp.mentions as Record<string, unknown>[]).map((r) => fragOf(r['@id']))).toEqual(
          exp.mentions
        );
      });

      it('the workflow node uses the bare title and the pinned date', () => {
        const wf = node('#workflow');
        expect(wf.name).toBe(exp.title);
        expect(wf.headline).toBe(exp.title);
        expect(wf.datePublished).toBe(exp.datePublished);
        if (exp.identifier) expect(wf.identifier).toBe(exp.identifier);
        else expect(wf).not.toHaveProperty('identifier');
      });

      it('each DefinedTermSet lists its members in the documented order', () => {
        for (const [setFrag, members] of Object.entries(exp.sets)) {
          expect(
            (node(setFrag).hasDefinedTerm as Record<string, unknown>[]).map((r) => fragOf(r['@id']))
          ).toEqual(members);
        }
      });
    });
  }
});
