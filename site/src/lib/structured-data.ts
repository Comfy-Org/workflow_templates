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
  url: string;
  /** Absolute image URL, omitted when the child has no still. */
  image?: string;
}

/**
 * `CollectionPage` JSON-LD for an aggregation/navigation page (tag, model,
 * index, use-case, category listings). These pages are never video "watch
 * pages": do NOT add a `VideoObject` here even when the page shows a
 * representative video — they pass `suppressVideoIndexing` to `BaseLayout`
 * instead (emits `max-video-preview:0`).
 */
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
 * The full client-provided `@graph` for a workflow detail page, in the exact
 * node order of the schema recommendation: WebSite → Organization → ComfyUI
 * SoftwareApplication (sitewide, constant) → WebPage → workflow
 * `[SoftwareApplication,TechArticle]` → core-topic DefinedTerms → any standalone
 * (uncategorized) DefinedTerms → each DefinedTermSet immediately followed by its
 * member DefinedTerms → BreadcrumbList → FAQPage. Replaces the separate
 * TechArticle/FAQPage/SoftwareApplication/
 * BreadcrumbList scripts with one linked graph. Entity names/sameAs/category
 * assignments and ordering come verbatim from `entityGraph` (see
 * workflow-entity-graphs.ts) — nothing here is inferred.
 */
export function buildWorkflowGraphJsonLd(params: {
  canonicalUrl: string;
  title: string;
  /**
   * The page `<title>` (with the " - ComfyUI Workflow" suffix) used for
   * `WebPage.headline`. Falls back to `title` when omitted; the workflow node
   * always uses the bare `title`.
   */
  pageHeadline?: string;
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
    pageHeadline,
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

  // A curated `datePublished` on the entity graph pins the value from the client
  // schema; otherwise fall back to the page date (from the hub index).
  const publishedDate = entityGraph.datePublished ?? datePublished;
  const hasFaq = Boolean(faqItems?.length);

  // --- Precompute the entity nodes and their cross-references ------------------
  const categoryIds = new Set(entityGraph.categories.map((c) => c.id));

  // about: the workflow, then each core topic, then each category set.
  const aboutRefs: { '@id': string }[] = [{ '@id': workflowId }];
  const coreTopicNodes: Record<string, unknown>[] = [];
  for (const topic of entityGraph.coreTopics) {
    coreTopicNodes.push({
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

  // One DefinedTerm node per entity, split into standalone vs. per-category
  // buckets. Order within a bucket follows the `entities` array order, which is
  // also the order used for each `DefinedTermSet.hasDefinedTerm`.
  const standaloneTermNodes: Record<string, unknown>[] = [];
  const termNodesByCategory = new Map<string, Record<string, unknown>[]>();
  const knownEntityIds = new Set<string>();
  for (const entity of entityGraph.entities) {
    knownEntityIds.add(entity.id);
    // Only emit inDefinedTermSet when categoryId names a category actually
    // declared on this graph — otherwise the reference would dangle (no
    // DefinedTermSet node behind it).
    const hasDeclaredCategory = Boolean(entity.categoryId && categoryIds.has(entity.categoryId));
    const node: Record<string, unknown> = {
      '@type': 'DefinedTerm',
      '@id': localId(entity.id),
      name: entity.name,
      sameAs: entity.sameAs,
      ...(hasDeclaredCategory ? { inDefinedTermSet: { '@id': localId(entity.categoryId!) } } : {}),
    };
    if (hasDeclaredCategory) {
      const bucket = termNodesByCategory.get(entity.categoryId!) ?? [];
      bucket.push(node);
      termNodesByCategory.set(entity.categoryId!, bucket);
    } else {
      standaloneTermNodes.push(node);
    }
  }

  // mentions: the explicit `mentionsOrder` when the client schema pins one (with
  // any entity it omits appended in `entities` order), else plain `entities`
  // order.
  const mentionsOrder = entityGraph.mentionsOrder;
  const orderedMentionIds = mentionsOrder?.length
    ? [
        ...mentionsOrder.filter((id) => knownEntityIds.has(id)),
        ...entityGraph.entities.map((e) => e.id).filter((id) => !mentionsOrder.includes(id)),
      ]
    : entityGraph.entities.map((e) => e.id);
  const mentionRefs = orderedMentionIds.map((id) => ({ '@id': localId(id) }));

  // --- Assemble the graph in the client schema's node order ------------------
  const graph: Record<string, unknown>[] = [...buildSiteEntityNodes()];

  graph.push({
    '@type': 'WebPage',
    '@id': webpageId,
    url: canonicalUrl,
    headline: pageHeadline ?? title,
    isPartOf: { '@id': WEBSITE_ID },
    publisher: { '@id': ORGANIZATION_ID },
    ...(publishedDate ? { datePublished: publishedDate } : {}),
    inLanguage,
    breadcrumb: { '@id': breadcrumbId },
    mainEntity: { '@id': workflowId },
    ...(hasFaq ? { hasPart: [{ '@id': faqId }] } : {}),
    about: aboutRefs,
    ...(mentionRefs.length ? { mentions: mentionRefs } : {}),
  });

  graph.push({
    '@type': ['SoftwareApplication', 'TechArticle'],
    '@id': workflowId,
    name: title,
    headline: title,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Windows, macOS, Linux',
    ...(entityGraph.identifier ? { identifier: entityGraph.identifier } : {}),
    ...(publishedDate ? { datePublished: publishedDate } : {}),
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

  graph.push(...coreTopicNodes);
  graph.push(...standaloneTermNodes);

  for (const category of entityGraph.categories) {
    const memberNodes = termNodesByCategory.get(category.id) ?? [];
    graph.push({
      '@type': 'DefinedTermSet',
      '@id': localId(category.id),
      name: category.name,
      hasDefinedTerm: memberNodes.map((n) => ({ '@id': n['@id'] as string })),
    });
    graph.push(...memberNodes);
  }

  graph.push({
    '@type': 'BreadcrumbList',
    '@id': breadcrumbId,
    itemListElement: mapBreadcrumbItems(breadcrumbItems),
  });

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

  return { '@context': 'https://schema.org', '@graph': graph };
}
