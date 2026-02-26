import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test('homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('homepage.png', { fullPage: true });
  });

  test('template listing page', async ({ page }) => {
    await page.goto('/templates');
    await page.waitForLoadState('networkidle');
    // Mask animated video/image thumbnails that cause instability
    const thumbnails = page.locator('main a[data-astro-prefetch] img, main a[data-astro-prefetch] video');
    const masks = await thumbnails.all();
    await expect(page).toHaveScreenshot('templates-listing.png', {
      mask: masks,
    });
  });

  test('template detail page', async ({ page }) => {
    await page.goto('/templates');
    await page.waitForLoadState('networkidle');

    const templateLink = page.locator('a[href^="/templates/"]').first();
    const href = await templateLink.getAttribute('href');

    if (href) {
      await page.goto(href);
      await page.waitForLoadState('networkidle');
      // Mask dynamic thumbnail/video content
      const media = page.locator('article img, article video');
      const masks = await media.all();
      await expect(page).toHaveScreenshot('template-detail.png', {
        mask: masks,
        // Small tolerance for layout shifts from lazy-loaded related templates
        maxDiffPixels: 5000,
      });
    }
  });

  test('template card thumbnails', async ({ page }) => {
    await page.goto('/templates');
    await page.waitForLoadState('networkidle');
    const firstCard = page.locator('main a[data-astro-prefetch]').first();
    await expect(firstCard).toBeVisible();
    await expect(firstCard).toHaveScreenshot('template-card-thumbnail.png');
  });

  test('category page', async ({ page }) => {
    const categoryPaths = [
      '/templates/category/image/',
      '/templates/category/video/',
      '/templates/category/audio/',
    ];

    for (const path of categoryPaths) {
      const response = await page.goto(path);
      if (response?.ok()) {
        await page.waitForLoadState('networkidle');
        // Mask animated thumbnails
        const thumbnails = page.locator('main a[data-astro-prefetch] img, main a[data-astro-prefetch] video');
        const masks = await thumbnails.all();
        await expect(page).toHaveScreenshot('category.png', {
          mask: masks,
        });
        return;
      }
    }

    // Fallback: find category link from templates page
    await page.goto('/templates');
    await page.waitForLoadState('networkidle');
    const categoryLink = page.locator('a[href*="/templates/category/"]').first();
    const href = await categoryLink.getAttribute('href');

    if (href) {
      await page.goto(href);
      await page.waitForLoadState('networkidle');
      const thumbnails = page.locator('main a[data-astro-prefetch] img, main a[data-astro-prefetch] video');
      const masks = await thumbnails.all();
      await expect(page).toHaveScreenshot('category.png', {
        mask: masks,
      });
    }
  });

  test('404 page', async ({ page }) => {
    await page.goto('/this-page-definitely-does-not-exist-12345');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('404.png', { fullPage: true });
  });
});
