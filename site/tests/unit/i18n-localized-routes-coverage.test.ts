/**
 * Every localized workflows route that renders workflow cards must localize them.
 *
 * `localizeCards` is applied per route rather than inside the data layer, because
 * the loaders are shared with the English routes and several of them memoize
 * across requests. That is the right call for correctness, but it makes omission
 * the natural failure mode: a new localized route gets its cards from the same
 * English-only hub index and renders a translated page above English cards, with
 * nothing failing to announce it.
 *
 * This is a guard against forgetting, not a render test. It keys off the data
 * source rather than the card component, because a page can render cards through
 * an intermediate island (the hub index passes its templates to HubBrowse) and
 * would otherwise look card-free.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROUTES_DIR = path.join(process.cwd(), 'src', 'pages', '[locale]', 'workflows');

/**
 * Helpers that hand back `SerializedTemplate` data built from the English hub
 * index. A page calling any of these holds card text that needs resolving.
 */
const TEMPLATE_SOURCES = [
  'loadSerializedTemplates',
  'serializeIndexEntry',
  'listRelatedWorkflows',
  'deriveModelGroups',
];

function astroFilesIn(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return astroFilesIn(full);
    return entry.name.endsWith('.astro') ? [full] : [];
  });
}

describe('localized workflows routes', () => {
  const routes = astroFilesIn(ROUTES_DIR).map((file) => ({
    route: path.relative(ROUTES_DIR, file),
    source: fs.readFileSync(file, 'utf-8'),
  }));

  it('finds the routes it is meant to be checking', () => {
    // Without this the suite would pass vacuously if the directory ever moved.
    expect(routes.length).toBeGreaterThan(4);
  });

  it('localizes card text wherever it loads workflow data', () => {
    const unlocalized = routes
      .filter(({ source }) => TEMPLATE_SOURCES.some((fn) => source.includes(fn)))
      .filter(({ source }) => !source.includes('localizeCards'))
      .map(({ route }) => route);

    expect(
      unlocalized,
      `These localized routes load workflow data but never pass it through localizeCards, so they will render English cards on a translated page: ${unlocalized.join(', ')}`
    ).toEqual([]);
  });
});
