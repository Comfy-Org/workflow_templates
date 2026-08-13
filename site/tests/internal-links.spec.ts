import { test, expect, type Page } from '@playwright/test';

/**
 * Guards against internal links that drift from the routes the site
 * actually serves — e.g. a hardcoded `/workflows/creators/<user>/` when the
 * real creator profile route is `/workflows/<user>/` (see `creatorPath()` in
 * `src/lib/routes.ts`).
 *
 * This has to run in a real browser rather than a static HTML/dist crawl:
 * the mobile nav's "Top Creators" links live inside a Sheet (dialog) that
 * Vue only mounts into the DOM once opened client-side, so they never appear
 * in server-rendered/prerendered HTML output.
 *
 * Scope is deliberately narrow — the nav chrome and hub index pages that are
 * reachable from every page, plus one sample creator and one sample template
 * detail page. Full-catalog link checking is a separate, much slower concern
 * (see `pnpm audit:seo` / the Site CI "Check internal links" step), and in
 * CI builds (`SKIP_AI_GENERATION=true`) most of the 300+ template detail
 * pages aren't generated at all, so crawling every card on `/workflows/`
 * would be full of expected false positives.
 */

const SKIP_HREF_PREFIXES = ['mailto:', 'tel:', 'javascript:'];

function isCheckableHref(href: string | null): href is string {
  if (!href) return false;
  if (href.startsWith('#')) return false;
  if (SKIP_HREF_PREFIXES.some((prefix) => href.toLowerCase().startsWith(prefix))) return false;
  if (/^https?:\/\//i.test(href)) return false; // external — out of scope here
  return href.startsWith('/');
}

/** Unique, checkable `href`s from anchors matching `selector` on the current page. */
async function collectHrefs(page: Page, selector: string): Promise<string[]> {
  const raw = await page
    .locator(selector)
    .evaluateAll((anchors) => anchors.map((a) => a.getAttribute('href')));
  return [...new Set(raw.filter(isCheckableHref))];
}

/** Asserts every href resolves (status < 400) via the same origin as `page`. */
async function expectAllResolve(page: Page, hrefs: string[], context: string) {
  for (const href of hrefs) {
    const response = await page.request.get(href);
    expect(
      response.status(),
      `[${context}] ${href} should resolve, got ${response.status()}`
    ).toBeLessThan(400);
  }
}

test.describe('Internal link integrity — nav & hub routes', () => {
  test('mobile "Top Creators" menu links resolve to real creator profile routes', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.getByTestId('mobile-nav-toggle').click();

    const creatorLinks = page.getByTestId('mobile-nav-creator-link');
    await creatorLinks.first().waitFor({ state: 'attached' });
    test.skip(
      (await creatorLinks.count()) === 0,
      'No creators returned by the Hub API for this build'
    );

    const hrefs = await collectHrefs(page, '[data-testid="mobile-nav-creator-link"]');

    // The exact regression this test guards: creator profiles live at
    // /workflows/<username>/, never /workflows/creators/<username>/.
    for (const href of hrefs) {
      expect(href, href).not.toMatch(/^\/workflows\/creators\//);
    }

    await expectAllResolve(page, hrefs, 'mobile nav creator links');
  });

  test('header and footer chrome on home/workflows/creators link to routes that resolve', async ({
    page,
  }) => {
    for (const path of ['/', '/workflows/', '/workflows/creators/']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      const hrefs = await collectHrefs(page, 'header a[href], footer a[href]');
      await expectAllResolve(page, hrefs, `${path} header/footer`);
    }
  });

  test('creators index links to every listed creator profile and each one resolves', async ({
    page,
  }) => {
    await page.goto('/workflows/creators/', { waitUntil: 'domcontentloaded' });
    const hrefs = await collectHrefs(page, 'main a[href^="/workflows/"]');
    test.skip(hrefs.length === 0, 'No creators returned by the Hub API for this build');
    await expectAllResolve(page, hrefs, '/workflows/creators/ listing');
  });

  test('sample creator profile page loads and its nav/footer links resolve', async ({ page }) => {
    await page.goto('/workflows/creators/', { waitUntil: 'domcontentloaded' });
    const firstCreatorLink = page.locator('main a[href^="/workflows/"]').first();
    test.skip(
      (await firstCreatorLink.count()) === 0,
      'No creators returned by the Hub API for this build'
    );

    const href = await firstCreatorLink.getAttribute('href');
    expect(href).toBeTruthy();

    const response = await page.goto(href!, { waitUntil: 'domcontentloaded' });
    expect(response?.status(), `${href} should resolve`).toBeLessThan(400);

    const hrefs = await collectHrefs(page, 'header a[href], footer a[href]');
    await expectAllResolve(page, hrefs, `creator profile ${href}`);
  });

  test('sample template detail page loads and its nav/footer links resolve', async ({ page }) => {
    await page.goto('/workflows/', { waitUntil: 'domcontentloaded' });
    const firstCard = page.locator('main a[data-testid="workflow-card-link"]').first();
    await expect(firstCard).toBeAttached({ timeout: 10000 });

    const href = await firstCard.getAttribute('href');
    expect(href).toBeTruthy();

    const response = await page.goto(href!, { waitUntil: 'domcontentloaded' });
    expect(response?.status(), `${href} should resolve`).toBeLessThan(400);

    const hrefs = await collectHrefs(page, 'header a[href], footer a[href]');
    await expectAllResolve(page, hrefs, `template detail ${href}`);
  });
});
