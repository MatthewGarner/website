import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('personal pages are discoverable without becoming essays or feed entries', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Now', exact: true })).toBeVisible();
  await expect(page.locator('.now-preview')).toContainText('Making a little room for reading');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Now', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Now', exact: true })).toBeVisible();
  await expect(page.locator('.updated-date')).toContainText('27 September 2026');
  await expect(page.locator('.essay-meta, .next-essay')).toHaveCount(0);
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Bookshelf', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Currently reading' })).toBeVisible();
  await expect(page.locator('.book-entry')).toHaveCount(3);
  await expect(page.locator('.book-jacket img')).toBeVisible();
  await expect(page.getByRole('link', { name: 'A Favourite Book — more about this book' })).toHaveAttribute('href', 'https://example.com/book');
  const feed = await (await request.get('/index.xml')).text();
  expect(feed).not.toMatch(/<title>(?:Now|Bookshelf)<\/title>/);
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('https://www.matthewgarner.me/now');
  expect(sitemap).toContain('https://www.matthewgarner.me/bookshelf');
  await page.goto('/writing');
  await expect(page.locator('.archive-list a[href="/now"], .archive-list a[href="/bookshelf"]')).toHaveCount(0);
});

test('new pages fit narrow screens and remain accessible in both appearances', async ({ page }) => {
  for (const width of [1200, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/now', '/bookshelf']) {
      await page.goto(route);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      expect(overflow, `${route} overflows at ${width}px`).toBe(false);
    }
  }
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    for (const route of ['/now', '/bookshelf']) {
      await page.goto(route);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    }
  }
});
