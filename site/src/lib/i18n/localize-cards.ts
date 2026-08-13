/**
 * Localized text for the cards on a listing page.
 *
 * The detail pages already resolve a workflow's translated text through
 * `resolveLocalizedWorkflow`. The listing pages never did: they render whatever
 * `loadSerializedTemplates` returns, and that reads the hub index, which is
 * English only. So a localized listing showed a translated navbar above a grid of
 * English cards, and clicking a card led to a page that was fully translated.
 *
 * This closes that gap by resolving the same text the detail page will show, so
 * the two agree. It only touches the two fields a card renders; everything else
 * on the entry (thumbnails, tags, counts, creator) is language-neutral and is
 * passed through untouched.
 *
 * Deliberately NOT gated on indexability. A non-indexable page still serves the
 * translation to humans and only points search engines at English, which is the
 * whole point of the canonical-based gate. Hiding the translation from readers
 * as well would give a locale visitor a worse page than they get today.
 */
import { DEFAULT_LOCALE } from '../../i18n/config';
import { resolveLocalizedWorkflow, type ResolverOptions } from './resolver';
import type { Locale } from './schema';

/** The only fields a card renders that are language-dependent. */
export interface LocalizableCard {
  shareId: string;
  title: string;
  description: string;
}

/**
 * Return the entries with `title`/`description` resolved for `locale`.
 *
 * English is returned untouched: it is the source the resolver falls back to, so
 * resolving it would be a no-op at best and an unnecessary per-entry read.
 *
 * The resolver already falls back to English per field, so an untranslated or
 * pruned field keeps its English text rather than rendering blank. A workflow the
 * resolver knows nothing about (published after the last translation run) is left
 * exactly as it arrived.
 */
export function localizeCards<T extends LocalizableCard>(
  templates: readonly T[],
  locale: Locale,
  options: ResolverOptions = {}
): T[] {
  if (locale === DEFAULT_LOCALE) return [...templates];

  return templates.map((template) => {
    const resolved = resolveLocalizedWorkflow(template.shareId, locale, options);
    if (!resolved) return template;
    const { data, provenance } = resolved;

    /**
     * Take the resolved value only when it is genuinely a translation.
     *
     * The resolver falls back to English per field, but *its* English comes from
     * the committed content snapshot, while the card's English comes from the
     * live hub index. Those are two different sources that can legitimately
     * disagree, so accepting an `english` provenance here would silently swap
     * live hub text for a build-time copy and quietly go stale. A field with no
     * translation should keep exactly the English the card already had.
     */
    const translated = (field: 'title' | 'description'): string => {
      if (provenance?.[field] === 'english') return template[field];
      const value = data?.[field];
      return typeof value === 'string' && value.trim() ? value : template[field];
    };

    const title = translated('title');
    const description = translated('description');
    if (title === template.title && description === template.description) return template;
    return { ...template, title, description };
  });
}
