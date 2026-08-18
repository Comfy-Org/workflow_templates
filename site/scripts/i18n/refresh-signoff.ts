/**
 * refresh-signoff — keep a signed-off locale's review records current, at the
 * same bar the locale's launch used.
 *
 * A sign-off record binds a page to the exact bytes a reviewer approved: the
 * English content hash and the resolved-artifact checksum. That binding is the
 * drift protection, and three ordinary events break it with nobody watching:
 * a held page's missing translation arrives, a creator edits the English
 * source, or a pruned field gets retranslated. Each broken seal silently
 * de-indexes the page even when the new text is fine, so without maintenance
 * the indexable count only ever decays.
 *
 * This re-stamps a record only when the page currently meets the launch bar:
 * every required field genuinely translated, and no unresolved critical/major
 * AI finding on any field whose text is actually the machine translation (a
 * finding against machine text that an override supersedes is moot: the flagged
 * bytes are not the bytes served). Anything the reviewer flagged and nothing
 * has resolved stays held for a human, which is where the human gate has been
 * since the first wave.
 *
 * Two hard limits, both deliberate:
 *  - a locale with no existing records is never touched. The first wave of
 *    sign-offs is the native reviewer's alone; this only maintains a wave that
 *    a human already made.
 *  - output rides the nightly automation PR like every other generated file,
 *    so a person still approves the refreshed records before they reach main.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  resolveLocalizedWorkflow,
  hashResolvedArtifact,
  __resetResolverCache,
} from '../../src/lib/i18n/resolver';
import { SUPPORTED_HUB_LOCALES } from '../../src/lib/i18n/locales';
import { PRUNING_SEVERITIES, type FindingSeverity } from './review-translations';
import {
  REQUIRED_FOR_INDEX,
  TRANSLATABLE_FIELDS,
  type Locale,
  type LocaleReviews,
  type ReviewRecord,
  type TranslationManifest,
  type WorkflowContent,
} from '../../src/lib/i18n/schema';

interface Verdicts {
  entries?: Record<string, { findings?: { field?: string; severity?: string }[] }>;
}

export interface RefreshSummary {
  locale: Locale;
  upToDate: number;
  refreshed: string[];
  sealedNew: string[];
  refusedUntranslated: string[];
  refusedFindings: string[];
  droppedGone: string[];
}

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
  } catch {
    return null;
  }
}

function isNonEmpty(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return value != null;
}

/**
 * Refresh one locale's records in place. Pure apart from reading and writing
 * under `contentRoot`, so tests run it against a fixture tree.
 */
export function refreshSignoffRecords(
  locale: Locale,
  contentRoot: string,
  today: string = new Date().toISOString().slice(0, 10)
): RefreshSummary | null {
  const reviewsPath = path.join(contentRoot, 'reviews', `${locale}.json`);
  const reviews = readJson<LocaleReviews>(reviewsPath);
  // No first wave, nothing to maintain. Never bootstrap a locale here: granting
  // the first sign-off is the native reviewer's act, not the pipeline's.
  if (!reviews || Object.keys(reviews).length === 0) return null;

  const english =
    readJson<Record<string, WorkflowContent>>(path.join(contentRoot, 'content', 'en.json')) ?? {};
  const manifest = readJson<TranslationManifest>(path.join(contentRoot, 'manifest.json')) ?? {};
  const verdicts =
    readJson<Verdicts>(path.join(contentRoot, 'review', `${locale}.json`))?.entries ?? {};

  const summary: RefreshSummary = {
    locale,
    upToDate: 0,
    refreshed: [],
    sealedNew: [],
    refusedUntranslated: [],
    refusedFindings: [],
    droppedGone: [],
  };

  // The wave this refresh extends: the reviewer and scope of the existing
  // records, taken as the most common value of each. Captured BEFORE the
  // cleanup below, so the wave survives even if every workflow it originally
  // covered has since left the catalog — the wave happened either way, and a
  // new page sealed under it must not come out as reviewer "unknown".
  const mode = (values: string[]): string => {
    const counts = new Map<string, number>();
    for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
  };
  // A scope's human-authored part is everything before the first automated
  // marker; stripping it here is what keeps repeated refreshes from stacking
  // markers on markers.
  const baseScope = (scope: string | undefined): string =>
    (scope ?? '').split(/(?:^|;\s*)auto-(?:refresh|sealed)\b/)[0].trim();
  const records = Object.values(reviews);
  const waveReviewer = mode(records.map((r) => r.reviewer)) || 'unknown';
  const waveScope = mode(records.map((r) => baseScope(r.approvedScope)).filter(Boolean));
  const withWaveScope = (marker: string, base: string = waveScope): string =>
    base ? `${base}; ${marker}` : marker;

  // The catalog is what English carries. Records for workflows no longer in it
  // point at pages that no longer build, so they are dropped rather than kept
  // as the illusion of coverage.
  for (const sid of Object.keys(reviews)) {
    if (!english[sid]) {
      delete reviews[sid];
      summary.droppedGone.push(sid);
    }
  }

  for (const sid of Object.keys(english)) {
    // Resolve as if the locale were flipped: pre-flip, the predicate would stop
    // at "not flipped" and hide the state this refresh needs to see. The records
    // written here do not depend on flip status.
    const resolved = resolveLocalizedWorkflow(sid, locale, {
      contentRoot,
      indexableLocales: [locale],
    });
    const currentContentHash = manifest[sid]?.content ?? '';
    const currentChecksum = hashResolvedArtifact(resolved.data);
    const existing: ReviewRecord | undefined = reviews[sid];

    if (
      existing &&
      existing.reviewedContentHash === currentContentHash &&
      existing.reviewedArtifactChecksum === currentChecksum
    ) {
      summary.upToDate++;
      continue;
    }

    // Launch bar, part 1: every required field the English source has must be
    // genuinely translated. English fallback in one of them means the page
    // cannot index regardless of any record, so re-stamping now would only bind
    // the seal to bytes that are about to change again.
    const untranslated = REQUIRED_FOR_INDEX.filter(
      (field) => isNonEmpty(english[sid][field]) && resolved.provenance[field] === 'english'
    );
    if (untranslated.length > 0) {
      summary.refusedUntranslated.push(sid);
      continue;
    }

    // Launch bar, part 2: no unresolved critical/major finding on a field whose
    // served text is the machine translation. Enforce prunes such fields in the
    // same run, which the check above then catches as untranslated; this is the
    // backstop for any path where a flagged machine field is still being served.
    const blocking = (verdicts[sid]?.findings ?? []).some((f) => {
      if (!PRUNING_SEVERITIES.has(f.severity as FindingSeverity)) return false;
      const field = f.field as (typeof TRANSLATABLE_FIELDS)[number] | undefined;
      // A serious finding that names no field cannot be checked against
      // provenance, so it blocks: unattributable problems fail closed.
      if (!field || !TRANSLATABLE_FIELDS.includes(field)) return true;
      return resolved.provenance[field] === 'machine';
    });
    if (blocking) {
      summary.refusedFindings.push(sid);
      continue;
    }

    if (existing) {
      reviews[sid] = {
        ...existing,
        reviewedAt: today,
        reviewedContentHash: currentContentHash,
        reviewedArtifactChecksum: currentChecksum,
        automated: true,
        approvedScope: withWaveScope(
          `auto-refresh ${today}: content changed after sign-off, current text is AI-review clean`,
          baseScope(existing.approvedScope) || waveScope
        ),
      };
      summary.refreshed.push(sid);
    } else {
      reviews[sid] = {
        reviewer: waveReviewer,
        reviewedAt: today,
        reviewedContentHash: currentContentHash,
        reviewedArtifactChecksum: currentChecksum,
        automated: true,
        approvedScope: withWaveScope(
          `auto-sealed ${today}: published after the last wave, AI-review clean`
        ),
      };
      summary.sealedNew.push(sid);
    }
  }

  const ordered = Object.fromEntries(
    Object.entries(reviews).sort(([a], [b]) => a.localeCompare(b))
  );
  fs.writeFileSync(reviewsPath, JSON.stringify(ordered, null, 2) + '\n');
  return summary;
}

function main(): void {
  const contentRoot = path.join(process.cwd(), 'src', 'i18n');
  let touched = 0;
  for (const locale of SUPPORTED_HUB_LOCALES.filter((l) => l !== 'en')) {
    __resetResolverCache();
    const s = refreshSignoffRecords(locale, contentRoot);
    if (!s) continue;
    touched++;
    const list = (ids: string[]) =>
      ids.length <= 5 ? ids.join(', ') : `${ids.slice(0, 5).join(', ')} +${ids.length - 5} more`;
    console.log(
      `[i18n] signoff-refresh: [${s.locale}] ${s.upToDate} current, ` +
        `${s.refreshed.length} refreshed, ${s.sealedNew.length} newly sealed, ` +
        `${s.refusedUntranslated.length} held untranslated, ` +
        `${s.refusedFindings.length} held on findings, ${s.droppedGone.length} dropped`
    );
    if (s.refreshed.length > 0) console.log(`  refreshed: ${list(s.refreshed)}`);
    if (s.sealedNew.length > 0) console.log(`  newly sealed: ${list(s.sealedNew)}`);
    if (s.refusedFindings.length > 0) console.log(`  held on findings: ${list(s.refusedFindings)}`);
  }
  if (touched === 0) console.log('[i18n] signoff-refresh: no locale has a sign-off wave yet.');
}

const isDirectRun =
  process.argv[1] != null && path.resolve(process.argv[1]).endsWith('refresh-signoff.ts');
if (isDirectRun) main();
