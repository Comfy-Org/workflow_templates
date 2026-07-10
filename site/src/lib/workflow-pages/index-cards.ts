/**
 * Card resolvers for the model + use-case index pages. Both render the same
 * `SeoPageCard` grid; only qualifying/non-empty pages become cards.
 */
import type { SerializedTemplate } from '../hub-api';
import { firstStillThumbnail, firstStillAcross } from '../media-utils';
import { modelPath, useCasePath, workflowDetailPath, resolveAbsoluteThumbnail } from '../routes';
import { getLogoPath, resolveTemplateLogos } from '../model-logos';
import { absoluteUrl } from '../../config/site';
import type { ItemListEntry } from '../structured-data';
import type { CardBadge, SeoPageCard } from './schema';
import { SEO_PAGES } from './use-cases';
import { qualifyingGroups, resolveUseCasePageTemplates } from './use-case-resolver';

/**
 * Map a page's workflow grid to `ItemList` entries for its CollectionPage —
 * each template linking to its own detail page, mirroring the visible grid.
 * Templates with no derivable detail URL are skipped.
 */
export function buildTemplateItemListEntries(
  templates: SerializedTemplate[],
  locale?: string
): ItemListEntry[] {
  return templates.flatMap((tpl) => {
    const path = workflowDetailPath(tpl.name, tpl.shareId, locale);
    if (!path) return [];
    return [
      {
        name: tpl.title,
        url: absoluteUrl(path),
        image: resolveAbsoluteThumbnail(firstStillThumbnail(tpl.thumbnails)),
      },
    ];
  });
}

/** Indexable model families, ranked by usage — the shared source order for both
 *  the card grid and the index description, so the two can't list different models. */
function qualifyingModelGroups(catalog: SerializedTemplate[]) {
  return [...qualifyingGroups(catalog)].sort((a, b) => b.usage - a.usage);
}

/** Top model family labels (e.g. "Flux") for the index page description. */
export function resolveTopModelLabels(catalog: SerializedTemplate[], limit = 4): string[] {
  return qualifyingModelGroups(catalog)
    .slice(0, limit)
    .map((group) => group.label);
}

export function resolveModelPageCards(
  catalog: SerializedTemplate[],
  locale?: string
): SeoPageCard[] {
  return qualifyingModelGroups(catalog).map((group) => {
    const familyLogo = getLogoPath(group.label);
    const logos: CardBadge[] = familyLogo
      ? [{ src: familyLogo, name: group.label }]
      : group.templates[0]
        ? resolveTemplateLogos(group.templates[0])
        : [];
    return {
      href: modelPath(group.slug, locale),
      title: `${group.label} ComfyUI Workflows`,
      count: group.templates.length,
      thumbnail: firstStillAcross(group.templates),
      logos,
    };
  });
}

export function resolveUseCasePageCards(
  catalog: SerializedTemplate[],
  locale?: string
): SeoPageCard[] {
  return SEO_PAGES.map((def) => {
    const templates = resolveUseCasePageTemplates(def, catalog);
    return {
      href: useCasePath(def.slug, locale),
      title: def.h1,
      count: templates.length,
      thumbnail: firstStillAcross(templates),
      logos: templates[0] ? resolveTemplateLogos(templates[0]) : [],
    };
  }).filter((card) => card.count > 0);
}
