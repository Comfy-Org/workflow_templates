import * as fs from 'node:fs';
import * as path from 'node:path';
import { ASSET_EXTENSIONS, DEFAULT_LOCALE, LOGO_FILENAME_FIXES } from './constants';
import {
  REPO_ROOT,
  TEMPLATES_DIR,
  CONTENT_DIR,
  THUMBNAILS_DIR,
  WORKFLOWS_DIR,
  LOGOS_SRC_DIR,
  LOGOS_DEST_DIR,
  AVATARS_SRC_DIR,
  AVATARS_DEST_DIR,
} from './paths';

export const DETAIL_IMAGES_DIR = path.join(THUMBNAILS_DIR, 'detail');
import { logger } from './logger';

/**
 * Whether to skip copying template media (thumbnails and detail images) into
 * `public/workflows/thumbnails/`.
 *
 * Hub-backed builds (production, preview, cron) set `PUBLIC_HUB_API_URL`. Every
 * page in those builds takes its thumbnails from the hub index as absolute CDN
 * URLs, so the local copies are never referenced and only inflate the Vercel
 * deploy archive (~1.9 GB). Local, CI and e2e builds leave it unset and keep
 * the copies, because the content-collection fallback and `tests/e2e.spec.ts`
 * serve `/workflows/thumbnails/...` from them.
 *
 * Set `SYNC_LOCAL_MEDIA=true` to force the copy even when the hub is configured.
 */
export function isLocalMediaCopySkipped(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.SYNC_LOCAL_MEDIA === 'true') return false;
  return Boolean(env.PUBLIC_HUB_API_URL?.trim());
}

const skippedMediaSources = new Map<string, number>();

/** Files and bytes that `copyThumbnails` / `copyDetailImages` skipped in this run. */
export function getSkippedMediaStats(): { files: number; bytes: number } {
  let bytes = 0;
  for (const size of skippedMediaSources.values()) bytes += size;
  return { files: skippedMediaSources.size, bytes };
}

function recordSkippedMedia(src: string): void {
  skippedMediaSources.set(src, fs.statSync(src).size);
}

export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function findThumbnails(templateName: string): string[] {
  const extPattern = ASSET_EXTENSIONS.map((e) => escapeRegExp(e)).join('|');
  const pattern = new RegExp(`^${escapeRegExp(templateName)}-\\d+(${extPattern})$`);
  const files = fs.readdirSync(TEMPLATES_DIR);
  return files
    .filter((file) => pattern.test(file))
    .sort((a, b) => {
      const numA = parseInt(a.match(/-(\d+)\./)?.[1] || '0');
      const numB = parseInt(b.match(/-(\d+)\./)?.[1] || '0');
      return numA - numB;
    });
}

export function copyThumbnails(templateName: string): void {
  const extPattern = ASSET_EXTENSIONS.map((e) => escapeRegExp(e)).join('|');
  const pattern = new RegExp(`^${escapeRegExp(templateName)}-\\d+(${extPattern})$`);

  const skip = isLocalMediaCopySkipped();
  const files = fs.readdirSync(TEMPLATES_DIR);
  for (const file of files) {
    if (pattern.test(file)) {
      const src = path.join(TEMPLATES_DIR, file);
      if (skip) {
        recordSkippedMedia(src);
        continue;
      }
      const dest = path.join(THUMBNAILS_DIR, file);
      if (!fs.existsSync(dest) || fs.statSync(src).mtime > fs.statSync(dest).mtime) {
        fs.copyFileSync(src, dest);
      }
    }
  }
}

/**
 * Copy detail images specified in the `thumbnail` field of index.json into
 * DETAIL_IMAGES_DIR. Paths are relative to the repo root (e.g. "input/foo.png",
 * "output/bar.mp4"). Returns the flat filenames for use as `detailImages`, or
 * an empty list when the local media copy is skipped (see `isLocalMediaCopySkipped`).
 */
export function copyDetailImages(thumbnailPaths: string[]): string[] {
  if (isLocalMediaCopySkipped()) {
    for (const relPath of thumbnailPaths) {
      const src = path.join(REPO_ROOT, relPath);
      if (fs.existsSync(src)) recordSkippedMedia(src);
    }
    return [];
  }
  if (!fs.existsSync(DETAIL_IMAGES_DIR)) {
    fs.mkdirSync(DETAIL_IMAGES_DIR, { recursive: true });
  }
  const result: string[] = [];
  for (const relPath of thumbnailPaths) {
    const src = path.join(REPO_ROOT, relPath);
    if (!fs.existsSync(src)) {
      logger.warn(`  Warning: detail image not found: ${relPath}`);
      continue;
    }
    const destName = path.basename(relPath);
    const dest = path.join(DETAIL_IMAGES_DIR, destName);
    if (!fs.existsSync(dest) || fs.statSync(src).mtime > fs.statSync(dest).mtime) {
      fs.copyFileSync(src, dest);
    }
    result.push(`detail/${destName}`);
  }
  return result;
}

export function copyWorkflowJson(templateName: string): void {
  const src = path.join(TEMPLATES_DIR, `${templateName}.json`);
  const dest = path.join(WORKFLOWS_DIR, `${templateName}.json`);

  if (!fs.existsSync(src)) {
    return;
  }

  if (!fs.existsSync(dest) || fs.statSync(src).mtime > fs.statSync(dest).mtime) {
    fs.copyFileSync(src, dest);
  }
}

export function ensureDirectories(locales: string[]): void {
  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
  }

  for (const locale of locales) {
    if (locale === DEFAULT_LOCALE) continue;
    const localeDir = path.join(CONTENT_DIR, locale);
    if (!fs.existsSync(localeDir)) {
      fs.mkdirSync(localeDir, { recursive: true });
    }
  }

  if (!fs.existsSync(THUMBNAILS_DIR)) {
    fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
  }

  if (!fs.existsSync(WORKFLOWS_DIR)) {
    fs.mkdirSync(WORKFLOWS_DIR, { recursive: true });
  }

  if (!fs.existsSync(LOGOS_DEST_DIR)) {
    fs.mkdirSync(LOGOS_DEST_DIR, { recursive: true });
  }

  if (!fs.existsSync(AVATARS_DEST_DIR)) {
    fs.mkdirSync(AVATARS_DEST_DIR, { recursive: true });
  }
}

export function syncLogos(): number {
  if (!fs.existsSync(LOGOS_SRC_DIR)) {
    logger.warn('  Warning: logos source directory not found, skipping logo sync');
    return 0;
  }

  let count = 0;
  for (const file of fs.readdirSync(LOGOS_SRC_DIR)) {
    if (!file.endsWith('.png') && !file.endsWith('.svg')) continue;
    const src = path.join(LOGOS_SRC_DIR, file);
    const destName = LOGO_FILENAME_FIXES[file] || file;
    const dest = path.join(LOGOS_DEST_DIR, destName);
    if (!fs.existsSync(dest) || fs.statSync(src).mtime > fs.statSync(dest).mtime) {
      fs.copyFileSync(src, dest);
      count++;
    }
  }
  return count;
}

export function syncAvatars(): number {
  if (!fs.existsSync(AVATARS_SRC_DIR)) {
    logger.warn('  Warning: avatars source directory not found, skipping avatar sync');
    return 0;
  }

  let count = 0;
  for (const file of fs.readdirSync(AVATARS_SRC_DIR)) {
    if (!file.endsWith('.png') && !file.endsWith('.webp')) continue;
    const src = path.join(AVATARS_SRC_DIR, file);
    const dest = path.join(AVATARS_DEST_DIR, file);
    if (!fs.existsSync(dest) || fs.statSync(src).mtime > fs.statSync(dest).mtime) {
      fs.copyFileSync(src, dest);
      count++;
    }
  }
  return count;
}

export function getOutputPath(templateName: string, locale: string): string {
  if (locale === DEFAULT_LOCALE) {
    return path.join(CONTENT_DIR, `${templateName}.json`);
  }
  return path.join(CONTENT_DIR, locale, `${templateName}.json`);
}
