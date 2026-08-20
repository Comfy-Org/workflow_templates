/**
 * review-translations — the JUDGEMENT layer for the hub pipeline.
 *
 * The deterministic validator answers "did the machine break a rule we wrote
 * down". It cannot answer "is this good Korean", and that second question is what
 * native reviewers actually flagged: preserve-terms nobody had listed yet, text
 * that says something the English does not, low fluency, and translations that
 * read wrong for where they sit on the page. None of those are expressible as a
 * regex, so they need a model that reads both languages.
 *
 * Findings are graded with an MQM-style taxonomy (category + severity + the
 * offending span) rather than a 1-10 score, because a score is neither reviewable
 * nor actionable — you cannot prune "6/10", but you can prune "this field claims
 * Flux when the English says Wan2.5".
 *
 * Critical/major findings become `Violation`s and flow into the EXISTING prune in
 * enforce-translations: the field is dropped, the resolver renders English, and
 * the page stays non-indexable. So a bad translation can never reach a reader, and
 * this file adds no new gating concept of its own.
 *
 * Everything above `main()` is pure and unit-tested. The Anthropic SDK is imported
 * dynamically inside `main()` so the pure logic (and its tests) need neither the
 * dependency nor an API key.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { SUPPORTED_HUB_LOCALES } from '../../src/lib/i18n/locales';
import { TRANSLATABLE_FIELDS } from '../../src/lib/i18n/schema';
import type { Locale, TranslatableField, WorkflowContent } from '../../src/lib/i18n/schema';
import type { Violation } from './validate-translations';

const CONTENT_DIR = path.join(process.cwd(), 'src', 'i18n', 'content');
const GLOSSARY_DIR = path.join(process.cwd(), 'i18n', 'glossary');
const REVIEW_DIR = path.join(process.cwd(), 'src', 'i18n', 'review');

/**
 * Bumping this invalidates every stored verdict, forcing a full re-review. It is a
 * deliberate, costly action: change it only when the rubric itself changes, since
 * verdicts produced under an older rubric are no longer comparable.
 */
export const PROMPT_VERSION = 1;

/**
 * Reviewer model. Opus 5 rather than a Sonnet tier because this is a judgement
 * task in ten languages, which is where the reported weakness is (ar/tr/ko
 * fluency), and a false verdict here removes a field from a real page.
 *
 * Note for anyone tuning `max_tokens` below: thinking is on by default on this
 * model and its tokens come out of the same budget as the findings. That is the
 * exact failure that made an earlier run report clean on the entries with the
 * most to say, so change the two together and check `stop_reason` afterwards.
 */
export const DEFAULT_REVIEW_MODEL = 'claude-opus-5';

/**
 * Resolve the reviewer model from its env override, treating blank as unset.
 *
 * The workflow passes this through from a repository variable. GitHub renders an
 * unset `vars.X` as an empty string rather than omitting the variable, so `??`
 * accepts `''` as a deliberate choice and every request then fails with
 * `model: String should have at least 1 character`. Because the review step is
 * continue-on-error, that failure does not stop the pipeline: it reports every
 * entry as unreviewable and the run still reports success, so a whole locale can
 * come back with nothing reviewed and nothing obviously wrong.
 *
 * `||` rather than `??` for exactly that reason, and trimmed so a variable set to
 * whitespace behaves the same as one that was never set. This matches how the
 * translator's own model knob already reads `HUB_I18N_MODEL` in `.i18nrc.cjs`.
 */
export function resolveReviewModel(raw: string | undefined): string {
  return raw?.trim() || DEFAULT_REVIEW_MODEL;
}

const MODEL = resolveReviewModel(process.env.I18N_REVIEW_MODEL);

/**
 * Read a positive integer from an env string, falling back when it is not one.
 *
 * A bare `Number()` here fails silently and dangerously. `NaN` for the entry
 * ceiling makes `totalReviewed > NaN` false forever, so the cost guard stops
 * guarding. `NaN` (or 0) for concurrency is worse: the pool builds zero runners,
 * every locale finishes with no calls made and no failures recorded, and the
 * state file is written as though the locale had been reviewed and found clean.
 */
export function parsePositiveInt(raw: string | undefined, fallback: number, name: string): number {
  if (raw == null || raw.trim() === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
    console.warn(
      `[i18n] review: ignoring invalid ${name}=${JSON.stringify(raw)} ` +
        `(want a positive integer) — using ${fallback}.`
    );
    return fallback;
  }
  return parsed;
}

/** Ceiling so a runaway loop fails loudly instead of quietly running up a bill. */
const MAX_ENTRIES_PER_RUN = parsePositiveInt(
  process.env.I18N_REVIEW_MAX_ENTRIES,
  2000,
  'I18N_REVIEW_MAX_ENTRIES'
);

/** Concurrent in-flight requests. Low enough to stay under standard rate limits. */
const CONCURRENCY = parsePositiveInt(
  process.env.I18N_REVIEW_CONCURRENCY,
  4,
  'I18N_REVIEW_CONCURRENCY'
);

export type FindingCategory = 'terminology' | 'accuracy' | 'fluency' | 'context';
export type FindingSeverity = 'critical' | 'major' | 'minor';

export interface Finding {
  field: TranslatableField;
  category: FindingCategory;
  severity: FindingSeverity;
  /** The offending text, copied verbatim from the translation. */
  span: string;
  /** The corrected text the reviewer proposes. */
  suggestion: string;
  /** One sentence, in English, so a non-speaker can triage without the language. */
  reason: string;
}

export interface EntryVerdict {
  /** Hash of (english, target, promptVersion) — the incremental-review key. */
  hash: string;
  findings: Finding[];
}

export interface ReviewState {
  promptVersion: number;
  entries: Record<string, EntryVerdict>;
}

const CATEGORIES: readonly FindingCategory[] = ['terminology', 'accuracy', 'fluency', 'context'];
const SEVERITIES: readonly FindingSeverity[] = ['critical', 'major', 'minor'];

/** Severities that cost a field its translation. `minor` is recorded for the report
 *  but never prunes — pruning a whole field over a comma would be worse than the nit. */
export const PRUNING_SEVERITIES: ReadonlySet<FindingSeverity> = new Set<FindingSeverity>([
  'critical',
  'major',
]);

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

/**
 * Identity of a review. Covers the English source AND the translation AND the
 * rubric, so an entry is re-reviewed when any of the three moves and skipped when
 * none of them has — which is what keeps the nightly run to a handful of calls.
 */
export function entryHash(
  english: WorkflowContent,
  target: Partial<WorkflowContent>,
  promptVersion: number = PROMPT_VERSION
): string {
  return createHash('sha256')
    .update(JSON.stringify({ english, target, promptVersion }))
    .digest('hex')
    .slice(0, 32);
}

/**
 * The entries whose verdict is missing or stale. Everything else already has a
 * verdict for this exact (source, translation, rubric) triple and is reused as-is.
 */
export function selectEntriesForReview(
  localeContent: Record<string, Partial<WorkflowContent>>,
  english: Record<string, WorkflowContent>,
  state: ReviewState
): string[] {
  const stale: string[] = [];
  for (const [shareId, target] of Object.entries(localeContent)) {
    const en = english[shareId];
    // No English counterpart: the validator's misalignment guard owns this case.
    // Reviewing it would burn a call to restate a problem already reported.
    if (!en) continue;
    const prior = state.entries[shareId];
    if (!prior || prior.hash !== entryHash(en, target)) stale.push(shareId);
  }
  return stale;
}

/**
 * Drop verdicts for entries that no longer exist, so the state file cannot grow
 * without bound as workflows are archived.
 */
export function pruneOrphanedVerdicts(
  state: ReviewState,
  localeContent: Record<string, Partial<WorkflowContent>>
): ReviewState {
  const live = new Set(Object.keys(localeContent));
  const entries: Record<string, EntryVerdict> = {};
  for (const [shareId, verdict] of Object.entries(state.entries)) {
    if (live.has(shareId)) entries[shareId] = verdict;
  }
  return { promptVersion: state.promptVersion, entries };
}

/** JSON schema the model's answer is constrained to. Structured output means the
 *  answer is machine-usable by construction, with no prose parsing to get wrong. */
export const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          field: { type: 'string', enum: [...TRANSLATABLE_FIELDS] },
          category: { type: 'string', enum: [...CATEGORIES] },
          severity: { type: 'string', enum: [...SEVERITIES] },
          span: { type: 'string' },
          suggestion: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['field', 'category', 'severity', 'span', 'suggestion', 'reason'],
        additionalProperties: false,
      },
    },
  },
  required: ['findings'],
  additionalProperties: false,
} as const;

/**
 * The rubric. Stable across every entry in a locale, so it is sent once as a cached
 * system prompt and read back at a tenth of the price on each of the ~600 calls.
 */
export function buildSystemPrompt(
  locale: Locale,
  preserveTerms: string[],
  terminology: Record<string, string>
): string {
  const termLines = Object.entries(terminology)
    .map(([en, loc]) => `- ${en} → ${loc}`)
    .join('\n');

  return `You are a professional translation reviewer for Comfy Workflows (comfy.org/workflows), a catalog of ComfyUI workflow templates. You review English → ${locale} translations of SEO page content.

Report ONLY real defects. An acceptable translation with different word choice than you would have picked is NOT a defect — do not invent findings to look thorough. Returning an empty findings array is the correct answer for a good translation.

Judge each entry as a whole page: the title, description, and FAQ are read together, so a term rendered one way in the title and another way in the description is a defect even when each is defensible alone.

Categories:
- terminology: a proper noun that must stay English was translated or altered, or a product-UI term does not match the required translation below.
- accuracy: the translation states something the English does not, omits something it does, or contradicts it (wrong model name, wrong number, wrong capability).
- fluency: grammar, orthography, or phrasing a native speaker would not write. Includes mixing Simplified and Traditional Chinese.
- context: technically correct but wrong for where it appears — a UI label translated as a sentence, a title translated as prose, or wording inconsistent with the rest of the entry.

Severity:
- critical: changes meaning, or would embarrass us publicly. Wrong model/product name, reversed meaning, broken script.
- major: clearly wrong to a native speaker and would need fixing before publication.
- minor: a nit. Style or preference. Correct but improvable.

These proper nouns must appear EXACTLY as in English, never translated or transliterated:
${preserveTerms.join(', ')}

${termLines ? `These product-UI terms must use exactly this translation, so the hub matches the ComfyUI app:\n${termLines}` : ''}

For every finding, "span" must be copied verbatim from the translation so it can be located, and "reason" must be in English so a reviewer who does not read ${locale} can triage it.`;
}

/** The per-entry message: English source beside the translation, fields aligned. */
export function buildUserPrompt(
  shareId: string,
  english: WorkflowContent,
  target: Partial<WorkflowContent>
): string {
  const lines: string[] = [`Workflow: ${shareId}`, ''];
  for (const field of TRANSLATABLE_FIELDS) {
    const en = english[field];
    const tr = target[field];
    // A field absent from the translation is already English-fallback; there is
    // nothing to review and flagging it would duplicate the resolver's own signal.
    if (en == null || tr == null) continue;
    lines.push(`## ${field}`);
    lines.push(`EN: ${JSON.stringify(en)}`);
    lines.push(`TRANSLATION: ${JSON.stringify(tr)}`);
    lines.push('');
  }
  return lines.join('\n');
}

/**
 * Keep only well-formed findings that point at a field actually present in the
 * translation. A model that hallucinates a field or an unknown severity must not be
 * able to prune real content, so anything unrecognised is dropped rather than trusted.
 */
export function sanitizeFindings(list: readonly unknown[]): Finding[] {
  const out: Finding[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const f = item as Record<string, unknown>;
    const field = f.field as TranslatableField;
    if (!TRANSLATABLE_FIELDS.includes(field)) continue;
    if (!CATEGORIES.includes(f.category as FindingCategory)) continue;
    if (!SEVERITIES.includes(f.severity as FindingSeverity)) continue;
    out.push({
      field,
      category: f.category as FindingCategory,
      severity: f.severity as FindingSeverity,
      span: typeof f.span === 'string' ? f.span : '',
      suggestion: typeof f.suggestion === 'string' ? f.suggestion : '',
      reason: typeof f.reason === 'string' ? f.reason : '',
    });
  }
  return out;
}

export function parseFindings(raw: unknown, target: Partial<WorkflowContent>): Finding[] {
  const list = (raw as { findings?: unknown })?.findings;
  if (!Array.isArray(list)) return [];
  // Drop findings about a field absent from the translation: that field already
  // renders English, so pruning it is a no-op that only inflates the systemic ratio.
  return sanitizeFindings(list).filter((f) => target[f.field] != null);
}

/**
 * Convert stored verdicts into the validator's own `Violation` shape so the
 * existing prune consumes them unchanged. Only pruning severities cross over —
 * minors stay in the report where a human can weigh them.
 */
export function reviewViolations(
  locale: Locale,
  state: ReviewState,
  /**
   * Current content, required. A verdict describes one exact (source, translation)
   * pair, so one whose hash no longer matches is about text that has since been
   * replaced — acting on it would prune a translation that may well have fixed the
   * very problem the verdict describes. These are mandatory rather than optional so
   * the freshness check cannot be skipped: a caller that omitted them would silently
   * prune on stale verdicts, which is the failure this check exists to prevent.
   */
  english: Record<string, WorkflowContent>,
  localeContent: Record<string, Partial<WorkflowContent>>
): Violation[] {
  const violations: Violation[] = [];
  for (const [shareId, verdict] of Object.entries(state.entries)) {
    const en = english[shareId];
    const target = localeContent[shareId];
    // Unreviewed-since-change: leave it to the deterministic checks until the
    // next run re-reviews it, rather than pruning on a verdict about old text.
    if (!en || !target || verdict.hash !== entryHash(en, target)) continue;
    for (const finding of verdict.findings) {
      if (!PRUNING_SEVERITIES.has(finding.severity)) continue;
      violations.push({
        shareId,
        locale,
        field: finding.field,
        // Reuses the validator's existing 'glossary' kind rather than inventing a
        // sixth: downstream reporting already groups by kind, and every AI finding
        // is a content-quality failure of the same family.
        kind: 'glossary',
        detail: `ai-review/${finding.category}/${finding.severity}: ${finding.reason}`,
      });
    }
  }
  return violations;
}

/** Counts for the run log and the PR summary comment. */
export function summarize(state: ReviewState): {
  entries: number;
  findings: number;
  bySeverity: Record<FindingSeverity, number>;
  byCategory: Record<FindingCategory, number>;
} {
  const bySeverity = { critical: 0, major: 0, minor: 0 } as Record<FindingSeverity, number>;
  const byCategory = { terminology: 0, accuracy: 0, fluency: 0, context: 0 } as Record<
    FindingCategory,
    number
  >;
  let findings = 0;
  for (const verdict of Object.values(state.entries)) {
    for (const f of verdict.findings) {
      findings += 1;
      bySeverity[f.severity] += 1;
      byCategory[f.category] += 1;
    }
  }
  return { entries: Object.keys(state.entries).length, findings, bySeverity, byCategory };
}

/** `dir` is injectable so tests never touch the real, committed review directory. */
export function reviewStatePath(locale: Locale, dir: string = REVIEW_DIR): string {
  return path.join(dir, `${locale}.json`);
}

/**
 * Load stored verdicts, discarding anything malformed.
 *
 * The file is generated, but it is also committed, so it can arrive truncated or
 * hand-edited. Trusting its shape lets a bad severity reach `summarize` (which
 * would report NaN) or a non-array `findings` reach a `for…of` (which throws and
 * takes down the run). Both are avoidable by validating once, here.
 */
export function loadReviewState(locale: Locale, dir: string = REVIEW_DIR): ReviewState {
  const state = readJson<ReviewState>(reviewStatePath(locale, dir), {
    promptVersion: PROMPT_VERSION,
    entries: {},
  });
  // A rubric change makes every stored verdict incomparable, so discard them all
  // rather than mixing verdicts from two different rubrics in one report.
  if (state?.promptVersion !== PROMPT_VERSION) {
    return { promptVersion: PROMPT_VERSION, entries: {} };
  }
  const entries: Record<string, EntryVerdict> = {};
  for (const [shareId, verdict] of Object.entries(state.entries ?? {})) {
    if (!verdict || typeof verdict.hash !== 'string' || !Array.isArray(verdict.findings)) continue;
    // Reuse the same validation the model output goes through, with no field
    // filter — a stored finding names a field that may legitimately be absent now.
    entries[shareId] = { hash: verdict.hash, findings: sanitizeFindings(verdict.findings) };
  }
  return { promptVersion: PROMPT_VERSION, entries };
}

/** Run `worker` over `items` with a bounded number in flight. */
async function pooled<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let cursor = 0;
  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await worker(items[index]!);
    }
  });
  await Promise.all(runners);
}

/**
 * Reviews one entry. Returns the findings, or `null` when the entry could not be
 * reviewed at all (API error, refusal, truncation). `null` is deliberately not the
 * same as `[]`: an empty array is a verdict of "this is clean" and gets stored,
 * whereas an unreviewed entry must keep its previous verdict and be retried next
 * run — otherwise a transient outage would silently mark a locale as reviewed.
 */
export type ReviewEntryFn = (
  shareId: string,
  english: WorkflowContent,
  target: Partial<WorkflowContent>
) => Promise<Finding[] | null>;

export interface LocaleReviewResult {
  state: ReviewState;
  reviewed: number;
  failures: string[];
}

/**
 * Orchestrate a locale's review: pick the stale entries, review them with bounded
 * concurrency, and fold the verdicts into the state. Takes the per-entry reviewer
 * as a parameter so the whole flow is exercised in tests without a network call or
 * an API key — this function decides what ends up pruned, so it needs real coverage.
 */
export async function reviewLocale(
  localeContent: Record<string, Partial<WorkflowContent>>,
  english: Record<string, WorkflowContent>,
  priorState: ReviewState,
  reviewEntry: ReviewEntryFn,
  concurrency: number = CONCURRENCY
): Promise<LocaleReviewResult> {
  const state = pruneOrphanedVerdicts(priorState, localeContent);
  const stale = selectEntriesForReview(localeContent, english, state);
  const failures: string[] = [];
  let reviewed = 0;

  await pooled(stale, concurrency, async (shareId) => {
    const en = english[shareId]!;
    const target = localeContent[shareId]!;
    try {
      const findings = await reviewEntry(shareId, en, target);
      if (findings === null) {
        failures.push(shareId);
        return;
      }
      state.entries[shareId] = { hash: entryHash(en, target), findings };
      reviewed += 1;
    } catch (error) {
      failures.push(`${shareId} (${(error as Error).message})`);
    }
  });

  return { state, reviewed, failures };
}

async function main(): Promise<void> {
  const english = readJson<Record<string, WorkflowContent>>(path.join(CONTENT_DIR, 'en.json'), {});
  const preserveTerms = readJson<string[]>(path.join(GLOSSARY_DIR, 'preserve-terms.json'), []);
  if (Object.keys(english).length === 0) {
    console.error('[i18n] review: no English content-of-record — nothing to review.');
    process.exit(1);
  }

  const requested = (process.env.TRANSLATE_LOCALES ?? '').split(/\s+/).filter(Boolean);
  const locales = (requested.length > 0 ? requested : SUPPORTED_HUB_LOCALES).filter(
    (l): l is Locale => l !== 'en' && SUPPORTED_HUB_LOCALES.includes(l as Locale)
  );

  // The reviewer is an ADDITIONAL gate on top of the deterministic floor, never a
  // dependency of it. With no key configured, skip cleanly instead of failing the
  // run: the pipeline then behaves exactly as it did before this step existed,
  // which is what lets the step ship before the org secret is provisioned.
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn(
      '[i18n] review: ANTHROPIC_API_KEY is not set — skipping AI review. ' +
        'Deterministic glossary/structure checks still apply.'
    );
    return;
  }

  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic();

  let totalReviewed = 0;
  for (const locale of locales) {
    const localeContent = readJson<Record<string, Partial<WorkflowContent>>>(
      path.join(CONTENT_DIR, `${locale}.json`),
      {}
    );
    if (Object.keys(localeContent).length === 0) continue;

    // The same selection the translator's prompt carries, read from the one
    // artifact `pnpm i18n:glossary` writes. Reading the uncapped mirror here is
    // what made the reviewer demand terms the translator was never given.
    const effective = readJson<Record<string, string> | null>(
      path.join(GLOSSARY_DIR, 'effective', `${locale}.json`),
      null
    );
    const terminology = effective ?? {
      ...readJson<Record<string, string>>(path.join(GLOSSARY_DIR, 'mirror', `${locale}.json`), {}),
      ...readJson<Record<string, string>>(
        path.join(GLOSSARY_DIR, 'overrides', `${locale}.json`),
        {}
      ),
    };

    const priorState = loadReviewState(locale);
    const pending = selectEntriesForReview(
      localeContent,
      english,
      pruneOrphanedVerdicts(priorState, localeContent)
    ).length;
    if (pending === 0) {
      console.log(
        `[i18n] review: [${locale}] up to date (${Object.keys(priorState.entries).length}).`
      );
      continue;
    }
    totalReviewed += pending;
    if (totalReviewed > MAX_ENTRIES_PER_RUN) {
      console.error(
        `[i18n] review: run would exceed the ${MAX_ENTRIES_PER_RUN}-entry ceiling ` +
          `(${totalReviewed}). Raise I18N_REVIEW_MAX_ENTRIES deliberately if this is expected.`
      );
      process.exit(1);
    }

    const system = buildSystemPrompt(locale, preserveTerms, terminology);
    console.log(`[i18n] review: [${locale}] reviewing ${pending} entr(ies) with ${MODEL}…`);

    const { state, failures } = await reviewLocale(
      localeContent,
      english,
      priorState,
      async (shareId, en, target) => {
        const response = await client.messages.create({
          model: MODEL,
          // Thinking is on by default on this model and its tokens count against
          // max_tokens, so the budget covers reasoning AND the findings. At 4096
          // the entries with the most to report starved their own answer and came
          // back truncated — i.e. the worst translations were the ones that failed
          // to review. Sized well clear of that; unused budget is not billed.
          max_tokens: 16000,
          // Cached: the rubric + glossary are identical for every entry in this
          // locale, so ~600 calls read it back at a tenth of the write price.
          system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
          output_config: {
            effort: 'high',
            format: { type: 'json_schema', schema: FINDINGS_SCHEMA },
          },
          messages: [{ role: 'user', content: buildUserPrompt(shareId, en, target) }],
        });
        // A refusal or a truncated answer is not a verdict — return null so the
        // entry stays unreviewed rather than being recorded as clean. Log why:
        // a silent null here is indistinguishable from a transient network blip,
        // and these two causes need opposite responses (retry vs raise the budget).
        // Any stop reason that means the answer was cut short or withheld: the
        // body is not a complete verdict, so it must not reach JSON.parse.
        const incomplete = ['refusal', 'max_tokens', 'model_context_window_exceeded'];
        if (incomplete.includes(response.stop_reason ?? '')) {
          console.warn(
            `[i18n] review: ${shareId} unreviewed (stop_reason=${response.stop_reason})`
          );
          return null;
        }
        const text = response.content.find((b) => b.type === 'text');
        if (!text || text.type !== 'text') {
          console.warn(`[i18n] review: ${shareId} unreviewed (no text block in response)`);
          return null;
        }
        return parseFindings(JSON.parse(text.text), target);
      }
    );

    fs.mkdirSync(REVIEW_DIR, { recursive: true });
    fs.writeFileSync(reviewStatePath(locale), JSON.stringify(state, null, 2) + '\n');

    const summary = summarize(state);
    console.log(
      `[i18n] review: [${locale}] ${summary.findings} finding(s) across ${summary.entries} entr(ies).`,
      summary.bySeverity,
      summary.byCategory
    );
    if (failures.length > 0) {
      // Unreviewed entries keep their previous verdict (or none) and will be picked
      // up next run, so a transient API failure delays review rather than faking it.
      console.warn(
        `[i18n] review: [${locale}] ${failures.length} entr(ies) could not be reviewed: ` +
          failures.slice(0, 10).join(', ')
      );
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('[i18n] review: fatal —', error);
    process.exit(1);
  });
}
