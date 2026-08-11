// Configuration for @lobehub/i18n-cli — translates the hub workflow CONTENT
// (titles, descriptions, meta, how-to, FAQs) from the English content-of-record
// into each supported locale's machine layer. Run: `pnpm locale`.
//
// Kept in CommonJS to match the tooling. The reference prompt is composed from
// the committed glossary so glossary + prompt never drift.
//
// Single-locale mode (HUB_I18N_LOCALE=<locale>): translate ONE locale and inject
// that locale's product-UI terminology (the synced mirror + curated overrides)
// into the prompt. This is the only way to feed per-locale terms — the all-locales
// run shares one reference prompt across every output locale, so a locale's mirror
// cannot be injected there. It also paces one locale at a time to stay under the
// OpenAI rate limit. With no env set the config keeps its original all-locales
// behavior (no per-locale terms) for local runs.
const { defineConfig } = require('@lobehub/i18n-cli');
const fs = require('node:fs');
const path = require('node:path');

const GLOSSARY_DIR = path.join(__dirname, 'i18n', 'glossary');

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return fallback;
  }
}

let preserveTerms = [];
try {
  preserveTerms = require('./i18n/glossary/preserve-terms.json');
} catch {
  // Glossary not synced yet — the deterministic validator still enforces terms.
}

const ALL_LOCALES = ['zh', 'zh-TW', 'ja', 'ko', 'es', 'fr', 'ru', 'tr', 'ar', 'pt-BR'];
const singleLocale = process.env.HUB_I18N_LOCALE || null;
const outputLocales = singleLocale ? [singleLocale] : ALL_LOCALES;

// Cap the bulk-harvested mirror so the prompt stays bounded; curated overrides
// are always kept in full and win over the mirror. Longest English terms first —
// they are the most specific and least likely to misfire as substrings.
const MAX_MIRROR_PAIRS = 200;

function terminologyBlock(locale) {
  const mirror = readJson(path.join(GLOSSARY_DIR, 'mirror', `${locale}.json`), {});
  const overrides = readJson(path.join(GLOSSARY_DIR, 'overrides', `${locale}.json`), {});
  const merged = new Map(
    Object.entries(mirror)
      .sort((a, b) => b[0].length - a[0].length)
      .slice(0, MAX_MIRROR_PAIRS)
  );
  for (const [en, loc] of Object.entries(overrides)) {
    if (typeof loc === 'string' && loc.trim()) merged.set(en, loc);
  }
  if (merged.size === 0) return '';
  const lines = [...merged.entries()].map(([en, loc]) => `- ${en} → ${loc}`).join('\n');
  return `\n\nProduct-UI terminology for this locale — when the English text contains one of these terms, translate it to exactly the paired term so hub content matches the ComfyUI app UI:\n${lines}`;
}

const reference = `This is SEO page content for Comfy Workflows (comfy.org/workflows), a catalog of ComfyUI workflow templates. Each value is a workflow's title, description, meta description, extended description, how-to steps, suggested use cases, or FAQ. Preserve JSON structure exactly: translate only string values, never keys, and keep every array the same length.

The text may contain placeholder tokens of the form {{PT0}}, {{PT1}}, {{PT2}}, and so on — they stand in for brand, product, model, and node names. Reproduce EVERY token exactly as written and in place: never translate, remove, reorder, merge, or add tokens, even when rephrasing or shortening a sentence.

Never translate these proper nouns (brand, product, model, and node names) — keep them byte-for-byte:
${preserveTerms.join(', ')}
Also keep any URL, file name, and share id unchanged.

Translate for search intent, not word-for-word: use the words each market actually searches for. Common technique terms (inpainting, upscaling, image to video, text to image, etc.) SHOULD be translated to the natural local term, and should match the wording used in the ComfyUI product UI for that language.

Tone: direct, factual, creator-first. The human directs the model; never phrase it as the AI creating for the user. Do not introduce hype words (no local equivalents of "stunning", "powerful", "seamless", "effortless", "unlock", "revolutionary").

Chinese: for 'zh' use ONLY Simplified Chinese characters; for 'zh-TW' use ONLY Traditional Chinese with Taiwan terminology. Never mix Simplified and Traditional within one locale.`;

module.exports = defineConfig({
  // Translation model, still overridable by env so a bad id can be reverted from a
  // repo variable without a code change. A wrong id fails every translation call,
  // so the ability to switch back instantly is the reason the override stays.
  //
  // gpt-4.1 was the previous default because it was the one all ten locales had
  // actually been run through. It is now safe to raise it on evidence rather than
  // hope: the AI reviewer scores the output, so a regression shows up as findings
  // instead of going unnoticed. Revert to 'gpt-4.1' if this model regresses.
  modelName: process.env.HUB_I18N_MODEL || 'gpt-5.6-terra',
  // GPT-5.x reasoning models accept only the default temperature and reject any
  // explicit value with a 400. lobe-i18n defaults this to 0 and always sends it,
  // so without pinning it to 1 here every translation call fails on the newer
  // model. Determinism now comes from the reference prompt and the deterministic
  // enforcement pass rather than from a zero temperature.
  temperature: 1,
  // Larger chunks send the system prompt fewer times (less token overhead).
  splitToken: 6000,
  // Serial: paced for the org's OpenAI tier (30k TPM). Raise once the tier is bumped.
  concurrency: 1,
  saveImmediately: true,
  // content/ holds ONLY locale files, so it is a clean lobe entry/output dir.
  entry: 'src/i18n/content/en.json',
  entryLocale: 'en',
  output: 'src/i18n/content',
  outputLocales,
  reference: singleLocale ? reference + terminologyBlock(singleLocale) : reference,
});
