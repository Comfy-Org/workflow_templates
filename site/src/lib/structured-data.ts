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
 * BreadcrumbList for a workflows sub-page: Home → a section crumb → the current
 * page. `section` defaults to the `/workflows/` listing; pass an override for
 * pages nested under a different parent (e.g. the models index).
 */
export function buildWorkflowBreadcrumb(
  locale: Locale,
  leaf: BreadcrumbItem,
  section: BreadcrumbItem = {
    name: t('breadcrumb.workflows', locale),
    item: absoluteUrl(localizeUrl('/workflows/', locale)),
  }
) {
  return buildBreadcrumbJsonLd([
    { name: t('breadcrumb.home', locale), item: SITE_ORIGIN },
    section,
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
  const itemList = params.items?.length
    ? {
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: params.items.length,
          itemListElement: params.items.map((entry, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: entry.name,
            url: entry.url,
            ...(entry.image ? { image: entry.image } : {}),
          })),
        },
      }
    : {};
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: params.name,
    description: params.description,
    url: params.url,
    ...(params.inLanguage ? { inLanguage: params.inLanguage } : {}),
    ...itemList,
  };
}

/**
 * schema.org `HowTo` for a page's ordered "how to use" steps, or `null` when
 * there are no non-blank steps (so the caller can skip an empty graph).
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
 * schema.org `SoftwareApplication` framing a landing page as a runnable tool.
 * No `offers` (Comfy Cloud is not free) and no `aggregateRating` (no rating
 * data exists) — never assert either.
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
