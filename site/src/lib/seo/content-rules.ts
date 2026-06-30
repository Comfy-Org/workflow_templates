/**
 * Quality rule engine for SEO-page content: `validateSeoContent` runs the rules
 * a page must pass before it can be indexed. Pure and dependency-free; the same
 * checks run in the generator's retry loop, the CLI gate, and the unit tests.
 */
import type { KeywordModel, SeoContent, WordCountBand } from './schema';

export interface QualityFailure {
  code: string;
  message: string;
}

export interface QualityResult {
  ok: boolean;
  failures: QualityFailure[];
  metrics: {
    bodyWordCount: number;
    primaryKeywordCount: number;
    primaryKeywordDensity: number;
    faqCount: number;
    emDashCount: number;
    maxSiblingSimilarity: number;
  };
}

export interface QualityContext {
  keywords: KeywordModel;
  wordCount: WordCountBand;
  clusterModels: string[];
  /** Sibling `extendedDescription`s, for the cross-page uniqueness check. */
  siblingIntros?: string[];
}

const DENSITY_STUFFING = 0.025;
const EM_DASH_CAP = 3;
/** Only flag length past this multiple of the tier max (genuine depth above tier is fine). */
const WORD_COUNT_OVERFLOW_FACTOR = 1.6;
const SIMILARITY_CEILING = 0.3;
const SHINGLE_SIZE = 5;
const MIN_FAQ = 6;
/** Hard pass range in chars; 150-160 is ideal. */
const META_MIN_CHARS = 120;
const META_MAX_CHARS = 165;
const FAQ_OPENERS = ['how', 'what', 'can', 'why', 'is', 'are', 'does', 'do', 'will'];

const BANNED_PHRASES = [
  'brings your visions to life',
  'unprecedented',
  'unparalleled',
  'seamless',
  'seamlessly',
  'empower',
  'cutting-edge',
  'revolutionary',
  'groundbreaking',
  'game-changing',
  'unlock the potential',
  'unlock the power',
  'the power of',
  'to the next level',
  'dive into',
  "in today's world",
  'in the world of',
  'when it comes to',
  'look no further',
];

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  const escaped = needle.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (haystack.toLowerCase().match(new RegExp(escaped, 'g')) ?? []).length;
}

/** Jaccard similarity over word shingles; robust to small edits. */
export function shingleSimilarity(a: string, b: string, size = SHINGLE_SIZE): number {
  const shingles = (text: string): Set<string> => {
    const w = words(text);
    const set = new Set<string>();
    for (let i = 0; i + size <= w.length; i++) set.add(w.slice(i, i + size).join(' '));
    return set;
  };
  const sa = shingles(a);
  const sb = shingles(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let intersection = 0;
  for (const s of sa) if (sb.has(s)) intersection++;
  const union = sa.size + sb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function collectBody(content: SeoContent): string {
  const parts: string[] = [content.extendedDescription];
  content.styles?.forEach((s) => parts.push(s.title, s.description));
  if (content.modelSpec) parts.push(content.modelSpec.summary, ...content.modelSpec.highlights);
  parts.push(...content.howToUse);
  content.whyComfy?.forEach((r) => parts.push(r.title, r.description));
  content.suggestedUseCases?.forEach((u) =>
    typeof u === 'string' ? parts.push(u) : parts.push(u.title, u.subtitle)
  );
  content.faqItems.forEach((f) => parts.push(f.question, f.answer));
  return parts.join('\n\n');
}

function countSentences(text: string): number {
  return text.split(/[.!?]+(?:\s|$)/).filter((s) => s.trim().length > 0).length;
}

export function validateSeoContent(content: SeoContent, ctx: QualityContext): QualityResult {
  const failures: QualityFailure[] = [];
  const fail = (code: string, message: string) => failures.push({ code, message });

  const body = collectBody(content);
  const bodyWordCount = words(body).length;
  const primary = ctx.keywords.primary.toLowerCase();
  const primaryKeywordCount = countOccurrences(body, primary);
  const primaryKeywordDensity =
    bodyWordCount === 0 ? 0 : (primaryKeywordCount * words(primary).length) / bodyWordCount;
  const emDashCount = (content.extendedDescription.match(/—/g) ?? []).length;
  const faqCount = content.faqItems.length;
  const maxSiblingSimilarity = (ctx.siblingIntros ?? []).reduce(
    (max, sib) => Math.max(max, shingleSimilarity(content.extendedDescription, sib)),
    0
  );

  if (!content.extendedDescription?.trim()) fail('missing-intro', 'extendedDescription is empty.');
  if (!content.howToUse?.length) fail('missing-howto', 'howToUse must have at least one step.');
  if (!content.metaDescription?.trim()) fail('missing-meta', 'metaDescription is empty.');

  if (bodyWordCount < ctx.wordCount.min)
    fail(
      'word-count-low',
      `Body is ${bodyWordCount} words; reach at least ${ctx.wordCount.min} by adding genuine detail to the intro, steps, or FAQ.`
    );
  if (bodyWordCount > ctx.wordCount.max * WORD_COUNT_OVERFLOW_FACTOR)
    fail(
      'word-count-excessive',
      `Body is ${bodyWordCount} words, well beyond the ~${ctx.wordCount.max}-word target; tighten only if it rambles or repeats.`
    );

  const metaLen = content.metaDescription.trim().length;
  if (metaLen < META_MIN_CHARS || metaLen > META_MAX_CHARS)
    fail(
      'meta-length',
      `metaDescription is ${metaLen} chars; keep it ${META_MIN_CHARS}-${META_MAX_CHARS} (ideal 150-160).`
    );

  if (primaryKeywordCount === 0)
    fail('keyword-absent', `Use the primary keyword "${ctx.keywords.primary}" in the body.`);
  const firstTwoSentences = content.extendedDescription
    .split(/(?<=[.!?])\s+/)
    .slice(0, 2)
    .join(' ');
  if (primaryKeywordCount > 0 && countOccurrences(firstTwoSentences, primary) === 0)
    fail(
      'keyword-not-early',
      `Put the primary keyword "${ctx.keywords.primary}" in the first sentence or two.`
    );
  if (faqCount > 0 && !content.faqItems.some((f) => countOccurrences(f.question, primary) > 0))
    fail('keyword-not-in-faq', 'Use the primary keyword in at least one FAQ question.');
  if (primaryKeywordDensity > DENSITY_STUFFING)
    fail(
      'keyword-stuffed',
      `Primary keyword density is ${(primaryKeywordDensity * 100).toFixed(1)}%; keep under 2.5% and use synonyms.`
    );

  const secondary = ctx.keywords.secondary ?? [];
  if (secondary.length > 0) {
    const used = secondary.filter((kw) => countOccurrences(body, kw) > 0).length;
    if (used / secondary.length < 0.5)
      fail(
        'secondary-coverage',
        `Only ${used}/${secondary.length} secondary keywords used; cover at least half naturally.`
      );
  }

  if (faqCount < MIN_FAQ)
    fail('faq-count', `Only ${faqCount} FAQ items; provide at least ${MIN_FAQ}.`);
  content.faqItems.forEach((f, i) => {
    const opener = words(f.question)[0];
    if (opener && !FAQ_OPENERS.includes(opener))
      fail('faq-not-question', `FAQ ${i + 1} should start with How/What/Can/Why/Is.`);
    if (countSentences(f.answer) < 2)
      fail('faq-thin-answer', `FAQ ${i + 1} answer needs 2-4 explanatory sentences, not yes/no.`);
  });

  const lowerBody = body.toLowerCase();
  for (const phrase of BANNED_PHRASES)
    if (lowerBody.includes(phrase)) fail('banned-phrase', `Remove filler phrase "${phrase}".`);

  if (emDashCount > EM_DASH_CAP)
    fail(
      'em-dash-overuse',
      `${emDashCount} em-dashes in the intro; cap ${EM_DASH_CAP}. Prefer commas and periods.`
    );

  if (maxSiblingSimilarity > SIMILARITY_CEILING)
    fail(
      'duplicate-skeleton',
      `Intro is ${(maxSiblingSimilarity * 100).toFixed(0)}% similar to another page; rewrite to be distinct.`
    );

  return {
    ok: failures.length === 0,
    failures,
    metrics: {
      bodyWordCount,
      primaryKeywordCount,
      primaryKeywordDensity,
      faqCount,
      emDashCount,
      maxSiblingSimilarity,
    },
  };
}
