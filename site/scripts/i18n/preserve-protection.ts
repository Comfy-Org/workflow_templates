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

/** Sentinel token for term index `i`. ASCII double-brackets read as a placeholder
 *  to the model (like a wiki link) and never occur in real workflow content. */
export function sentinelFor(index: number): string {
  return `[[PT${index}]]`;
}

/**
 * Match a sentinel even if the model nudged it: 1-2 ASCII or fullwidth brackets,
 * optional spaces, case-insensitive PT, digits. A residual it can't match stays as
 * a missing preserve-term, which the validator then catches (fail-closed).
 */
const SENTINEL_RE = /[[［【]{1,2}\s*[Pp][Tt]\s*(\d+)\s*[\]］】]{1,2}/g;

export interface TermMap {
  /** Preserve-terms longest-first, so "ComfyUI" is replaced before "Comfy". */
  ordered: string[];
  sentinelByTerm: Map<string, string>;
  termByIndex: string[];
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
  return { ordered, sentinelByTerm, termByIndex };
}

/** Replace every exact occurrence of each preserve-term with its sentinel. */
export function protectText(text: string, map: TermMap): string {
  let out = text;
  for (const term of map.ordered) {
    out = out.split(term).join(map.sentinelByTerm.get(term)!);
  }
  return out;
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
    const done = transformFile(path.join(CONTENT_DIR, 'en.json'), (d) => protectContent(d, map));
    console.log(
      done
        ? `[i18n] protect: sentinelized ${map.ordered.length} preserve-terms in content/en.json.`
        : '[i18n] protect: content/en.json not found.'
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
