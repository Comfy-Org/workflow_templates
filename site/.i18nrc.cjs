// Configuration for @lobehub/i18n-cli
// Used to auto-generate translations using OpenAI
// Run: pnpm locale
const { defineConfig } = require('@lobehub/i18n-cli');

module.exports = defineConfig({
  modelName: 'gpt-4.1',
  splitToken: 1024,
  saveImmediately: true,
  entry: 'src/i18n/locales/en.json',
  entryLocale: 'en',
  output: 'src/i18n/locales',
  outputLocales: ['zh', 'zh-TW', 'ja', 'ko', 'es', 'fr', 'ru', 'tr', 'ar', 'pt-BR'],
  reference: `
    ComfyUI-specific terms to keep untranslated: ComfyUI, Comfy Cloud, workflow, node, VRAM, FLUX, SDXL, VAE, LoRA, checkpoint.
    
    IMPORTANT Chinese Translation Guidelines:
    - For 'zh' locale: Use ONLY Simplified Chinese characters (简体中文).
    - For 'zh-TW' locale: Use ONLY Traditional Chinese characters (繁體中文).
    - NEVER mix Simplified and Traditional Chinese characters within the same locale.
    
    Keep technical terms consistent with ComfyUI documentation.
  `,
});
