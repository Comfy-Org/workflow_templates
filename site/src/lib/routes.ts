import { tagSlug } from './tag-aliases';

export const categoryPath = (type: string) => `/workflows/category/${type}/`;
export const modelPath = (name: string) => `/workflows/model/${name}/`;
export const tagPath = (tag: string) => `/workflows/tag/${tagSlug(tag)}/`;
export const thumbnailPath = (asset: string) =>
  asset.startsWith('http://') || asset.startsWith('https://')
    ? asset
    : `/workflows/thumbnails/${asset}`;

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
