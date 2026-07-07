/**
 * Shared content shape for the SEO-page engine — use-case and model pages differ
 * only in `styles` vs `modelSpec`. Dependency-free so routes, generator,
 * validator, and tests can all import it.
 */

/** Target keywords: `primary` head term, `secondary` cluster. */
export interface KeywordModel {
  primary: string;
  secondary: string[];
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
  subheading?: string;
  extendedDescription: string;
  styles?: SeoStyle[];
  modelSpec?: ModelSpec;
  howToUse: string[];
  capabilitiesIntro?: string;
  whyComfy?: WhyComfyReason[];
  applicationsIntro?: string;
  suggestedUseCases?: (string | Application)[];
  /** 150-160 chars; excluded from body word counts. */
  metaDescription: string;
  faqItems: FaqItem[];
  lastAIGeneration?: string;
}

/** Loaded SEO content: the shared schema plus the generator's quality flag. */
export type GeneratedSeoContent = SeoContent & {
  /** Set by the generator when content could not pass the quality contract. */
  qualityFailed?: boolean;
};

/** Target body-copy length tier for a keyword, by search intent. */
export type WordCountTier = 'long' | 'medium' | 'lean';

/** A model/provider badge overlaid on a card: logo asset + name for alt text. */
export interface CardBadge {
  src: string;
  name: string;
}

/** An SEO landing page (use-case or model) summarized as an index/rail card. */
export interface SeoPageCard {
  href: string;
  title: string;
  count: number;
  thumbnail: string | null;
  logos: CardBadge[];
}

/** Title-case a keyword for use inside a heading ("ai headshot" -> "AI Headshot"). */
export function titleCaseKeyword(text: string): string {
  return text.replace(/\b([a-z])/g, (_, c: string) => c.toUpperCase()).replace(/\bAi\b/g, 'AI');
}
