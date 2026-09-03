// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import vue from '@astrojs/vue';
import { INDEXABLE_LOCALES } from './src/lib/i18n/locales.ts';
import {
  deriveModelGroups,
  assertUniqueModelSlugs,
} from './src/lib/workflow-pages/model-groups.ts';
import { SEO_PAGES } from './src/lib/workflow-pages/use-cases.ts';
import { useCasePageHasGrid } from './src/lib/workflow-pages/use-case-resolver.ts';
import { buildCustomPages } from './src/lib/sitemap-custom-pages.ts';
import {
  loadHubCategories,
  loadHubModelCatalog,
  loadHubTagSlugs,
} from './src/lib/hub-manifests.ts';
import {
  modelContentPasses,
  useCaseContentPasses,
  assertNoOrphanedContent,
} from './src/lib/workflow-pages/landing-content.ts';
import { assertBrandSafe } from './src/lib/workflow-pages/governance.ts';

/** @type {import('astro').AstroIntegration} */
const accountLayerPocIntegration = {
  name: 'account-layer-poc',
  hooks: {
    'astro:config:setup': ({ injectRoute }) => {
      injectRoute({
        pattern: '/poc/account-layer',
        entrypoint: './src/poc/account-layer.astro',
        prerender: true,
      });
    },
  },
};

const templatesDir = path.join(process.cwd(), 'src/content/templates');
const templateDates = new Map();
/**
 * @typedef {{ name: string; date?: string; username?: string; models?: string[];
 *   tags?: string[]; usage?: number }} SitemapTemplate
 */
/** Raw content templates, reused below for the use-case grid gate. @type {SitemapTemplate[]} */
const contentTemplates = [];
const creatorUsernames = new Set();

if (fs.existsSync(templatesDir)) {
  const files = fs.readdirSync(templatesDir).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    try {
      const content = JSON.parse(fs.readFileSync(path.join(templatesDir, file), 'utf-8'));
      if (content.username) creatorUsernames.add(content.username);
      if (typeof content.name !== 'string') continue;
      // Normalize the arrays the group/use-case resolvers read, so a template
      // JSON missing `models`/`tags` can't crash sitemap derivation.
      content.models = Array.isArray(content.models) ? content.models : [];
      content.tags = Array.isArray(content.tags) ? content.tags : [];
      contentTemplates.push(content);
      if (content.date) templateDates.set(content.name, content.date);
    } catch {
      // Skip invalid JSON
    }
  }
}

/**
 * Model families, derived from the catalog the model routes actually serve.
 *
 * Not `contentTemplates`. Those are the repo's own templates, synced from
 * `templates/index.json`; both model routes resolve a request from
 * `loadSerializedTemplates()`, which is the live hub index. Deriving families
 * here from the synced files validated — and advertised — a catalog the routes
 * never serve, so a hub-only family or alias change bypassed the guards below
 * while the route happily served it.
 *
 * The config cannot fetch the hub itself (it is loaded by `astro check`, `astro
 * dev`, eslint and every unit-test run), so prebuild writes the catalog to a
 * manifest and this reads it. Same function, same data, one process later.
 */
const modelGroups = deriveModelGroups(loadHubModelCatalog());
const canonicalModelSlugs = new Set(modelGroups.map((group) => group.slug));

/**
 * Build-time guards for model pages.
 *
 * These ran inside the English route's `getStaticPaths` until that route became
 * on-demand rendered (it has to be, to issue a real 301 for a variant slug —
 * see the route for why the redirects config cannot). A guard that only runs
 * while prerendering would have quietly stopped running.
 *
 * Here they still fail the build, and they run against the same `modelGroups`
 * the sitemap is already derived from, so there is one derivation and one
 * verdict rather than two that can drift.
 *
 * Skipped when the catalog is absent, matching how everything else in this file
 * treats it. The manifest is written by `pnpm build:hub-manifests` during
 * prebuild, so a real build always has it, but plain config loads (astro check,
 * a fresh clone) do not — and asserting against an empty catalog would report
 * every landing-content file as orphaned, which is the opposite of a useful guard.
 */
if (modelGroups.length > 0) {
  assertNoOrphanedContent('model', canonicalModelSlugs);
  // Canonical AND variant slugs: both are route identifiers now that the routes
  // resolve variants themselves, so both have to be unambiguous.
  assertUniqueModelSlugs(modelGroups);

  for (const group of modelGroups) {
    // Fail the build if a qualifying (indexable) model page carries a denied term.
    if (group.qualifies) {
      assertBrandSafe({
        slug: group.slug,
        primaryKeyword: group.keywords.primary,
        title: group.label,
        secondaryKeywords: group.keywords.secondary,
      });
    }
  }
}

// Same content gate the routes' noindex uses (landing-content.ts), so the
// sitemap can't advertise a page the route renders noindex.
const indexableModelSlugs = new Set(
  modelGroups
    .filter((group) => group.qualifies && modelContentPasses(group.slug))
    .map((group) => group.slug)
);

const indexableUseCaseSlugs = new Set(
  SEO_PAGES.filter(
    (def) => useCasePageHasGrid(def, contentTemplates) && useCaseContentPasses(def.slug)
  ).map((def) => def.slug)
);

// Variant slugs (wan2-5 -> wan) are resolved in the route, not here.
//
// This used to be a `redirects` map keyed on both slash forms. It never worked in
// production and could not: the Vercel adapter builds each rule's `source` from
// parsed route segments, and a trailing slash is not a segment, so both keys
// collapsed to one slashless rule while the platform canonicalises every incoming
// request to the slashed form first. The two never met and every variant 404'd.
// Astro also warned that the two keys collide as duplicate static routes, which it
// says will become a hard error. The model routes resolve variants from
// `group.redirectFrom` instead, which is what the locale route always did.

// lastmod fallback for pages without a specific date.
const buildDate = new Date().toISOString();

// Supported locales (matches src/i18n/config.ts)
const locales = ['en', 'zh', 'zh-TW', 'ja', 'ko', 'es', 'fr', 'ru', 'tr', 'ar', 'pt-BR'];

// Locales flipped to indexable — the single source of truth is INDEXABLE_LOCALES
// in src/lib/i18n/locales.ts (imported above), so a go-live flip is one edit there
// and the sitemap gate follows automatically. While empty, no prerendered locale
// detail page enters the sitemap, so its Google-facing content is unchanged; a
// locale detail URL would leak in otherwise, since those pages are now static and
// match the generic detail rule below.
/** @type {Set<string>} */
const indexableLocales = new Set(INDEXABLE_LOCALES);

const siteOrigin = (process.env.PUBLIC_SITE_ORIGIN || 'https://comfy.org').replace(/\/$/, '');

// Creator pages, English model pages and every localized directory page: all
// on-demand rendered, so `@astrojs/sitemap` cannot discover them among the built
// files. The rule lives in src/lib/sitemap-custom-pages.ts so it can be unit
// tested against real inputs; the tag slugs and categories come from the hub
// index via the prebuild-generated manifests, because those routes list the
// hub's catalog and not the repo's synced one.
const hubCategories = loadHubCategories();

const customPages = buildCustomPages({
  siteOrigin,
  creatorUsernames,
  indexableLocales,
  indexableModelSlugs,
  tagSlugs: loadHubTagSlugs(),
  categoryTypes: hubCategories,
});

// https://astro.build/config
export default defineConfig({
  site: (process.env.PUBLIC_SITE_ORIGIN || 'https://comfy.org').replace(/\/$/, ''),
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
  i18n: {
    defaultLocale: 'en',
    locales: locales,
    routing: {
      prefixDefaultLocale: false, // English at root, others prefixed (/zh/, /ja/, etc.)
    },
  },
  integrations: [
    ...(process.env.PUBLIC_ACCOUNT_LAYER_POC === 'true' ? [accountLayerPocIntegration] : []),
    sitemap({
      // Use custom filename to avoid collision with Framer's /sitemap.xml
      filenameBase: 'sitemap-workflows',
      // Include Framer's marketing sitemap in the index
      customSitemaps: ['https://comfy.org/sitemap.xml'],
      // Include on-demand locale pages that aren't discovered at build time
      customPages: customPages,
      serialize(item) {
        const url = new URL(item.url);
        const pathname = url.pathname;

        // Template detail pages: /workflows/{slug}/ or /{locale}/workflows/{slug}/
        const templateMatch = pathname.match(
          /^(?:\/([a-z]{2}(?:-[A-Z]{2})?))?\/workflows\/([^/]+)\/?$/
        );
        if (templateMatch) {
          const slug = templateMatch[2];
          const date = templateDates.get(slug);
          item.lastmod = date ? new Date(date).toISOString() : buildDate;
          // @ts-expect-error - sitemap types are stricter than actual API
          item.changefreq = 'monthly';
          item.priority = 0.8;
          return item;
        }

        if (pathname === '/' || pathname === '') {
          item.lastmod = buildDate;
          // @ts-expect-error - sitemap types are stricter than actual API
          item.changefreq = 'daily';
          item.priority = 1.0;
          return item;
        }

        // Workflows index (including localized versions)
        if (pathname.match(/^(?:\/[a-z]{2}(?:-[A-Z]{2})?)?\/workflows\/?$/)) {
          item.lastmod = buildDate;
          // @ts-expect-error - sitemap types are stricter than actual API
          item.changefreq = 'daily';
          item.priority = 0.9;
          return item;
        }

        // Category pages: /workflows/category/{type}/ or /{locale}/workflows/category/{type}/
        if (pathname.match(/^(?:\/[a-z]{2}(?:-[A-Z]{2})?)?\/workflows\/category\//)) {
          // @ts-expect-error - sitemap types are stricter than actual API
          item.changefreq = 'weekly';
          item.priority = 0.7;
          return item;
        }

        // Model pages: /workflows/model/{model}/ or /{locale}/workflows/model/{model}/
        if (pathname.match(/^(?:\/[a-z]{2}(?:-[A-Z]{2})?)?\/workflows\/model\//)) {
          // @ts-expect-error - sitemap types are stricter than actual API
          item.changefreq = 'weekly';
          item.priority = 0.6;
          return item;
        }

        // Tag pages: /workflows/tag/{tag}/ or /{locale}/workflows/tag/{tag}/
        if (pathname.match(/^(?:\/[a-z]{2}(?:-[A-Z]{2})?)?\/workflows\/tag\//)) {
          // @ts-expect-error - sitemap types are stricter than actual API
          item.changefreq = 'weekly';
          item.priority = 0.6;
          return item;
        }
        // Use-case pages: /workflows/use-cases/{slug}/ or /{locale}/workflows/use-cases/{slug}/
        if (pathname.match(/^(?:\/[a-z]{2}(?:-[A-Z]{2})?)?\/workflows\/use-cases\//)) {
          // @ts-expect-error - sitemap types are stricter than actual API
          item.changefreq = 'weekly';
          item.priority = 0.8;
          return item;
        }

        // @ts-expect-error - sitemap types are stricter than actual API
        item.changefreq = 'weekly';
        item.priority = 0.5;
        return item;
      },
      // Exclude OG image routes and legacy redirect pages. Legacy redirects are
      // /workflows/{slug}/ without a 12-char hex share_id suffix; canonical detail
      // pages are /workflows/{slug}-{shareId}/ (shareId = 12 hex chars).
      filter: (page) => {
        if (page.includes('/workflows/og/') || page.includes('/workflows/og.png')) return false;
        // Only list indexable model pages. Non-qualifying families and
        // variant-redirect slugs still resolve to a route but render noindex (or
        // 301), so they must stay out of the sitemap.
        const modelMatch = page.match(/\/workflows\/model\/([^/]+)\/$/);
        if (modelMatch) {
          return indexableModelSlugs.has(modelMatch[1]);
        }

        // English category pages are prerendered, so unlike the localized ones
        // they render an empty grid rather than 404ing when the index has
        // nothing of that type — and were advertised regardless. Same gate as
        // the localized URLs, off the same manifest. Only applied when the
        // manifest is non-empty: absent means prebuild did not run, not that
        // every category is empty, and gating on that would drop the populated
        // ones too.
        const categoryMatch = page.match(/\/workflows\/category\/([^/]+)\/$/);
        if (categoryMatch && hubCategories.length > 0) {
          return hubCategories.includes(categoryMatch[1]);
        }

        // Same rule for use-case pages: only list slugs that actually get an
        // indexable page, so a noindex/thin use-case never enters the sitemap.
        const useCaseMatch = page.match(/\/workflows\/use-cases\/([^/]+)\/$/);
        if (useCaseMatch) {
          return indexableUseCaseSlugs.has(useCaseMatch[1]);
        }

        const match = page.match(/\/workflows\/([^/]+)\/$/);
        if (match) {
          const segment = match[1];
          if (
            ['category', 'tag', 'model', 'creators', 'use-cases'].some((p) =>
              page.includes(`/workflows/${p}/`)
            )
          )
            return true;
          // Include only when the slug carries a share_id suffix (12 hex chars
          // after the last hyphen); anything else is a legacy redirect.
          const lastHyphen = segment.lastIndexOf('-');
          if (lastHyphen === -1) return false;
          const candidate = segment.slice(lastHyphen + 1);
          if (candidate.length === 12 && /^[0-9a-f]+$/.test(candidate)) {
            // Locale detail pages are prerendered now; only list them once their
            // locale is flipped indexable. English detail pages have no prefix.
            const localeMatch = page.match(/\/([a-z]{2}(?:-[A-Z]{2})?)\/workflows\//);
            if (localeMatch && localeMatch[1] !== 'en' && !indexableLocales.has(localeMatch[1])) {
              return false;
            }
            return true;
          }
          return false;
        }
        return true;
      },
    }),
    vue(),
  ],
  output: 'static',
  adapter: vercel({
    webAnalytics: { enabled: true },
    skewProtection: true,
  }),

  // The site is served through comfy.org's Framer rewrite, so browsers send
  // `Origin: https://comfy.org` while requests reach Astro addressed to the
  // Vercel host — Astro's origin check can never pass and 403s every form
  // POST (e.g. the MiniMax demo's /run). On-demand mutating routes enforce
  // their own origin allowlist instead (see src/lib/demos/mmh3/server.ts).
  security: {
    checkOrigin: false,
  },

  build: {
    concurrency: Math.max(1, os.cpus().length),
    inlineStylesheets: 'auto',
  },

  compressHTML: true,

  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: {
        limitInputPixels: 268402689, // ~16384x16384, guards against memory blowups
      },
    },
  },

  vite: {
    plugins: [/** @type {any} */ (tailwindcss())],
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['web-vitals'],
          },
        },
      },
    },
    optimizeDeps: {
      include: ['web-vitals'],
    },
    css: {
      devSourcemap: false,
    },
  },
});
