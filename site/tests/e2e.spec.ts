import { test, expect } from '@playwright/test';

/**
 * Helper: get the first template card link from the workflow listing.
 * Targets the card title anchor by test id — creator links share the
 * /workflows/ prefix, so an href-only selector matches those too.
 */
function templateCardLink(page: import('@playwright/test').Page) {
  return page.locator('main a[data-testid="workflow-card-link"]').first();
}

test.describe('Homepage', () => {
  test('loads correctly with required elements', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ComfyUI/i);
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();
  });

  test('has working navigation links', async ({ page }) => {
    await page.goto('/');
    const workflowsLink = page.locator('a[href*="/workflows"]').first();
    await expect(workflowsLink).toBeAttached();
  });
});

test.describe('Templates Listing', () => {
  test('shows template cards', async ({ page }) => {
    await page.goto('/workflows/');
    await expect(page).toHaveTitle(/workflow/i);
    const firstCard = templateCardLink(page);
    await expect(firstCard).toBeAttached({ timeout: 10000 });
  });

  test('template cards are clickable', async ({ page }) => {
    await page.goto('/workflows/');
    const firstCard = templateCardLink(page);
    await expect(firstCard).toBeAttached({ timeout: 10000 });
    const href = await firstCard.getAttribute('href');
    expect(href).toBeTruthy();
    expect(href).toMatch(/\/workflows\/[a-z0-9_-]+\//i);
  });
});

test.describe('Template Detail Page', () => {
  test('has required sections', async ({ page }) => {
    await page.goto('/workflows/');
    const firstCard = templateCardLink(page);
    await expect(firstCard).toBeAttached({ timeout: 10000 });
    const href = await firstCard.getAttribute('href');
    expect(href).toBeTruthy();

    await page.goto(href!);
    await expect(page.locator('h1').first()).toBeAttached();
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', /.+/);
  });

  test('has CTA button', async ({ page }) => {
    await page.goto('/workflows/');
    const firstCard = templateCardLink(page);
    await expect(firstCard).toBeAttached({ timeout: 10000 });
    const href = await firstCard.getAttribute('href');
    expect(href).toBeTruthy();

    await page.goto(href!);
    await page.waitForLoadState('networkidle');

    const ctaLinks = page.locator('a.run-cloud-btn');
    expect(await ctaLinks.count()).toBeGreaterThan(0);
  });

  test('uses canonical download route', async ({ page }) => {
    await page.goto('/workflows/');
    const firstCard = templateCardLink(page);
    await expect(firstCard).toBeAttached({ timeout: 10000 });
    const href = await firstCard.getAttribute('href');
    expect(href).toBeTruthy();

    await page.goto(href!);
    await page.waitForLoadState('networkidle');

    const downloadLink = page.locator('a.download-json-btn').first();
    await expect(downloadLink).toBeAttached();
    const downloadHref = await downloadLink.getAttribute('href');
    expect(downloadHref).toMatch(/^\/workflows\/download\/[^/]+\.json(?:\?.*)?$/);
  });

  test('has structured data', async ({ page }) => {
    await page.goto('/workflows/');
    const firstCard = templateCardLink(page);
    await expect(firstCard).toBeAttached({ timeout: 10000 });
    const href = await firstCard.getAttribute('href');
    expect(href).toBeTruthy();

    await page.goto(href!);
    await page.waitForLoadState('networkidle');

    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd.first()).toBeAttached();
  });
});

test.describe('Category Pages', () => {
  test('category page loads and shows templates', async ({ page }) => {
    const response = await page.goto('/workflows/category/image/');
    if (response?.ok()) {
      await expect(page.locator('h1').first()).toBeVisible();
    }
  });
});

test.describe('i18n - Japanese', () => {
  test('Japanese page loads with correct lang attribute', async ({ page }) => {
    await page.goto('/ja/workflows/');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', 'ja');
  });

  test('Japanese page has localized content', async ({ page }) => {
    await page.goto('/ja/workflows/');
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('hreflang tags are present', async ({ page }) => {
    await page.goto('/workflows/');
    const hreflangJa = page.locator('link[hreflang="ja"]');
    await expect(hreflangJa).toBeAttached();
    const hreflangEn = page.locator('link[hreflang="en"]');
    await expect(hreflangEn).toBeAttached();
  });
});

test.describe('SEO Essentials', () => {
  test('homepage has meta tags', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('meta[property="og:title"]')).toBeAttached();
    await expect(page.locator('meta[property="og:description"]')).toBeAttached();
  });

  test('canonical URL is set', async ({ page }) => {
    await page.goto('/workflows/');
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toBeAttached();
  });
});

test.describe('Search Filter "+X more" Expansion', () => {
  /**
   * Opens the search popover discovery panel by focusing the search input.
   * Returns the search input locator.
   */
  async function openDiscoveryPanel(page: import('@playwright/test').Page) {
    await page.goto('/workflows/');
    const searchInput = page.locator('input[placeholder*="Search workflows"]');
    await expect(searchInput).toBeAttached({ timeout: 10000 });
    await searchInput.click();
    return searchInput;
  }

  test('clicking "+X more" on Categories expands to show all tags', async ({ page }) => {
    await openDiscoveryPanel(page);

    const moreTagsBtn = page.getByTestId('show-more-tags');
    // If there are enough tags to show the button
    if ((await moreTagsBtn.count()) > 0) {
      const row = page.getByTestId('filter-row-categories');
      const badgesBefore = await row.locator('button').count();

      await moreTagsBtn.click();

      // Button should disappear after clicking
      await expect(moreTagsBtn).not.toBeAttached();
      // More badges should now be visible
      const badgesAfter = await row.locator('button').count();
      expect(badgesAfter).toBeGreaterThan(badgesBefore);
    }
  });

  test('clicking "+X more" on Models expands to show all models', async ({ page }) => {
    await openDiscoveryPanel(page);

    const moreModelsBtn = page.getByTestId('show-more-models');
    if ((await moreModelsBtn.count()) > 0) {
      const row = page.getByTestId('filter-row-models');
      const badgesBefore = await row.locator('button').count();

      await moreModelsBtn.click();

      await expect(moreModelsBtn).not.toBeAttached();
      const badgesAfter = await row.locator('button').count();
      expect(badgesAfter).toBeGreaterThan(badgesBefore);
    }
  });

  test('expanded filter badges are clickable and add filters', async ({ page }) => {
    await openDiscoveryPanel(page);

    const moreTagsBtn = page.getByTestId('show-more-tags');
    if ((await moreTagsBtn.count()) > 0) {
      await moreTagsBtn.click();

      // Click the last tag badge (one that was previously hidden)
      const row = page.getByTestId('filter-row-categories');
      const badges = row.locator('button');
      const lastBadge = badges.last();
      await lastBadge.click();

      // A filter badge should now be active (search input placeholder changes)
      const searchInput = page.locator('input[placeholder="Search..."]');
      await expect(searchInput).toBeAttached({ timeout: 3000 });
    }
  });
});

test.describe('Card Tag Row', () => {
  test('visible tags are whole (not clipped) and navigate to the tag page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/workflows/');
    await expect(templateCardLink(page)).toBeAttached({ timeout: 10000 });

    // Rows fit whole tags then a "+N" chip — no row should clip its own content.
    const rows = page.locator('[data-testid="tag-row"]');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(rowCount, 10); i++) {
      const clips = await rows.nth(i).evaluate((el) => el.scrollWidth > el.clientWidth + 1);
      expect(clips).toBe(false);
    }

    const firstTag = rows.locator('a.tag-link').first();
    test.skip((await firstTag.count()) === 0, 'No card has tags at this viewport');
    await Promise.all([page.waitForURL(/\/workflows\/tag\/.+\//), firstTag.click()]);
    expect(page.url()).toMatch(/\/workflows\/tag\/.+\//);
  });

  test('a "+N" overflow chip appears when tags exceed the row width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/workflows/');
    await expect(templateCardLink(page)).toBeAttached({ timeout: 10000 });

    const overflow = page.locator('[data-testid="tag-overflow"]').first();
    test.skip((await overflow.count()) === 0, 'No card overflows its tag row at this width');
    await expect(overflow).toHaveText(/^\+\d+$/);
  });
});

test.describe('Error Handling', () => {
  test('404 page renders correctly', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-xyz123');
    expect(response?.status()).toBe(404);
    await expect(page.locator('body')).toContainText(/not found|404|error/i);
  });
});

test.describe('Performance', () => {
  test('pages load within acceptable time', async ({ page }) => {
    const start = Date.now();
    await page.goto('/workflows/');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(10000);
  });
});

test.describe('Accessibility Basics', () => {
  test('images have alt text', async ({ page }) => {
    await page.goto('/workflows/');
    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      expect(alt !== null).toBeTruthy();
    }
  });

  test('page has main landmark', async ({ page }) => {
    await page.goto('/');
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });
});

test.describe('Thumbnail Loading', () => {
  test('template cards have thumbnail images', async ({ page }) => {
    await page.goto('/workflows/');
    const thumbnailImages = page.locator('main img[src^="/workflows/thumbnails/"]');
    await expect(thumbnailImages.first()).toBeAttached({ timeout: 10000 });
    const count = await thumbnailImages.count();
    expect(count).toBeGreaterThan(0);
  });

  test('thumbnail images load successfully (no broken images)', async ({ page }) => {
    await page.goto('/workflows/');
    const images = page.locator('main img[src^="/workflows/thumbnails/"]');
    await expect(images.first()).toBeAttached({ timeout: 10000 });
    const count = await images.count();
    expect(count).toBeGreaterThan(0);

    // Only check images that are visible (above-fold, eagerly loaded)
    for (let i = 0; i < Math.min(count, 4); i++) {
      const img = images.nth(i);
      await img.scrollIntoViewIfNeeded();
      // Wait briefly for the image to load after scrolling into view
      await expect(img).toHaveJSProperty('complete', true, { timeout: 5000 });
      const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
      expect(naturalWidth, `Image ${i} should have loaded`).toBeGreaterThan(0);
    }
  });

  test('template detail page hero thumbnail loads', async ({ page }) => {
    await page.goto('/workflows/');
    const firstCard = templateCardLink(page);
    await expect(firstCard).toBeAttached({ timeout: 10000 });
    const href = await firstCard.getAttribute('href');
    expect(href).toBeTruthy();

    await page.goto(href!);
    await page.waitForLoadState('networkidle');

    const heroImages = page.locator('article img[src^="/workflows/thumbnails/"]');
    const count = await heroImages.count();
    if (count > 0) {
      const naturalWidth = await heroImages
        .first()
        .evaluate((el: HTMLImageElement) => el.naturalWidth);
      expect(naturalWidth, 'Hero thumbnail should have loaded').toBeGreaterThan(0);
    }
  });

  test('thumbnail URLs return 200 status', async ({ page, request }) => {
    await page.goto('/workflows/');
    const images = page.locator('main img[src^="/workflows/thumbnails/"]');
    await expect(images.first()).toBeAttached({ timeout: 10000 });
    const count = await images.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 5); i++) {
      const src = await images.nth(i).getAttribute('src');
      expect(src).toBeTruthy();
      const response = await request.get(src!);
      expect(response.status(), `${src} should return 200`).toBe(200);
    }
  });
});

test.describe('UTM Parameter Tracking', () => {
  test('CTA links include required UTM parameters', async ({ page }) => {
    await page.goto('/workflows/');
    const firstCard = templateCardLink(page);
    await expect(firstCard).toBeAttached({ timeout: 10000 });
    const href = await firstCard.getAttribute('href');
    expect(href).toBeTruthy();

    await page.goto(href!);
    await page.waitForLoadState('networkidle');

    // Scope to article to exclude navbar CTA links
    const ctaLinks = page.locator('article a.run-cloud-btn');
    const count = await ctaLinks.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const ctaHref = await ctaLinks.nth(i).getAttribute('href');
      expect(ctaHref).toBeTruthy();
      const url = new URL(ctaHref!);
      const params = url.searchParams;

      expect(params.get('utm_source')).toBe('workflow_hub');
      expect(params.get('utm_medium')).toBe('site_CTA');
      expect(params.has('utm_campaign')).toBeTruthy();
      expect(params.has('utm_content')).toBeTruthy();
      expect(params.has('template')).toBeTruthy();
    }
  });

  test('UTM content matches template name', async ({ page }) => {
    await page.goto('/workflows/');
    const firstCard = templateCardLink(page);
    await expect(firstCard).toBeAttached({ timeout: 10000 });
    const href = await firstCard.getAttribute('href');
    expect(href).toBeTruthy();

    await page.goto(href!);
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    const slug = currentUrl.split('/workflows/')[1]?.replace(/\/$/, '');
    expect(slug).toBeTruthy();

    // Scope to article to exclude navbar CTA links
    const ctaLinks = page.locator('article a.run-cloud-btn');
    const count = await ctaLinks.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const ctaHref = await ctaLinks.nth(i).getAttribute('href');
      expect(ctaHref).toBeTruthy();
      const url = new URL(ctaHref!);
      expect(url.searchParams.get('utm_content')).toBe(slug);
    }
  });
});
