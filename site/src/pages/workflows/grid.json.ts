/**
 * Static catalog for the browse grid + search badge-filtering.
 *
 * Prerendered to /workflows/grid.json at build time. Islands lazy-fetch this
 * once (module-cached, shared across navigation) instead of embedding the whole
 * ~580-workflow catalog as serialized props in every page's HTML. See
 * `src/lib/catalog.ts` for the client loader.
 *
 * `description` is dropped: neither the grid card nor the search badge-filter
 * reads it, and it is the single largest per-entry field.
 */
import type { APIRoute } from 'astro';
import { listWorkflowIndex, getProfileCache, serializeIndexEntry } from '../../lib/hub-api';
import type { GridTemplate } from '../../lib/catalog';
import { fetchRankingMap } from '../../lib/ranking';

export const GET: APIRoute = async () => {
  let catalog: GridTemplate[] = [];
  try {
    const [entries, profiles, rankingMap] = await Promise.all([
      listWorkflowIndex(),
      getProfileCache(),
      fetchRankingMap(),
    ]);
    catalog = entries.map((entry) => {
      // Drop `description` from the shared serializer output — unused by both
      // consumers and by far the heaviest field.
      const { description: _description, ...rest } = serializeIndexEntry(
        entry,
        profiles,
        rankingMap
      );
      return rest;
    });
  } catch (err) {
    // The browse grid and search depend on this catalog; emitting an empty 200
    // would ship a broken grid and let the CDN cache it as genuinely empty. Fail
    // the build instead (fail-closed) — a missing Hub index at build time is a
    // deploy-blocking problem, not a supplementary one.
    throw new Error(
      `grid.json: failed to build the workflow catalog from the Hub index: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  return new Response(JSON.stringify(catalog), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
