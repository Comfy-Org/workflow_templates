/**
 * Per-locale twin of `/workflows/grid.json`.
 *
 * The grid island paints an embedded slice for instant first render and then
 * replaces its working set with this catalog. On a localized page that embedded
 * slice is translated, so without a translated catalog to swap in the cards
 * would revert to English the moment the fetch resolved: correct in the served
 * HTML, wrong a heartbeat later in front of the reader.
 *
 * Only `title` is resolved. `description` is dropped from the catalog (see the
 * English route) and nothing else on an entry is language-dependent, so the
 * translation happens before the drop and the shapes stay identical.
 */
import type { APIRoute } from 'astro';
import { listWorkflowIndex, getProfileCache, serializeIndexEntry } from '../../../lib/hub-api';
import type { GridTemplate } from '../../../lib/catalog';
import { fetchRankingMap } from '../../../lib/ranking';
import { localizeCards } from '../../../lib/i18n/localize-cards';
import { SUPPORTED_HUB_LOCALES } from '../../../lib/i18n/locales';
import { DEFAULT_LOCALE, type Locale } from '../../../i18n/config';

export function getStaticPaths() {
  // English is served by its own route; emitting it here too would give the
  // same catalog two URLs.
  return SUPPORTED_HUB_LOCALES.filter((locale) => locale !== DEFAULT_LOCALE).map((locale) => ({
    params: { locale },
  }));
}

export const GET: APIRoute = async ({ params }) => {
  const locale = params.locale as Locale;
  let catalog: GridTemplate[] = [];
  try {
    const [entries, profiles, rankingMap] = await Promise.all([
      listWorkflowIndex(),
      getProfileCache(),
      fetchRankingMap(),
    ]);
    catalog = localizeCards(
      entries.map((entry) => serializeIndexEntry(entry, profiles, rankingMap)),
      locale
    ).map(({ description: _description, ...rest }) => rest);
  } catch (err) {
    // Fail the build rather than emit an empty 200, matching the English route:
    // a cacheable empty catalog is worse than no deploy.
    throw new Error(
      `grid.json (${locale}): failed to build the workflow catalog from the Hub index: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  return new Response(JSON.stringify(catalog), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
