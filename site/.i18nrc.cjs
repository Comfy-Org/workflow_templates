// Configuration for @lobehub/i18n-cli — translates the hub workflow CONTENT
// (titles, descriptions, meta, how-to, FAQs) from the English content-of-record
// into each supported locale's machine layer. Run: `pnpm locale`.
//
// Kept in CommonJS to match the tooling. The reference prompt is composed from
// the committed do-not-translate list so glossary + prompt never drift.
const { defineConfig } = require('@lobehub/i18n-cli');

let preserveTerms = [];
try {
  preserveTerms = require('./i18n/glossary/preserve-terms.json');
} catch {
  // Glossary not synced yet — the deterministic validator still enforces terms.
}

module.exports = defineConfig({
  modelName: 'gpt-4.1',
  splitToken: 2048,
  concurrency: 5,
  saveImmediately: true,
  // content/ holds ONLY locale files, so it is a clean lobe entry/output dir.
  entry: 'src/i18n/content/en.json',
  entryLocale: 'en',
  output: 'src/i18n/content',
  outputLocales: ['zh', 'zh-TW', 'ja', 'ko', 'es', 'fr', 'ru', 'tr', 'ar', 'pt-BR'],
  reference: `This is SEO page content for Comfy Workflows (comfy.org/workflows), a catalog of ComfyUI workflow templates. Each value is a workflow's title, description, meta description, extended description, how-to steps, suggested use cases, or FAQ. Preserve JSON structure exactly: translate only string values, never keys, and keep every array the same length.

Never translate these proper nouns (brand, product, model, and node names) — keep them byte-for-byte:
${preserveTerms.join(', ')}
Also keep any URL, file name, and share id unchanged.

Translate for search intent, not word-for-word: use the words each market actually searches for. Common technique terms (inpainting, upscaling, image to video, text to image, etc.) SHOULD be translated to the natural local term, and should match the wording used in the ComfyUI product UI for that language.

Tone: direct, factual, creator-first. The human directs the model; never phrase it as the AI creating for the user. Do not introduce hype words (no local equivalents of "stunning", "powerful", "seamless", "effortless", "unlock", "revolutionary").

Chinese: for 'zh' use ONLY Simplified Chinese characters; for 'zh-TW' use ONLY Traditional Chinese with Taiwan terminology. Never mix Simplified and Traditional within one locale.`,
});
