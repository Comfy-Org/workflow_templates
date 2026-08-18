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

export interface FaqItem {
  question: string;
  answer: string;
}

export interface BreadcrumbItem {
  name: string;
  /** Omit on the current page — schema.org allows a trailing item without a URL. */
  item?: string;
}

/** schema.org `BreadcrumbList` JSON-LD from an ordered list of crumbs. */
export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(({ name, item }, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      ...(item ? { item } : {}),
    })),
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

/** A named concept a workflow page covers, optionally linked to its Wikipedia article. */
export interface EntityTerm {
  name: string;
  sameAs?: string;
}

/** A named group of related `EntityTerm`s (e.g. "Technology", "Audio & Video"). */
export interface EntityCategory {
  name: string;
  terms: EntityTerm[];
}

/** Entity coverage for a single workflow page: broad "about" concepts plus categorized mentions. */
export interface WorkflowEntities {
  /** Broad concepts the page is directly about (e.g. Video, Image). */
  about?: EntityTerm[];
  /** Narrower entities the page touches on, grouped into `DefinedTermSet`s. */
  categories?: EntityCategory[];
}

/**
 * Unified nested `@graph` JSON-LD for a single workflow detail page: `WebSite` →
 * `Organization` → `SoftwareApplication` (ComfyUI) → `WebPage` → the workflow itself
 * (`SoftwareApplication` + `TechArticle`), plus `DefinedTerm`/`DefinedTermSet` nodes
 * for `entities.categories` and a `BreadcrumbList`/`FAQPage` when supplied.
 *
 * Unlike `buildCollectionPageJsonLd` (a bare `CollectionPage`, no root nodes of its
 * own), this builds the full `WebSite`/`Organization`/`SoftwareApplication` root
 * chain itself, with a `WebPage` whose `mainEntity` is the workflow. Always builds
 * the graph, replacing the page's old per-type scripts outright — `entities` is
 * optional structured-data enrichment layered into the same graph once the backend
 * supplies it, not a gate on whether the graph itself renders.
 */
export function buildWorkflowGraphJsonLd(params: {
  name: string;
  description: string;
  url: string;
  image?: string;
  identifier?: string;
  datePublished?: string;
  inLanguage?: string;
  keywords?: string;
  breadcrumbItems: BreadcrumbItem[];
  entities?: WorkflowEntities;
  faqItems?: FaqItem[];
}) {
  const { about, categories } = params.entities || {};

  const website = {
    '@type': 'WebSite',
    '@id': `${SITE_ORIGIN}/#website`,
    name: 'Comfy',
    url: `${SITE_ORIGIN}/`,
  };

  const organization = {
    '@type': 'Organization',
    '@id': `${SITE_ORIGIN}/#organization`,
    name: 'Comfy Org',
    url: `${SITE_ORIGIN}/`,
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
    '@id': `${SITE_ORIGIN}/#comfyui`,
    name: 'ComfyUI',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Windows, macOS, Linux',
  };

  const breadcrumbId = `${params.url}#breadcrumb`;
  const { '@context': _ctx, ...breadcrumb } = buildBreadcrumbJsonLd(params.breadcrumbItems);
  const breadcrumbList = { ...breadcrumb, '@id': breadcrumbId };

  const workflowId = `${params.url}#workflow`;

  const termSets = (categories || []).map((category, ci) => {
    const setId = `${params.url}#cat-${ci}`;
    const terms = category.terms.map((term, ti) => ({
      id: `${params.url}#e-${ci}-${ti}`,
      node: {
        '@type': 'DefinedTerm',
        '@id': `${params.url}#e-${ci}-${ti}`,
        name: term.name,
        ...(term.sameAs ? { sameAs: term.sameAs } : {}),
        inDefinedTermSet: { '@id': setId },
      },
    }));
    return {
      id: setId,
      node: {
        '@type': 'DefinedTermSet',
        '@id': setId,
        name: category.name,
        hasDefinedTerm: terms.map((t) => ({ '@id': t.id })),
      },
      terms,
    };
  });

  const faqId = `${params.url}#faq`;

  const webpage = {
    '@type': 'WebPage',
    '@id': `${params.url}#webpage`,
    url: params.url,
    headline: params.name,
    isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
    publisher: { '@id': `${SITE_ORIGIN}/#organization` },
    ...(params.datePublished ? { datePublished: params.datePublished } : {}),
    ...(params.inLanguage ? { inLanguage: params.inLanguage } : {}),
    breadcrumb: { '@id': breadcrumbId },
    mainEntity: { '@id': workflowId },
    ...(about?.length
      ? {
          about: about.map((term) => ({
            '@type': 'DefinedTerm',
            name: term.name,
            ...(term.sameAs ? { sameAs: term.sameAs } : {}),
          })),
        }
      : {}),
    ...(termSets.length
      ? { mentions: termSets.flatMap((set) => set.terms.map((t) => ({ '@id': t.id }))) }
      : {}),
    ...(params.faqItems?.length ? { hasPart: { '@id': faqId } } : {}),
  };

  const workflow = {
    '@type': ['SoftwareApplication', 'TechArticle'],
    '@id': workflowId,
    name: params.name,
    headline: params.name,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Windows, macOS, Linux',
    ...(params.identifier ? { identifier: params.identifier } : {}),
    ...(params.datePublished ? { datePublished: params.datePublished } : {}),
    ...(params.image ? { image: params.image } : {}),
    description: params.description,
    ...(params.keywords ? { keywords: params.keywords } : {}),
    creator: { '@id': `${SITE_ORIGIN}/#organization` },
    runtimePlatform: { '@id': `${SITE_ORIGIN}/#comfyui` },
  };

  const faqPage = params.faqItems?.length
    ? {
        '@type': 'FAQPage',
        '@id': faqId,
        isPartOf: { '@id': `${params.url}#webpage` },
        mainEntity: params.faqItems.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      }
    : null;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      website,
      organization,
      softwareApp,
      webpage,
      workflow,
      breadcrumbList,
      ...termSets.flatMap((set) => [set.node, ...set.terms.map((t) => t.node)]),
      ...(faqPage ? [faqPage] : []),
    ],
  };
}
