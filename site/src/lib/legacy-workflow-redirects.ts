import { extractShareId } from './hub-api';

/**
 * Should a `/workflows/{segment}/` (or `/{locale}/workflows/{segment}/`) request
 * that fell through every real route be 301'd to the hub instead of 404'd?
 *
 * The workflow hub's template catalogue is refreshed continuously and retired
 * slugs are not preserved, so a large tail of old detail-page and JSON-download
 * URLs now resolve to nothing. Those still carry the *shape* of a URL the site
 * used to serve, so redirecting them to the hub keeps the visitor (and the
 * crawler) in the right section rather than on a dead end.
 *
 * A bare word with no share-id suffix ("undefined", "ima", a retired creator
 * handle) is deliberately NOT matched — those keep returning 404, preserving the
 * catch-all's existing anti-thin-content behaviour.
 *
 * Matches:
 *   - `{name}-{12hex}`  → a retired workflow detail page (`extractShareId`)
 *   - `{12hex}`          → a retired bare-hash detail page / legacy JSON id
 *   - `tag`              → `/workflows/tag/` — the one hub sub-section that has
 *                          no index page of its own, so it only ever 404s
 */
export function isLegacyWorkflowSegment(segment: string | undefined | null): boolean {
  if (!segment) return false;
  if (extractShareId(segment)) return true;
  if (/^[0-9a-f]{12}$/i.test(segment)) return true;
  if (segment === 'tag') return true;
  return false;
}
