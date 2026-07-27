/**
 * build-content-source — produces the English content-of-record + manifest and
 * seeds existing human translations for the hub localization pipeline (GTM-291).
 *
 * Run: `pnpm i18n:build-source` (needs PUBLIC_HUB_API_URL; no OpenAI key).
 *
 * Outputs, under src/i18n/content/ (one file per locale, keyed by shareId):
 *   en.json          — the 7 translatable fields per workflow, from the Hub index
 *   manifest.json    — per-workflow source hashes (combined + per-field)
 *   {locale}.json    — seeded with human title/description where the repo already
 *                      has them (templates/index.{locale}.json), lobe fills the rest
 *
 * Staleness: on each run, any English field whose hash changed since the last
 * manifest is deleted from every locale file so lobe re-translates it (and, via
 * the manifest content-hash, any sign-off for that page goes stale — see the
 * resolver/predicate). Human seeds and lobe output for unchanged fields survive.
 *
 * The pure functions below are exported and unit-tested; `main()` only does IO.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  TRANSLATABLE_FIELDS,
  type FaqItem,
  type TranslatableField,
  type TranslationManifest,
  type WorkflowContent,
  type WorkflowSourceHashes,
} from '../../src/lib/i18n/schema';
import { SUPPORTED_HUB_LOCALES } from '../../src/lib/i18n/locales';
import { LOCALE_INDEX_FILES } from '../lib/constants';

const CONTENT_DIR = path.join(process.cwd(), 'src', 'i18n', 'content');
const TEMPLATES_DIR = path.join(process.cwd(), '..', 'templates');

// ---------------------------------------------------------------------------
// Pure core (exported for tests)
// ---------------------------------------------------------------------------

function asString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}
function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}
function asFaqItems(v: unknown): FaqItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map((x) => ({ question: asString(x.question), answer: asString(x.answer) }))
    .filter((x) => x.question || x.answer);
}

/** Extract and normalize the 7 translatable fields from a Hub index entry. */
export function extractContent(entry: Record<string, unknown>): WorkflowContent {
  return {
    title: asString(entry.title),
    description: asString(entry.description),
    metaDescription: asString(entry.metaDescription),
    extendedDescription: asString(entry.extendedDescription),
    howToUse: asStringArray(entry.howToUse),
    suggestedUseCases: asStringArray(entry.suggestedUseCases),
    faqItems: asFaqItems(entry.faqItems),
  };
}

/** Stable 12-hex sha256 of a value (deterministic: fields are built in fixed order). */
export function hashValue(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 12);
}

/** Per-field + combined content hashes for one workflow. */
export function hashContent(content: WorkflowContent): WorkflowSourceHashes {
  const fields: Partial<Record<TranslatableField, string>> = {};
  for (const field of TRANSLATABLE_FIELDS) fields[field] = hashValue(content[field]);
  return { content: hashValue(content), fields };
}

/**
 * Given the previous and next manifests, return per-shareId the set of fields
 * whose English source changed (so callers can drop them from locale files).
 */
export function staleFields(
  prev: TranslationManifest,
  next: TranslationManifest
): Record<string, TranslatableField[]> {
  const out: Record<string, TranslatableField[]> = {};
  for (const shareId of Object.keys(next)) {
    const before = prev[shareId]?.fields ?? {};
    const after = next[shareId].fields;
    const changed = TRANSLATABLE_FIELDS.filter((f) => before[f] !== after[f] && before[f] != null);
    if (changed.length > 0) out[shareId] = changed;
  }
  return out;
}

/**
 * Merge a locale file for one run: drop stale fields, then overlay human seeds
 * (human title/description that differ from English win over any machine value).
 * Existing machine translations for non-stale, non-seeded fields are preserved.
 */
export function mergeLocaleFile(
  existing: Record<string, Partial<WorkflowContent>>,
  humanSeed: Record<string, Partial<WorkflowContent>>,
  stale: Record<string, TranslatableField[]>
): Record<string, Partial<WorkflowContent>> {
  const merged: Record<string, Partial<WorkflowContent>> = {};
  const shareIds = new Set([...Object.keys(existing), ...Object.keys(humanSeed)]);
  for (const shareId of shareIds) {
    const entry: Partial<WorkflowContent> = { ...existing[shareId] };
    for (const field of stale[shareId] ?? []) delete entry[field];
    Object.assign(entry, humanSeed[shareId] ?? {});
    if (Object.keys(entry).length > 0) merged[shareId] = entry;
  }
  return merged;
}

/**
 * Build the human seed for a locale: for each workflow, include the human
 * title/description from the repo's locale index when it differs from English
 * (an identical value means "untranslated" and is left for lobe / glossary).
 */
export function buildHumanSeed(
  english: Record<string, WorkflowContent>,
  nameByShareId: Record<string, string>,
  humanByName: Record<string, { title?: string; description?: string }>
): Record<string, Partial<WorkflowContent>> {
  const seed: Record<string, Partial<WorkflowContent>> = {};
  for (const [shareId, en] of Object.entries(english)) {
    const human = humanByName[nameByShareId[shareId]];
    if (!human) continue;
    const fields: Partial<WorkflowContent> = {};
    if (human.title && human.title !== en.title) fields.title = human.title;
    if (human.description && human.description !== en.description)
      fields.description = human.description;
    if (Object.keys(fields).length > 0) seed[shareId] = fields;
  }
  return seed;
}

// ---------------------------------------------------------------------------
// IO (main)
// ---------------------------------------------------------------------------

function sortedJson(obj: Record<string, unknown>): string {
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) sorted[key] = obj[key];
  return JSON.stringify(sorted, null, 2) + '\n';
}

function readJsonFile<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
  } catch {
    return null;
  }
}

async function fetchIndex(): Promise<Record<string, unknown>[]> {
  const apiUrl = (process.env.PUBLIC_HUB_API_URL || '').replace(/\/$/, '');
  if (!apiUrl) throw new Error('PUBLIC_HUB_API_URL is required to build the content source');
  const approvedOnly = process.env.PUBLIC_APPROVED_ONLY === 'true';
  const statuses = approvedOnly ? 'approved' : 'pending,approved,rejected,deprecated';
  const res = await fetch(`${apiUrl}/api/hub/workflows/index?status=${statuses}`, {
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Hub API returned ${res.status}: ${res.statusText}`);
  const entries = (await res.json()) as Record<string, unknown>[];
  if (!Array.isArray(entries) || entries.length === 0)
    throw new Error('Hub API returned empty index');
  return entries;
}

/** name -> {title, description} from templates/index.{locale}.json (fs, else git). */
function loadHumanIndex(locale: string): Record<string, { title?: string; description?: string }> {
  const filename = LOCALE_INDEX_FILES[locale];
  if (!filename) return {};
  let raw: string | null = null;
  const fsPath = path.join(TEMPLATES_DIR, filename);
  if (fs.existsSync(fsPath)) {
    raw = fs.readFileSync(fsPath, 'utf-8');
  } else {
    try {
      raw = execFileSync('git', ['show', `origin/main:templates/${filename}`], {
        cwd: process.cwd(),
        encoding: 'utf-8',
        maxBuffer: 64 * 1024 * 1024,
      });
    } catch {
      return {};
    }
  }
  let categories: { templates?: { name?: string; title?: string; description?: string }[] }[];
  try {
    categories = JSON.parse(raw);
  } catch {
    return {};
  }
  const map: Record<string, { title?: string; description?: string }> = {};
  for (const cat of categories) {
    for (const t of cat.templates ?? []) {
      if (t.name) map[t.name] = { title: t.title, description: t.description };
    }
  }
  return map;
}

async function main(): Promise<void> {
  fs.mkdirSync(CONTENT_DIR, { recursive: true });
  const entries = await fetchIndex();

  const english: Record<string, WorkflowContent> = {};
  const nameByShareId: Record<string, string> = {};
  for (const entry of entries) {
    const shareId = asString(entry.shareId);
    if (!shareId) continue;
    english[shareId] = extractContent(entry);
    nameByShareId[shareId] = asString(entry.name);
  }

  const nextManifest: TranslationManifest = {};
  for (const [shareId, content] of Object.entries(english)) {
    nextManifest[shareId] = hashContent(content);
  }
  const prevManifest =
    readJsonFile<TranslationManifest>(path.join(CONTENT_DIR, 'manifest.json')) ?? {};
  const stale = staleFields(prevManifest, nextManifest);

  fs.writeFileSync(path.join(CONTENT_DIR, 'en.json'), sortedJson(english));
  fs.writeFileSync(path.join(CONTENT_DIR, 'manifest.json'), sortedJson(nextManifest));

  let seededTotal = 0;
  for (const locale of SUPPORTED_HUB_LOCALES) {
    if (locale === 'en') continue;
    const localeFile = path.join(CONTENT_DIR, `${locale}.json`);
    const existing = readJsonFile<Record<string, Partial<WorkflowContent>>>(localeFile) ?? {};
    const humanSeed = buildHumanSeed(english, nameByShareId, loadHumanIndex(locale));
    const merged = mergeLocaleFile(existing, humanSeed, stale);
    if (Object.keys(merged).length > 0) fs.writeFileSync(localeFile, sortedJson(merged));
    seededTotal += Object.keys(humanSeed).length;
  }

  const staleCount = Object.keys(stale).length;
  console.log(
    `[i18n] content source: ${Object.keys(english).length} workflows, ` +
      `${seededTotal} human seeds across ${SUPPORTED_HUB_LOCALES.length - 1} locales, ` +
      `${staleCount} workflows with stale fields dropped for re-translation.`
  );
}

// Run only when invoked directly (so tests can import the pure functions).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('[i18n] build-content-source failed:', err);
    process.exit(1);
  });
}
