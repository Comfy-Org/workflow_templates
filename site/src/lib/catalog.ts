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

// Module-level cache — the fetch fires at most once per page-load session.
let catalogPromise: Promise<GridTemplate[]> | null = null;

export function loadCatalog(): Promise<GridTemplate[]> {
  if (!catalogPromise) {
    catalogPromise = fetch('/workflows/grid.json', { signal: AbortSignal.timeout(8000) })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load catalog: ${res.status}`);
        return res.json() as Promise<GridTemplate[]>;
      })
      .catch((err) => {
        // Reset so a later interaction can retry a transient failure.
        catalogPromise = null;
        throw err;
      });
  }
  return catalogPromise;
}
