/**
 * Loads the shipped SEO articles + their quality context in one place, so the CI
 * test (seo-content-shipped.test.ts) and the CLI gate (validate-seo-content.ts)
 * resolve every page identically — and like the live route does. Pure Node (fs,
 * not import.meta.glob) so it runs in vitest and a plain tsx script alike.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { QualityContext } from './content-rules';
import { WORD_COUNT_TIERS, type GeneratedSeoContent, type KeywordModel } from './schema';
import { deriveModelGroups, type CatalogTemplate } from './model-groups';
import { SEO_PAGES } from '../../config/seo-pages';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const useCaseDir = join(root, 'src/content/seo/use-cases');
const modelDir = join(root, 'src/content/seo/models');
const templatesDir = join(root, 'src/content/templates');

const MODEL_BAND = WORD_COUNT_TIERS.medium;

/** One authored article plus the context the quality + brand-safety checks need. */
export interface SeoArticle {
  label: string;
  content: GeneratedSeoContent;
  ctx: QualityContext;
  safety: { slug: string; primaryKeyword: string; title: string };
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function tryReadJson<T>(path: string): T | null {
  try {
    return readJson<T>(path);
  } catch {
    return null;
  }
}

function modelKeywordsBySlug(): Map<string, KeywordModel> {
  const map = new Map<string, KeywordModel>();
  let catalog: CatalogTemplate[] = [];
  try {
    catalog = readdirSync(templatesDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => readJson<CatalogTemplate>(join(templatesDir, f)));
  } catch {
    return map; // catalog not synced — caller falls back to slug-derived keywords
  }
  for (const group of deriveModelGroups(catalog)) map.set(group.slug, group.keywords);
  return map;
}

/**
 * Every authored article with its quality context. Use-case keywords come from
 * the registry, model keywords from `deriveModelGroups`; `siblingIntros` excludes
 * the article itself so the cross-page uniqueness check compares against others.
 */
export function loadSeoArticles(): SeoArticle[] {
  const articles: SeoArticle[] = [];

  const useCases = SEO_PAGES.map((def) => ({
    def,
    content: tryReadJson<GeneratedSeoContent>(join(useCaseDir, `${def.slug}.json`)),
  })).filter(
    (x): x is { def: (typeof SEO_PAGES)[number]; content: GeneratedSeoContent } => !!x.content
  );
  const ucIntro = new Map(useCases.map((x) => [x.def.slug, x.content.extendedDescription]));

  for (const { def, content } of useCases) {
    articles.push({
      label: `use-case/${def.slug}`,
      content,
      ctx: {
        keywords: def.keywords,
        wordCount: WORD_COUNT_TIERS[def.wordCountTier],
        clusterModels: [],
        siblingIntros: [...ucIntro].filter(([s]) => s !== def.slug).map(([, intro]) => intro),
      },
      safety: { slug: def.slug, primaryKeyword: def.keywords.primary, title: def.title },
    });
  }

  const modelKeywords = modelKeywordsBySlug();
  const modelEntries = readdirSync(modelDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({
      slug: f.replace(/\.json$/, ''),
      content: readJson<GeneratedSeoContent>(join(modelDir, f)),
    }));
  const mIntro = new Map(modelEntries.map((x) => [x.slug, x.content.extendedDescription]));

  for (const { slug, content } of modelEntries) {
    const label = slug.replace(/-/g, ' ');
    const keywords: KeywordModel = modelKeywords.get(slug) ?? {
      primary: `${label} comfyui workflows`,
      secondary: [`${label} comfyui`, `${label} workflow`],
    };
    articles.push({
      label: `model/${slug}`,
      content,
      ctx: {
        keywords,
        wordCount: MODEL_BAND,
        clusterModels: [],
        siblingIntros: [...mIntro].filter(([s]) => s !== slug).map(([, intro]) => intro),
      },
      safety: { slug, primaryKeyword: keywords.primary, title: content.subheading ?? slug },
    });
  }

  return articles;
}
