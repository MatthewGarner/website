import { test, expect, type Page } from '@playwright/test';

const headlineName = 'A few things I’ve been thinking about.';
const inkWeights = (page: Page) => page.locator('.headline-ink').evaluateAll(letters => letters.map(letter => Number(getComputedStyle(letter).fontWeight)));

test('ordinary article navigation can skip a snapshot without an unhandled rejection', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/drifting');
  await page.getByRole('navigation', { name: 'More writing' }).getByRole('link').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("I'll stay home thanks");
  await page.getByRole('link', { name: 'Matthew Garner', exact: true }).click();
  await expect(page.getByRole('heading', { name: headlineName, exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('headline responds without moving its letters or surrounding layout, then rests', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  // The entrance deliberately moves the lines; measure the resting layout for pointer interaction.
  await expect(page.locator('[data-home-arrival]')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: headlineName, exact: true })).toHaveCount(1);
  const geometry = () => page.locator('.headline-letter, .intro-copy, .writing-preview').evaluateAll(elements => elements.map(el => {
    const { x, y, width, height } = el.getBoundingClientRect();
    return { x, y, width, height };
  }));
  const before = await geometry();
  await page.locator('.headline-ink').nth(4).hover();
  await expect.poll(async () => Math.min(...await inkWeights(page))).toBeLessThan(600);
  expect(await geometry()).toEqual(before);
  await page.screenshot({ path: testInfo.outputPath('headline-response.png') });
  await page.mouse.move(0, 0);
  await expect.poll(async () => (await inkWeights(page)).every(weight => weight === 700)).toBe(true);
  for (const width of [320, 390, 768, 1200]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  }
});

test('touch headline ripples and settles; cancelled gestures leave scrolling available', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 }, baseURL: 'http://127.0.0.1:4335' });
  const page = await context.newPage();
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const headline = page.getByRole('heading', { name: headlineName, exact: true });
  await headline.tap();
  await expect.poll(async () => Math.min(...await inkWeights(page))).toBeLessThan(680);
  await expect.poll(async () => (await inkWeights(page)).every(weight => weight === 700)).toBe(true);
  await headline.dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 2, isPrimary: true, clientX: 100, clientY: 200 });
  await headline.dispatchEvent('pointercancel', { pointerType: 'touch', pointerId: 2 });
  await headline.dispatchEvent('pointerup', { pointerType: 'touch', pointerId: 2, clientX: 100, clientY: 200 });
  expect((await inkWeights(page)).every(weight => weight === 700)).toBe(true);
  await expect(headline).toHaveCSS('touch-action', 'auto');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await headline.tap();
  expect((await inkWeights(page)).every(weight => weight === 700)).toBe(true);
  await context.close();
});

test('rapid preview choices expose only the final paper and leave all links usable', async ({ page }) => {
  await page.goto('/');
  const height = await page.locator('.preview-panel').evaluate(el => el.getBoundingClientRect().height);
  for (const name of ['Drifting', 'The gardening metaphor', 'Rediscovering the joy of running', 'Drifting']) {
    await page.getByRole('button', { name: `Preview ${name}`, exact: true }).press('Enter');
  }
  await expect(page.locator('[data-panel]:not([inert])')).toHaveCount(1);
  await expect(page.locator('[data-leaving]')).toHaveCount(0);
  await expect(page.locator('#preview-drifting')).toHaveCSS('transform', 'none');
  expect(await page.locator('.preview-panel').evaluate(el => el.getBoundingClientRect().height)).toBe(height);
  await expect(page.getByRole('link', { name: 'Read the note', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Read the essay', exact: true })).toHaveCount(0);
});

test('theme reveal starts at the switch, reaches the far corner, and releases the snapshot', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      if (typeof options === 'object' && options.pseudoElement === '::view-transition-new(root)') {
        (window as any).themeFrames = frames;
      }
      return animate.call(this, frames, options);
    };
  });
  await page.goto('/');
  const icon = (await page.locator('.appearance .icon').boundingBox())!;
  const position = { x: icon.x + icon.width / 2, y: icon.y + icon.height / 2 };
  await page.getByRole('button', { name: /^Appearance:/ }).press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const native = await page.evaluate(() => typeof document.startViewTransition === 'function');
  if (native) {
    await expect.poll(() => page.evaluate(() => (window as any).themeFrames)).toBeTruthy();
    const frames = await page.evaluate(() => (window as any).themeFrames);
    expect(frames.clipPath[0]).toBe(`circle(0px at ${position.x}px ${position.y}px)`);
    const radius = Number(frames.clipPath[1].match(/circle\((\d+)px/)[1]);
    const { width, height } = page.viewportSize()!;
    expect(radius).toBeGreaterThanOrEqual(Math.hypot(Math.max(position.x, width - position.x), Math.max(position.y, height - position.y)));
  }
  await expect(page.locator('[data-theme-reveal]')).toHaveCount(0);
  await expect(page.locator('html')).toHaveCSS('clip-path', 'none');
  await page.screenshot({ path: testInfo.outputPath('paper-stack-dark.png') });
});

test('changing motion preference stops active headline, paper and theme animation', async ({ page }) => {
  await page.goto('/');
  await page.locator('.headline-ink').nth(4).hover();
  await expect.poll(async () => Math.min(...await inkWeights(page))).toBeLessThan(650);
  await page.getByRole('button', { name: 'Preview Drifting', exact: true }).press('Enter');
  await page.getByRole('button', { name: /^Appearance:/ }).press('Enter');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(async () => (await inkWeights(page)).every(weight => weight === 700)).toBe(true);
  await expect(page.locator('[data-leaving], [data-theme-reveal]')).toHaveCount(0);
  await expect(page.locator('#preview-drifting')).toHaveCSS('transform', 'none');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('link', { name: 'Read the note', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Drifting', exact: true })).toBeVisible();
});

test('a browser rejecting snapshot animation still switches themes without an error', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      if (typeof options === 'object' && options.pseudoElement) throw new Error('Unsupported snapshot animation');
      return animate.call(this, frames, options);
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: /^Appearance:/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('[data-theme-reveal]')).toHaveCount(0);
  expect(errors).toEqual([]);
});
