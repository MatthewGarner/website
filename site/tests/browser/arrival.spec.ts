import { test, expect, type Page } from '@playwright/test';

async function recordArrival(page: Page) {
  await page.addInitScript(() => {
    (window as any).arrivalAnimations = [];
    document.addEventListener('animationstart', event => {
      if (event.animationName.startsWith('arrive-')) (window as any).arrivalAnimations.push(event.animationName);
    });
  });
}

test('a fresh homepage typesets in sequence and fans its paper without moving links', async ({ page }, testInfo) => {
  await recordArrival(page);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-home-arrival', '');
  const links = page.locator('.intro-copy > a, .preview-panel [data-panel]:not([inert]) .text-link');
  const before = await links.evaluateAll(elements => elements.map(el => ({ x: el.getBoundingClientRect().x, y: el.getBoundingClientRect().y })));
  // Rules start after the paper; wait for every staggered start rather than using an earlier effect as a clock.
  await expect.poll(() => page.evaluate(() => (window as any).arrivalAnimations)).toEqual(expect.arrayContaining(['arrive-type', 'arrive-copy', 'arrive-rule', 'arrive-paper-back', 'arrive-paper-middle', 'arrive-paper-light']));
  await page.screenshot({ path: testInfo.outputPath('home-arrival-in-motion.png'), animations: 'allow' });
  await expect(page.locator('[data-home-arrival]')).toHaveCount(0);
  expect(await links.evaluateAll(elements => elements.map(el => ({ x: el.getBoundingClientRect().x, y: el.getBoundingClientRect().y })))).toEqual(before);
  await expect(page.locator('.headline-line-ink').first()).toHaveCSS('transform', 'none');
  await expect(page.locator('.headline-line').first()).toHaveCSS('clip-path', 'none');
  await expect(page.locator('.headline-line-ink').first()).toHaveCSS('font-weight', '700');
  await page.screenshot({ path: testInfo.outputPath('home-arrival-settled.png') });
});

test('returning and reloading preserve the page without replaying the entrance', async ({ page }) => {
  await recordArrival(page);
  await page.goto('/');
  await expect(page.locator('[data-home-arrival]')).toHaveCount(1);
  await page.evaluate(() => scrollTo(0, 350));
  await expect(page.locator('[data-home-arrival]')).toHaveCount(0);
  const position = await page.evaluate(() => scrollY);
  await page.goto('/drifting');
  await page.goBack();
  await expect(page.locator('[data-home-arrival]')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(position, 0);
  await page.reload();
  await expect(page.locator('[data-home-arrival]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).arrivalAnimations)).toEqual([]);
});

test('a slower rendering timeline finishes before the entrance state is cleared', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-home-arrival]')).toHaveCount(1);
  await page.evaluate(() => {
    const animations = document.getAnimations().filter(animation => (animation as CSSAnimation).animationName?.startsWith('arrive-'));
    for (const animation of animations) animation.playbackRate = .35;
    // Removing the CSS selector resets retained animation objects to idle; record completion first.
    (window as any).arrivalFinished = false;
    void Promise.all(animations.map(animation => animation.finished)).then(() => { (window as any).arrivalFinished = true; }, () => {});
  });
  // A cold compositor can lag wall-clock time; cleanup must follow animation completion.
  await page.waitForTimeout(1100);
  await expect(page.locator('[data-home-arrival]')).toHaveCount(1);
  await expect(page.locator('[data-home-arrival]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).arrivalFinished)).toBe(true);
});

test('an early preview choice finishes the entrance and remains actionable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('[data-home-arrival]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Preview Drifting', exact: true }).press('Enter');
  await expect(page.locator('[data-home-arrival]')).toHaveCount(0);
  await expect(page.locator('#preview-drifting')).toHaveAttribute('aria-hidden', 'false');
  await page.getByRole('link', { name: 'Read the note', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Drifting', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('motion preferences leave a still homepage and cancel a running entrance', async ({ page }) => {
  await recordArrival(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('[data-home-arrival]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).arrivalAnimations)).toEqual([]);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload();
  await expect(page.locator('[data-home-arrival]')).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('[data-home-arrival]')).toHaveCount(0);
  await expect(page.locator('.headline-line-ink').first()).toHaveCSS('transform', 'none');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.headline-line').first()).toHaveCSS('clip-path', 'none');
});

test('blocked storage and JavaScript-free browsing retain a complete homepage', async ({ browser, page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage blocked'); };
    Storage.prototype.setItem = () => { throw new Error('Storage blocked'); };
  });
  await page.goto('/');
  await expect(page.locator('[data-home-arrival]')).toHaveCount(0);
  await page.getByRole('link', { name: 'About', exact: true }).click();
  await page.getByRole('link', { name: 'Matthew Garner', exact: true }).click();
  await expect(page.locator('[data-home-arrival]')).toHaveCount(0);
  expect(errors).toEqual([]);
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL: 'http://127.0.0.1:4335' });
  const plain = await context.newPage();
  await plain.goto('/');
  await expect(plain.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(plain.locator('.headline-line-ink').first()).toHaveCSS('transform', 'none');
  await plain.getByRole('link', { name: 'Drifting', exact: true }).click();
  await expect(plain.getByRole('heading', { name: 'Drifting', exact: true })).toBeVisible();
  await context.close();
});

test('the entrance fits narrow screens and hash destinations stay still', async ({ browser }) => {
  for (const width of [320, 390, 768, 1200]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, baseURL: 'http://127.0.0.1:4335' });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('[data-home-arrival]')).toHaveCount(1);
    const widest = await page.evaluate(() => new Promise<number>(resolve => {
      let width = 0;
      function measure() {
        width = Math.max(width, document.documentElement.scrollWidth);
        if (document.documentElement.hasAttribute('data-home-arrival')) requestAnimationFrame(measure);
        else resolve(width);
      }
      measure();
    }));
    expect(widest).toBe(width);
    await context.close();
  }
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4335' });
  const page = await context.newPage();
  await page.goto('/#projects');
  await expect(page.locator('[data-home-arrival]')).toHaveCount(0);
  await expect(page.getByRole('complementary', { name: 'Small tools' })).toBeInViewport();
  await context.close();
});
