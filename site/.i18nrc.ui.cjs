// Configuration for @lobehub/i18n-cli — translates the site's UI CHROME strings
// (buttons, labels, meta title patterns) from src/i18n/locales/en.json into the
// missing keys of each locale file. Run: `pnpm locale:ui`.
//
// Separate from .i18nrc.cjs (which translates workflow content) because it has a
// different entry/output and different rules (short UI strings with {placeholders}).
const { defineConfig } = require('@lobehub/i18n-cli');

let preserveTerms = [];
try {
  preserveTerms = require('./i18n/glossary/preserve-terms.json');
} catch {
  /* glossary not synced yet */
}

module.exports = defineConfig({
  modelName: 'gpt-4.1',
  splitToken: 1024,
  saveImmediately: true,
  entry: 'src/i18n/locales/en.json',
  entryLocale: 'en',
  output: 'src/i18n/locales',
  outputLocales: ['zh', 'zh-TW', 'ja', 'ko', 'es', 'fr', 'ru', 'tr', 'ar', 'pt-BR'],
  reference: `These are short UI chrome strings for Comfy Workflows (comfy.org/workflows): button labels, section headings, and page title/meta patterns.

Keep interpolation placeholders EXACTLY as written and in place — tokens wrapped in curly braces like {label}, {keyword}, {count}, {name}. Never translate, reorder, remove, or add them.

Never translate these proper nouns (keep them byte-for-byte): ${preserveTerms.join(', ')}. Keep any URL unchanged.

Tone: direct, factual, creator-first; no hype words. Chinese: 'zh' Simplified only, 'zh-TW' Traditional only, never mixed.`,
});
