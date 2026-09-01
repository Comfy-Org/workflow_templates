/**
 * Every English /workflows/* page that renders <BaseLayout> must pass an
 * explicit hreflangLocales (or hreflangLocalized={false} for an English-only
 * route) instead of relying on BaseLayout's default.
 *
 * That default (clusterLocales(true) with no explicit list) resolves to every
 * SUPPORTED_HUB_LOCALES entry — the locales the hub builds routes for, not the
 * INDEXABLE_LOCALES subset that has actually cleared native review and has a
 * live /{locale}/... route. "it" sits in the gap between those two sets today:
 * it is supported (LANGUAGES has an entry, so /it/workflows/* is a candidate
 * route the hub "deliberately builds and serves") but not indexable (no native
 * review wave has run, so no /it/... page is actually built). Falling through
 * to the default therefore advertised <link rel="alternate" hreflang="it"
 * href=".../it/workflows/..."> pointing at a 404 on every un-fixed page.
 *
 * This is a guard against the same omission recurring on a new /workflows/*
 * page, not a render test — it keys off the source text of each route file.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROUTES_DIR = path.join(process.cwd(), 'src', 'pages', 'workflows');

// This page is unconditionally noindex — its hreflang cluster is moot for
// crawling/indexing, and it is a one-off interactive demo, not part of the
// hub's localization surface. Out of scope for this guard.
const EXEMPT_ROUTES = new Set(['minimax-h3-multiref.astro']);

function astroFilesIn(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return astroFilesIn(full);
    return entry.name.endsWith('.astro') ? [full] : [];
  });
}

describe('English /workflows/* hreflang coverage', () => {
  const routes = astroFilesIn(ROUTES_DIR)
    .map((file) => ({
      route: path.relative(ROUTES_DIR, file),
      source: fs.readFileSync(file, 'utf-8'),
    }))
    .filter(({ route }) => !EXEMPT_ROUTES.has(route))
    .filter(({ source }) => /<BaseLayout\b/.test(source));

  it('finds the routes it is meant to be checking', () => {
    // Without this the suite would pass vacuously if the directory ever moved
    // or every route were accidentally added to EXEMPT_ROUTES.
    expect(routes.length).toBeGreaterThan(4);
  });

  it('never falls through to hreflangLocalized/BaseLayout defaults', () => {
    const uncovered = routes
      .filter(
        ({ source }) => !/hreflangLocales=\{/.test(source) && !/hreflangLocalized=\{false\}/.test(source)
      )
      .map(({ route }) => route);

    expect(
      uncovered,
      `These English /workflows/* routes render <BaseLayout> without an explicit ` +
        `hreflangLocales (or hreflangLocalized={false}), so they fall through to ` +
        `BaseLayout's default cluster — every SUPPORTED_HUB_LOCALES entry, which ` +
        `includes locales with no built route (e.g. "it"): ${uncovered.join(', ')}`
    ).toEqual([]);
  });

  it('never derives hreflangLocales from LANGUAGES/SUPPORTED_HUB_LOCALES/AVAILABLE_APP_LOCALES', () => {
    // A page could pass the hreflangLocales= check above while still reaching
    // for the wrong source set (e.g. Object.keys(LANGUAGES) or LOCALES instead
    // of INDEXABLE_LOCALES). Flag any route whose hreflangLocales computation
    // touches one of those wider sets directly.
    const wrongSource = routes
      .filter(({ source }) => /hreflangLocales=\{/.test(source))
      .filter(({ source }) =>
        /\.\.\.(LANGUAGES|LOCALES|SUPPORTED_HUB_LOCALES|AVAILABLE_APP_LOCALES)\b/.test(source) ||
        /Object\.keys\(LANGUAGES\)/.test(source)
      )
      .map(({ route }) => route);

    expect(
      wrongSource,
      `These routes compute hreflangLocales from a wider locale set than ` +
        `INDEXABLE_LOCALES, which will advertise unbuilt locale routes: ${wrongSource.join(', ')}`
    ).toEqual([]);
  });
});
