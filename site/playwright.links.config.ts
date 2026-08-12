import { defineConfig, devices } from '@playwright/test';

/**
 * Dedicated Playwright config for the internal-link/route-drift check
 * (`tests/internal-links.spec.ts`).
 *
 * Deliberately does NOT reuse `playwright.config.ts`'s webServer
 * (`pnpm run preview`, i.e. `astro build` + `astro preview`): the installed
 * `@astrojs/vercel` adapter has no preview entrypoint for this project's
 * hybrid static+SSR output (`src/pages/workflows/[username].astro` is
 * `prerender: false`), so `astro preview` fails immediately with "The
 * @astrojs/vercel adapter does not support the preview command" — before any
 * test can run. `astro dev` serves the exact same routes, including SSR
 * ones, straight from source without that limitation, which is all this
 * check needs: real route resolution, not a byte-for-byte production build.
 */
export default defineConfig({
  testDir: './tests',
  testMatch: 'internal-links.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['list']],
  outputDir: 'test-results',

  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
