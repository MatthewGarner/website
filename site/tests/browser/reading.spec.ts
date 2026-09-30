import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function selectParagraph(page: Page, index = 0) {
  return page.locator('.prose > p').nth(index).evaluate((paragraph) => {
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    const selection = getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    return selection.toString().trim();
  });
}

test('preview holds its place and the title travels into the article, then cleans up on Back', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    addEventListener('pagereveal', (event: any) => {
      event.viewTransition?.ready.then(() => {
        document.documentElement.dataset.capturedTitle = document.querySelector<HTMLElement>('h1[data-reading-title]')?.style.viewTransitionName ?? '';
        document.documentElement.dataset.capturedSheet = document.querySelector<HTMLElement>('.essay')?.style.viewTransitionName ?? '';
      }, () => {});
    });
  });
  await page.goto('/');
  // CI exposed a first-render race when the destination stylesheet arrived late.
  await page.route('**/*.css', async route => {
    await new Promise(resolve => setTimeout(resolve, 300));
    await route.continue();
  });
  const height = await page.locator('.preview-panel').evaluate(el => el.getBoundingClientRect().height);
  await page.getByRole('button', { name: 'Preview Drifting', exact: true }).press('Enter');
  await expect(page.locator('#preview-drifting')).toHaveAttribute('aria-hidden', 'false');
  expect(await page.locator('.preview-panel').evaluate(el => el.getBoundingClientRect().height)).toBe(height);
  await page.getByRole('button', { name: 'Preview The gardening metaphor', exact: true }).click();
  await page.getByRole('button', { name: 'Preview Drifting', exact: true }).click();
  await page.getByRole('link', { name: 'Read the note', exact: true }).click();
  await expect(page).toHaveURL(/\/drifting$/);
  const supportsTransition = await page.evaluate(() => 'onpagereveal' in window && 'navigation' in window);
  if (supportsTransition) {
    await expect(page.locator('html')).toHaveAttribute('data-captured-title', 'reading-title');
    await expect(page.locator('html')).toHaveAttribute('data-captured-sheet', 'reading-sheet');
  }
  await expect(page.locator('h1')).toHaveCSS('view-transition-name', 'none');
  await expect(page.locator('.essay')).toHaveCSS('view-transition-name', 'none');
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Selected writing' })).toBeVisible();
  await expect(page.locator('[data-reading-transition]')).toHaveCount(0);
  await expect(page.locator('[style*="view-transition-name"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('footnotes keep the reading position, return keyboard focus, and fit a phone', async ({ page }) => {
  await page.goto('/interaction-sample');
  const reference = page.locator('[data-footnote-ref]').first();
  await reference.scrollIntoViewIfNeeded();
  await reference.focus();
  const scroll = await page.evaluate(() => scrollY);
  await reference.press('Enter');
  const panel = page.getByRole('dialog', { name: 'Footnote 1' });
  await expect(panel).toBeVisible();
  expect(await page.evaluate(() => scrollY)).toBe(scroll);
  await expect(panel.getByRole('link', { name: 'Drifting' })).toBeVisible();
  await expect(panel.locator('[data-footnote-backref], .footnote-panel-body [id]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(panel).not.toBeVisible();
  await expect(reference).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await reference.click();
  await expect(panel).toBeVisible();
  const rect = await panel.boundingBox();
  expect(rect!.x).toBeGreaterThanOrEqual(0);
  expect(rect!.x + rect!.width).toBeLessThanOrEqual(390);
  expect(rect!.y + rect!.height).toBeLessThanOrEqual(844);
  await page.getByRole('button', { name: 'Close footnote' }).click();
  await page.locator('[data-footnote-ref]').last().click();
  await expect(panel).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(panel).not.toBeVisible();
});

test('a selected passage copies its text, credit and a specific link', async ({ page, context, browserName }, testInfo) => {
  if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  else await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (text: string) => { (window as any).copiedQuote = text; } } });
    });
  await page.goto('/drifting');
  const text = await selectParagraph(page);
  const toolbar = page.getByRole('complementary', { name: 'Share selected text' });
  await expect(toolbar).toBeVisible();
  await page.getByRole('button', { name: 'Copy quote & link' }).click();
  await expect(page.getByRole('status')).toHaveText('Copied — ready to share.');
  const copied = browserName === 'chromium' ? await page.evaluate(() => navigator.clipboard.readText()) : await page.evaluate(() => (window as any).copiedQuote);
  expect(copied).toContain(`“${text}”`);
  expect(copied).toContain('— Matthew Garner, Drifting');
  expect(copied).toContain('https://www.matthewgarner.me/drifting#main:~:text=');
  await page.screenshot({ path: testInfo.outputPath('quote-tools.png') });
  await page.getByRole('button', { name: 'Dismiss quote tools' }).click();
  await expect(toolbar).not.toBeVisible();
});

test('the same footnote reference toggles its preview with pointer and keyboard input', async ({ page }) => {
  await page.goto('/interaction-sample');
  const reference = page.locator('[data-footnote-ref]').first();
  const panel = page.getByRole('dialog', { name: 'Footnote 1' });
  await reference.click();
  await expect(panel).toBeVisible();
  await reference.click();
  await expect(panel).not.toBeVisible();
  await expect(reference).toBeFocused();
  await reference.press('Enter');
  await expect(panel).toBeVisible();
  await reference.focus();
  await reference.press('Enter');
  await expect(panel).not.toBeVisible();
  await expect(reference).toBeFocused();
});

test('a dismissed clipboard request cannot change a later quotation or steal focus', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).quoteWrites = [];
    Object.defineProperty(navigator, 'clipboard', { value: {
      writeText: () => new Promise<void>((resolve, reject) => {
        (window as any).quoteWrites.push({ resolve, reject });
      }),
    } });
  });
  await page.goto('/drifting');
  await selectParagraph(page);
  const toolbar = page.getByRole('complementary', { name: 'Share selected text' });
  const copy = page.getByRole('button', { name: 'Copy quote & link' });
  await copy.click();
  await expect(copy).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(toolbar).not.toBeVisible();
  await selectParagraph(page, 1);
  await expect(toolbar).toBeVisible();
  await expect(copy).toBeEnabled();
  await copy.click();
  await expect(copy).toBeDisabled();
  await page.evaluate(() => (window as any).quoteWrites[0].reject(new Error('Denied')));
  await expect(page.getByLabel('Copy this quote')).not.toBeVisible();
  await expect(page.locator('.quote-status')).toBeEmpty();
  await expect(copy).toBeDisabled();
  await page.evaluate(() => (window as any).quoteWrites[1].resolve());
  await expect(page.locator('.quote-status')).toHaveText('Copied — ready to share.');
});

test('clipboard denial offers a keyboard-accessible manual copy, including on mobile', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('Denied'); } } });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/drifting');
  await selectParagraph(page);
  const copy = page.getByRole('button', { name: 'Copy quote & link' });
  await expect(copy).toBeVisible();
  await copy.focus();
  await copy.press('Enter');
  await expect(page.getByLabel('Copy this quote')).toBeFocused();
  await expect(page.getByLabel('Copy this quote')).toHaveValue(/Matthew Garner, Drifting/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('complementary', { name: 'Share selected text' })).not.toBeVisible();
});

test('reduced motion disables preview, theme and navigation animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    (window as any).motionCalls = 0;
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args) { (window as any).motionCalls++; return animate.apply(this, args); };
    if (document.startViewTransition) {
      const transition = document.startViewTransition.bind(document);
      document.startViewTransition = (...args) => { (window as any).motionCalls++; return transition(...args); };
    }
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Preview Drifting', exact: true }).click();
  await page.getByRole('button', { name: /^Appearance:/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => (window as any).motionCalls)).toBe(0);
  await expect(page.locator('.appearance .icon')).toHaveCSS('transition-duration', '0s');
  await page.getByRole('link', { name: 'Read the note', exact: true }).click();
  await expect(page.locator('[data-reading-transition]')).toHaveCount(0);
  await page.goto('/interaction-sample');
  await page.locator('[data-footnote-ref]').first().click();
  await expect(page.getByRole('dialog')).toHaveCSS('animation-name', 'none');
});

test('system appearance updates until overridden; unsupported features retain basic controls', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, 'startViewTransition', { value: undefined });
    Object.defineProperty(Element.prototype, 'animate', { value: undefined });
    Object.defineProperty(HTMLElement.prototype, 'showPopover', { value: undefined });
  });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: /^Appearance:/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Preview Drifting', exact: true }).click();
  await page.getByRole('link', { name: 'Read the note', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.goto('/interaction-sample');
  await page.locator('[data-footnote-ref]').first().click();
  await expect(page).toHaveURL(/#user-content-fn-pace$/);
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.locator('[data-footnote-backref]').first().click();
  await expect(page).toHaveURL(/#user-content-fnref-pace$/);
});

test('native reading and footnote links work with JavaScript disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL: 'http://127.0.0.1:4335' });
  const page = await context.newPage();
  await page.goto('/');
  await page.getByRole('link', { name: 'Drifting', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Drifting', exact: true })).toBeVisible();
  await page.goto('/interaction-sample');
  await page.locator('[data-footnote-ref]').first().click();
  await expect(page).toHaveURL(/#user-content-fn-pace$/);
  await context.close();
});

test('touch previews open one at a time and quote actions fit above the phone edge', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 }, baseURL: 'http://127.0.0.1:4335' });
  const page = await context.newPage();
  await page.goto('/');
  await page.getByText('Preview The gardening metaphor', { exact: true }).tap();
  await page.getByText('Preview Drifting', { exact: true }).tap();
  await expect(page.locator('.mobile-preview[open]')).toHaveCount(1);
  await page.getByRole('link', { name: 'Read the note', exact: true }).tap();
  await expect(page.getByRole('heading', { name: 'Drifting', exact: true })).toBeVisible();
  await selectParagraph(page);
  const toolbar = page.getByRole('complementary', { name: 'Share selected text' });
  await expect(toolbar).toBeVisible();
  const rect = (await toolbar.boundingBox())!;
  expect(rect.x).toBeGreaterThanOrEqual(0);
  expect(rect.x + rect.width).toBeLessThanOrEqual(390);
  expect(rect.y + rect.height).toBeLessThanOrEqual(844);
  await page.getByRole('button', { name: 'Dismiss quote tools' }).tap();
  await expect(toolbar).not.toBeVisible();
  await page.goto('/interaction-sample');
  const reference = page.locator('[data-footnote-ref]').first();
  await reference.tap();
  await expect(page.getByRole('dialog')).toBeVisible();
  await reference.tap();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await context.close();
});

test('theme controls survive blocked browser storage and rapid activation', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage blocked'); };
    Storage.prototype.setItem = () => { throw new Error('Storage blocked'); };
  });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const toggle = page.getByRole('button', { name: /^Appearance:/ });
  await toggle.click();
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await toggle.press('Space');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(errors).toEqual([]);
});

test('print output is light, contains full prose and footnotes, and omits floating controls', async ({ page, browserName }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/interaction-sample');
  await page.locator('[data-footnote-ref]').first().click();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.site-header')).not.toBeVisible();
  await expect(page.locator('.site-footer')).not.toBeVisible();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('.prose')).toHaveCSS('color', 'rgb(34, 34, 34)');
  // The theme script writes an inline color-scheme; print must override it, including page margins.
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'light');
  await expect(page.locator('.prose pre')).toHaveCSS('white-space', 'pre-wrap');
  await expect(page.locator('.table-scroll')).toHaveCSS('overflow', 'visible');
  await expect(page.locator('.prose [data-footnotes]')).toContainText('This footnote is deliberately brief.');
  if (browserName === 'chromium') await page.pdf({ path: testInfo.outputPath('reading-print.pdf'), format: 'A4', printBackground: true });
  await page.screenshot({ path: testInfo.outputPath('reading-print.png'), fullPage: true });
});

test('reading controls have accessible names and contrast in both appearances', async ({ page }) => {
  test.setTimeout(60_000);
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await page.goto('/');
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.goto('/interaction-sample');
    await page.locator('[data-footnote-ref]').first().click();
    // Contrast is measured at rest, after the optional 160ms entrance fade.
    await expect(page.getByRole('dialog')).toHaveCSS('opacity', '1');
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.keyboard.press('Escape');
    await selectParagraph(page);
    await expect(page.getByRole('complementary', { name: 'Share selected text' })).toBeVisible();
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  }
});
