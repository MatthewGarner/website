import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function middleOfProse(page: Page) {
  await page.locator('.prose').evaluate(el => {
    const bounds = el.getBoundingClientRect();
    scrollTo(0, scrollY + bounds.top + (bounds.height - innerHeight) / 2);
  });
}
async function markerPosition(page: Page) {
  return page.locator('.reading-marker').evaluate(el => {
    const track = el.querySelector('.reading-marker-track')!.getBoundingClientRect();
    const thumb = el.querySelector('.reading-marker-thumb')!.getBoundingClientRect();
    return track.height > track.width ? (thumb.top - track.top) / (track.height - thumb.height) : thumb.width / track.width;
  });
}
async function recordEnding(page: Page) {
  await page.addInitScript(() => {
    (window as any).endingDraws = 0;
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      if (this.matches('.article-end-mark path')) (window as any).endingDraws++;
      return animate.call(this, frames, options);
    };
  });
}

test('ink links respond to keyboard and pointer without changing layout', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const link = page.getByRole('link', { name: 'Writing', exact: true });
  const before = await link.boundingBox();
  await expect(link).toHaveCSS('background-size', '0% 1px');
  await link.hover();
  await expect(link).toHaveCSS('background-size', '100% 1px');
  expect(await link.boundingBox()).toEqual(before);
  await page.mouse.move(0, 0);
  await expect(link).toHaveCSS('background-size', '0% 1px');
  await link.focus();
  await expect(link).toHaveCSS('background-size', '100% 1px');
  await expect(link).toHaveCSS('outline-style', 'solid');
  await link.press('Enter');
  await expect(page).toHaveURL(/\/writing\/?$/);
  const current = page.getByRole('link', { name: 'Writing', exact: true });
  await expect(current).toHaveAttribute('aria-current', 'page');
  await expect(current).toHaveCSS('background-size', '100% 1px');
  await page.setViewportSize({ width: 320, height: 740 });
  const title = page.locator('.archive-list h2 a').first();
  await title.focus();
  await expect(title).toHaveCSS('background-size', '100% 1px');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await page.goto('/drifting');
  const back = page.getByRole('link', { name: 'All writing', exact: true });
  await back.focus();
  await expect(back.locator('.icon')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, -3, 0)');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(back.locator('.icon')).toHaveCSS('transform', 'none');
});

test('the bookmark tracks prose independently of the footer and adapts to reflow', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/interaction-sample');
  await page.evaluate(() => document.fonts.ready);
  await middleOfProse(page);
  const marker = page.locator('.reading-marker');
  await expect(marker).toHaveCSS('opacity', '1');
  await expect.poll(() => markerPosition(page)).toBeCloseTo(.5, 2);
  const proseBounds = (await page.locator('.prose').boundingBox())!;
  const markerBounds = (await marker.boundingBox())!;
  expect(markerBounds.x + markerBounds.width).toBeLessThan(proseBounds.x);
  await page.screenshot({ path: testInfo.outputPath('reading-marker-desktop.png') });
  // Expanding content below the article must not redefine how much remains to read.
  await page.locator('.colophon').evaluate(el => { (el as HTMLDetailsElement).open = true; });
  await expect.poll(() => markerPosition(page)).toBeCloseTo(.5, 2);
  // A delayed illustration or changed font can genuinely lengthen the article.
  await page.locator('.prose img').evaluate(el => { (el as HTMLElement).style.height = '1000px'; });
  await expect.poll(() => markerPosition(page)).toBeLessThan(.49);
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await middleOfProse(page);
    await expect.poll(() => markerPosition(page)).toBeCloseTo(.5, 2);
    const bounds = (await marker.boundingBox())!;
    expect(bounds.y).toBe(0);
    expect(bounds.width).toBe(width);
    expect(bounds.height).toBe(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  }
  await page.locator('.prose img').evaluate(el => { (el as HTMLElement).style.removeProperty('height'); });
  await page.setViewportSize({ width: 390, height: 844 });
  await middleOfProse(page);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.screenshot({ path: testInfo.outputPath('reading-marker-phone-dark.png') });
  await page.locator('.article-end-mark').scrollIntoViewIfNeeded();
  await expect.poll(() => markerPosition(page)).toBe(1);
  expect(errors).toEqual([]);
});

test('short pieces stay quiet and the marker is confined to writing', async ({ page }) => {
  await page.goto('/drifting');
  await expect(page.locator('.reading-marker')).toBeHidden();
  await expect(page.locator('.article-end-mark')).toBeVisible();
  for (const url of ['/', '/about', '/writing']) {
    await page.goto(url);
    await expect(page.locator('.reading-marker, .article-ending')).toHaveCount(0);
  }
});

test('the ending draws once and Keep reading remains immediately usable', async ({ page }, testInfo) => {
  await recordEnding(page);
  await page.goto('/interaction-sample');
  expect(await page.evaluate(() => (window as any).endingDraws)).toBe(0);
  await page.locator('.article-end-mark').scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => (window as any).endingDraws)).toBe(1);
  const next = page.getByRole('navigation', { name: 'More writing' });
  await expect(next).toHaveCSS('opacity', '1');
  await expect(next).toHaveCSS('transform', 'none');
  await page.locator('.article-ending').screenshot({ path: testInfo.outputPath('article-ending.png') });
  await page.getByRole('heading', { level: 1 }).scrollIntoViewIfNeeded();
  await page.locator('.article-end-mark').scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => (window as any).endingDraws)).toBe(1);
  await next.getByRole('link').focus();
  await next.getByRole('link').press('Enter');
  await expect(page).not.toHaveURL(/interaction-sample/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('reduced motion cancels a running ending and hides optional reading motion', async ({ page }) => {
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      // Hold the real animation open long enough to exercise an OS preference change.
      if (this.closest('.article-ending') && typeof options === 'object') options = { ...options, duration: 5000 };
      return animate.call(this, frames, options);
    };
  });
  await page.goto('/interaction-sample');
  await page.locator('.article-end-mark').scrollIntoViewIfNeeded();
  const active = () => page.locator('.article-ending').evaluate(el => el.getAnimations({ subtree: true }).length);
  await expect.poll(active).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(active).toBe(0);
  await expect(page.locator('.reading-marker')).toBeHidden();
  await expect(page.locator('.next-essay')).toHaveCSS('transform', 'none');
  await page.reload();
  await page.locator('.article-end-mark').scrollIntoViewIfNeeded();
  expect(await active()).toBe(0);
  await expect(page.locator('.article-end-mark path')).toHaveCSS('stroke-dasharray', 'none');
});

test('missing observation and animation APIs leave a complete readable ending', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'IntersectionObserver', { value: undefined });
    Object.defineProperty(window, 'ResizeObserver', { value: undefined });
    Object.defineProperty(Element.prototype, 'animate', { value: undefined });
  });
  await page.goto('/interaction-sample');
  await middleOfProse(page);
  await expect.poll(() => markerPosition(page)).toBeCloseTo(.5, 2);
  await page.locator('.article-ending').scrollIntoViewIfNeeded();
  await expect(page.locator('.article-end-mark path')).toHaveCSS('stroke-dasharray', 'none');
  await page.getByRole('navigation', { name: 'More writing' }).getByRole('link').click();
  await expect(page).not.toHaveURL(/interaction-sample/);
  expect(errors).toEqual([]);
});

test('without JavaScript the ending and links work, and print omits the decoration', async ({ browser, page }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL: 'http://127.0.0.1:4335' });
  const plain = await context.newPage();
  await plain.goto('/interaction-sample');
  await expect(plain.locator('.reading-marker')).toBeHidden();
  await expect(plain.locator('.article-end-mark')).toBeVisible();
  await plain.getByRole('navigation', { name: 'More writing' }).getByRole('link').click();
  await expect(plain).not.toHaveURL(/interaction-sample/);
  await context.close();
  await page.goto('/interaction-sample');
  await middleOfProse(page);
  await expect(page.locator('.reading-marker')).toHaveCSS('opacity', '1');
  await page.emulateMedia({ media: 'print' });
  // Visibility assertions target one element; both decorations must independently disappear.
  await expect(page.locator('.reading-marker')).toBeHidden();
  await expect(page.locator('.article-ending')).toBeHidden();
  await expect(page.locator('.prose')).toBeVisible();
});

test('ending and focused links have contrast in both themes and survive forced colours', async ({ page }) => {
  test.setTimeout(60_000);
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.goto('/interaction-sample');
    await page.getByRole('navigation', { name: 'More writing' }).getByRole('link').focus();
    expect((await new AxeBuilder({ page }).include('.article-ending').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  }
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/writing');
  const current = page.getByRole('link', { name: 'Writing', exact: true });
  await expect(current).toHaveCSS('text-decoration-line', 'underline');
  const title = page.locator('.archive-list h2 a').first();
  await title.focus();
  await expect(title).toHaveCSS('text-decoration-line', 'underline');
});
