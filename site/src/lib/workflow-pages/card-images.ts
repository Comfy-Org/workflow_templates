/**
 * Assigns a representative template thumbnail to each editorial card on an SEO
 * page. Pure and deterministic — same inputs, same assignment every build.
 */
import { byUsageDesc, type MatcherTemplate } from '../hub-api';
import { hasStillThumbnail, isMediaFile } from '../media-utils';
import { thumbnailPath } from '../routes';

export interface CardImage {
  src: string;
  alt: string;
}

interface CardText {
  title?: string;
  text?: string;
}

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'of',
  'to',
  'in',
  'on',
  'for',
  'with',
  'your',
  'you',
  'into',
  'from',
  'any',
  'every',
  'that',
  'this',
  'it',
  'is',
  'are',
  'as',
  'at',
  'by',
  'be',
  'can',
  'run',
  'use',
  'using',
  'workflow',
  'workflows',
]);

function tokenize(...parts: (string | undefined)[]): Set<string> {
  return new Set(
    parts
      .filter((p): p is string => Boolean(p))
      .join(' ')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  );
}

function overlap(a: Set<string>, b: Set<string>): number {
  let score = 0;
  for (const token of a) if (b.has(token)) score += 1;
  return score;
}

/** Per-template token sets, memoized by identity — read once per (card, template) pair. */
const tokenCache = new WeakMap<MatcherTemplate, { tags: Set<string>; prose: Set<string> }>();
function templateTokens(template: MatcherTemplate) {
  let tokens = tokenCache.get(template);
  if (!tokens) {
    tokens = {
      tags: tokenize(...(template.tags ?? []), ...(template.models ?? [])),
      prose: tokenize(template.title, template.description),
    };
    tokenCache.set(template, tokens);
  }
  return tokens;
}

/**
 * Relevance of a template to a card's words. Tags and models are the strongest
 * topical signal, so they weigh more than incidental title/description words.
 */
function relevance(cardTokens: Set<string>, template: MatcherTemplate): number {
  const { tags, prose } = templateTokens(template);
  return overlap(cardTokens, tags) * 3 + overlap(cardTokens, prose);
}

export interface AssignOptions {
  /** Exclusion set, mutated as templates are consumed. Share one across a page's
   *  sections so an image never repeats across them. */
  used?: Set<string>;
  /** Wider pool drawn from once `templates` is exhausted, to avoid a repeat. */
  fallback?: MatcherTemplate[];
}

const withStill = (templates: MatcherTemplate[]) =>
  templates.filter((t) => hasStillThumbnail(t.thumbnails)).sort(byUsageDesc);

/** Best unused, content-matched template for a card; null when nothing overlaps. */
function pickForCard(
  card: CardText,
  pool: MatcherTemplate[],
  used: Set<string>
): MatcherTemplate | null {
  const cardTokens = tokenize(card.title, card.text);
  let best: MatcherTemplate | null = null;
  let bestScore = 0;
  for (const template of pool) {
    if (used.has(template.name)) continue;
    const score = relevance(cardTokens, template);
    if (score > bestScore) {
      best = template;
      bestScore = score;
    }
  }
  return best;
}

/** First unused template in a pool, ignoring relevance. */
function firstUnused(pool: MatcherTemplate[], used: Set<string>): MatcherTemplate | null {
  return pool.find((t) => !used.has(t.name)) ?? null;
}

/** Best template for a card by overlap, ignoring the used set (allows repeats). */
function pickBestAllowingRepeat(card: CardText, pool: MatcherTemplate[]): MatcherTemplate | null {
  return pickForCard(card, pool, new Set());
}

/**
 * One template (or null) per card, in order. Each template is used at most once
 * within the shared `used` set, so images never repeat — across a page when one
 * set is threaded through every section. Resolution order per card:
 *   1. content-matched, unused, from the page grid;
 *   2. content-matched, unused, from the whole-dataset `fallback`;
 *   3. any unused grid template, then any unused fallback template;
 *   4. best-effort repeat (content-matched if any overlap, else highest-usage),
 *      only once every unused pool is exhausted.
 */
export function assignCardTemplates(
  cards: CardText[],
  templates: MatcherTemplate[],
  opts: AssignOptions = {}
): (MatcherTemplate | null)[] {
  const pool = withStill(templates);
  const fallbackPool = opts.fallback ? withStill(opts.fallback) : [];
  const used = opts.used ?? new Set<string>();

  return cards.map((card) => {
    const best =
      pickForCard(card, pool, used) ??
      pickForCard(card, fallbackPool, used) ??
      firstUnused(pool, used) ??
      firstUnused(fallbackPool, used) ??
      pickBestAllowingRepeat(card, fallbackPool.length ? fallbackPool : pool);
    if (best) used.add(best.name);
    return best;
  });
}

/**
 * Attaches a related-rail `image` to each card: the card's own thumbnail when set,
 * else the next unused still from `templates` (hero and already-owned stills
 * excluded), so a rail never repeats an image. `ownThumbnail` is consumed; the
 * returned card carries `image: CardImage | null` keyed to its title for alt text.
 */
export function resolveRailImages<T extends { title: string; ownThumbnail?: string }>(
  cards: T[],
  templates: { name: string; thumbnails?: string[] }[],
  opts: { excludeName?: string; excludeStills?: string[] } = {}
): (Omit<T, 'ownThumbnail'> & { image: CardImage | null })[] {
  const owned = cards.map((card) => card.ownThumbnail).filter(Boolean) as string[];
  const taken = new Set([...owned, ...(opts.excludeStills ?? [])]);
  const queue = templates
    .filter((template) => template.name !== opts.excludeName)
    .flatMap((template) => template.thumbnails ?? [])
    .filter((thumb) => {
      if (isMediaFile(thumb) || taken.has(thumb)) return false;
      taken.add(thumb);
      return true;
    });

  return cards.map(({ ownThumbnail, ...card }) => {
    const still = ownThumbnail ?? queue.shift();
    return { ...card, image: still ? { src: thumbnailPath(still), alt: card.title } : null };
  });
}
