/**
 * preserve-protection — deterministic do-not-translate protection for the hub
 * translation pipeline.
 *
 * lobe/OpenAI's "never translate these proper nouns" instruction is advisory, so
 * brand/model names (ComfyUI, ControlNet, Flux, VAE, KSampler…) leak into the
 * localized output and fail the glossary validator. This wraps the translate step:
 *
 *   pnpm i18n:protect   → swap every preserve-term in content/en.json for an inert
 *                         sentinel token the model passes through untouched.
 *   pnpm locale         → lobe translates the sentinelized English.
 *   pnpm i18n:restore   → swap the sentinels back to the exact English term in
 *                         every content file (en + machine locales).
 *
 * The result is byte-for-byte survival of preserve-terms for every locale. The
 * committed en.json ends up with real terms again, so it still matches the manifest
 * hashes (which build-source computed from the real English before protection).
 *
 * The pure functions are exported and unit-tested; `main()` only does IO.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const CONTENT_DIR = path.join(process.cwd(), 'src', 'i18n', 'content');
const GLOSSARY_DIR = path.join(process.cwd(), 'i18n', 'glossary');

/** Sentinel token for term index `i`. Double-braces read as a required
 *  interpolation variable, which models preserve far more reliably than a
 *  bracketed marker (they drop the latter when rephrasing), and never occur in
 *  real workflow content. */
export function sentinelFor(index: number): string {
  return `{{PT${index}}}`;
}

/**
 * Match a sentinel even if the model nudged it: 1-2 ASCII or fullwidth braces,
 * optional spaces, case-insensitive PT, digits. A residual it can't match stays as
 * a missing preserve-term, which the validator then catches (fail-closed). Kept as
 * literal regexes (not `new RegExp(str)`) so they carry no ReDoS/dynamic-source risk.
 */
const SENTINEL_RE = /[{｛]{1,2}\s*[Pp][Tt]\s*(\d+)\s*[}｝]{1,2}/g; // restore: replace every match
const SENTINEL_TEST = /[{｛]{1,2}\s*[Pp][Tt]\s*(\d+)\s*[}｝]{1,2}/; // detection: stateless test

/** Escape a literal string for safe inclusion in a RegExp alternation. */
function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface TermMap {
  /** Preserve-terms longest-first, so "ComfyUI" is replaced before "Comfy". */
  ordered: string[];
  sentinelByTerm: Map<string, string>;
  termByIndex: string[];
  /** One alternation over all terms, longest-first, or null when there are none. */
  matcher: RegExp | null;
}

export function buildTermMap(terms: string[]): TermMap {
  const uniq = [...new Set(terms.filter((t) => typeof t === 'string' && t.trim()))];
  const ordered = uniq.sort((a, b) => b.length - a.length);
  const sentinelByTerm = new Map<string, string>();
  const termByIndex: string[] = [];
  ordered.forEach((term, i) => {
    sentinelByTerm.set(term, sentinelFor(i));
    termByIndex[i] = term;
  });
  // Terms are escaped literals, so the alternation is safe (no ReDoS). Longest-first
  // ordering makes "ComfyUI" win over "Comfy" at the same position.
  const matcher = ordered.length ? new RegExp(ordered.map(escapeRegExp).join('|'), 'g') : null;
  return { ordered, sentinelByTerm, termByIndex, matcher };
}

/**
 * Replace every occurrence of each preserve-term with its sentinel, in a SINGLE
 * pass over the original text. Sequential per-term replacement re-scans its own
 * output, so a later term ("PT0") could match inside a sentinel already emitted for
 * an earlier term ("FooX" -> "{{PT0}}") and corrupt it; one regex pass never
 * re-examines the text it just inserted.
 */
export function protectText(text: string, map: TermMap): string {
  if (!map.matcher) return text;
  map.matcher.lastIndex = 0;
  return text.replace(map.matcher, (m) => map.sentinelByTerm.get(m) ?? m);
}

/** Replace every sentinel with its exact English term. */
export function restoreText(text: string, map: TermMap): string {
  return text.replace(SENTINEL_RE, (whole, idx) => map.termByIndex[Number(idx)] ?? whole);
}

/** Walk a JSON value (string | array | object), applying `fn` to every string. */
function mapStrings(value: unknown, fn: (s: string) => string): unknown {
  if (typeof value === 'string') return fn(value);
  if (Array.isArray(value)) return value.map((v) => mapStrings(v, fn));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = mapStrings(v, fn);
    return out;
  }
  return value;
}

export function protectContent(content: unknown, map: TermMap): unknown {
  return mapStrings(content, (s) => protectText(s, map));
}

export function restoreContent(content: unknown, map: TermMap): unknown {
  return mapStrings(content, (s) => restoreText(s, map));
}

/**
 * Strings in `content` that already contain sentinel-shaped text. Protecting such
 * content would let `restore` silently rewrite genuine Hub content into a
 * preserve-term, so `protect` refuses the build when this returns anything.
 */
export function findSentinelCollisions(content: unknown): string[] {
  const hits: string[] = [];
  mapStrings(content, (s) => {
    if (SENTINEL_TEST.test(s)) hits.push(s);
    return s;
  });
  return hits;
}

// ---------------------------------------------------------------------------
// IO (main)
// ---------------------------------------------------------------------------

function transformFile(file: string, transform: (data: unknown) => unknown): boolean {
  if (!fs.existsSync(file)) return false;
  const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
  fs.writeFileSync(file, JSON.stringify(transform(data), null, 2) + '\n');
  return true;
}

function main(): void {
  const mode = process.argv[2];
  if (mode !== 'protect' && mode !== 'restore') {
    console.error('[i18n] preserve-protection: usage — protect | restore');
    process.exit(1);
  }
  const termsFile = path.join(GLOSSARY_DIR, 'preserve-terms.json');
  let terms: string[] = [];
  try {
    terms = JSON.parse(fs.readFileSync(termsFile, 'utf-8'));
  } catch {
    console.warn('[i18n] preserve-protection: no preserve-terms.json — nothing to do.');
    return;
  }
  const map = buildTermMap(terms);

  if (mode === 'protect') {
    // Only the English source lobe reads; restored before commit.
    const enFile = path.join(CONTENT_DIR, 'en.json');
    if (!fs.existsSync(enFile)) {
      console.log('[i18n] protect: content/en.json not found.');
      return;
    }
    const source = JSON.parse(fs.readFileSync(enFile, 'utf-8'));
    // Fail closed if the Hub source already contains sentinel-shaped text — restore
    // would otherwise rewrite that genuine content into a preserve-term.
    const collisions = findSentinelCollisions(source);
    if (collisions.length > 0) {
      console.error(
        `[i18n] protect: ${collisions.length} source string(s) contain sentinel-shaped text; ` +
          `refusing to protect (restore would corrupt them). Examples:`
      );
      for (const c of collisions.slice(0, 5)) console.error(`  ${c}`);
      process.exit(1);
    }
    fs.writeFileSync(enFile, JSON.stringify(protectContent(source, map), null, 2) + '\n');
    console.log(
      `[i18n] protect: sentinelized ${map.ordered.length} preserve-terms in content/en.json.`
    );
  } else {
    // Restore every content file: en.json plus each machine locale lobe produced.
    let files = 0;
    for (const f of fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json'))) {
      if (transformFile(path.join(CONTENT_DIR, f), (d) => restoreContent(d, map))) files++;
    }
    console.log(`[i18n] restore: restored preserve-terms across ${files} content file(s).`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
