/**
 * Shiki highlighting for the API payload blocks.
 *
 * `kanagawa-wave` is the closest bundled theme to the Comfy palette: its
 * background sits nearest `--color-primary-comfy-ink` of any dark theme, its
 * warm beige foreground tracks `--color-primary-comfy-canvas`, and its accent
 * lands 15° off `--color-primary-comfy-yellow` at a muted chroma.
 *
 * Runs at build time for the SDK snippet and in the browser for the fetched
 * payload, so it loads through dynamic imports and the JavaScript regex engine —
 * no Oniguruma wasm, and nothing reaches the island chunk until a block is
 * actually highlighted. Grammars load per language too: the browser pulls JSON
 * for the payload, and a snippet grammar only in the hub-sourced case where the
 * panel rebuilds snippets the build already highlighted.
 */
import type { HighlighterCore } from 'shiki/core';

const CODE_THEME = 'kanagawa-wave';

export type CodeLang = 'json' | 'python' | 'typescript';

// Markup grows ~7x the source and the cost is linear: 128KB takes ~50ms and
// yields ~900KB of DOM, while the 1MB outlier in templates/ would reach 7.7MB.
// Bigger payloads keep the plain-text rendering; this covers 93% of templates.
export const MAX_HIGHLIGHT_BYTES = 128 * 1024;

const GRAMMARS = {
  json: () => import('shiki/langs/json.mjs'),
  python: () => import('shiki/langs/python.mjs'),
  typescript: () => import('shiki/langs/typescript.mjs'),
} satisfies Record<CodeLang, () => Promise<unknown>>;

let pending: Promise<HighlighterCore> | null = null;

function highlighter(): Promise<HighlighterCore> {
  pending ??= Promise.all([import('shiki/core'), import('shiki/engine/javascript')]).then(
    ([{ createHighlighterCore }, { createJavaScriptRegexEngine }]) =>
      createHighlighterCore({
        themes: [import('shiki/themes/kanagawa-wave.mjs')],
        langs: [],
        engine: createJavaScriptRegexEngine(),
      })
  );
  return pending;
}

/**
 * Tokenized spans for a `<pre>` the caller already owns — `structure: 'inline'`
 * drops Shiki's own wrapper, so the element and its classes survive. Null when
 * the code is too large or highlighting fails, leaving callers on raw text.
 */
export async function highlightInline(code: string, lang: CodeLang): Promise<string | null> {
  if (code.length > MAX_HIGHLIGHT_BYTES) return null;
  try {
    const hl = await highlighter();
    if (!hl.getLoadedLanguages().includes(lang)) {
      await hl.loadLanguage((await GRAMMARS[lang]()) as Parameters<typeof hl.loadLanguage>[0]);
    }
    return hl.codeToHtml(code, { lang, theme: CODE_THEME, structure: 'inline' });
  } catch {
    return null;
  }
}
