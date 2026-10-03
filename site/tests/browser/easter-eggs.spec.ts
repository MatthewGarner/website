import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('42 reveals the Guide without trapping the editor or changing the chosen paper', async ({ page }) => {
  await page.goto('/');
  await page.locator('.colophon > summary').click();
  const specimen = page.getByRole('textbox', { name: 'Your words' });
  const guide = page.getByRole('region', { name: 'The Guide, entry 42' });
  await page.getByRole('radio', { name: 'Ink', exact: true }).check();
  await specimen.fill('142');
  await expect(guide).not.toBeVisible();
  await specimen.fill('42');
  await expect(guide).toBeVisible();
  await expect(guide).toContainText('Mostly harmless.');
  await expect(page.locator('.specimen-caption')).toHaveText('The GuideEntry · 0042');
  await expect(specimen).toBeFocused();
  await expect(page.getByRole('radio', { name: 'Ink', exact: true })).toBeChecked();
  await specimen.press('3');
  await expect(guide).not.toBeVisible();
  await specimen.fill('42');
  await page.getByRole('button', { name: 'Back to the specimen' }).click();
  await expect(specimen).toBeFocused();
  await expect(guide).not.toBeVisible();
  await expect(page.locator('.specimen-caption')).toHaveText('OswaldType specimen · 01');
  await specimen.fill('42');
  await page.getByRole('button', { name: 'Another phrase' }).click();
  await expect(guide).not.toBeVisible();
  await specimen.fill('42');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(guide).not.toBeVisible();
  await expect(specimen).toHaveValue('A little\nroom to think.');
});

test('a keyboard tug reveals a working way home and can be rewound', async ({ page, browserName }) => {
  await page.goto('/404.html');
  const tug = page.getByRole('button', { name: 'Give it a tug' });
  const home = page.locator('#thread-home');
  await expect(home).not.toBeVisible();
  await tug.focus();
  await tug.press('Enter');
  await expect(home).toBeVisible();
  await expect(page.getByRole('button', { name: 'Wind it back up' })).toBeFocused();
  await page.keyboard.press('Space');
  await expect(home).not.toBeVisible();
  await page.keyboard.press('Enter');
  // macOS Safari's default Tab preference skips links; Option-Tab includes them.
  await page.keyboard.press(browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab');
  await expect(home).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/');
});

test('both discoveries fit a narrow phone in both themes with reduced motion', async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 320, height: 740 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await page.goto('/404.html');
    await page.getByRole('button', { name: 'Give it a tug' }).tap();
    expect(await page.locator('.loose-end').evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
    expect((await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.locator('main').screenshot({ path: testInfo.outputPath(`thread-${colorScheme}.png`) });
    await page.locator('.colophon > summary').tap();
    await page.getByRole('textbox', { name: 'Your words' }).fill('42');
    await expect(page.getByRole('region', { name: 'The Guide, entry 42' })).toBeVisible();
    expect(await page.locator('.type-sheet').evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
    expect((await new AxeBuilder({ page }).include('.type-sheet').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.locator('.type-sheet').screenshot({ path: testInfo.outputPath(`guide-${colorScheme}.png`) });
  }
  await context.close();
});

test('without JavaScript the 404 retains its reading link and no dead controls', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4335/404.html');
  await expect(page.locator('.loose-end')).not.toBeVisible();
  await page.getByRole('link', { name: 'Find something to read' }).click();
  await expect(page).toHaveURL(/\/writing\/?$/);
  await context.close();
});
