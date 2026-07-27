/**
 * resolveLocalizedWorkflow — the one place that merges a workflow's translated
 * content and decides whether its locale page may be indexed (GTM-291).
 *
 * fs-based and `astro:*`-free (like `workflow-pages/landing-content.ts`) so the
 * route, the sitemap filter, the hreflang emitter, and the CI validator all
 * consume the SAME decision and cannot drift. It never returns a silent English
 * blend: any English-fallback in a required field makes the page non-indexable
 * with a `reason`, rather than quietly rendering half-English.
 *
 * Precedence per field: reviewer override → human seed → machine (lobe) →
 * English. These are separate committed files so lobe always translates the
 * complete English source (never a partially-seeded entry) and human/reviewer
 * work is never overwritten by a machine run. English is the last resort and
 * only valid for non-indexable pages.
 */
import fs from 'node:fs';
import path from 'node:path';
import { isLocalePageIndexable } from './predicate';
import { SUPPORTED_HUB_LOCALES, INDEXABLE_LOCALES } from './locales';
import {
  TRANSLATABLE_FIELDS,
  type FieldSource,
  type Locale,
  type LocaleReviews,
  type ResolvedWorkflow,
  type ReviewRecord,
  type TranslatableField,
  type TranslationManifest,
  type WorkflowContent,
} from './schema';

// Root of the committed translation artifacts. Layout:
//   content/en.json, content/{locale}.json   (lobe entry + machine output; this
//                                              dir holds ONLY locale files)
//   human/{locale}.json, overrides/{locale}.json, reviews/{locale}.json, manifest.json
const DEFAULT_CONTENT_ROOT = path.join(process.cwd(), 'src', 'i18n');

export interface ResolverOptions {
  /** Root of the committed translation artifacts. Overridable for tests. */
  contentRoot?: string;
  supportedLocales?: readonly Locale[];
  indexableLocales?: readonly Locale[];
}

// Caches for the per-locale shared files (manifest is global). Keyed by absolute
// path so different fixture roots never collide. Cleared in tests via reset().
const jsonCache = new Map<string, unknown>();

function readJson<T>(file: string): T | null {
  if (jsonCache.has(file)) return jsonCache.get(file) as T | null;
  let value: T | null = null;
  try {
    value = JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
  } catch {
    value = null; // missing or malformed — callers treat as absent
  }
  jsonCache.set(file, value);
  return value;
}

/** Clear the module cache (tests only). */
export function __resetResolverCache(): void {
  jsonCache.clear();
}

function isNonEmpty(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return value != null;
}

/** Empty English shell — used when a workflow has no source file at all. */
function emptyContent(): WorkflowContent {
  return {
    title: '',
    description: '',
    metaDescription: '',
    extendedDescription: '',
    howToUse: [],
    suggestedUseCases: [],
    faqItems: [],
  };
}

export function resolveLocalizedWorkflow(
  shareId: string,
  locale: Locale,
  options: ResolverOptions = {}
): ResolvedWorkflow {
  const root = options.contentRoot ?? DEFAULT_CONTENT_ROOT;
  const supportedLocales = options.supportedLocales ?? SUPPORTED_HUB_LOCALES;
  const indexableLocales = options.indexableLocales ?? INDEXABLE_LOCALES;

  // One committed file per locale per layer, keyed by shareId.
  const enFile =
    readJson<Record<string, WorkflowContent>>(path.join(root, 'content', 'en.json')) ?? {};
  const machineFile =
    readJson<Record<string, Partial<WorkflowContent>>>(
      path.join(root, 'content', `${locale}.json`)
    ) ?? {};
  const humanFile =
    readJson<Record<string, Partial<WorkflowContent>>>(
      path.join(root, 'human', `${locale}.json`)
    ) ?? {};
  const overrides =
    readJson<Record<string, Partial<WorkflowContent>>>(
      path.join(root, 'overrides', `${locale}.json`)
    ) ?? {};
  const manifest = readJson<TranslationManifest>(path.join(root, 'manifest.json')) ?? {};
  const reviews = readJson<LocaleReviews>(path.join(root, 'reviews', `${locale}.json`)) ?? {};

  const english = enFile[shareId] ?? emptyContent();
  const machine = machineFile[shareId] ?? {};
  const human = humanFile[shareId] ?? {};
  const override = overrides[shareId] ?? {};

  const data = emptyContent();
  // Field types differ (string vs string[] vs FaqItem[]); write through a record
  // view so the per-field copy stays generic while `data` keeps its typed shape.
  const dataRecord = data as Record<TranslatableField, unknown>;
  const provenance = {} as Record<TranslatableField, FieldSource>;
  const englishHas = {} as Record<TranslatableField, boolean>;

  for (const field of TRANSLATABLE_FIELDS) {
    const enValue = english[field];
    englishHas[field] = isNonEmpty(enValue);

    if (isNonEmpty(override[field])) {
      dataRecord[field] = override[field];
      provenance[field] = 'override';
    } else if (isNonEmpty(human[field])) {
      dataRecord[field] = human[field];
      provenance[field] = 'human';
    } else if (isNonEmpty(machine[field])) {
      dataRecord[field] = machine[field];
      provenance[field] = 'machine';
    } else {
      dataRecord[field] = enValue;
      provenance[field] = 'english';
    }
  }

  const review: ReviewRecord | null = reviews[shareId] ?? null;
  const currentContentHash = manifest[shareId]?.content ?? '';

  const { indexable, reason } = isLocalePageIndexable({
    locale,
    provenance,
    englishHas,
    currentContentHash,
    review,
    supportedLocales,
    indexableLocales,
  });

  return { data, provenance, indexable, reason };
}
