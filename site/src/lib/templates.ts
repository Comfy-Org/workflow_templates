/**
 * Template utilities for fetching and managing template data across locales
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '../i18n/config';

export type Template = CollectionEntry<'templates'>;

/**
 * Get all templates for a specific locale.
 * Falls back to English if locale-specific content doesn't exist.
 */
export async function getTemplatesForLocale(locale: Locale): Promise<Template[]> {
  // Get English templates as the base
  const enTemplates = await getCollection('templates');

  if (locale === DEFAULT_LOCALE) {
    return enTemplates.filter((t) => !t.id.includes('/'));
  }

  // Build a map of localized templates
  const localizedMap = new Map<string, Template>();
  for (const t of enTemplates) {
    if (t.id.startsWith(`${locale}/`)) {
      const baseName = t.id.replace(`${locale}/`, '');
      localizedMap.set(baseName, t);
    }
  }

  // Return localized where available, fall back to English
  return enTemplates
    .filter((t) => !t.id.includes('/'))
    .map((enTemplate) => {
      const localizedVersion = localizedMap.get(enTemplate.id);
      return localizedVersion || enTemplate;
    });
}

/**
 * Get a single template by name for a specific locale
 */
export async function getTemplateByName(
  name: string,
  locale: Locale
): Promise<Template | undefined> {
  const templates = await getTemplatesForLocale(locale);
  return templates.find((t) => t.data.name === name);
}

/**
 * Get all available locales for a template
 */
export async function getAvailableLocalesForTemplate(name: string): Promise<Locale[]> {
  const allTemplates = await getCollection('templates');
  const available: Locale[] = [];

  for (const locale of LOCALES) {
    if (locale === DEFAULT_LOCALE) {
      // Check if English version exists
      if (allTemplates.some((t) => t.id === name || t.data.name === name)) {
        available.push(locale);
      }
    } else {
      // Check if localized version exists
      if (allTemplates.some((t) => t.id === `${locale}/${name}`)) {
        available.push(locale);
      }
    }
  }

  return available;
}

/**
 * Sort templates by usage (most popular first)
 */
export function sortByUsage(templates: Template[]): Template[] {
  return [...templates].sort((a, b) => (b.data.usage || 0) - (a.data.usage || 0));
}

/**
 * Filter templates by media type
 */
export function filterByMediaType(
  templates: Template[],
  mediaType: 'image' | 'video' | 'audio' | '3d'
): Template[] {
  return templates.filter((t) => t.data.mediaType === mediaType);
}

/**
 * Filter templates by model
 */
export function filterByModel(templates: Template[], model: string): Template[] {
  return templates.filter((t) => t.data.models?.includes(model));
}

/**
 * Filter templates by tag
 */
export function filterByTag(templates: Template[], tag: string): Template[] {
  return templates.filter((t) => t.data.tags?.includes(tag));
}

/**
 * Get all unique models from templates
 */
export function getAllModels(templates: Template[]): string[] {
  const models = new Set<string>();
  for (const t of templates) {
    if (t.data.models) {
      for (const model of t.data.models) {
        models.add(model);
      }
    }
  }
  return Array.from(models).sort();
}

/**
 * Get all unique tags from templates
 */
export function getAllTags(templates: Template[]): string[] {
  const tags = new Set<string>();
  for (const t of templates) {
    if (t.data.tags) {
      for (const tag of t.data.tags) {
        tags.add(tag);
      }
    }
  }
  return Array.from(tags).sort();
}
