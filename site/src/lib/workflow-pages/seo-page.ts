/**
 * Shared presentation + indexability for the SEO landing pages (model +
 * use-case), so their English and localized routes can't drift on title/meta,
 * copy, or the noindex decision. Model and use-case differ in their inputs
 * (derived label + `qualifies` gate vs authored title + keyword), so each gets a
 * thin typed wrapper over the shared primitive below.
 */
import { t } from '../../i18n/ui';
import type { Locale } from '../../i18n/config';
import type { ModelGroup } from './model-groups';
import type { SeoPageDef } from './use-cases';
import type { GeneratedSeoContent } from './schema';
import { isIndexable } from './governance';

/** Indexable only when rich and backed by real templates. Shared by both kinds. */
function pageIndexable(isRich: boolean, templateCount: number): boolean {
  return isIndexable({ clusterSize: templateCount, humanEdited: true, qualityPassed: isRich });
}

export interface SeoPageMeta {
  isRich: boolean;
  h1: string;
  title: string;
  description: string;
  subheading: string;
}

// --- Model pages ---------------------------------------------------------

/** A model page is rich only when it qualifies AND has quality editorial copy. */
function isModelPageRich(
  group: Pick<ModelGroup, 'qualifies'>,
  content: GeneratedSeoContent | null
): boolean {
  return group.qualifies && !!content && !content.qualityFailed;
}

export function isModelPageIndexable(
  group: Pick<ModelGroup, 'qualifies'>,
  templateCount: number,
  content: GeneratedSeoContent | null
): boolean {
  return pageIndexable(isModelPageRich(group, content), templateCount);
}

/** Title/meta/subheading from the derived family label; rich pages prefer the
 *  generator's own metaDescription/subheading. */
export function buildModelPageMeta({
  group,
  content,
  locale,
  templateCount,
}: {
  group: Pick<ModelGroup, 'label' | 'qualifies'>;
  content: GeneratedSeoContent | null;
  locale: Locale;
  templateCount: number;
}): SeoPageMeta {
  const label = group.label;
  return {
    isRich: isModelPageRich(group, content),
    h1: t('model.metaH1', locale).replace('{label}', label),
    title: t('model.metaTitle', locale).replace('{label}', label),
    description:
      content?.metaDescription ||
      t('model.metaDescription', locale)
        .replace('{count}', String(templateCount))
        .replace('{label}', label),
    subheading: content?.subheading || t('model.subheading', locale).replace('{label}', label),
  };
}

// --- Use-case pages ------------------------------------------------------

/** A use-case page is rich only when it has quality editorial copy. */
function isUseCasePageRich(content: GeneratedSeoContent | null): boolean {
  return !!content && !content.qualityFailed;
}

export function isUseCasePageIndexable(
  templateCount: number,
  content: GeneratedSeoContent | null
): boolean {
  return pageIndexable(isUseCasePageRich(content), templateCount);
}

/** `title`/`h1` are authored per page in the registry; rich pages prefer the
 *  generator's own metaDescription/subheading, else templated i18n copy. */
export function buildUseCasePageMeta({
  def,
  content,
  locale,
  templateCount,
}: {
  def: Pick<SeoPageDef, 'title' | 'h1' | 'keywords'>;
  content: GeneratedSeoContent | null;
  locale: Locale;
  templateCount: number;
}): SeoPageMeta {
  const keyword = def.keywords.primary;
  return {
    isRich: isUseCasePageRich(content),
    h1: def.h1,
    title: def.title,
    description:
      content?.metaDescription ||
      t('useCase.metaDescription', locale)
        .replace('{count}', String(templateCount))
        .replace('{keyword}', keyword),
    subheading:
      content?.subheading || t('useCase.subheading', locale).replace('{keyword}', keyword),
  };
}
