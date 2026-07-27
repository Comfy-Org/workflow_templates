/**
 * The single per-page indexability predicate for hub localization (GTM-291).
 *
 * One decision, consumed by four surfaces so they can never disagree: sitemap
 * membership, which hreflang alternates a page emits, its canonical (self vs
 * English), and a fail-closed build assert. A page is indexable only when it is
 * translated, current, reviewed-at-this-version, and its language is supported +
 * flipped on. If the English source later changes, the content-hash term breaks
 * and the page drops out automatically until re-approved.
 *
 * Pure and fs-free so it is unit-testable and importable from `astro.config.mjs`.
 */
import { REQUIRED_FOR_INDEX, type IndexabilityInput, type RequiredField } from './schema';

export interface IndexabilityResult {
  indexable: boolean;
  /** Empty when indexable; otherwise a short cause (first failing reason). */
  reason: string;
}

/**
 * A required field counts as translated when English has nothing to translate
 * for it (englishHas === false) or the resolved value did not fall back to
 * English (provenance !== 'english').
 */
function fieldIsTranslated(input: IndexabilityInput, field: RequiredField): boolean {
  if (!input.englishHas[field]) return true;
  return input.provenance[field] !== 'english';
}

export function isLocalePageIndexable(input: IndexabilityInput): IndexabilityResult {
  // 1. Language must be deliberately supported and flipped on.
  if (!input.supportedLocales.includes(input.locale)) {
    return { indexable: false, reason: `locale ${input.locale} not supported` };
  }
  if (!input.indexableLocales.includes(input.locale)) {
    return { indexable: false, reason: `locale ${input.locale} not flipped indexable` };
  }

  // 2. Every required field must be genuinely translated (no English fallback).
  const untranslated = (REQUIRED_FOR_INDEX as readonly RequiredField[]).filter(
    (field) => !fieldIsTranslated(input, field)
  );
  if (untranslated.length > 0) {
    return { indexable: false, reason: `untranslated fields: ${untranslated.join(', ')}` };
  }

  // 3. A native reviewer must have signed off on this exact English version.
  if (!input.review) {
    return { indexable: false, reason: 'no review sign-off' };
  }
  if (input.review.reviewedContentHash !== input.currentContentHash) {
    return { indexable: false, reason: 'stale: English source changed since sign-off' };
  }

  return { indexable: true, reason: '' };
}
