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

export function buildCollectionPageJsonLd(params: {
  name: string;
  description: string;
  url: string;
  inLanguage?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: params.name,
    description: params.description,
    url: params.url,
    ...(params.inLanguage ? { inLanguage: params.inLanguage } : {}),
  };
}



export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      ...(crumb.item ? { item: crumb.item } : {}),
    })),
  };
}
