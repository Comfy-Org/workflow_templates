/**
 * Shared content shape for the SEO-page engine — use-case and model pages differ
 * only in `styles` vs `modelSpec`. Dependency-free so routes, generator,
 * validator, and tests can all import it.
 */

/** Target keywords: `primary` head term, `secondary` cluster, `paaQuestions` seed FAQs. */
export interface KeywordModel {
  primary: string;
  secondary: string[];
  paaQuestions?: string[];
}

/** A "what you can create" capability card. */
export interface SeoStyle {
  title: string;
  description: string;
}

/** One "Why ComfyUI" reason row: a short title and a supporting sentence. */
export interface WhyComfyReason {
  title: string;
  description: string;
  /** Flags the row with an "Only on Comfy Cloud" badge. */
  cloudOnly?: boolean;
}

/** Factual "what is <model>" block; every claim must be exposed by our templates. */
export interface ModelSpec {
  summary: string;
  /** Titled facts (modalities, resolution, speed, license) — the About cards. */
  highlights: SeoStyle[];
}

/** One FAQ entry; drives both the accordion and the FAQPage JSON-LD. */
export interface FaqItem {
  question: string;
  answer: string;
}

/** One "what people use it for" card: a short header and a supporting line. */
export interface Application {
  title: string;
  subtitle: string;
}

/** Editorial content an SEO page renders; optional fields render only if present. */
export interface SeoContent {
  /** Hero subheading under the H1. */
  subheading?: string;
  /** Intro; paragraphs separated by blank lines. */
  extendedDescription: string;
  /** Capability cards (use-case pages). */
  styles?: SeoStyle[];
  /** "What is <model>" block (model pages). */
  modelSpec?: ModelSpec;
  howToUse: string[];
  /** Subheading for the "What you can create" capabilities section (use-case pages;
   *  model pages fall back to `modelSpec.summary`). */
  capabilitiesIntro?: string;
  /** "Why ComfyUI" reason rows (title + description). */
  whyComfy?: WhyComfyReason[];
  /** Subheading for the "What people use it for" section. */
  applicationsIntro?: string;
  /** "What people use it for" cards; strings are legacy, objects are preferred. */
  suggestedUseCases?: (string | Application)[];
  /** 150-160 chars; excluded from body word counts. */
  metaDescription: string;
  /** Drives FAQPage JSON-LD. */
  faqItems: FaqItem[];
  /** Set when generated rather than hand-authored. */
  lastAIGeneration?: string;
}

/** Loaded SEO content: the shared schema plus the generator's quality flag. */
export type GeneratedSeoContent = SeoContent & {
  /** Set by the generator when content could not pass the quality contract. */
  qualityFailed?: boolean;
};

/** Word-count band the validator enforces over rendered body copy. */
export interface WordCountBand {
  min: number;
  max: number;
}

/** Word-count tiers by keyword value (validated over body copy, excluding meta). */
export const WORD_COUNT_TIERS = {
  long: { min: 1100, max: 1700 },
  medium: { min: 850, max: 1300 },
  lean: { min: 650, max: 1050 },
} as const satisfies Record<string, WordCountBand>;

export type WordCountTier = keyof typeof WORD_COUNT_TIERS;

/** A model/provider badge overlaid on a card: logo asset + name for alt text. */
export interface CardBadge {
  src: string;
  name: string;
}

/** An SEO landing page (use-case or model) summarized as an index/rail card. */
export interface SeoPageCard {
  /** Absolute or root-relative href to the page. */
  href: string;
  /** Card heading (the page's H1). */
  title: string;
  /** Resolved grid size, shown as the workflow count. */
  count: number;
  /** Lead template's first thumbnail, or null for a placeholder. */
  thumbnail: string | null;
  /** Provider badges shown on the card, in order (may be empty). */
  logos: CardBadge[];
}

/** Title-case a keyword for use inside a heading ("ai headshot" -> "AI Headshot"). */
export function titleCaseKeyword(text: string): string {
  return text.replace(/\b([a-z])/g, (_, c: string) => c.toUpperCase()).replace(/\bAi\b/g, 'AI');
}
