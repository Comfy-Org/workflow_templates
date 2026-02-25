import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('loads correctly with required elements', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ComfyUI/i);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();
  });

  test('has working navigation links', async ({ page }) => {
    await page.goto('/');
    const templatesLink = page.locator('a[href*="/templates"]').first();
    await expect(templatesLink).toBeAttached();
  });
});

test.describe('Templates Listing', () => {
  test('shows template cards', async ({ page }) => {
    await page.goto('/templates');
    await expect(page).toHaveTitle(/templates/i);
    const templateCards = page.locator('main a[data-astro-prefetch]');
    await expect(templateCards.first()).toBeVisible();
    expect(await templateCards.count()).toBeGreaterThan(0);
  });

  test('template cards are clickable', async ({ page }) => {
    await page.goto('/templates');
    const firstTemplate = page.locator('main a[data-astro-prefetch]').first();
    const href = await firstTemplate.getAttribute('href');
    expect(href).toBeTruthy();
    expect(href).toMatch(/\/templates\/[a-z0-9_-]+/i);
  });
});

test.describe('Template Detail Page', () => {
  test('has required sections', async ({ page }) => {
    await page.goto('/templates');
    const templateLink = page.locator('main a[data-astro-prefetch]').first();
    const href = await templateLink.getAttribute('href');
    expect(href).toBeTruthy();

    await page.goto(href!);
    await expect(page.locator('h1').first()).toBeAttached();
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', /.+/);
  });

  test('has CTA button', async ({ page }) => {
    await page.goto('/templates');
    const templateLink = page.locator('main a[data-astro-prefetch]').first();
    const href = await templateLink.getAttribute('href');
    expect(href).toBeTruthy();

    await page.goto(href!);
    await page.waitForLoadState('networkidle');

    const ctaLinks = page.locator('a[href*="cloud.comfy.org"]');
    expect(await ctaLinks.count()).toBeGreaterThan(0);
  });

  test('has structured data', async ({ page }) => {
    await page.goto('/templates');
    const templateLink = page.locator('main a[data-astro-prefetch]').first();
    const href = await templateLink.getAttribute('href');
    expect(href).toBeTruthy();

    await page.goto(href!);
    await page.waitForLoadState('networkidle');

    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd.first()).toBeAttached();
  });
});

test.describe('Category Pages', () => {
  test('category page loads and shows templates', async ({ page }) => {
    await page.goto('/');
    const categoryLink = page.locator('a[href^="/category/"]').first();

    if ((await categoryLink.count()) > 0) {
      const href = await categoryLink.getAttribute('href');
      expect(href).toBeTruthy();
      await page.goto(href!);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('h1')).toBeVisible();
    } else {
      const response = await page.goto('/category/image-generation');
      if (response?.ok()) {
        await expect(page.locator('h1')).toBeVisible();
      }
    }
  });
});

test.describe('i18n - Japanese', () => {
  test('Japanese page loads with correct lang attribute', async ({ page }) => {
    await page.goto('/ja/templates');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', 'ja');
  });

  test('Japanese page has localized content', async ({ page }) => {
    await page.goto('/ja/templates');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('hreflang tags are present', async ({ page }) => {
    await page.goto('/templates');
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
    await page.goto('/templates');
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toBeAttached();
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
    await page.goto('/templates');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(5000);
  });
});

test.describe('Accessibility Basics', () => {
  test('images have alt text', async ({ page }) => {
    await page.goto('/templates');
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
    await page.goto('/templates');
    await page.waitForLoadState('networkidle');
    const thumbnailImages = page.locator('main a[data-astro-prefetch] img[src^="/templates/thumbnails/"]');
    const count = await thumbnailImages.count();
    expect(count).toBeGreaterThan(0);
  });

  test('thumbnail images load successfully (no broken images)', async ({ page }) => {
    await page.goto('/templates');
    await page.waitForLoadState('networkidle');
    const images = page.locator('main img[src^="/templates/thumbnails/"]');
    const count = await images.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 10); i++) {
      const img = images.nth(i);
      const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
      expect(naturalWidth, `Image ${i} should have loaded`).toBeGreaterThan(0);
    }
  });

  test('template detail page hero thumbnail loads', async ({ page }) => {
    await page.goto('/templates');
    const templateLink = page.locator('main a[data-astro-prefetch]').first();
    const href = await templateLink.getAttribute('href');
    expect(href).toBeTruthy();

    await page.goto(href!);
    await page.waitForLoadState('networkidle');

    const heroImages = page.locator('article img[src^="/templates/thumbnails/"]');
    const count = await heroImages.count();
    if (count > 0) {
      const naturalWidth = await heroImages
        .first()
        .evaluate((el: HTMLImageElement) => el.naturalWidth);
      expect(naturalWidth, 'Hero thumbnail should have loaded').toBeGreaterThan(0);
    }
  });

  test('thumbnail URLs return 200 status', async ({ page, request }) => {
    await page.goto('/templates');
    await page.waitForLoadState('networkidle');

    const images = page.locator('main img[src^="/templates/thumbnails/"]');
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
    await page.goto('/templates');
    const templateLink = page.locator('main a[data-astro-prefetch]').first();
    const href = await templateLink.getAttribute('href');
    expect(href).toBeTruthy();

    await page.goto(href!);
    await page.waitForLoadState('networkidle');

    const ctaLinks = page.locator('article a[href*="cloud.comfy.org"]');
    const count = await ctaLinks.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const ctaHref = await ctaLinks.nth(i).getAttribute('href');
      expect(ctaHref).toBeTruthy();
      const url = new URL(ctaHref!);
      const params = url.searchParams;

      expect(params.get('utm_source')).toBe('templates');
      expect(params.get('utm_medium')).toBe('web');
      expect(params.has('utm_campaign')).toBeTruthy();
      expect(params.has('utm_content')).toBeTruthy();
      expect(params.has('template')).toBeTruthy();
    }
  });

  test('UTM content matches template name', async ({ page }) => {
    await page.goto('/templates');
    const templateLink = page.locator('main a[data-astro-prefetch]').first();
    const href = await templateLink.getAttribute('href');
    expect(href).toBeTruthy();

    await page.goto(href!);
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    const slug = currentUrl.split('/templates/')[1]?.replace(/\/$/, '');
    expect(slug).toBeTruthy();

    const ctaLinks = page.locator('article a[href*="cloud.comfy.org"]');
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
