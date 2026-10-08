/**
 * Client-side loader + shared type for the full workflow catalog
 * (/workflows/grid.json, produced by src/pages/workflows/grid.json.ts).
 *
 * The catalog is lazy-loaded once and shared across all islands + across
 * navigation (module-level cache). Grid and search islands render an embedded
 * top-N slice for instant paint, then hydrate the full set from here on demand,
 * instead of embedding the whole ~580-workflow catalog in every page's HTML.
 */
import type { SerializedTemplate } from './hub-api';

/**
 * Catalog entry shape consumed by grid/search islands. Mirrors
 * `SerializedTemplate` minus `description`, which neither the grid card nor the
 * search badge-filter reads and which is the heaviest per-entry field.
 */
export type GridTemplate = Omit<SerializedTemplate, 'description'>;

// Module-level cache — the fetch fires at most once per locale per page-load
// session. Keyed by locale because a page can only ever want its own, but the
// English and localized catalogs differ and must not share an entry.
const catalogPromises = new Map<string, Promise<GridTemplate[]>>();

/** English lives at the unprefixed path; every other locale has its own twin. */
function catalogUrl(locale: string): string {
  return locale && locale !== 'en' ? `/${locale}/workflows/grid.json` : '/workflows/grid.json';
}

export function loadCatalog(locale = 'en'): Promise<GridTemplate[]> {
  const cached = catalogPromises.get(locale);
  if (cached) return cached;

  const promise = fetch(catalogUrl(locale), { signal: AbortSignal.timeout(8000) })
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load catalog: ${res.status}`);
      return res.json() as Promise<GridTemplate[]>;
    })
    .catch((err) => {
      // Reset so a later interaction can retry a transient failure.
      catalogPromises.delete(locale);
      throw err;
    });
  catalogPromises.set(locale, promise);
  return promise;
}

/** Clear the module cache (tests only). */
export function __resetCatalogCache(): void {
  catalogPromises.clear();
}
