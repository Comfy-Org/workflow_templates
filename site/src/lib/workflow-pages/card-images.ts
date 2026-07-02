/**
 * Assigns a representative template thumbnail to each editorial card on an SEO
 * page. Pure and deterministic — same inputs, same assignment every build.
 */
import type { MatcherTemplate } from '../hub-api';
import { hasStillThumbnail } from '../media-utils';

export interface CardImage {
  src: string;
  alt: string;
}

export interface CardText {
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

/**
 * Relevance of a template to a card's words. Tags and models are the strongest
 * topical signal, so they weigh more than incidental title/description words.
 */
function relevance(cardTokens: Set<string>, template: MatcherTemplate): number {
  const tagTokens = tokenize(...(template.tags ?? []), ...(template.models ?? []));
  const proseTokens = tokenize(template.title, template.description);
  return overlap(cardTokens, tagTokens) * 3 + overlap(cardTokens, proseTokens);
}

export interface AssignOptions {
  /**
   * Shared exclusion set, mutated as templates are consumed. Pass the SAME set
   * to every section on a page so an image never repeats across sections.
   */
  used?: Set<string>;
  /**
   * Wider catalog to draw from once `templates` is exhausted — lets a section
   * borrow a relevant image from the whole dataset instead of repeating one.
   */
  fallback?: MatcherTemplate[];
}

const withStill = (templates: MatcherTemplate[]) =>
  templates
    .filter((t) => hasStillThumbnail(t.thumbnails))
    .sort((a, b) => (b.usage || 0) - (a.usage || 0) || a.name.localeCompare(b.name));

/** Best unused template for a card by token overlap; null if the pool is dry. */
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
  // No semantic match → highest-usage unused template in the pool.
  return best ?? pool.find((t) => !used.has(t.name)) ?? null;
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
 *   3. content-matched repeat (only once everything is exhausted).
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
      pickBestAllowingRepeat(card, fallbackPool.length ? fallbackPool : pool);
    if (best) used.add(best.name);
    return best;
  });
}
