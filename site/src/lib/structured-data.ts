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
import { categoryPath, tagPath } from './routes';

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
  /** Overrides the auto-slugified `name` for this term's `@id` fragment (e.g. "gpu" for "Graphics Processing Unit"). */
  slug?: string;
}

/** A named group of related `EntityTerm`s (e.g. "Technology", "Audio & Video"). */
export interface EntityCategory {
  name: string;
  terms: EntityTerm[];
  /** Overrides the auto-slugified `name` for this category's `DefinedTermSet` `@id` fragment. */
  slug?: string;
}

/** Lowercase, hyphenated `@id`-fragment form of a name: strips parentheticals, collapses non-alphanumerics to `-`. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * A unique `@id` fragment for an entity node: an explicit `slug` wins, then a
 * slugified `name`, then a positional `fallback` — deduped against `used` (shared
 * across one page's whole graph) so two same-named terms don't collide.
 */
function entityFragment(
  prefix: 'e' | 'cat',
  term: { name?: string; slug?: string },
  fallback: string,
  used: Set<string>
): string {
  const slugPart = term.slug || (term.name ? slugify(term.name) : '');
  const base = slugPart ? `${prefix}-${slugPart}` : fallback;
  let candidate = base;
  let n = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${n++}`;
  }
  used.add(candidate);
  return candidate;
}

/** Entity coverage for a single workflow page: broad "about" concepts plus categorized mentions. */
export interface WorkflowEntities {
  /** Broad concepts the page is directly about (e.g. Video, Image). */
  about?: EntityTerm[];
  /** Narrower entities the page touches on, grouped into `DefinedTermSet`s. */
  categories?: EntityCategory[];
  /** Ungrouped entities cross-referenced via `mentions` only — no `DefinedTermSet`, unlike `categories`. */
  mentions?: EntityTerm[];
}

/**
 * Unified nested `@graph` JSON-LD for a single workflow detail page: `WebSite` →
 * `Organization` → `SoftwareApplication` (ComfyUI) → `WebPage` → the workflow itself
 * (`SoftwareApplication` + `TechArticle`), plus `DefinedTerm`/`DefinedTermSet` nodes
 * for `entities.categories` and standalone `entities.mentions` terms, and a
 * `BreadcrumbList`/`FAQPage` when supplied.
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
  /** `WebPage.headline` — defaults to `name` when omitted (e.g. pass the page's `<title>` to include a site suffix there without affecting the workflow node's own name/headline). */
  headline?: string;
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
  /** Category/tag listing pages this workflow belongs to, folded into the workflow node's `isRelatedTo`. */
  relatedLinks?: { name: string; url: string }[];
}) {
  const { about, categories, mentions } = params.entities || {};

  // Hoisted once so every node that cross-references another (e.g. `webpage.isPartOf`
  // pointing at `website`) reuses the exact same string — no risk of a hand-typed
  // template literal drifting from the `@id` it's supposed to match.
  const websiteId = `${SITE_ORIGIN}/#website`;
  const organizationId = `${SITE_ORIGIN}/#organization`;
  const comfyuiId = `${SITE_ORIGIN}/#comfyui`;
  const webpageId = `${params.url}#webpage`;

  const website = {
    '@type': 'WebSite',
    '@id': websiteId,
    name: 'Comfy',
    url: `${SITE_ORIGIN}/`,
    publisher: { '@id': organizationId },
    hasPart: [{ '@type': 'Blog', name: 'Comfy Blog', url: 'https://blog.comfy.org' }],
  };

  const organization = {
    '@type': 'Organization',
    '@id': organizationId,
    name: 'Comfy Org',
    url: `${SITE_ORIGIN}/`,
    sameAs: [
      'https://github.com/Comfy-Org',
      'https://discord.gg/comfyorg',
      'https://x.com/ComfyUI',
      'https://www.linkedin.com/company/comfyui',
      'https://www.instagram.com/comfyui',
      'https://www.youtube.com/@comfyorg',
    ],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'hello@comfy.org',
        url: 'https://support.comfy.org/',
      },
      { '@type': 'ContactPoint', contactType: 'press', email: 'press@comfy.org' },
    ],
  };

  const softwareApp = {
    '@type': 'SoftwareApplication',
    '@id': comfyuiId,
    name: 'ComfyUI',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Windows, macOS, Linux',
    sameAs: [
      'https://en.wikipedia.org/wiki/ComfyUI',
      'https://github.com/Comfy-Org/ComfyUI',
      `${SITE_ORIGIN}/`,
    ],
    softwareHelp: { '@type': 'CreativeWork', name: 'ComfyUI Docs', url: 'https://docs.comfy.org' },
  };

  const breadcrumbId = `${params.url}#breadcrumb`;
  const { '@context': _ctx, ...breadcrumb } = buildBreadcrumbJsonLd(params.breadcrumbItems);
  const breadcrumbList = { ...breadcrumb, '@id': breadcrumbId };

  const workflowId = `${params.url}#workflow`;

  // Shared across every entity/category node on this page so same-named terms
  // (or a name that collides with another's slug) still get distinct `@id`s.
  const usedFragments = new Set<string>();

  const termSets = (categories || []).map((category, ci) => {
    const setId = `${params.url}#${entityFragment('cat', category, `cat-${ci}`, usedFragments)}`;
    const terms = category.terms.map((term, ti) => {
      const id = `${params.url}#${entityFragment('e', term, `e-${ci}-${ti}`, usedFragments)}`;
      return {
        id,
        node: {
          '@type': 'DefinedTerm',
          '@id': id,
          name: term.name,
          ...(term.sameAs ? { sameAs: term.sameAs } : {}),
          inDefinedTermSet: { '@id': setId },
        },
      };
    });
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

  // `about` terms get their own `@id`s (unlike category terms, which are only
  // ever referenced through their DefinedTermSet) so the WebPage's `about` can
  // point at them alongside the workflow itself and each category set.
  const aboutTerms = (about || []).map((term, i) => {
    const id = `${params.url}#${entityFragment('e', term, `e-about-${i}`, usedFragments)}`;
    return {
      id,
      node: {
        '@type': 'DefinedTerm',
        '@id': id,
        name: term.name,
        ...(term.sameAs ? { sameAs: term.sameAs } : {}),
      },
    };
  });

  // Unlike `aboutTerms` and category terms, `mentionTerms` carry no `inDefinedTermSet` —
  // they're standalone entities cross-referenced only through the WebPage's `mentions`.
  const mentionTerms = (mentions || []).map((term, i) => {
    const id = `${params.url}#${entityFragment('e', term, `e-mention-${i}`, usedFragments)}`;
    return {
      id,
      node: {
        '@type': 'DefinedTerm',
        '@id': id,
        name: term.name,
        ...(term.sameAs ? { sameAs: term.sameAs } : {}),
      },
    };
  });

  const faqId = `${params.url}#faq`;

  const webpage = {
    '@type': 'WebPage',
    '@id': webpageId,
    url: params.url,
    headline: params.headline || params.name,
    isPartOf: { '@id': websiteId },
    publisher: { '@id': organizationId },
    ...(params.datePublished ? { datePublished: params.datePublished } : {}),
    ...(params.inLanguage ? { inLanguage: params.inLanguage } : {}),
    breadcrumb: { '@id': breadcrumbId },
    mainEntity: { '@id': workflowId },
    // Always anchored on the workflow node itself, even with no entity data, so
    // `about` doesn't silently vanish on the (currently common) pages the backend
    // hasn't enriched yet — only the entity-term refs are conditional.
    about: [
      { '@id': workflowId },
      ...aboutTerms.map((t) => ({ '@id': t.id })),
      ...termSets.map((set) => ({ '@id': set.id })),
    ],
    ...(mentionTerms.length || termSets.length
      ? {
          mentions: [
            ...mentionTerms.map((t) => ({ '@id': t.id })),
            ...termSets.flatMap((set) => set.terms.map((t) => ({ '@id': t.id }))),
          ],
        }
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
    creator: { '@id': organizationId },
    runtimePlatform: { '@id': comfyuiId },
    ...(params.relatedLinks?.length
      ? {
          isRelatedTo: params.relatedLinks.map((link) => ({
            '@type': 'WebPage',
            name: link.name,
            url: link.url,
          })),
        }
      : {}),
  };

  const faqPage = params.faqItems?.length
    ? {
        '@type': 'FAQPage',
        '@id': faqId,
        isPartOf: { '@id': webpageId },
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
      ...aboutTerms.map((t) => t.node),
      ...mentionTerms.map((t) => t.node),
      ...termSets.flatMap((set) => [set.node, ...set.terms.map((t) => t.node)]),
      ...(faqPage ? [faqPage] : []),
    ],
  };
}

/**
 * Builds the `buildWorkflowGraphJsonLd` params (`relatedLinks`, `keywords`,
 * `breadcrumbItems`, etc.) from a workflow detail page's own data — shared by the
 * default-locale and localized `/workflows/[slug]` routes so those fields can't
 * drift between the two the way hand-duplicated inline objects eventually would.
 */
export function buildWorkflowGraphParams(params: {
  data: {
    title: string;
    description: string;
    metaDescription: string;
    mediaType: string;
    tags: string[];
    models: string[];
    date: string;
    shareId: string;
    faqItems: FaqItem[];
    entities?: WorkflowEntities;
  };
  locale: Locale;
  /** The page's canonical URL — every graph node's `#fragment` is relative to this. */
  canonicalUrl: string;
  /** The page's full `<title>` text (already includes any site suffix) — becomes `WebPage.headline`. */
  pageTitle: string;
  image?: string;
}) {
  const { data, locale, canonicalUrl, pageTitle, image } = params;
  const workflowsLabel = t('breadcrumb.workflows', locale);

  // Category/tag listing pages this workflow belongs to, folded into the
  // workflow node's `isRelatedTo`.
  const relatedLinks = [
    {
      name: `${t(`category.${data.mediaType}`, locale)} ${workflowsLabel}`,
      url: absoluteUrl(localizeUrl(categoryPath(data.mediaType), locale)),
    },
    ...data.tags.map((tag) => ({
      name: `${tag} ${workflowsLabel}`,
      url: absoluteUrl(tagPath(tag, locale)),
    })),
  ];

  const keywords =
    [
      t(`category.${data.mediaType}`, locale),
      ...data.tags,
      ...data.models,
      t('workflow.keywordSuffix', locale),
    ]
      .filter(Boolean)
      .join(', ') || undefined;

  return {
    name: data.title,
    headline: pageTitle,
    description: data.metaDescription || data.description,
    url: canonicalUrl,
    image,
    identifier: data.shareId || undefined,
    datePublished: data.date || undefined,
    inLanguage: locale,
    keywords,
    breadcrumbItems: [
      { name: t('breadcrumb.home', locale), item: absoluteUrl('/') },
      { name: workflowsLabel, item: absoluteUrl(localizeUrl('/workflows/', locale)) },
      { name: data.title },
    ],
    entities: data.entities || {},
    faqItems: data.faqItems,
    relatedLinks,
  };
}
