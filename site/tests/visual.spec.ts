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
    const thumbnails = page.locator(
      'main a[data-astro-prefetch] img, main a[data-astro-prefetch] video'
    );
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
        const thumbnails = page.locator(
          'main a[data-astro-prefetch] img, main a[data-astro-prefetch] video'
        );
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
      const thumbnails = page.locator(
        'main a[data-astro-prefetch] img, main a[data-astro-prefetch] video'
      );
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

  test('author link idle and hover states', async ({ page, isMobile }) => {
    // :hover isn't a meaningful, stable state on touch/mobile viewports —
    // only exercise it on the desktop (mouse) project.
    test.skip(isMobile, 'Hover states only apply to pointer/mouse viewports');

    await page.goto('/workflows/');
    await page.waitForLoadState('networkidle');

    // Scoped to a grid card rather than `a[data-testid="author-link"]` on the
    // whole page — the featured hero carousel above the grid renders the same
    // component but auto-advances, which would make an element screenshot
    // flaky. The grid card's author attribution is an <a> whenever the
    // creator has a profile page, which is the state that carries the hover
    // treatment.
    const authorLink = page
      .locator('[data-testid="workflow-card"]')
      .first()
      .locator('a[data-testid="author-link"]');
    await expect(authorLink).toBeVisible();
    await authorLink.scrollIntoViewIfNeeded();

    // The avatar image (when the creator has one) is lazy-loaded, so it only
    // starts fetching once scrolled into view — wait for it to finish or the
    // idle shot can race a still-loading image and flake between the real
    // avatar and the fallback initial. No <img> at all means Avatar already
    // settled on the fallback initial; nothing to wait for.
    const avatarImg = authorLink.locator('img');
    await expect
      .poll(async () => {
        if ((await avatarImg.count()) === 0) return true;
        return avatarImg.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0);
      })
      .toBe(true);

    await expect(authorLink).toHaveScreenshot('author-link-idle.png');

    await authorLink.hover();
    // Let the 150ms background/underline/ring transition finish before capturing.
    await page.waitForTimeout(250);
    await expect(authorLink).toHaveScreenshot('author-link-hover.png');
  });
});
