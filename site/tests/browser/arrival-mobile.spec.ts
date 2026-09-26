import { test, expect, devices } from '@playwright/test';

test.use({ viewport: devices['iPhone 13'].viewport, userAgent: devices['iPhone 13'].userAgent, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

test('phone viewport notifications do not cancel the first entrance', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    (window as any).arrivalStarts = [];
    document.addEventListener('animationstart', event => {
      if (event.animationName.startsWith('arrive-')) (window as any).arrivalStarts.push(event.animationName);
    });
    // Mobile browser chrome and the initial viewport can notify resize without reader input.
    document.addEventListener('DOMContentLoaded', () => {
      dispatchEvent(new Event('resize'));
      dispatchEvent(new Event('scroll'));
    });
  });
  await page.goto('/');
  await page.setViewportSize({ width: 390, height: 760 });
  await expect.poll(() => page.evaluate(() => (window as any).arrivalStarts)).toEqual(expect.arrayContaining(['arrive-type', 'arrive-copy', 'arrive-rule']));
  await expect(page.locator('[data-home-arrival]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).arrivalStarts.filter((name: string) => name === 'arrive-type').length)).toBe(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width);
  await page.screenshot({ path: testInfo.outputPath('mobile-home-settled.png') });
});

test('a homepage loaded in a background tab starts when first shown', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    (window as any).arrivalStarts = [];
    document.addEventListener('animationstart', event => {
      if (event.animationName.startsWith('arrive-')) (window as any).arrivalStarts.push(event.animationName);
    });
  });
  await page.goto('/');
  await expect(page.locator('[data-home-arrival]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).arrivalStarts)).toEqual([]);
  await page.evaluate(() => {
    delete (document as any).hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => page.evaluate(() => (window as any).arrivalStarts)).toEqual(expect.arrayContaining(['arrive-type', 'arrive-copy', 'arrive-rule']));
  await expect(page.locator('[data-home-arrival]')).toHaveCount(0);
  await page.getByRole('link', { name: 'About', exact: true }).click();
  await page.goBack();
  await expect(page.locator('[data-home-arrival]')).toHaveCount(0);
});

test('refreshing at the top replays the entrance even with the previous session marker', async ({ page }) => {
  // Use a fresh top-of-page context: WebKit can retain an earlier scrolled reload's
  // restoration point even after programmatic scrolling, independently of the site.
  await page.addInitScript(() => {
    sessionStorage.setItem('mg:home-arrival', 'seen');
    (window as any).arrivalStarts = [];
    document.addEventListener('animationstart', event => {
      if (event.animationName.startsWith('arrive-')) (window as any).arrivalStarts.push(event.animationName);
    });
  });
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => (window as any).arrivalStarts)).toContain('arrive-type');
  await expect(page.locator('[data-home-arrival]')).toHaveCount(0);
  await page.reload();
  await expect.poll(() => page.evaluate(() => (window as any).arrivalStarts)).toEqual(expect.arrayContaining(['arrive-type', 'arrive-copy', 'arrive-rule']));
  await expect(page.locator('[data-home-arrival]')).toHaveCount(0);
  expect(await page.evaluate(() => scrollY)).toBe(0);
});
