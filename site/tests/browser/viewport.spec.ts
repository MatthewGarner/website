import { test, expect, type Locator, type Page } from '@playwright/test';

const laptops = [
  { width: 1512, height: 820 },
  { width: 1440, height: 800 },
  { width: 1366, height: 680 },
  { width: 1280, height: 720 },
  { width: 1024, height: 768 },
  { width: 1920, height: 1080 },
];

async function load(page: Page, route = '/') {
  await page.goto(route);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('[data-home-arrival]')).toHaveCount(0);
}

async function fits(page: Page, elements: Locator) {
  const viewport = page.viewportSize()!;
  const rectangles = await elements.evaluateAll(nodes => nodes.map(node => {
    const { top, right, bottom, left, width, height } = node.getBoundingClientRect();
    return { text: node.textContent?.trim(), top, right, bottom, left, width, height };
  }));
  expect(rectangles.length).toBeGreaterThan(0);
  for (const rect of rectangles) {
    expect(rect.width, rect.text).toBeGreaterThan(0);
    expect(rect.height, rect.text).toBeGreaterThan(0);
    expect(rect.top, rect.text).toBeGreaterThanOrEqual(0);
    expect(rect.left, rect.text).toBeGreaterThanOrEqual(0);
    expect(rect.bottom, rect.text).toBeLessThanOrEqual(viewport.height);
    expect(rect.right, rect.text).toBeLessThanOrEqual(viewport.width);
  }
  expect(await page.evaluate(() => scrollY)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
}

for (const viewport of laptops) {
  test(`the complete homepage reading choice fits ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await load(page);
    await fits(page, page.locator('.site-header, .intro, .writing-preview'));
    await fits(page, page.locator('.article-title, .writing-row-meta, .preview-button'));
    const height = await page.locator('.writing-preview').evaluate(el => el.getBoundingClientRect().height);
    for (const button of await page.locator('.preview-button').all()) {
      // DOM activation leaves scroll untouched, so an offscreen link cannot be
      // rescued by Playwright's automatic scroll into view.
      await button.evaluate((el: HTMLButtonElement) => el.click());
      await expect(page.locator('.preview-panel [data-panel]:not([inert])')).toHaveCSS('transform', 'none');
      await fits(page, page.locator('.preview-panel [data-panel]:not([inert]) .preview-copy'));
      await fits(page, page.locator('.preview-panel [data-panel]:not([inert]) .text-link'));
      expect(await page.locator('.writing-preview').evaluate(el => el.getBoundingClientRect().height)).toBe(height);
      expect(await button.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    }
  });
}

test('the short laptop opening stays complete in both appearances', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 680 });
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await load(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);
    await fits(page, page.locator('.site-header, .intro, .writing-preview'));
  }
});

test('phone readers see a complete first writing choice on load', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 744 });
  await load(page);
  await fits(page, page.locator('.site-header, .intro, .writing-row:first-child'));
  await fits(page, page.locator('.writing-row:first-child summary'));
  await expect(page.locator('.preview-panel')).toBeHidden();
});

test('other page openings show the heading and useful content on a short laptop', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 680 });
  for (const [route, selector] of [
    ['/writing', '.archive-list li:first-child'],
    ['/about', '.prose > p:nth-child(2)'],
    ['/now', '.updated-date, .prose > h2:first-child'],
    ['/drifting', '.essay-meta, .prose > p:first-child'],
    ['/bookshelf', '.shelf-section:first-of-type > h2, .shelf-section:first-of-type .book-entry:first-child .book-copy h3, .shelf-section:first-of-type .book-entry:first-child .book-author'],
  ]) {
    await load(page, route);
    await fits(page, page.locator('.site-header, h1'));
    await fits(page, page.locator(selector));
  }
});

test('200% zoom reflows to a scrollable page with every reading choice reachable', async ({ page }) => {
  // Browser zoom halves the CSS viewport. Changing deviceScaleFactor only
  // changes pixel density and would miss the actual reflow at 200% zoom.
  await page.setViewportSize({ width: 756, height: 410 });
  await load(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(756);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeGreaterThan(410);
  await expect(page.locator('.preview-panel')).toBeHidden();
  for (const row of await page.locator('.writing-row').all()) {
    await row.locator('summary').click();
    const link = row.locator('.text-link');
    await link.scrollIntoViewIfNeeded();
    await expect(link).toBeInViewport({ ratio: 1 });
    const rect = await link.boundingBox();
    expect(rect!.x).toBeGreaterThanOrEqual(0);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(756);
  }
  expect(await page.locator('.intro h1').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(44);
});
