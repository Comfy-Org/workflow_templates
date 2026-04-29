import { tagSlug } from './tag-aliases';

export const categoryPath = (type: string) => `/workflows/category/${type}/`;
export const modelPath = (name: string) => `/workflows/model/${name}/`;
export const tagPath = (tag: string) => `/workflows/tag/${tagSlug(tag)}/`;
export const thumbnailPath = (asset: string) =>
  asset.startsWith('http://') || asset.startsWith('https://')
    ? asset
    : `/workflows/thumbnails/${asset}`;

/**
 * Build the URL slug component (no `/workflows/` prefix, no locale). Returns
 * null when `name` is missing so callers can avoid persisting `undefined-...`
 * or `<name>-undefined` slugs into the search index or rendered hrefs.
 */
export function workflowDetailSlug(
  name: string | null | undefined,
  shareId?: string | null
): string | null {
  if (!name) return null;
  return shareId ? `${name}-${shareId}` : name;
}

/**
 * Build a workflow detail URL. Returns null when `name` is missing so callers
 * can render a non-clickable card instead of a `/workflows/undefined/` link.
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
