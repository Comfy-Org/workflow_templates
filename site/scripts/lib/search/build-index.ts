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
  thumbnail: string;
  usage: number;
  tagsArray: string[];
}

interface CreatorsJson {
  [username: string]: {
    displayName: string;
    handle: string;
    summary?: string;
    social?: string;
  };
}

const MEDIA_TYPE_LABELS: Record<string, string> = {
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  '3d': '3D',
};

async function fetchIndexEntries(): Promise<Array<Record<string, unknown>> | null> {
  const apiUrl = (process.env.PUBLIC_HUB_API_URL || '').replace(/\/$/, '');
  if (!apiUrl) return null;
  try {
    const res = await fetch(`${apiUrl}/api/hub/workflows/index`);
    if (!res.ok) return null;
    return (await res.json()) as Array<Record<string, unknown>>;
  } catch {
    return null;
  }
}

export async function buildSearchIndex(): Promise<void> {
  const startTime = Date.now();

  // Load creators mapping (fallback for display names)
  const creatorsPath = path.join(SITE_DIR, 'creators.json');
  let creators: CreatorsJson = {};
  if (fs.existsSync(creatorsPath)) {
    creators = JSON.parse(fs.readFileSync(creatorsPath, 'utf-8'));
  }

  const documents: SearchDocument[] = [];

  // Try hub API first, fall back to content collection files
  const hubEntries = await fetchIndexEntries();
  if (hubEntries) {
    logger.info(`Building search index from hub API (${hubEntries.length} entries)`);
    for (const data of hubEntries) {
      const username = (data.username as string) || 'ComfyUI';
      const creatorInfo = creators[username];
      const creatorName = creatorInfo?.displayName || username;
      const tags: string[] = (data.tags as string[]) || [];
      const models: string[] = (data.models as string[]) || [];
      const thumbnailUrl = (data.thumbnailUrl as string) || '';
      const shareId = (data.shareId as string) || '';
      const name = (data.name as string) || shareId;

      documents.push({
        id: name,
        title: (data.title as string) || name,
        description: (data.description as string) || '',
        tags: tags.map(tagSearchText).join(' '),
        models: models.join(' '),
        mediaType: (data.mediaType as string) || 'image',
        mediaTypeLabel: MEDIA_TYPE_LABELS[(data.mediaType as string)] || (data.mediaType as string) || 'image',
        username,
        creatorName,
        thumbnail: thumbnailUrl,
        usage: 0,
        tagsArray: tags.map(tagDisplayName),
      });
    }
  } else {
    // Fallback: read from synced content collection files
    const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json') && !f.includes('/'));
    logger.info(`Building search index from content collection (${files.length} files)`);

    for (const file of files) {
      const filePath = path.join(CONTENT_DIR, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      const username = data.username || 'ComfyUI';
      const creatorInfo = creators[username];
      const creatorName = creatorInfo?.displayName || username;
      const tags: string[] = data.tags || [];
      const models: string[] = data.models || [];
      const thumbnails: string[] = data.thumbnails || [];

      documents.push({
        id: data.name,
        title: data.title || data.name,
        description: data.description || '',
        tags: tags.map(tagSearchText).join(' '),
        models: models.join(' '),
        mediaType: data.mediaType || 'image',
        mediaTypeLabel: MEDIA_TYPE_LABELS[data.mediaType] || data.mediaType,
        username,
        creatorName,
        thumbnail: thumbnails[0] || '',
        usage: data.usage || 0,
        tagsArray: tags.map(tagDisplayName),
      });
    }
  }

  logger.info(`Indexing ${documents.length} templates...`);

  // Custom tokenizer: keep hyphenated terms as single tokens AND emit sub-parts.
  // e.g. "flux-image-to-video" → ["flux-image-to-video", "flux", "image", "to", "video"]
  // This lets "z-image" match as a prefix against "z-image-to-video" style titles.
  const tokenize = (text: string): string[] => {
    const tokens: string[] = [];
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    for (const word of words) {
      tokens.push(word);
      if (word.includes('-')) {
        for (const part of word.split('-')) {
          if (part) tokens.push(part);
        }
      }
    }
    return tokens;
  };

  const miniSearch = new MiniSearch<SearchDocument>({
    fields: ['title', 'description', 'tags', 'models', 'mediaType', 'creatorName'],
    storeFields: [
      'title',
      'mediaType',
      'mediaTypeLabel',
      'thumbnail',
      'username',
      'creatorName',
      'usage',
      'tagsArray',
    ],
    tokenize,
    searchOptions: {
      boost: { title: 3, models: 2, tags: 2, creatorName: 1.5, mediaType: 1, description: 0.5 },
      prefix: true,
      fuzzy: 0.2,
      tokenize,
    },
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
  logger.info(`Search index written to public/workflows/search-index.json (${sizeKB} KB, ${duration}s)`);
}
