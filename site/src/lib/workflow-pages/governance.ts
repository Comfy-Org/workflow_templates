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

const DENY_PATTERNS = BRAND_SAFETY_DENY.map(
  (term) => new RegExp(`\\b${term.replace(/[\s-]+/g, '[\\s_-]+')}`, 'i')
);

function checkBrandSafety(text: string): string[] {
  return BRAND_SAFETY_DENY.filter((_, i) => DENY_PATTERNS[i].test(text));
}

/** Throws on any denylist hit; call at build time so denied pages never ship. */
export function assertBrandSafe(fields: {
  slug: string;
  primaryKeyword: string;
  title: string;
  secondaryKeywords?: string[];
}): void {
  const fieldsToCheck = [
    fields.slug,
    fields.primaryKeyword,
    fields.title,
    ...(fields.secondaryKeywords ?? []),
  ];
  const hits = [...new Set(fieldsToCheck.flatMap(checkBrandSafety))];
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
