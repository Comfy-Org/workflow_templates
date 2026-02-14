// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Build template date lookup at config time
const templatesDir = path.join(process.cwd(), 'src/content/templates');
const templateDates = new Map();

if (fs.existsSync(templatesDir)) {
  const files = fs.readdirSync(templatesDir).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    try {
      const content = JSON.parse(fs.readFileSync(path.join(templatesDir, file), 'utf-8'));
      if (content.name && content.date) {
        templateDates.set(content.name, content.date);
      }
    } catch {
      // Skip invalid JSON files
    }
  }
}

// Supported locales (matches src/i18n/config.ts)
const locales = ['en', 'zh', 'zh-TW', 'ja', 'ko', 'es', 'fr', 'ru', 'tr', 'ar', 'pt-BR'];

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
      serialize(item) {
        const url = new URL(item.url);
        const pathname = url.pathname;

        // Template detail pages: /templates/{slug}/ or /{locale}/templates/{slug}/
        const templateMatch = pathname.match(
          /^(?:\/([a-z]{2}(?:-[A-Z]{2})?))?\/templates\/([^/]+)\/?$/
        );
        if (templateMatch) {
          const slug = templateMatch[2];
          const date = templateDates.get(slug);
          if (date) {
            item.lastmod = new Date(date).toISOString();
          }
          // @ts-expect-error - sitemap types are stricter than actual API
          item.changefreq = 'monthly';
          item.priority = 0.8;
          return item;
        }

        // Homepage
        if (pathname === '/' || pathname === '') {
          // @ts-expect-error - sitemap types are stricter than actual API
          item.changefreq = 'daily';
          item.priority = 1.0;
          return item;
        }

        // Templates index (including localized versions)
        if (pathname.match(/^(?:\/[a-z]{2}(?:-[A-Z]{2})?)?\/templates\/?$/)) {
          // @ts-expect-error - sitemap types are stricter than actual API
          item.changefreq = 'daily';
          item.priority = 0.9;
          return item;
        }

        // Category pages: /templates/category/{type}/ or /{locale}/templates/category/{type}/
        if (pathname.match(/^(?:\/[a-z]{2}(?:-[A-Z]{2})?)?\/templates\/category\//)) {
          // @ts-expect-error - sitemap types are stricter than actual API
          item.changefreq = 'weekly';
          item.priority = 0.7;
          return item;
        }

        // Model pages: /templates/model/{model}/ or /{locale}/templates/model/{model}/
        if (pathname.match(/^(?:\/[a-z]{2}(?:-[A-Z]{2})?)?\/templates\/model\//)) {
          // @ts-expect-error - sitemap types are stricter than actual API
          item.changefreq = 'weekly';
          item.priority = 0.6;
          return item;
        }

        // Tag pages: /templates/tag/{tag}/ or /{locale}/templates/tag/{tag}/
        if (pathname.match(/^(?:\/[a-z]{2}(?:-[A-Z]{2})?)?\/templates\/tag\//)) {
          // @ts-expect-error - sitemap types are stricter than actual API
          item.changefreq = 'weekly';
          item.priority = 0.6;
          return item;
        }

        // Default for other pages
        // @ts-expect-error - sitemap types are stricter than actual API
        item.changefreq = 'weekly';
        item.priority = 0.5;
        return item;
      },
      // Exclude OG image routes from sitemap
      filter: (page) => !page.includes('/templates/og/'),
    }),
  ],
  output: 'static',
  adapter: vercel({
    webAnalytics: { enabled: true },
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
