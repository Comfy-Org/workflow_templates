/**
 * Builds a MiniSearch index from synced template data and writes it to public/.
 * The index is loaded on the client for instant search in the SearchPopover.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import MiniSearch from 'minisearch';
import { CONTENT_DIR, SITE_DIR } from '../paths';
import { logger } from '../logger';
import { tagDisplayName, tagSearchText } from '../../../src/lib/tag-aliases';
import {
  SEARCH_FIELDS,
  STORE_FIELDS,
  tokenize,
  searchOptions,
} from '../../../src/lib/search-config';
import { applyRanking, fetchRankingMap } from '../../../src/lib/ranking';

interface SearchDocument {
  id: string;
  title: string;
  description: string;
  tags: string;
  models: string;
  mediaType: string;
  mediaTypeLabel: string;
  username: string;
  creatorName: string;
  // Stored fields for display (not searched)
  name: string;
  slug: string;
  thumbnail: string;
  usage: number;
  tagsArray: string[];
}

/** Shape returned by GET /api/hub/workflows/index */
interface IndexEntry {
  name?: string;
  title?: string;
  description?: string;
  tags?: string[];
  models?: string[];
  mediaType?: string;
  username?: string;
  thumbnailUrl?: string;
  shareId?: string;
  usage?: number;
}

const MEDIA_TYPE_LABELS: Record<string, string> = {
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  '3d': '3D',
};

/**
 * Fetch workflow index entries from the hub API.
 * Returns `null` when no API URL is configured (local dev).
 * Throws when the API is configured but returns an error or empty response.
 */
async function fetchIndexEntries(): Promise<IndexEntry[] | null> {
  const apiUrl = (process.env.PUBLIC_HUB_API_URL || '').replace(/\/$/, '');
  if (!apiUrl) return null;

  const approvedOnly = process.env.PUBLIC_APPROVED_ONLY === 'true';
  const statuses = approvedOnly ? 'approved' : 'pending,approved,rejected,deprecated';
  const res = await fetch(`${apiUrl}/api/hub/workflows/index?status=${statuses}`, {
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Hub API returned ${res.status}: ${res.statusText}`);
  }
  const entries = (await res.json()) as IndexEntry[];
  if (entries.length === 0) {
    throw new Error('Hub API returned empty index');
  }
  return entries;
}

async function fetchProfileDisplayName(username: string): Promise<string> {
  const apiUrl = (process.env.PUBLIC_HUB_API_URL || '').replace(/\/$/, '');
  if (!apiUrl) return username;
  try {
    const res = await fetch(`${apiUrl}/api/hub/profiles/${encodeURIComponent(username)}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return username;
    const profile = (await res.json()) as { display_name?: string };
    return profile.display_name || username;
  } catch {
    return username;
  }
}

export async function buildSearchIndex(): Promise<void> {
  const startTime = Date.now();

  const documents: SearchDocument[] = [];

  // Override usage with Algolia run_clicks so the popover's "X runs" matches ranking.
  // Both fetches are independent — run them concurrently.
  const [rankingMap, hubEntries] = await Promise.all([fetchRankingMap(), fetchIndexEntries()]);
  if (hubEntries) {
    logger.info(`Building search index from hub API (${hubEntries.length} entries)`);

    // Resolve display names from profile API
    const usernames = [...new Set(hubEntries.map((e) => e.username).filter(Boolean) as string[])];
    const displayNames = new Map<string, string>();
    const results = await Promise.allSettled(
      usernames.map(async (u) => ({ username: u, displayName: await fetchProfileDisplayName(u) }))
    );
    for (const r of results) {
      if (r.status === 'fulfilled') {
        displayNames.set(r.value.username, r.value.displayName);
      }
    }

    for (const data of hubEntries) {
      const username = data.username || 'ComfyUI';
      const creatorName = displayNames.get(username) || username;
      const tags = data.tags || [];
      const models = data.models || [];
      const shareId = data.shareId || '';
      const name = data.name || shareId;
      // shareId is the unique key — only skip if neither field can identify the workflow.
      if (!name) continue;
      const id = shareId || name;
      const slug = shareId ? `${name}-${shareId}` : name;

      documents.push({
        id,
        title: data.title || name,
        description: data.description || '',
        tags: tags.map(tagSearchText).join(' '),
        models: models.join(' '),
        mediaType: data.mediaType || 'image',
        mediaTypeLabel: MEDIA_TYPE_LABELS[data.mediaType || ''] || data.mediaType || 'image',
        username,
        creatorName,
        name,
        slug,
        thumbnail: data.thumbnailUrl || '',
        usage: applyRanking(shareId, data.usage, rankingMap),
        tagsArray: tags.map(tagDisplayName),
      });
    }
  } else {
    // No PUBLIC_HUB_API_URL — local/offline build from the content collection.
    // These entries lack shareId, so the ranking map can't join; usage falls back
    // to the local value (offline builds have neither the hub API nor Algolia).
    const files = fs
      .readdirSync(CONTENT_DIR)
      .filter((f) => f.endsWith('.json') && !f.includes('/'));
    logger.warn(
      `No hub API configured — building search index from content collection (${files.length} files)`
    );

    for (const file of files) {
      const filePath = path.join(CONTENT_DIR, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      const username = data.username || 'ComfyUI';
      const tags: string[] = data.tags || [];
      const models: string[] = data.models || [];
      const thumbnails: string[] = data.thumbnails || [];

      const shareId = data.shareId || '';
      const name = data.name || shareId;
      const id = shareId || name;
      const slug = shareId ? `${name}-${shareId}` : name;

      documents.push({
        id,
        title: data.title || name,
        description: data.description || '',
        tags: tags.map(tagSearchText).join(' '),
        models: models.join(' '),
        mediaType: data.mediaType || 'image',
        mediaTypeLabel: MEDIA_TYPE_LABELS[data.mediaType] || data.mediaType,
        username,
        creatorName: username,
        name,
        slug,
        thumbnail: thumbnails[0] || '',
        usage: applyRanking(shareId, data.usage, rankingMap),
        tagsArray: tags.map(tagDisplayName),
      });
    }
  }

  logger.info(`Indexing ${documents.length} templates...`);

  // Field config + tokenizer come from the SHARED search-config so the index and
  // the client query layer never drift. (searchOptions is NOT serialized by
  // MiniSearch — the client re-specifies it at query time; we set sensible
  // defaults here only for any in-process searches.)
  const miniSearch = new MiniSearch<SearchDocument>({
    fields: [...SEARCH_FIELDS],
    storeFields: [...STORE_FIELDS],
    tokenize,
    searchOptions: searchOptions() as Record<string, unknown>,
  });

  miniSearch.addAll(documents);

  // Write to public/
  const outputDir = path.join(SITE_DIR, 'public', 'workflows');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, 'search-index.json');
  const serialized = JSON.stringify(miniSearch);
  fs.writeFileSync(outputPath, serialized);

  const sizeKB = (Buffer.byteLength(serialized) / 1024).toFixed(1);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  logger.info(
    `Search index written to public/workflows/search-index.json (${sizeKB} KB, ${duration}s)`
  );
}
