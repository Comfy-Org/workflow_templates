/**
 * Card resolvers for the model + use-case index pages. Both render the same
 * `SeoPageCard` grid; only qualifying/non-empty pages become cards.
 */
import type { SerializedTemplate } from '../hub-api';
import { firstStillThumbnail } from '../media-utils';
import { modelPath, useCasePath } from '../routes';
import { getLogoPath, resolveTemplateLogos } from '../model-logos';
import type { CardBadge, SeoPageCard } from './schema';
import { deriveModelGroups } from './model-groups';
import { SEO_PAGES } from './use-cases';
import { resolveUseCasePageTemplates } from './use-case-resolver';

export function resolveModelPageCards(
  catalog: SerializedTemplate[],
  locale?: string
): SeoPageCard[] {
  return deriveModelGroups(catalog)
    .filter((group) => group.qualifies)
    .sort((a, b) => b.usage - a.usage)
    .map((group) => {
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
        thumbnail: firstStillThumbnail(group.templates[0]?.thumbnails),
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
      thumbnail: firstStillThumbnail(templates[0]?.thumbnails),
      logos: templates[0] ? resolveTemplateLogos(templates[0]) : [],
    };
  }).filter((card) => card.count > 0);
}
