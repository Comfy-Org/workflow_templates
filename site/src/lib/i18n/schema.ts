/**
 * Shared shapes for the hub localization pipeline (GTM-291).
 *
 * Dependency-free so routes, the resolver, the builder, validators, CI, and
 * tests can all import it (mirrors `workflow-pages/schema.ts`). No `astro:*`,
 * no `fs`, no `import.meta.env`.
 */
import type { Locale } from '../../i18n/config';

export type { Locale };

/** The translatable content fields carried per workflow (from the Hub index). */
export const TRANSLATABLE_FIELDS = [
  'title',
  'description',
  'metaDescription',
  'extendedDescription',
  'howToUse',
  'suggestedUseCases',
  'faqItems',
] as const;

export type TranslatableField = (typeof TRANSLATABLE_FIELDS)[number];

export interface FaqItem {
  question: string;
  answer: string;
}

/** One workflow's translatable content, English or a localized version of it. */
export interface WorkflowContent {
  title: string;
  description: string;
  metaDescription: string;
  extendedDescription: string;
  howToUse: string[];
  suggestedUseCases: string[];
  faqItems: FaqItem[];
}

/**
 * Fields that must be genuinely translated (not English fallback) for a locale
 * page to be indexable. These are the fields that render in the page head/body
 * and feed its structured data (TechArticle title/description, FAQPage). A field
 * that English itself does not have is not required (see the predicate).
 */
export const REQUIRED_FOR_INDEX = [
  'title',
  'description',
  'metaDescription',
  'extendedDescription',
  'faqItems',
] as const satisfies readonly TranslatableField[];

export type RequiredField = (typeof REQUIRED_FOR_INDEX)[number];

/**
 * Where a resolved field's value came from, highest precedence first. Any source
 * other than `english` means the field is genuinely translated.
 */
export type FieldSource = 'override' | 'human' | 'machine' | 'english';

/**
 * Per-workflow English source hashes, committed in the manifest.
 * - `content` hashes all translatable fields together and is what a reviewer's
 *   sign-off binds to (a change de-approves the page).
 * - `fields` hashes each field individually so the builder re-translates only
 *   the fields whose English source changed.
 */
export interface WorkflowSourceHashes {
  content: string;
  fields: Partial<Record<TranslatableField, string>>;
}

/** shareId -> source hashes. Committed as content/manifest.json. */
export type TranslationManifest = Record<string, WorkflowSourceHashes>;

/**
 * A native reviewer's sign-off for one (shareId, locale), committed as
 * content/reviews/{locale}.json. `reviewedContentHash` must still equal the
 * manifest's current `content` hash for the sign-off to remain valid — that is
 * what makes an auto-translation PR (which changes the hash) silently drop the
 * page from the index until re-review. The LLM-judge never writes these.
 */
export interface ReviewRecord {
  reviewer: string;
  reviewedAt: string;
  reviewedContentHash: string;
  reviewedArtifactChecksum: string;
  approvedScope?: string;
}

/** shareId -> review record for one locale. */
export type LocaleReviews = Record<string, ReviewRecord>;

/**
 * The resolver's output for one (shareId, locale): the merged content ready to
 * render, where each field came from, and the single indexability decision the
 * route, sitemap, hreflang emitter, and CI all consume. `reason` is empty when
 * `indexable` is true, otherwise a short human-readable cause.
 */
export interface ResolvedWorkflow {
  data: WorkflowContent;
  provenance: Record<TranslatableField, FieldSource>;
  indexable: boolean;
  reason: string;
}

/** Input to the pure indexability predicate — no fs, fully testable. */
export interface IndexabilityInput {
  locale: Locale;
  provenance: Record<TranslatableField, FieldSource>;
  /** Whether English itself has a non-empty value for each field. */
  englishHas: Record<TranslatableField, boolean>;
  /** Current English content hash from the manifest. */
  currentContentHash: string;
  /** The locale's sign-off for this workflow, or null if unreviewed. */
  review: ReviewRecord | null;
  supportedLocales: readonly Locale[];
  indexableLocales: readonly Locale[];
}
