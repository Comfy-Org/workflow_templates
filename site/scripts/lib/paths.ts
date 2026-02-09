import * as path from 'node:path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
export const SITE_DIR = path.resolve(__dirname, '..', '..');
export const TEMPLATES_DIR = path.join(SITE_DIR, '..', 'templates');
export const CONTENT_DIR = path.join(SITE_DIR, 'src', 'content', 'templates');
export const THUMBNAILS_DIR = path.join(SITE_DIR, 'public', 'thumbnails');
export const WORKFLOWS_DIR = path.join(SITE_DIR, 'public', 'workflows');
export const LOGOS_SRC_DIR = path.join(TEMPLATES_DIR, 'logo');
export const LOGOS_DEST_DIR = path.join(SITE_DIR, 'public', 'logos');
