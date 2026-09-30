import { test, expect } from '@playwright/test';

test('shared navigation keeps personal pages reachable and uses canonical collection origins', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(nav.getByRole('link')).toHaveText(['Writing', 'Tools', 'Energy', 'Now']);
  await expect(nav.getByRole('link', { name: 'Tools', exact: true })).toHaveAttribute('href', 'https://tools.matthewgarner.me/');
  await expect(nav.getByRole('link', { name: 'Energy', exact: true })).toHaveAttribute('href', 'https://energy.matthewgarner.me/');
  await nav.getByRole('link', { name: 'Writing', exact: true }).click();
  await expect(nav.getByRole('link', { name: 'Writing', exact: true })).toHaveAttribute('aria-current', 'page');
  const footer = page.getByRole('navigation', { name: 'Elsewhere' });
  await footer.getByRole('link', { name: 'About', exact: true }).click();
  await expect(footer.getByRole('link', { name: 'About', exact: true })).toHaveAttribute('aria-current', 'page');
  await footer.getByRole('link', { name: 'Bookshelf', exact: true }).click();
  await expect(footer.getByRole('link', { name: 'Bookshelf', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('device appearance restores live OS following after a saved override', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: /Appearance:/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Use system appearance', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await page.evaluate(() => localStorage.getItem('mg:appearance'))).toBeNull();
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('navigation and OS appearance remain useful without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, colorScheme: 'dark', baseURL: 'http://127.0.0.1:4335' });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(36, 33, 44)');
  await expect(page.getByRole('button', { name: /Appearance:/ })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Use system appearance', exact: true })).toBeHidden();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Now', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Now', exact: true })).toBeVisible();
  await page.getByRole('navigation', { name: 'Elsewhere' }).getByRole('link', { name: 'Bookshelf', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bookshelf', exact: true })).toBeVisible();
  await context.close();
});
