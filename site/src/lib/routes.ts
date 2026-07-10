import { tagSlug } from './tag-aliases';
import { absoluteUrl } from '../config/site';

/**
 * Prefix a root-relative path with the locale segment, matching the site's
 * routing (`prefixDefaultLocale: false` — English stays unprefixed). Mirrors
 * `localizeUrl` but takes a plain `string` locale so route helpers stay usable
 * from both Astro pages and Vue islands without importing the `Locale` type.
 */
const localize = (path: string, locale?: string) =>
  locale && locale !== 'en' ? `/${locale}${path}` : path;

export const categoryPath = (type: string) => `/workflows/category/${type}/`;
const MODEL_BASE = '/workflows/model/';
export const modelsIndexPath = (locale?: string) => localize(MODEL_BASE, locale);
export const modelPath = (name: string, locale?: string) =>
  localize(`${MODEL_BASE}${name}/`, locale);
export const tagPath = (tag: string, locale?: string) =>
  localize(`/workflows/tag/${tagSlug(tag)}/`, locale);
const USE_CASES_BASE = '/workflows/use-cases/';
export const useCasesIndexPath = (locale?: string) => localize(USE_CASES_BASE, locale);
export const useCasePath = (slug: string, locale?: string) =>
  localize(`${USE_CASES_BASE}${slug}/`, locale);
export const creatorPath = (username: string, locale?: string) =>
  localize(`/workflows/${encodeURIComponent(username)}/`, locale);
export const thumbnailPath = (asset: string) =>
  asset.startsWith('http://') || asset.startsWith('https://')
    ? asset
    : `/workflows/thumbnails/${asset}`;

/**
 * Resolve a thumbnail asset to an absolute URL for structured-data image fields.
 * Hub-CDN URLs are already absolute; local assets are rooted then absolutized.
 * Returns `undefined` for a missing thumbnail so callers can omit the field.
 */
export const resolveAbsoluteThumbnail = (
  thumbnail: string | null | undefined
): string | undefined => {
  if (!thumbnail) return undefined;
  const rooted = thumbnailPath(thumbnail);
  return rooted.startsWith('http') ? rooted : absoluteUrl(rooted);
};

/**
 * Build the URL slug component (no `/workflows/` prefix, no locale).
 *
 * Falls back to `shareId` as the name when `name` is missing — a workflow with
 * a `shareId` is still findable, so we never hide it from the user. Only
 * returns `null` when both `name` and `shareId` are missing, which is the only
 * case where no detail page can exist.
 */
export function workflowDetailSlug(
  name: string | null | undefined,
  shareId?: string | null
): string | null {
  const effectiveName = name || shareId;
  if (!effectiveName) return null;
  return shareId ? `${effectiveName}-${shareId}` : effectiveName;
}

/**
 * Build a workflow detail URL. Returns `null` only when both `name` and
 * `shareId` are missing (no detail page can exist); otherwise falls back
 * to `shareId` so the workflow stays linkable.
 */
export function workflowDetailPath(
  name: string | null | undefined,
  shareId?: string | null,
  locale?: string
): string | null {
  const slug = workflowDetailSlug(name, shareId);
  if (!slug) return null;
  const base = `/workflows/${slug}/`;
  return locale && locale !== 'en' ? `/${locale}${base}` : base;
}
