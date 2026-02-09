import * as fs from 'node:fs';
import * as path from 'node:path';
import { ASSET_EXTENSIONS, DEFAULT_LOCALE, LOGO_FILENAME_FIXES } from './constants';
import {
  TEMPLATES_DIR,
  CONTENT_DIR,
  THUMBNAILS_DIR,
  WORKFLOWS_DIR,
  LOGOS_SRC_DIR,
  LOGOS_DEST_DIR,
} from './paths';
import { logger } from './logger';

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

  const files = fs.readdirSync(TEMPLATES_DIR);
  for (const file of files) {
    if (pattern.test(file)) {
      const src = path.join(TEMPLATES_DIR, file);
      const dest = path.join(THUMBNAILS_DIR, file);
      if (!fs.existsSync(dest) || fs.statSync(src).mtime > fs.statSync(dest).mtime) {
        fs.copyFileSync(src, dest);
      }
    }
  }
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

export function getOutputPath(templateName: string, locale: string): string {
  if (locale === DEFAULT_LOCALE) {
    return path.join(CONTENT_DIR, `${templateName}.json`);
  }
  return path.join(CONTENT_DIR, locale, `${templateName}.json`);
}
