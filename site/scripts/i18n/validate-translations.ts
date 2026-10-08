/**
 * validate-translations — the deterministic quality gate for the hub pipeline
 * (GTM-291). We own quality, not the model: every generated translation is
 * checked here, and CI fails on any violation for a supported locale.
 *
 * Run: `pnpm i18n:validate` (no OpenAI key).
 *
 * Per translated field it checks:
 *  - structure: arrays match the English length; FAQ items keep question+answer
 *  - language: the target script is present in longer prose fields, no English
 *    leakage (the title field is exempt: titles are often all proper nouns)
 *  - glossary: every preserve-term present in English still appears, untranslated
 *    (model/brand/node names are never translated away)
 *  - format: every URL in the English field survives unchanged
 *  - brand voice: no banned hype word is introduced
 *
 * The pure `collectViolations` is exported and unit-tested; `main()` only does IO.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { SUPPORTED_HUB_LOCALES } from '../../src/lib/i18n/locales';
import { enforceableOverrides, type GlossaryOverrides } from './glossary-overrides.cjs';
import {
  TRANSLATABLE_FIELDS,
  type FaqItem,
  type Locale,
  type TranslatableField,
  type WorkflowContent,
} from '../../src/lib/i18n/schema';

export interface Violation {
  shareId: string;
  locale: string;
  field: TranslatableField;
  kind: 'structure' | 'language' | 'glossary' | 'format' | 'brand-voice';
  detail: string;
}

// Target-script ranges. Latin-script locales rely on the leakage check instead.
const SCRIPT_RANGES: Partial<Record<Locale, RegExp>> = {
  zh: /[一-鿿]/,
  'zh-TW': /[一-鿿]/,
  ja: /[぀-ヿ一-鿿]/,
  ko: /[가-힯]/,
  ru: /[Ѐ-ӿ]/,
  ar: /[؀-ۿ]/,
};

// Banned hype words (English) that must never be introduced in any locale.
const BANNED_HYPE = [
  'stunning',
  'powerful',
  'seamless',
  'effortless',
  'unlock',
  'revolutionary',
  'game-changing',
  'cutting-edge',
  'unleash',
  'supercharge',
];

const LEAKAGE_MIN_LEN = 12; // below this, a mostly-Latin string can be legitimate

function toText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value
      .map((v) =>
        typeof v === 'string' ? v : v && typeof v === 'object' ? Object.values(v).join(' ') : ''
      )
      .join(' ');
  }
  return '';
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  return haystack.split(needle).length - 1;
}

function extractUrls(text: string): string[] {
  // Strip trailing sentence punctuation the greedy match swallows, so a URL
  // followed by a period in English but a full-width period in the translation
  // is not flagged as altered.
  return (text.match(/https?:\/\/[^\s"')]+/g) ?? []).map((u) => u.replace(/[.,;:!?)\]]+$/, ''));
}

/**
 * All violations for one workflow's translated fields. `english` is the source,
 * `localized` the (possibly partial) translation, `preserveTerms` the
 * do-not-translate list. Only fields present in `localized` are checked.
 */
export function collectViolations(
  shareId: string,
  locale: Locale,
  english: WorkflowContent,
  localized: Partial<WorkflowContent>,
  preserveTerms: string[],
  /** Curated English->localized product-UI terms that MUST be used (overrides). */
  overrides: Record<string, string> = {}
): Violation[] {
  const violations: Violation[] = [];
  const scriptRe = SCRIPT_RANGES[locale];
  const add = (field: TranslatableField, kind: Violation['kind'], detail: string) =>
    violations.push({ shareId, locale, field, kind, detail });

  for (const field of TRANSLATABLE_FIELDS) {
    if (!(field in localized) || localized[field] == null) continue;
    const enValue = english[field];
    const locValue = localized[field];
    const enText = toText(enValue);
    const locText = toText(locValue);

    // 1. Structure: the localized value must share English's container type first
    // (an array field emitted as a scalar/object would otherwise skip every check
    // below and be treated as translated content by the resolver). Then arrays
    // must match English length and carry well-formed elements.
    const enIsArray = Array.isArray(enValue);
    const locIsArray = Array.isArray(locValue);
    if (enIsArray !== locIsArray) {
      add(
        field,
        'structure',
        `container mismatch: expected ${enIsArray ? 'array' : 'string'}, got ${
          locIsArray ? 'array' : typeof locValue
        }`
      );
    } else if (enIsArray && locIsArray) {
      if (enValue.length !== locValue.length) {
        add(field, 'structure', `array length ${locValue.length} != English ${enValue.length}`);
      }
      if (field === 'faqItems') {
        for (const item of locValue) {
          if (
            !item ||
            typeof item !== 'object' ||
            Array.isArray(item) ||
            typeof (item as FaqItem).question !== 'string' ||
            typeof (item as FaqItem).answer !== 'string' ||
            !(item as FaqItem).question.trim() ||
            !(item as FaqItem).answer.trim()
          ) {
            add(
              field,
              'structure',
              'FAQ item malformed (need non-empty question + answer strings)'
            );
            break;
          }
        }
      } else if (locValue.some((el) => typeof el !== 'string')) {
        // howToUse / suggestedUseCases carry plain strings.
        add(field, 'structure', 'array element is not a string');
      }
    } else if (typeof enValue === 'string' && typeof locValue !== 'string') {
      // A string field (title/description/meta/extended) sent as a non-string.
      add(field, 'structure', `expected string, got ${typeof locValue}`);
    }

    // 2. Language: a long prose field must contain the target script. Title is
    // exempt — titles are often all proper nouns / identifiers that stay English.
    if (
      field !== 'title' &&
      scriptRe &&
      locText.replace(/\s/g, '').length >= LEAKAGE_MIN_LEN &&
      !scriptRe.test(locText)
    ) {
      add(field, 'language', 'no target-script characters (English leakage)');
    }
    // Latin locales: a long field identical to English is untranslated leakage.
    if (
      field !== 'title' &&
      !scriptRe &&
      locText.length >= LEAKAGE_MIN_LEN &&
      locText.trim() === enText.trim()
    ) {
      add(field, 'language', 'identical to English (untranslated)');
    }

    // 3. Glossary: a preserve-term in English must still appear (presence, not
    // exact count — natural translation may repeat it fewer times).
    for (const term of preserveTerms) {
      if (countOccurrences(enText, term) > 0 && countOccurrences(locText, term) === 0) {
        add(field, 'glossary', `preserve-term "${term}" translated away`);
      }
    }

    // 4. Format: every English URL survives unchanged.
    for (const url of extractUrls(enText)) {
      if (!locText.includes(url)) add(field, 'format', `URL "${url}" missing/altered`);
    }

    // 5. Brand voice: no banned hype word introduced.
    const lower = locText.toLowerCase();
    for (const hype of BANNED_HYPE) {
      if (lower.includes(hype) && !enText.toLowerCase().includes(hype)) {
        add(field, 'brand-voice', `banned hype word "${hype}" introduced`);
      }
    }

    // 6. Product-UI terminology: when the English contains a term with a curated
    // override, the translation must render exactly the paired term (so the
    // override layer is binding, not just advisory prompt guidance).
    for (const [enTerm, locTerm] of Object.entries(overrides)) {
      if (!locTerm) continue;
      if (countOccurrences(enText, enTerm) > 0 && !locText.includes(locTerm)) {
        add(field, 'glossary', `override term "${enTerm}" not rendered as "${locTerm}"`);
      }
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// UI chrome strings (src/i18n/locales/*.json) — validated separately from
// workflow content. These are flat "a.b.c" -> string maps filled by `locale:ui`,
// and several carry interpolation placeholders ({label}, {count}, {keyword}).
// A model can drop/rename one and still commit, breaking runtime interpolation,
// so we check value type + exact placeholder multiset against en.json. Missing
// keys are allowed (they render via the English fallback); present keys must match.
// ---------------------------------------------------------------------------

export interface UiViolation {
  locale: string;
  key: string;
  kind: 'type' | 'placeholder' | 'unknown-key';
  detail: string;
}

const PLACEHOLDER_RE = /\{[a-zA-Z0-9_]+\}/g;

/** Sorted multiset of `{token}` placeholders in a string (for exact comparison). */
function placeholderMultiset(value: string): string[] {
  return (value.match(PLACEHOLDER_RE) ?? []).sort();
}

/**
 * Violations for one locale's UI strings against English. For every key present
 * in the locale file: its value type must match English, and (for strings) its
 * placeholder multiset must match exactly. A key absent from English is flagged
 * (stale/hallucinated) since its interpolation contract cannot be checked.
 */
export function collectUiViolations(
  locale: string,
  enUi: Record<string, unknown>,
  localeUi: Record<string, unknown>
): UiViolation[] {
  const out: UiViolation[] = [];
  for (const [key, locVal] of Object.entries(localeUi)) {
    const enVal = enUi[key];
    if (enVal === undefined) {
      out.push({ locale, key, kind: 'unknown-key', detail: 'key not present in en.json' });
      continue;
    }
    if (typeof enVal !== typeof locVal) {
      out.push({
        locale,
        key,
        kind: 'type',
        detail: `type ${typeof locVal} != English ${typeof enVal}`,
      });
      continue;
    }
    if (typeof enVal === 'string' && typeof locVal === 'string') {
      const enPh = placeholderMultiset(enVal);
      const locPh = placeholderMultiset(locVal);
      if (enPh.join(' ') !== locPh.join(' ')) {
        out.push({
          locale,
          key,
          kind: 'placeholder',
          detail: `placeholders [${locPh.join(', ')}] != English [${enPh.join(', ')}]`,
        });
      }
    }
  }
  return out;
}

/**
 * True when a locale CONTENT file has entries but NONE align to the English
 * source (no shared shareId). The per-field checks skip any entry whose shareId
 * is absent from English, so a corrupt or misaligned machine file — e.g. a model
 * mangling fenced JSON into a wrong-shaped object, as Claude did in the Anthropic
 * trial — would otherwise pass with zero violations. An empty or absent file is
 * fine: nothing has been translated for that locale yet.
 */
export function localeContentMisaligned(
  localeContent: Record<string, unknown>,
  english: Record<string, unknown>
): boolean {
  const keys = Object.keys(localeContent);
  if (keys.length === 0) return false;
  return keys.every((shareId) => !(shareId in english));
}

// ---------------------------------------------------------------------------
// IO (main)
// ---------------------------------------------------------------------------

const CONTENT_DIR = path.join(process.cwd(), 'src', 'i18n', 'content');
const LOCALES_DIR = path.join(process.cwd(), 'src', 'i18n', 'locales');
const GLOSSARY_DIR = path.join(process.cwd(), 'i18n', 'glossary');

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function main(): void {
  const english = readJson<Record<string, WorkflowContent>>(path.join(CONTENT_DIR, 'en.json'), {});
  const preserveTerms = readJson<string[]>(path.join(GLOSSARY_DIR, 'preserve-terms.json'), []);

  const all: Violation[] = [];
  const fileErrors: string[] = [];
  for (const locale of SUPPORTED_HUB_LOCALES) {
    if (locale === 'en') continue;
    const localeContent = readJson<Record<string, Partial<WorkflowContent>>>(
      path.join(CONTENT_DIR, `${locale}.json`),
      {}
    );
    // Corrupt/misaligned file guard: entries present but none match English means
    // the per-field checks below would silently skip everything and pass.
    if (localeContentMisaligned(localeContent, english)) {
      fileErrors.push(
        `content/${locale}.json has ${Object.keys(localeContent).length} entries but none ` +
          `match the English source (corrupt or misaligned machine output)`
      );
    }
    // Curated per-locale terms that must be honored (the override layer's teeth).
    // Read through `enforceableOverrides` so a retraction (a `null`, which drops a
    // bad harvested pair) can never become a requirement to render the literal null.
    const overrides = enforceableOverrides(
      readJson<GlossaryOverrides>(path.join(GLOSSARY_DIR, 'overrides', `${locale}.json`), {})
    );
    for (const [shareId, localized] of Object.entries(localeContent)) {
      const en = english[shareId];
      if (!en) continue;
      all.push(...collectViolations(shareId, locale, en, localized, preserveTerms, overrides));
    }
  }

  // UI chrome strings: placeholder/type parity against en.json.
  const enUi = readJson<Record<string, unknown>>(path.join(LOCALES_DIR, 'en.json'), {});
  const uiAll: UiViolation[] = [];
  for (const locale of SUPPORTED_HUB_LOCALES) {
    if (locale === 'en') continue;
    const localeUi = readJson<Record<string, unknown>>(
      path.join(LOCALES_DIR, `${locale}.json`),
      {}
    );
    uiAll.push(...collectUiViolations(locale, enUi, localeUi));
  }

  if (all.length === 0 && uiAll.length === 0 && fileErrors.length === 0) {
    console.log('[i18n] validate: no violations.');
    return;
  }

  if (fileErrors.length > 0) {
    console.error(`[i18n] validate: ${fileErrors.length} locale file(s) misaligned:`);
    for (const err of fileErrors) console.error(`  ${err}`);
  }

  if (all.length > 0) {
    const byKind = all.reduce<Record<string, number>>((acc, v) => {
      acc[v.kind] = (acc[v.kind] ?? 0) + 1;
      return acc;
    }, {});
    console.error(`[i18n] validate: ${all.length} content violation(s):`, byKind);
    for (const v of all.slice(0, 50)) {
      console.error(`  [${v.locale}] ${v.shareId} ${v.field} (${v.kind}): ${v.detail}`);
    }
    if (all.length > 50) console.error(`  …and ${all.length - 50} more.`);
  }

  if (uiAll.length > 0) {
    const byKind = uiAll.reduce<Record<string, number>>((acc, v) => {
      acc[v.kind] = (acc[v.kind] ?? 0) + 1;
      return acc;
    }, {});
    console.error(`[i18n] validate: ${uiAll.length} UI-string violation(s):`, byKind);
    for (const v of uiAll.slice(0, 50)) {
      console.error(`  [${v.locale}] ${v.key} (${v.kind}): ${v.detail}`);
    }
    if (uiAll.length > 50) console.error(`  …and ${uiAll.length - 50} more.`);
  }

  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
