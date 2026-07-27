/**
 * validate-translations — the deterministic quality gate for the hub pipeline
 * (GTM-291). We own quality, not the model: every generated translation is
 * checked here, and CI fails on any violation for a supported locale.
 *
 * Run: `pnpm i18n:validate` (no OpenAI key).
 *
 * Per translated field it checks:
 *  - structure: arrays match the English length; FAQ items keep question+answer
 *  - language: the target script is present in longer fields (no English leakage)
 *  - glossary: every preserve-term still appears, untranslated, the same number
 *    of times as in English (model/brand/node names are never translated away)
 *  - format: every URL in the English field survives unchanged
 *  - brand voice: no banned hype word is introduced
 *
 * The pure `collectViolations` is exported and unit-tested; `main()` only does IO.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { SUPPORTED_HUB_LOCALES } from '../../src/lib/i18n/locales';
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
  return text.match(/https?:\/\/[^\s"')]+/g) ?? [];
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
  preserveTerms: string[]
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

    // 1. Structure: arrays must match English length; FAQ items well-formed.
    if (Array.isArray(enValue) && Array.isArray(locValue)) {
      if (enValue.length !== locValue.length) {
        add(field, 'structure', `array length ${locValue.length} != English ${enValue.length}`);
      }
      if (field === 'faqItems') {
        for (const item of locValue as FaqItem[]) {
          if (!item || !item.question?.trim() || !item.answer?.trim()) {
            add(field, 'structure', 'FAQ item missing question or answer');
            break;
          }
        }
      }
    }

    // 2. Language: a long translated field must contain the target script.
    if (
      scriptRe &&
      locText.replace(/\s/g, '').length >= LEAKAGE_MIN_LEN &&
      !scriptRe.test(locText)
    ) {
      add(field, 'language', 'no target-script characters (English leakage)');
    }
    // Latin locales: a long field identical to English is untranslated leakage.
    if (!scriptRe && locText.length >= LEAKAGE_MIN_LEN && locText.trim() === enText.trim()) {
      add(field, 'language', 'identical to English (untranslated)');
    }

    // 3. Glossary: every preserve-term survives, same count, untranslated.
    for (const term of preserveTerms) {
      const enCount = countOccurrences(enText, term);
      if (enCount > 0 && countOccurrences(locText, term) < enCount) {
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
  }

  return violations;
}

// ---------------------------------------------------------------------------
// IO (main)
// ---------------------------------------------------------------------------

const CONTENT_DIR = path.join(process.cwd(), 'src', 'i18n', 'content');
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
  for (const locale of SUPPORTED_HUB_LOCALES) {
    if (locale === 'en') continue;
    const localeContent = readJson<Record<string, Partial<WorkflowContent>>>(
      path.join(CONTENT_DIR, `${locale}.json`),
      {}
    );
    for (const [shareId, localized] of Object.entries(localeContent)) {
      const en = english[shareId];
      if (!en) continue;
      all.push(...collectViolations(shareId, locale, en, localized, preserveTerms));
    }
  }

  if (all.length === 0) {
    console.log('[i18n] validate: no violations.');
    return;
  }

  const byKind = all.reduce<Record<string, number>>((acc, v) => {
    acc[v.kind] = (acc[v.kind] ?? 0) + 1;
    return acc;
  }, {});
  console.error(`[i18n] validate: ${all.length} violation(s):`, byKind);
  for (const v of all.slice(0, 50)) {
    console.error(`  [${v.locale}] ${v.shareId} ${v.field} (${v.kind}): ${v.detail}`);
  }
  if (all.length > 50) console.error(`  …and ${all.length - 50} more.`);
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
