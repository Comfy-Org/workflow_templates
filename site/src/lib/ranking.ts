/**
 * Fetches per-template popularity (`run_clicks`) from the Algolia `templates_index`
 * once per build, as a `Map<shareId, RankingSignal>`. Serializers and the search
 * index builder use it to override `SerializedTemplate.usage` from one place.
 *
 * Enrichment overlay, not catalog data: with no Algolia key or on query failure it
 * returns an empty map so callers fall back to the backend `usage`. Never throws.
 */
// `/lite` resolves to the Node build here (typed), not the browser build whose
// XMLHttpRequest is absent under Node — this runs at build time. Read-only; no
// gateway/circuit-breaker (that's for live client-side search).
import { liteClient as algoliasearch, type SearchResponse } from 'algoliasearch/lite';

/** Popularity signal for a single template. */
export interface RankingSignal {
  /** Real run-button clicks over the mart's usage window (currently 90 days). */
  runClicks: number;
}

/** Ranking map keyed by shareId (Algolia `objectID`). */
export type RankingMap = Map<string, RankingSignal>;

/** Minimal shape of an Algolia `templates_index` record we depend on. */
interface AlgoliaTemplateRecord {
  objectID: string;
  slug?: string;
  run_clicks?: number;
}

/** Algolia's max `hitsPerPage`; the index fits in one page today, but we paginate. */
const HITS_PER_PAGE = 1000;

/**
 * Read a PUBLIC_ env var in both the Vite runtime (`import.meta.env`, used by
 * `src/lib` at Astro build) and plain Node scripts (`process.env`, used by
 * `scripts/`). Either may be undefined depending on the caller's context.
 */
function readEnv(key: string): string {
  const fromVite =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env as Record<string, string | undefined>)[key]
      : undefined;
  const fromNode = typeof process !== 'undefined' ? process.env?.[key] : undefined;
  return (fromVite ?? fromNode ?? '').trim();
}

function getConfig(): { appId: string; searchKey: string; indexName: string } | null {
  const appId = readEnv('PUBLIC_ALGOLIA_APP_ID');
  const searchKey = readEnv('PUBLIC_ALGOLIA_SEARCH_KEY');
  if (!appId || !searchKey) return null;
  const indexName = readEnv('PUBLIC_ALGOLIA_TEMPLATES_INDEX') || 'templates_index';
  return { appId, searchKey, indexName };
}

/**
 * Fetch every record from the Algolia index via the lite client's `search`
 * (the lite build has no `browseObjects`), paginating until all pages are read.
 */
async function fetchAllRecords(
  appId: string,
  searchKey: string,
  indexName: string
): Promise<AlgoliaTemplateRecord[]> {
  const client = algoliasearch(appId, searchKey);
  const records: AlgoliaTemplateRecord[] = [];
  let page = 0;
  let nbPages = 1;

  do {
    const response = await client.search<AlgoliaTemplateRecord>({
      requests: [{ indexName, query: '', hitsPerPage: HITS_PER_PAGE, page }],
    });
    // A search request always yields a SearchResponse (never the facet-values
    // variant of the results union), so narrow to it for typed hits/nbPages.
    const result = response.results[0] as SearchResponse<AlgoliaTemplateRecord>;
    records.push(...result.hits);
    nbPages = result.nbPages ?? 1;
    page += 1;
  } while (page < nbPages);

  return records;
}

let rankingCache: Promise<RankingMap> | null = null;

/**
 * Fetch and cache the ranking map. Called across many pages during a single
 * build; the actual Algolia request fires only once. Never throws — a missing
 * key or a failed query yields an empty map and a single warning.
 */
export function fetchRankingMap(): Promise<RankingMap> {
  if (rankingCache) return rankingCache;

  rankingCache = (async () => {
    const config = getConfig();
    if (!config) {
      console.warn(
        '[ranking] No Algolia credentials (PUBLIC_ALGOLIA_APP_ID / PUBLIC_ALGOLIA_SEARCH_KEY) — ' +
          'falling back to backend usage for ranking.'
      );
      return new Map();
    }

    try {
      const records = await fetchAllRecords(config.appId, config.searchKey, config.indexName);
      const map: RankingMap = new Map();
      for (const record of records) {
        if (!record.objectID) continue;
        const runClicks = typeof record.run_clicks === 'number' ? record.run_clicks : 0;
        map.set(record.objectID, { runClicks });
      }
      return map;
    } catch (err) {
      console.warn(
        `[ranking] Failed to fetch Algolia ${config.indexName} — falling back to backend usage: ${err}`
      );
      return new Map();
    }
  })();

  return rankingCache;
}

/**
 * Popularity for a template: positive Algolia `run_clicks`, else backend `usage`,
 * else 0. A `run_clicks` of 0 is "no signal" (a record can exist before clicks are
 * backfilled), so it never overrides a nonzero `usage`.
 */
export function applyRanking(
  shareId: string,
  usage: number | undefined,
  rankingMap: RankingMap | undefined
): number {
  const runClicks = rankingMap?.get(shareId)?.runClicks;
  if (runClicks && runClicks > 0) return runClicks;
  return usage ?? 0;
}
