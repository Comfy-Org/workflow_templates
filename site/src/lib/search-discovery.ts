/**
 * Server-side (build-time) discovery data for the SearchPopover.
 *
 * The popover used to receive the entire ~580-workflow catalog as a prop just to
 * render the discovery panel (popular workflows, top creators, category/model
 * facets). That embedded the whole catalog in every page's HTML. Instead we
 * precompute the small discovery slices here, in Astro frontmatter, so only a
 * few KB reach the client. The full catalog is lazy-loaded from grid.json only
 * when the user applies a filter badge (see src/lib/catalog.ts).
 */
import type { IslandTemplate, CreatorEntry } from './hub-api';
import { byUsageDesc } from './hub-api';

export interface DiscoveryFacet {
  name: string;
  count: number;
}

/** Trimmed popular-workflow card for the discovery panel. */
export interface DiscoveryWorkflow {
  name: string;
  shareId: string;
  title: string;
  thumbnail: string;
  creatorDisplayName: string;
  usage: number;
}

/** Creator enriched with workflow count + total usage for sorting/search. */
export interface DiscoveryCreator {
  username: string;
  displayName: string;
  avatarUrl: string;
  workflowCount: number;
  usage: number;
}

export interface DiscoveryData {
  popular: DiscoveryWorkflow[];
  creators: DiscoveryCreator[];
  facets: { tags: DiscoveryFacet[]; models: DiscoveryFacet[] };
  totalCount: number;
}

/** How many popular workflows to precompute (the panel shows the first 4). */
const POPULAR_COUNT = 8;

function countBy(
  templates: IslandTemplate[],
  pick: (t: IslandTemplate) => string[]
): DiscoveryFacet[] {
  const counts = new Map<string, number>();
  for (const tmpl of templates) {
    for (const value of pick(tmpl)) {
      counts.set(value, (counts.get(value) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}

/**
 * Build the discovery slices from the full catalog + creator list. Pure, so it
 * is unit-tested; called once per page in HubNavbar/HubSearchBar frontmatter.
 */
export function buildDiscoveryData(
  templates: IslandTemplate[],
  creators: CreatorEntry[]
): DiscoveryData {
  // Per-creator workflow count + summed usage, for creator ranking + search.
  const usageByCreator = new Map<string, { count: number; usage: number }>();
  for (const tmpl of templates) {
    if (!tmpl.username) continue;
    const existing = usageByCreator.get(tmpl.username);
    if (existing) {
      existing.count++;
      existing.usage += tmpl.usage;
    } else {
      usageByCreator.set(tmpl.username, { count: 1, usage: tmpl.usage });
    }
  }

  const enrichedCreators: DiscoveryCreator[] = creators
    .map((c) => ({
      username: c.username,
      displayName: c.displayName,
      avatarUrl: c.avatarUrl || '',
      workflowCount: usageByCreator.get(c.username)?.count || 0,
      usage: usageByCreator.get(c.username)?.usage || 0,
    }))
    .sort((a, b) => b.usage - a.usage);

  const popular: DiscoveryWorkflow[] = [...templates]
    .sort(byUsageDesc)
    .slice(0, POPULAR_COUNT)
    .map((t) => ({
      name: t.name,
      shareId: t.shareId,
      title: t.title,
      thumbnail: t.thumbnails[0] || '',
      creatorDisplayName: t.creatorDisplayName,
      usage: t.usage,
    }));

  return {
    popular,
    creators: enrichedCreators,
    facets: {
      tags: countBy(templates, (t) => t.tags),
      models: countBy(templates, (t) => t.models),
    },
    totalCount: templates.length,
  };
}
