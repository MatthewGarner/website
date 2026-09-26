import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('the colophon opens by keyboard, edits only the specimen, and resets cleanly', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const summary = page.locator('.colophon > summary');
  const specimen = page.getByRole('textbox', { name: 'Your words' });
  await expect(specimen).not.toBeVisible();
  await summary.focus();
  await summary.press('Enter');
  await expect(specimen).toBeVisible();
  // At the document end, scrolling is clamped; the specimen must be revealed, not aligned to an arbitrary top offset.
  await expect.poll(async () => {
    const bounds = (await page.locator('.type-sheet').boundingBox())!;
    return bounds.y + bounds.height;
  }).toBeLessThanOrEqual(page.viewportSize()!.height);
  await expect(specimen).toHaveValue('A little\nroom to think.');
  const theme = await page.locator('html').getAttribute('data-theme');
  const headlineFont = await page.locator('h1').evaluate(el => getComputedStyle(el).fontFamily);
  await specimen.fill('Something of my own.');
  await page.getByRole('radio', { name: 'Newsreader', exact: true }).check();
  await expect(specimen).toHaveCSS('font-family', /Newsreader/);
  const weight = page.getByRole('slider', { name: 'Weight' });
  await weight.focus();
  await weight.press('Home');
  await expect(specimen).toHaveCSS('font-weight', '200');
  await weight.press('ArrowRight');
  await expect(specimen).toHaveCSS('font-weight', '210');
  await page.getByRole('radio', { name: 'Ink', exact: true }).check();
  await expect(page.locator('.type-sheet')).toHaveCSS('background-color', 'rgb(36, 33, 44)');
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme!);
  expect(await page.locator('h1').evaluate(el => getComputedStyle(el).fontFamily)).toBe(headlineFont);
  await expect(specimen).toHaveValue('Something of my own.');
  await page.getByRole('button', { name: 'Another phrase' }).click();
  await expect(specimen).toHaveValue('Good things\ntake time.');
  await expect(page.locator('[data-specimen-status]')).toHaveText('New phrase: Good things take time.');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reset', exact: true })).toBeFocused();
  await expect(specimen).toHaveValue('A little\nroom to think.');
  await expect(specimen).toHaveCSS('font-weight', '600');
  await expect(page.getByRole('radio', { name: 'Oswald', exact: true })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Cream', exact: true })).toBeChecked();
  await page.keyboard.press('Escape');
  await expect(specimen).not.toBeVisible();
  await expect(summary).toBeFocused();
  expect(errors).toEqual([]);
});

test('touch controls and long specimen text fit a narrow phone', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 320, height: 740 }, baseURL: 'http://127.0.0.1:4335' });
  const page = await context.newPage();
  await page.goto('/');
  await page.locator('.colophon > summary').tap();
  const specimen = page.getByRole('textbox', { name: 'Your words' });
  await specimen.fill('W'.repeat(72));
  await page.getByText('Newsreader', { exact: true }).last().tap();
  await page.getByText('Lilac', { exact: true }).tap();
  await expect(page.getByRole('radio', { name: 'Lilac', exact: true })).toBeChecked();
  const bounds = (await page.locator('.type-sheet').boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await page.getByRole('button', { name: 'Reset', exact: true }).tap();
  await expect(specimen).toHaveValue('A little\nroom to think.');
  await page.locator('.colophon > summary').tap();
  await expect(specimen).not.toBeVisible();
  await context.close();
});

test('colophon works without JavaScript and stays out of printed articles', async ({ browser, page }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL: 'http://127.0.0.1:4335' });
  const plain = await context.newPage();
  await plain.goto('/');
  await plain.locator('.colophon > summary').click();
  await expect(plain.getByRole('heading', { name: 'A little room to play.' })).toBeVisible();
  await expect(plain.locator('.colophon-intro')).toContainText('Written in Obsidian');
  await plain.getByRole('textbox', { name: 'Your words' }).fill('Still room to play.');
  await expect(plain.getByRole('textbox', { name: 'Your words' })).toHaveValue('Still room to play.');
  await expect(plain.locator('.type-controls')).not.toBeVisible();
  await context.close();
  await page.goto('/drifting');
  await page.locator('.colophon > summary').click();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.colophon')).not.toBeVisible();
  await expect(page.locator('.prose')).toBeVisible();
});

test('reduced motion keeps the playground still, including when preference changes', async ({ page }) => {
  await page.goto('/');
  await page.locator('.colophon > summary').click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Another phrase' }).click();
  await page.getByRole('radio', { name: 'Newsreader', exact: true }).check();
  await page.getByRole('radio', { name: 'Ink', exact: true }).check();
  await expect(page.locator('.type-sheet')).toHaveCSS('transition-duration', '0s');
  await expect(page.getByRole('textbox', { name: 'Your words' })).toHaveCSS('transform', 'none');
  expect(await page.locator('.colophon').evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
});

test('type controls stay accessible in both themes and every paper colour', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await page.goto('/');
    await page.locator('.colophon > summary').click();
    for (const paper of ['Cream', 'Lilac', 'Ink']) {
      await page.getByRole('radio', { name: paper, exact: true }).check();
      expect((await new AxeBuilder({ page }).include('.site-footer').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    }
    await page.locator('.colophon-content').screenshot({ path: testInfo.outputPath(`colophon-${colorScheme}.png`) });
  }
});
