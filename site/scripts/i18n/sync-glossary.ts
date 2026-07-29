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
  'T2I',
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
  let mirrorTotal = 0;
  for (const locale of SUPPORTED_HUB_LOCALES) {
    if (locale === 'en') continue;
    const mirror = buildMirror(enStrings, loadAppStrings(localesDir, locale));
    writeJson(path.join(GLOSSARY_DIR, 'mirror', `${locale}.json`), mirror);
    const overridePath = path.join(GLOSSARY_DIR, 'overrides', `${locale}.json`);
    if (!fs.existsSync(overridePath)) writeJson(overridePath, {});
    mirrorTotal += Object.keys(mirror).length;
  }

  console.log(
    `[i18n] glossary: ${PRESERVE_TERMS.length} preserve terms, ` +
      `${mirrorTotal} mirror pairs across ${SUPPORTED_HUB_LOCALES.length - 1} locales ` +
      `(from ${localesDir}).`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
