import { buildSoftwareApplicationJsonLd } from '../structured-data';

/**
 * The entity node a localized model page emits.
 *
 * The English route also emits FAQPage and HowTo nodes, and a featureList on the
 * SoftwareApplication. All three are built from the model landing copy in
 * src/content/landing/models/, which exists **only in English**: there are no
 * per-locale variants of those files. Emitting them on a localized page would
 * put English questions and steps into structured data on a page that declares
 * inLanguage for its own locale, offering search engines an answer in a language
 * the reader did not ask for. That is worse than emitting nothing, so a localized
 * page carries the entity node alone.
 *
 * The name and description are safe because they come from buildModelPageMeta,
 * which resolves them through the UI dictionary for the page's locale.
 *
 * Returns an array so the caller renders one script per block, matching the
 * English route, and so adding a node later needs no change at the call site.
 */
export function buildLocalizedModelJsonLd(params: {
  h1: string;
  description: string;
  /** False when the page is too thin for its editorial copy to be trusted. */
  hasQualityContent: boolean;
}): object[] {
  if (!params.hasQualityContent) return [];
  return [
    buildSoftwareApplicationJsonLd({
      name: params.h1,
      description: params.description,
    }),
  ];
}
