/**
 * enforce-translations — the deterministic quality FLOOR for the hub pipeline.
 *
 * The model preserves brand names (and other invariants) only probabilistically,
 * so at 582-workflow scale a small tail of translated fields still drops a
 * preserve-term or otherwise fails a deterministic check — however the sentinel is
 * shaped. Rather than fail the whole run (discarding thousands of good fields) or
 * publish a field that dropped "ComfyUI", this prunes each violating field from the
 * machine locale file. A pruned field is simply ABSENT, and the rest of the system
 * already handles that safely:
 *   - the validator only checks fields present in the locale file, so it skips it, and
 *   - the resolver renders the English source for a missing field and marks that page
 *     non-indexable — already the gated behaviour for any English-fallback field.
 * Nothing incorrect is ever published; the dropped fields show English until a later
 * run (or a human review) fills them in. Runs after restore, before validate.
 *
 * The pipeline still fails loudly when pruning is SYSTEMIC (a whole locale mostly
 * failing points at a broken model/config, not a tail), guarded by the max-fraction
 * threshold. The pure `pruneViolatingFields` is exported and unit-tested; `main()`
 * only does IO and needs no OpenAI key.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { SUPPORTED_HUB_LOCALES } from '../../src/lib/i18n/locales';
import type { Locale, WorkflowContent } from '../../src/lib/i18n/schema';
import { collectViolations, type Violation } from './validate-translations';
import { loadReviewState, reviewViolations } from './review-translations';

const CONTENT_DIR = path.join(process.cwd(), 'src', 'i18n', 'content');
const GLOSSARY_DIR = path.join(process.cwd(), 'i18n', 'glossary');

/** A locale failing more than this fraction of its translated fields is systemic,
 *  not a tail — fail the build rather than silently English-fallback most of it. */
export const DEFAULT_MAX_PRUNE_FRACTION = 0.15;

/**
 * Read the systemic threshold from an env string, falling back to the default for
 * anything that is not a usable fraction.
 *
 * A bare `Number()` here fails silently in two opposite directions: an empty
 * variable becomes 0, so every prune counts as systemic and the build always
 * fails; a typo becomes NaN, and since every `>` comparison against NaN is false
 * the guard stops guarding without saying so. Both are worse than the default.
 */
export function parsePruneFraction(raw: string | undefined): number {
  if (raw == null || raw.trim() === '') return DEFAULT_MAX_PRUNE_FRACTION;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    // Loud: someone deliberately set this and it did not take effect.
    console.warn(
      `[i18n] enforce: ignoring invalid I18N_MAX_PRUNE_FRACTION=${JSON.stringify(raw)} ` +
        `(want a number between 0 and 1) — using ${DEFAULT_MAX_PRUNE_FRACTION}.`
    );
    return DEFAULT_MAX_PRUNE_FRACTION;
  }
  return parsed;
}

const MAX_PRUNE_FRACTION = parsePruneFraction(process.env.I18N_MAX_PRUNE_FRACTION);

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

export interface PruneResult {
  /** The locale content with every violating field removed. */
  content: Record<string, Partial<WorkflowContent>>;
  /** The violations that caused a prune, for the report. */
  pruned: Violation[];
  /** Distinct fields removed (a field with several violations counts once). */
  prunedFieldCount: number;
  /** Translated fields inspected (present + non-null), the threshold denominator. */
  fieldsInspected: number;
}

/**
 * Remove every field that fails a deterministic check from a locale's content, so
 * it falls back to English at render. Pure — reuses the validator's own
 * `collectViolations`, so what is pruned is exactly what would have failed.
 */
export function pruneViolatingFields(
  localeContent: Record<string, Partial<WorkflowContent>>,
  english: Record<string, WorkflowContent>,
  locale: Locale,
  preserveTerms: string[],
  overrides: Record<string, string>,
  /**
   * Extra violations from a non-deterministic source (the AI reviewer), merged in
   * so quality findings prune through this same path. Keeping one prune means a
   * field dropped for bad grammar behaves exactly like one dropped for a lost
   * brand name: English fallback, non-indexable page, one systemic threshold.
   */
  extraViolations: readonly Violation[] = []
): PruneResult {
  const pruned: Violation[] = [];
  let prunedFieldCount = 0;
  let fieldsInspected = 0;
  const content: Record<string, Partial<WorkflowContent>> = {};

  const extraByShareId = new Map<string, Violation[]>();
  for (const violation of extraViolations) {
    const list = extraByShareId.get(violation.shareId);
    if (list) list.push(violation);
    else extraByShareId.set(violation.shareId, [violation]);
  }

  for (const [shareId, localized] of Object.entries(localeContent)) {
    const en = english[shareId];
    // Entries with no English match are left untouched — the validator's
    // misalignment guard owns that case (pruning would just hide it).
    if (!en) {
      content[shareId] = localized;
      continue;
    }
    fieldsInspected += Object.values(localized).filter((v) => v != null).length;
    const violations = [
      ...collectViolations(shareId, locale, en, localized, preserveTerms, overrides),
      // Only findings about a field still present can prune; one about an
      // already-absent field would inflate the systemic ratio for a no-op.
      ...(extraByShareId.get(shareId) ?? []).filter((v) => localized[v.field] != null),
    ];
    if (violations.length === 0) {
      content[shareId] = localized;
      continue;
    }
    const badFields = new Set(violations.map((v) => v.field));
    const kept = { ...localized };
    for (const field of badFields) delete kept[field];
    content[shareId] = kept;
    prunedFieldCount += badFields.size;
    pruned.push(...violations);
  }

  return { content, pruned, prunedFieldCount, fieldsInspected };
}

/**
 * True when translation was attempted for locales but produced NOTHING for any of
 * them while English is populated — i.e. the model call failed wholesale (e.g. an
 * OpenAI 429 quota error), not a partial rate-limited run. Publishing then would
 * open an empty PR, so the run must fail instead. A run with any translated entry
 * (real partial progress) is allowed through.
 */
export function isEmptyTranslation(englishCount: number, targetEntryCounts: number[]): boolean {
  return (
    englishCount > 0 && targetEntryCounts.length > 0 && targetEntryCounts.every((n) => n === 0)
  );
}

function main(): void {
  const english = readJson<Record<string, WorkflowContent>>(path.join(CONTENT_DIR, 'en.json'), {});
  const preserveTerms = readJson<string[]>(path.join(GLOSSARY_DIR, 'preserve-terms.json'), []);

  // Fail fast on a wholesale translation failure: if every locale we tried to
  // translate this run came back empty (English is populated), the model call died
  // (e.g. OpenAI quota) and there is nothing to publish. Refuse to open an empty PR.
  const targets = (process.env.TRANSLATE_LOCALES ?? '').split(/\s+/).filter((l) => l && l !== 'en');
  const targetCounts = targets.map(
    (loc) =>
      Object.keys(readJson<Record<string, unknown>>(path.join(CONTENT_DIR, `${loc}.json`), {}))
        .length
  );
  if (isEmptyTranslation(Object.keys(english).length, targetCounts)) {
    console.error(
      `[i18n] enforce: translation produced 0 entries for every target locale ` +
        `(${targets.join(', ')}) while English has ${Object.keys(english).length} workflow(s). ` +
        `The translation step failed wholesale (e.g. OpenAI quota) — refusing to publish an empty PR.`
    );
    process.exit(1);
  }

  let totalPruned = 0;
  const systemic: string[] = [];

  for (const locale of SUPPORTED_HUB_LOCALES) {
    if (locale === 'en') continue;
    const file = path.join(CONTENT_DIR, `${locale}.json`);
    const localeContent = readJson<Record<string, Partial<WorkflowContent>>>(file, {});
    if (Object.keys(localeContent).length === 0) continue;
    const overrides = readJson<Record<string, string>>(
      path.join(GLOSSARY_DIR, 'overrides', `${locale}.json`),
      {}
    );

    // Quality findings from the AI reviewer prune through the same path. Absent
    // review state (reviewer not run, or no findings) contributes nothing, so the
    // deterministic floor keeps working exactly as before on its own.
    // Pass the current content so verdicts about text that has since been
    // re-translated are ignored rather than pruning a fresher translation.
    const reviewFindings = reviewViolations(
      locale,
      loadReviewState(locale),
      english,
      localeContent
    );

    const result = pruneViolatingFields(
      localeContent,
      english,
      locale,
      preserveTerms,
      overrides,
      reviewFindings
    );
    if (result.prunedFieldCount === 0) continue;

    fs.writeFileSync(file, JSON.stringify(result.content, null, 2) + '\n');
    totalPruned += result.prunedFieldCount;

    const byKind = result.pruned.reduce<Record<string, number>>((acc, v) => {
      acc[v.kind] = (acc[v.kind] ?? 0) + 1;
      return acc;
    }, {});
    const fraction = result.fieldsInspected ? result.prunedFieldCount / result.fieldsInspected : 0;
    console.log(
      `[i18n] enforce: [${locale}] pruned ${result.prunedFieldCount}/${result.fieldsInspected} ` +
        `field(s) (${(fraction * 100).toFixed(1)}%) -> English fallback.`,
      byKind
    );
    for (const v of result.pruned.slice(0, 20)) {
      console.log(`  [${locale}] ${v.shareId} ${v.field} (${v.kind}): ${v.detail}`);
    }
    if (result.pruned.length > 20) console.log(`  …and ${result.pruned.length - 20} more.`);

    if (fraction > MAX_PRUNE_FRACTION) {
      systemic.push(
        `${locale}: ${(fraction * 100).toFixed(1)}% of translated fields failed ` +
          `(> ${(MAX_PRUNE_FRACTION * 100).toFixed(0)}% threshold)`
      );
    }
  }

  if (totalPruned === 0) {
    console.log('[i18n] enforce: no violations to prune.');
    return;
  }
  console.log(`[i18n] enforce: pruned ${totalPruned} field(s) total across all locales.`);

  if (systemic.length > 0) {
    console.error(
      '[i18n] enforce: pruning is systemic, not a tail — failing the run instead of ' +
        'English-falling-back most of a locale:'
    );
    for (const s of systemic) console.error(`  ${s}`);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
