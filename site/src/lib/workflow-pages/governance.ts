/** Brand-safety denylist and indexability gating for SEO pages. */

const BRAND_SAFETY_DENY = [
  'face swap',
  'faceswap',
  'deepfake',
  'deep fake',
  'nsfw',
  'nude',
  'nudify',
  'undress',
  'clothes remover',
  'clothing remover',
  'outfit swap',
  'porn',
];

function checkBrandSafety(text: string): string[] {
  const haystack = text.toLowerCase();
  return BRAND_SAFETY_DENY.filter((term) => haystack.includes(term));
}

/** Throws on any denylist hit; call at build time so denied pages never ship. */
export function assertBrandSafe(fields: {
  slug: string;
  primaryKeyword: string;
  title: string;
}): void {
  const hits = [
    ...new Set([fields.slug, fields.primaryKeyword, fields.title].flatMap(checkBrandSafety)),
  ];
  if (hits.length > 0) {
    throw new Error(
      `Brand-safety violation on page "${fields.slug}": denied term(s) found in slug/keyword/title: ${hits.join(', ')}.`
    );
  }
}

export interface IndexabilityInput {
  clusterSize: number;
  humanEdited: boolean;
  qualityPassed: boolean;
}

/**
 * Indexable only when backed by real templates AND the copy is trustworthy —
 * every condition must hold, so a failed quality gate can never be overridden by
 * the `humanEdited` flag.
 */
export function isIndexable({
  clusterSize,
  humanEdited,
  qualityPassed,
}: IndexabilityInput): boolean {
  return clusterSize > 0 && humanEdited && qualityPassed;
}
