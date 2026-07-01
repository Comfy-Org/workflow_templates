// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import vue from '@astrojs/vue';
import { deriveModelGroups } from './src/lib/workflow-pages/model-groups.ts';

const templatesDir = path.join(process.cwd(), 'src/content/templates');
const modelContentDir = path.join(process.cwd(), 'src/content/landing/models');
const templateDates = new Map();
/** Raw content templates, reused below to derive indexable model slugs. @type {any[]} */
const contentTemplates = [];

if (fs.existsSync(templatesDir)) {
  const files = fs.readdirSync(templatesDir).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    try {
      const content = JSON.parse(fs.readFileSync(path.join(templatesDir, file), 'utf-8'));
      contentTemplates.push(content);
      if (content.name && content.date) {
        templateDates.set(content.name, content.date);
      }
    } catch {
      // Skip invalid JSON
    }
  }
}
const indexableModelSlugs = new Set(
  deriveModelGroups(contentTemplates)
    .filter((group) => {
      if (!group.qualifies) return false;
      const contentPath = path.join(modelContentDir, `${group.slug}.json`);
      if (!fs.existsSync(contentPath)) return false;
      try {
        return JSON.parse(fs.readFileSync(contentPath, 'utf-8')).qualityFailed !== true;
      } catch {
        return false;
      }
    })
    .map((group) => group.slug)
);

// lastmod fallback for pages without a specific date.
const buildDate = new Date().toISOString();

// Supported locales (matches src/i18n/config.ts)
const locales = ['en', 'zh', 'zh-TW', 'ja', 'ko', 'es', 'fr', 'ru', 'tr', 'ar', 'pt-BR'];
const nonDefaultLocales = locales.filter((l) => l !== 'en');

// Custom sitemap pages for ISR routes not discovered at build time
const siteOrigin = (process.env.PUBLIC_SITE_ORIGIN || 'https://comfy.org').replace(/\/$/, '');

// Creator profile pages — extract unique usernames from synced templates
const creatorUsernames = new Set();
if (fs.existsSync(templatesDir)) {
  const files = fs.readdirSync(templatesDir).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    try {
      const content = JSON.parse(fs.readFileSync(path.join(templatesDir, file), 'utf-8'));
      if (content.username) creatorUsernames.add(content.username);
    } catch {
      // Skip invalid JSON
    }
  }
}

const creatorPages = [...creatorUsernames].map((u) => `${siteOrigin}/workflows/${u}/`);
const localeCustomPages = nonDefaultLocales.map((locale) => `${siteOrigin}/${locale}/workflows/`);
const customPages = [...creatorPages, ...localeCustomPages];

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

        // Homepage
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
        if (pathname.match(/^\/workflows\/use-cases\//)) {
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
          if (candidate.length === 12 && /^[0-9a-f]+$/.test(candidate)) return true;
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

  // Build performance optimizations
  build: {
    // Increase concurrency for faster builds on multi-core systems
    concurrency: Math.max(1, os.cpus().length),
    // Inline small stylesheets automatically
    inlineStylesheets: 'auto',
  },

  // HTML compression
  compressHTML: true,

  // Image optimization settings
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: {
        // Limit input pixels to prevent memory issues with large images
        limitInputPixels: 268402689, // ~16384x16384
      },
    },
  },

  // Responsive images for automatic srcset generation (now stable in Astro 5)
  // Note: responsiveImages was moved from experimental to stable in Astro 5.x

  vite: {
    plugins: [tailwindcss()],
    build: {
      // Increase chunk size warning limit (reduces noise)
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // Manual chunking for better caching
          manualChunks: {
            vendor: ['web-vitals'],
          },
        },
      },
    },
    // Optimize dependency pre-bundling
    optimizeDeps: {
      include: ['web-vitals'],
    },
    // Disable dev sourcemaps for CSS (faster)
    css: {
      devSourcemap: false,
    },
  },
});
