/**
 * sync-glossary — builds the translation glossary for the hub pipeline.
 *
 * Run: `pnpm i18n:glossary` (reads a ComfyUI_frontend checkout; no OpenAI key).
 *
 * Three layers, written under site/i18n/glossary/ (standalone so a future
 * monorepo can share them):
 *   preserve-terms.json  — proper nouns that must stay English in every locale
 *                          (brand, product, model, and node names). Unlike the
 *                          docs pipeline we deliberately do NOT preserve common
 *                          technique words (inpainting, upscale, sampler…): for
 *                          SEO we want those translated to match search intent,
 *                          and the mirror supplies the app's own translation.
 *   mirror/{locale}.json — English→localized term pairs harvested from the app's
 *                          UI locale files, so hub content uses the same wording
 *                          the product UI already uses (workflow, node, queue…).
 *   overrides/{locale}.json — hand-curated fixes that win over the mirror
 *                          (created empty here; reviewers/CODEOWNERS extend them).
 *
 * The pure functions are exported and unit-tested; `main()` only does IO.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { SUPPORTED_HUB_LOCALES } from '../../src/lib/i18n/locales';

const GLOSSARY_DIR = path.join(process.cwd(), 'i18n', 'glossary');

/**
 * Proper nouns kept English in all locales. Brand/product/tech proper nouns plus
 * the model-family labels (kept in sync with FAMILY_RULES in
 * src/lib/workflow-pages/model-groups.ts). Extend as new models/nodes land.
 */
export const PRESERVE_TERMS: string[] = [
  // Brand / product
  'ComfyUI',
  'Comfy',
  'Comfy Cloud',
  'Comfy Workflows',
  'ComfyUI Manager',
  // Ecosystem proper nouns
  'Civitai',
  'Hugging Face',
  'Black Forest Labs',
  'Stability AI',
  // Node / component proper nouns
  'LoRA',
  'VAE',
  'CLIP',
  'ControlNet',
  'KSampler',
  'UNet',
  'IPAdapter',
  'InstantID',
  'AnimateDiff',
  'RealESRGAN',
  'T5',
  // Task-type acronyms as they appear in workflow names. Case matters: matching
  // is case-sensitive, so 'T2I' alone left the lowercase 't2i' that the titles
  // actually use unshielded, and a Turkish reviewer found it rendered as 'm2g'.
  // The sibling acronyms were never listed in any casing.
  'T2I',
  't2i',
  'i2v',
  't2v',
  'v2v',
  'flf2v',
  'safetensors',
  'GGUF',
  // Model families (mirror of FAMILY_RULES labels)
  'Wan',
  'Flux',
  'LTX',
  'Stable Diffusion',
  'SDXL',
  'SD1.5',
  'Qwen-Image-Edit',
  'Qwen-Image',
  'Seedance',
  'Seedream',
  'Kling',
  'Z-Image',
  'GPT-Image',
  'Nano Banana Pro',
  'Nano Banana',
  'Hunyuan3D',
  'ACE-Step',
  'Dall-E',
  // Variant names whose parent family is already listed above. Listing only the
  // family leaves the rest of the name exposed: "Wan" was protected inside
  // "Wan 2.2 5B Fun Inpaint" while "Fun" was not, and zh rendered it 趣味
  // ("playful"), turning a product name into an adjective. Likewise
  // "Qwen-Image" protected the head of "Qwen-Image-Layered" and left "Layered"
  // to be translated.
  //
  // "Fun" is deliberately listed bare rather than as each variant
  // (Fun Inpaint / Fun Inp / Fun Control / Fun Camera Control / Fun Union):
  // every one of its 38 occurrences in the English content is a model name and
  // none is the ordinary adjective, and matching is case-sensitive, so lowercase
  // "fun" in prose is untouched.
  'Fun',
  'Qwen-Image-Layered',
];

/** Longest glossary term to harvest from UI strings (skip full sentences). */
const MAX_TERM_LEN = 40;

/**
 * Join an English UI dictionary with a locale's dictionary by key, yielding
 * English→localized term pairs, skipping empties, identity pairs, and long
 * strings (which are sentences, not terms). Keys are flat "a.b.c" paths.
 */
export function buildMirror(
  enStrings: Record<string, string>,
  localeStrings: Record<string, string>
): Record<string, string> {
  const mirror: Record<string, string> = {};
  for (const [key, en] of Object.entries(enStrings)) {
    const localized = localeStrings[key];
    if (typeof en !== 'string' || typeof localized !== 'string') continue;
    const enTrim = en.trim();
    const locTrim = localized.trim();
    if (!enTrim || !locTrim || enTrim === locTrim) continue;
    if (enTrim.length > MAX_TERM_LEN) continue;
    // Keep the first (shortest-key) mapping for a given English term.
    if (!(enTrim in mirror)) mirror[enTrim] = locTrim;
  }
  return mirror;
}

/**
 * How many harvested pairs reach the translator's prompt. The prompt has to stay
 * bounded, so the mirror is trimmed; which pairs survive is the important part.
 */
export const MAX_MIRROR_PAIRS = 200;

/**
 * The glossary both sides actually use, chosen by how often a term appears in
 * the English corpus rather than by how long it is.
 *
 * Length-first ranking is what broke the Russian run: it drops the SHORTEST
 * terms first, and "Workflow" is the most frequent term in the product, so the
 * translator was never shown it while the reviewer went on enforcing it. Every
 * field mentioning a workflow was then flagged, 27% of the locale, and the
 * systemic-prune guard failed the run.
 *
 * Curated overrides are always kept, on top of the cap, because someone chose
 * them deliberately.
 */
export function selectGlossary(
  mirror: Record<string, string>,
  overrides: Record<string, string>,
  corpus: string,
  limit: number = MAX_MIRROR_PAIRS
): Record<string, string> {
  const frequency = (term: string): number => {
    if (!term) return 0;
    // Whole-term matches only: "AI" should not score inside "Explain", nor inside
    // "AI2" or "AI_model" — this corpus is full of identifiers like `wan2_2`, so
    // digits and underscores have to count as term characters or a short term
    // inflates its own frequency and displaces a genuinely common one at the cap.
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return (corpus.match(new RegExp(`(?<!\\w)${escaped}(?!\\w)`, 'gi')) ?? []).length;
  };

  const ranked = Object.entries(mirror)
    .map(([en, localized]) => ({ en, localized, count: frequency(en) }))
    // Frequency first; longer term wins a tie, since it is the more specific one.
    .sort((a, b) => b.count - a.count || b.en.length - a.en.length)
    .slice(0, limit);

  const selected: Record<string, string> = {};
  for (const { en, localized } of ranked) selected[en] = localized;
  for (const [en, localized] of Object.entries(overrides)) {
    if (typeof localized === 'string' && localized.trim()) selected[en] = localized;
  }
  return selected;
}

/** Flatten a nested JSON dictionary to flat "a.b.c" → string entries. */
export function flattenStrings(obj: unknown, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out[path] = value;
    // Recurse into plain objects only; arrays aren't glossary term sources.
    else if (value && typeof value === 'object' && !Array.isArray(value))
      Object.assign(out, flattenStrings(value, path));
  }
  return out;
}

// ---------------------------------------------------------------------------
// IO (main)
// ---------------------------------------------------------------------------

/** Resolve the ComfyUI_frontend locales dir (env, then common relative paths). */
function resolveFrontendLocalesDir(): string | null {
  const candidates = [
    process.env.FRONTEND_LOCALES_DIR,
    // main clone: site/ -> workflow_templates -> Comfy root
    path.join(process.cwd(), '..', '..', 'ComfyUI_frontend', 'src', 'locales'),
    // worktree: site/ -> <task> -> worktrees -> Comfy root
    path.join(process.cwd(), '..', '..', '..', 'ComfyUI_frontend', 'src', 'locales'),
  ].filter(Boolean) as string[];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'en', 'main.json'))) return dir;
  }
  return null;
}

/** Load + flatten the app's English + one locale's UI dictionaries. */
function loadAppStrings(localesDir: string, locale: string): Record<string, string> {
  const files = ['main.json', 'commands.json', 'settings.json'];
  const merged: Record<string, string> = {};
  for (const file of files) {
    const p = path.join(localesDir, locale, file);
    if (!fs.existsSync(p)) continue;
    try {
      Object.assign(merged, flattenStrings(JSON.parse(fs.readFileSync(p, 'utf-8'))));
    } catch {
      /* skip unparseable */
    }
  }
  return merged;
}

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

/**
 * The English content the translator will see, as one string for term counting.
 * Absent before the first build-source run, in which case ranking falls back to
 * term length via the zero-count tie-break.
 */
function readEnglishCorpus(): string {
  const file = path.join(process.cwd(), 'src', 'i18n', 'content', 'en.json');
  try {
    return fs.readFileSync(file, 'utf-8');
  } catch {
    return '';
  }
}

function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

function main(): void {
  writeJson(path.join(GLOSSARY_DIR, 'preserve-terms.json'), PRESERVE_TERMS);

  const localesDir = resolveFrontendLocalesDir();
  if (!localesDir) {
    console.warn(
      '[i18n] glossary: ComfyUI_frontend locales not found — wrote preserve-terms only. ' +
        'Set FRONTEND_LOCALES_DIR to build the mirror.'
    );
    return;
  }

  const enStrings = loadAppStrings(localesDir, 'en');
  // Rank against the text being translated, so the terms that survive the cap
  // are the ones the corpus actually uses.
  const corpus = readEnglishCorpus();
  let mirrorTotal = 0;
  let effectiveTotal = 0;
  for (const locale of SUPPORTED_HUB_LOCALES) {
    if (locale === 'en') continue;
    const mirror = buildMirror(enStrings, loadAppStrings(localesDir, locale));
    writeJson(path.join(GLOSSARY_DIR, 'mirror', `${locale}.json`), mirror);
    const overridePath = path.join(GLOSSARY_DIR, 'overrides', `${locale}.json`);
    if (!fs.existsSync(overridePath)) writeJson(overridePath, {});
    const overrides = readJson<Record<string, string>>(overridePath, {});
    // ONE artifact, read verbatim by the translator config and the reviewer, so
    // neither can enforce a term the other was never shown.
    const effective = selectGlossary(mirror, overrides, corpus);
    writeJson(path.join(GLOSSARY_DIR, 'effective', `${locale}.json`), effective);
    mirrorTotal += Object.keys(mirror).length;
    effectiveTotal += Object.keys(effective).length;
  }

  console.log(
    `[i18n] glossary: ${PRESERVE_TERMS.length} preserve terms, ` +
      `${mirrorTotal} mirror pairs (${effectiveTotal} effective) across ` +
      `${SUPPORTED_HUB_LOCALES.length - 1} locales ` +
      `(from ${localesDir}).`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
