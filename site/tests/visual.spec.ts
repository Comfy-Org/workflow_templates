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
    await expect(page).toHaveScreenshot('templates-listing.png', { fullPage: true });
  });

  test('template detail page', async ({ page }) => {
    // Navigate to templates listing first to find a valid template
    await page.goto('/templates');
    await page.waitForLoadState('networkidle');

    // Get the first template link
    const templateLink = page.locator('a[href^="/templates/"]').first();
    const href = await templateLink.getAttribute('href');

    if (href) {
      await page.goto(href);
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('template-detail.png', { fullPage: true });
    }
  });

  test('category page', async ({ page }) => {
    // Try common category paths
    const categoryPaths = ['/category/image-generation', '/category/video', '/category/upscaling'];

    for (const path of categoryPaths) {
      const response = await page.goto(path);
      if (response?.ok()) {
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveScreenshot('category.png', { fullPage: true });
        return;
      }
    }

    // Fallback: find category link from homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const categoryLink = page.locator('a[href^="/category/"]').first();
    const href = await categoryLink.getAttribute('href');

    if (href) {
      await page.goto(href);
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('category.png', { fullPage: true });
    }
  });

  test('404 page', async ({ page }) => {
    await page.goto('/this-page-definitely-does-not-exist-12345');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('404.png', { fullPage: true });
  });
});
