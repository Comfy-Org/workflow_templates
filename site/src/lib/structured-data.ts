/**
 * Builders for the JSON-LD structured data emitted on workflow pages.
 *
 * Kept in one place so the default-locale and localized `/workflows/[slug]`
 * routes emit byte-identical schema.org shapes — Google compares the visible
 * content against this markup, so the two routes must not drift.
 */
import { t } from '../i18n/ui';
import type { Locale } from '../i18n/config';
import { localizeUrl } from '../i18n/utils';
import { SITE_ORIGIN, absoluteUrl } from '../config/site';
import { WEBSITE_ID, ORGANIZATION_ID, COMFYUI_ID, buildSiteEntityNodes } from './site-entities';
import type { WorkflowEntityGraph } from '../data/workflow-entity-graphs';

export interface FaqItem {
  question: string;
  answer: string;
}

export interface BreadcrumbItem {
  name: string;
  /** Omit on the current page — schema.org allows a trailing item without a URL. */
  item?: string;
}

/** Maps an ordered list of crumbs to schema.org `ListItem` entries. */
function mapBreadcrumbItems(items: BreadcrumbItem[]) {
  return items.map(({ name, item }, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name,
    ...(item ? { item } : {}),
  }));
}

/** schema.org `BreadcrumbList` JSON-LD from an ordered list of crumbs. */
export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: mapBreadcrumbItems(items),
  };
}

/**
 * BreadcrumbList for a workflows sub-page: Home → section crumb(s) → the current
 * page. `sections` defaults to the `/workflows/` listing; pass deeper parents
 * (e.g. Workflows → Models) so routes that share a parent emit the same trail.
 */
export function buildWorkflowBreadcrumb(
  locale: Locale,
  leaf: BreadcrumbItem,
  sections: BreadcrumbItem[] = [
    {
      name: t('breadcrumb.workflows', locale),
      item: absoluteUrl(localizeUrl('/workflows/', locale)),
    },
  ]
) {
  return buildBreadcrumbJsonLd([
    { name: t('breadcrumb.home', locale), item: SITE_ORIGIN },
    ...sections,
    leaf,
  ]);
}

/**
 * Serialize a JSON-LD object for injection into an inline `<script>` via
 * `set:html`. Escapes `<`, `>`, `&`, and the U+2028/U+2029 line separators so
 * user-supplied text (FAQ questions/answers, titles) containing `</script>`
 * cannot break out of the script block and inject markup.
 *
 * `JSON.stringify` returns `undefined` for `undefined`/functions/symbols; we
 * coerce that to the literal `null` so the function always returns a valid,
 * inert JSON string instead of throwing on `.replace`.
 */
export function serializeJsonLdForScript(value: unknown): string {
  const json = JSON.stringify(value);
  if (json === undefined) return 'null';
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * schema.org `FAQPage` JSON-LD for a workflow's FAQ section, or `null` when
 * there are no items (so the caller can skip emitting an empty graph).
 */
export function buildFaqJsonLd(faqItems: FaqItem[] | undefined) {
  if (!faqItems?.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

/** One entry of a `CollectionPage`'s `ItemList` — a link to a child page. */
export interface ItemListEntry {
  name: string;
  /** Absolute URL to the child page. */
  url?: string;
  /** Absolute image URL, omitted when the child has no still. */
  image?: string;
  itemType?: string;
  description?: string;
  keywords?: string;
  creator?: {
    name: string;
    url?: string;
  };
}

export type StructuredDataAbout = Array<{ '@type': string; name: string; sameAs?: string }>;
export type StructuredDataMention = Array<
  { '@id': string } | { '@type': string; name: string; sameAs?: string }
>;

export const SOFTWARE_NODE_ID = `${SITE_ORIGIN}/workflows/comfyui/#software`;

export function buildSeoGraphJsonLd(params: {
  name: string;
  description: string;
  url: string;
  inLanguage?: string;
  breadcrumbItems: BreadcrumbItem[];
  items?: ItemListEntry[];
  itemListName?: string;
  faqItems?: FaqItem[];
  howTo?: { name: string; description?: string; steps: string[] };
  about?: StructuredDataAbout;
  mentions?: StructuredDataMention;
}) {
  const website = {
    '@type': 'WebSite',
    '@id': `${SITE_ORIGIN}/#website`,
    name: 'ComfyUI Workflows',
    url: `${SITE_ORIGIN}/`,
  };

  const organization = {
    '@type': 'Organization',
    '@id': `${SITE_ORIGIN}/#organization`,
    name: 'Comfy Org',
    url: `${SITE_ORIGIN}/`,
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl('/brand/comfy-wordmark-yellow.svg'),
    },
    sameAs: [
      'https://github.com/Comfy-Org',
      'https://discord.gg/comfyorg',
      'https://x.com/ComfyUI',
      'https://www.linkedin.com/company/comfyui',
      'https://www.instagram.com/comfyui',
    ],
  };

  const softwareApp = {
    '@type': 'SoftwareApplication',
    '@id': SOFTWARE_NODE_ID,
    name: 'ComfyUI',
    url: absoluteUrl('/workflows/comfyui/'),
    description:
      'Build powerful AI pipelines by connecting nodes on an infinite canvas, with every model, parameter, and processing step visible and adjustable.',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Windows, macOS, Linux, Cloud',
    image: absoluteUrl('/workflows/og-default.png'),
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    publisher: { '@id': `${SITE_ORIGIN}/#organization` },
  };

  const breadcrumbId = `${params.url}#breadcrumb`;
  const { '@context': _ctx, ...breadcrumb } = buildBreadcrumbJsonLd(params.breadcrumbItems);
  const breadcrumbList = {
    ...breadcrumb,
    '@id': breadcrumbId,
  };

  const itemListId = params.items?.length ? `${params.url}#itemlist` : undefined;

  const collectionPage = {
    '@type': 'CollectionPage',
    '@id': `${params.url}#webpage`,
    url: params.url,
    name: params.name,
    description: params.description,
    ...(params.inLanguage ? { inLanguage: params.inLanguage } : {}),
    isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
    breadcrumb: { '@id': breadcrumbId },
    publisher: { '@id': `${SITE_ORIGIN}/#organization` },
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: absoluteUrl('/workflows/og-default.png'),
      width: 1200,
      height: 630,
    },
    ...(params.about ? { about: params.about } : {}),
    ...(params.mentions ? { mentions: params.mentions } : {}),
    ...(itemListId ? { mainEntity: { '@id': itemListId } } : {}),
  };

  const itemList =
    itemListId && params.items
      ? {
          '@type': 'ItemList',
          '@id': itemListId,
          name: params.itemListName || params.name,
          numberOfItems: params.items.length,
          itemListElement: params.items.map((entry, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            item: {
              '@type': entry.itemType || 'SoftwareApplication',
              name: entry.name,
              ...(entry.url ? { url: entry.url } : {}),
              ...(entry.image ? { image: entry.image } : {}),
              ...(entry.description ? { description: entry.description } : {}),
              ...(entry.keywords ? { keywords: entry.keywords } : {}),
              ...(entry.creator
                ? {
                    creator: {
                      '@type': 'Person',
                      name: entry.creator.name,
                      ...(entry.creator.url ? { url: entry.creator.url } : {}),
                    },
                  }
                : {}),
            },
          })),
        }
      : null;

  const faqPage = params.faqItems?.length
    ? {
        '@type': 'FAQPage',
        '@id': `${params.url}#faq`,
        isPartOf: { '@id': `${params.url}#webpage` },
        mainEntity: params.faqItems.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      }
    : null;

  const howToSteps = params.howTo?.steps.map((s) => s.trim()).filter(Boolean) || [];
  const howTo =
    params.howTo && howToSteps.length
      ? {
          '@type': 'HowTo',
          '@id': `${params.url}#howto`,
          isPartOf: { '@id': `${params.url}#webpage` },
          name: params.howTo.name,
          ...(params.howTo.description ? { description: params.howTo.description } : {}),
          step: howToSteps.map((step, i) => ({
            '@type': 'HowToStep',
            position: i + 1,
            name: step,
            text: step,
          })),
        }
      : null;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      website,
      organization,
      softwareApp,
      breadcrumbList,
      collectionPage,
      ...(itemList ? [itemList] : []),
      ...(faqPage ? [faqPage] : []),
      ...(howTo ? [howTo] : []),
    ],
  };
}

export function buildCollectionPageJsonLd(params: {
  name: string;
  description: string;
  url: string;
  inLanguage?: string;
  /** Child pages to enumerate as a nested `ItemList`; omit for a bare CollectionPage. */
  items?: ItemListEntry[];
}) {
  const mainEntity = params.items?.length
    ? {
        '@type': 'ItemList',
        numberOfItems: params.items.length,
        itemListElement: params.items.map((entry, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: entry.name,
          url: entry.url,
          ...(entry.image ? { image: entry.image } : {}),
        })),
      }
    : undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: params.name,
    description: params.description,
    url: params.url,
    ...(params.inLanguage ? { inLanguage: params.inLanguage } : {}),
    ...(mainEntity ? { mainEntity } : {}),
  };
}

/**
 * schema.org `HowTo` for a page's ordered "how to use" steps, or `null` when
 * there are no non-blank steps. Not a Google rich result (deprecated 2023) — this
 * is machine-readable step data for LLMs and other consumers.
 */
export function buildHowToJsonLd(params: {
  name: string;
  steps: string[] | undefined;
  description?: string;
}) {
  const steps = params.steps?.map((s) => s.trim()).filter(Boolean);
  if (!steps?.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: params.name,
    ...(params.description ? { description: params.description } : {}),
    step: steps.map((text, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: text,
      text,
    })),
  };
}

/**
 * schema.org `SoftwareApplication` framing a landing page as a runnable tool —
 * machine-readable metadata, not a Google rich result (that needs `offers` and
 * `aggregateRating`, which we never assert: Comfy Cloud isn't free and no rating
 * data exists).
 */
export function buildSoftwareApplicationJsonLd(params: {
  name: string;
  description: string;
  featureList?: string[];
}) {
  const featureList = params.featureList?.map((f) => f.trim()).filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: params.name,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Windows, macOS, Linux',
    description: params.description,
    ...(featureList?.length ? { featureList } : {}),
  };
}

/**
 * The full client-provided `@graph` for a workflow detail page: WebSite →
 * Organization → ComfyUI SoftwareApplication (sitewide, constant) plus a
 * per-page WebPage, workflow `[SoftwareApplication,TechArticle]`, DefinedTerm /
 * DefinedTermSet entity nodes, BreadcrumbList, and FAQPage — replacing the
 * separate TechArticle/FAQPage/SoftwareApplication/BreadcrumbList scripts with
 * one linked graph. Entity names/sameAs/category assignments come verbatim from
 * `entityGraph` (see workflow-entity-graphs.ts) — nothing here is inferred.
 */
export function buildWorkflowGraphJsonLd(params: {
  canonicalUrl: string;
  title: string;
  description: string;
  image?: string;
  datePublished?: string;
  inLanguage: string;
  breadcrumbItems: BreadcrumbItem[];
  faqItems?: FaqItem[];
  entityGraph: WorkflowEntityGraph;
}) {
  const {
    canonicalUrl,
    title,
    description,
    image,
    datePublished,
    inLanguage,
    breadcrumbItems,
    faqItems,
    entityGraph,
  } = params;

  const localId = (fragment: string) => `${canonicalUrl}#${fragment}`;
  const webpageId = localId('webpage');
  const workflowId = localId('workflow');
  const breadcrumbId = localId('breadcrumb');
  const faqId = localId('faq');

  const graph: Record<string, unknown>[] = [...buildSiteEntityNodes()];

  const aboutRefs: { '@id': string }[] = [{ '@id': workflowId }];
  for (const topic of entityGraph.coreTopics) {
    graph.push({
      '@type': 'DefinedTerm',
      '@id': localId(topic.id),
      name: topic.name,
      sameAs: topic.sameAs,
    });
    aboutRefs.push({ '@id': localId(topic.id) });
  }
  for (const category of entityGraph.categories) {
    aboutRefs.push({ '@id': localId(category.id) });
  }

  const categoryIds = new Set(entityGraph.categories.map((c) => c.id));

  const mentionRefs: { '@id': string }[] = [];
  for (const entity of entityGraph.entities) {
    // Only emit inDefinedTermSet when categoryId names a category actually
    // declared on this graph — otherwise the reference would dangle (no
    // DefinedTermSet node behind it).
    const hasDeclaredCategory = Boolean(entity.categoryId && categoryIds.has(entity.categoryId));
    graph.push({
      '@type': 'DefinedTerm',
      '@id': localId(entity.id),
      name: entity.name,
      sameAs: entity.sameAs,
      ...(hasDeclaredCategory ? { inDefinedTermSet: { '@id': localId(entity.categoryId!) } } : {}),
    });
    mentionRefs.push({ '@id': localId(entity.id) });
  }

  for (const category of entityGraph.categories) {
    graph.push({
      '@type': 'DefinedTermSet',
      '@id': localId(category.id),
      name: category.name,
      hasDefinedTerm: entityGraph.entities
        .filter((e) => e.categoryId === category.id)
        .map((e) => ({ '@id': localId(e.id) })),
    });
  }

  graph.push({
    '@type': ['SoftwareApplication', 'TechArticle'],
    '@id': workflowId,
    name: title,
    headline: title,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Windows, macOS, Linux',
    ...(entityGraph.identifier ? { identifier: entityGraph.identifier } : {}),
    ...(datePublished ? { datePublished } : {}),
    ...(image ? { image } : {}),
    description,
    ...(entityGraph.keywords ? { keywords: entityGraph.keywords } : {}),
    creator: { '@id': ORGANIZATION_ID },
    runtimePlatform: { '@id': COMFYUI_ID },
    ...(entityGraph.isRelatedTo?.length
      ? {
          isRelatedTo: entityGraph.isRelatedTo.map((r) => ({
            '@type': 'WebPage',
            name: r.name,
            url: r.url,
          })),
        }
      : {}),
  });

  graph.push({
    '@type': 'BreadcrumbList',
    '@id': breadcrumbId,
    itemListElement: mapBreadcrumbItems(breadcrumbItems),
  });

  const hasFaq = Boolean(faqItems?.length);
  if (hasFaq) {
    graph.push({
      '@type': 'FAQPage',
      '@id': faqId,
      mainEntity: faqItems!.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
  }

  graph.push({
    '@type': 'WebPage',
    '@id': webpageId,
    url: canonicalUrl,
    headline: title,
    isPartOf: { '@id': WEBSITE_ID },
    publisher: { '@id': ORGANIZATION_ID },
    ...(datePublished ? { datePublished } : {}),
    inLanguage,
    breadcrumb: { '@id': breadcrumbId },
    mainEntity: { '@id': workflowId },
    ...(hasFaq ? { hasPart: [{ '@id': faqId }] } : {}),
    about: aboutRefs,
    ...(mentionRefs.length ? { mentions: mentionRefs } : {}),
  });

  return { '@context': 'https://schema.org', '@graph': graph };
}
