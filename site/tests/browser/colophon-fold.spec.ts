import { test, expect } from '@playwright/test';

test('the paper unfolds before its contents and closes without exposing controls to focus', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const disclosure = page.locator('.colophon');
  const summary = disclosure.locator('summary');
  await summary.scrollIntoViewIfNeeded();
  await summary.evaluate(element => (element as HTMLElement).click());
  const composition = await disclosure.evaluate(element => {
    const paper = element.querySelector('.type-sheet')!;
    const content = element.querySelector('.type-sheet-content')!;
    const controls = element.querySelector('.type-controls')!;
    // Pause the real timelines at a shared instant to inspect the staged composition deterministically.
    element.getAnimations({ subtree: true }).forEach(animation => { animation.pause(); animation.currentTime = 100; });
    return {
      open: (element as HTMLDetailsElement).open,
      paperTransform: getComputedStyle(paper).transform,
      contentsClip: getComputedStyle(content).clipPath,
      controlsClip: getComputedStyle(controls).clipPath,
      textOpacity: getComputedStyle(content).opacity,
    };
  });
  expect(composition).toMatchObject({ open: true, controlsClip: 'inset(0px 100% 0px 0px)', textOpacity: '1' });
  expect(composition.paperTransform).not.toBe('none');
  expect(composition.contentsClip).not.toBe('inset(0px)');
  await disclosure.evaluate(element => element.getAnimations({ subtree: true }).forEach(animation => animation.play()));
  await expect(disclosure).not.toHaveAttribute('data-fold');
  await page.getByRole('textbox', { name: 'Your words' }).focus();
  await page.keyboard.press('Escape');
  await expect(summary).toBeFocused();
  await expect(disclosure.locator('.colophon-content')).toHaveAttribute('inert', '');
  await page.keyboard.press('Tab');
  expect(await disclosure.locator('.colophon-content').evaluate(element => element.contains(document.activeElement))).toBe(false);
  await expect(disclosure).not.toHaveAttribute('open');
  await expect(disclosure).not.toHaveAttribute('data-fold');
  expect(errors).toEqual([]);
});

test('rapid direction changes reverse the same fold and entering the editor settles it', async ({ page }) => {
  await page.goto('/');
  const disclosure = page.locator('.colophon');
  const summary = disclosure.locator('summary');
  await summary.scrollIntoViewIfNeeded();
  const reversed = await summary.evaluate(element => {
    const summary = element as HTMLElement;
    const details = element.parentElement!;
    summary.click();
    const animation = details.getAnimations().find(animation => animation.effect instanceof KeyframeEffect && animation.effect.target === details)!;
    animation.currentTime = 210;
    const before = details.getBoundingClientRect().height;
    summary.click();
    const during = details.getBoundingClientRect().height;
    const closing = details.dataset.fold;
    summary.click();
    const after = details.getBoundingClientRect().height;
    return { before, during, after, closing, opening: details.dataset.fold, sameTimeline: details.getAnimations().includes(animation) };
  });
  expect(reversed.closing).toBe('closing');
  expect(reversed.opening).toBe('opening');
  expect(reversed.sameTimeline).toBe(true);
  expect(Math.abs(reversed.before - reversed.during)).toBeLessThan(1);
  expect(Math.abs(reversed.during - reversed.after)).toBeLessThan(1);
  await page.getByRole('textbox', { name: 'Your words' }).focus();
  await expect(disclosure).not.toHaveAttribute('data-fold');
  await expect(page.getByRole('textbox', { name: 'Your words' })).toBeFocused();
  await expect.poll(async () => {
    const paper = (await disclosure.locator('.type-sheet').boundingBox())!;
    return paper.y + paper.height;
  }).toBeLessThanOrEqual(page.viewportSize()!.height);
  // The summary's independent plus-to-cross transition may still be finishing; editor and layout must be settled.
  expect(await disclosure.evaluate(element => [
    ...element.getAnimations(),
    ...element.querySelector('.colophon-content')!.getAnimations({ subtree: true }),
  ].length)).toBe(0);
});

test('motion preference and page lifecycle changes settle the requested state without replay', async ({ page }) => {
  await page.goto('/');
  const disclosure = page.locator('.colophon');
  const summary = disclosure.locator('summary');
  await summary.evaluate(element => (element as HTMLElement).click());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(disclosure).toHaveAttribute('open', '');
  await expect(disclosure).not.toHaveAttribute('data-fold');
  expect(await disclosure.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await summary.evaluate(element => (element as HTMLElement).click());
  await page.evaluate(() => {
    dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  });
  await expect(disclosure).not.toHaveAttribute('open');
  await expect(disclosure).not.toHaveAttribute('data-fold');
  await summary.evaluate(element => (element as HTMLElement).click());
  await page.evaluate(() => {
    dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  });
  await expect(disclosure).toHaveAttribute('open', '');
  await expect(disclosure).not.toHaveAttribute('data-fold');
  expect(await disclosure.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
  await page.getByRole('textbox', { name: 'Your words' }).fill('Still room to play.');
});

test('missing animation support and external native changes preserve a usable disclosure', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(Element.prototype, 'animate', { value: undefined, configurable: true });
    Object.defineProperty(Element.prototype, 'getAnimations', { value: undefined, configurable: true });
  });
  await page.goto('/');
  const disclosure = page.locator('.colophon');
  const summary = disclosure.locator('summary');
  await summary.click();
  await page.getByRole('textbox', { name: 'Your words' }).fill('No animation needed.');
  await page.keyboard.press('Escape');
  await expect(disclosure).not.toHaveAttribute('open');
  await expect(summary).toBeFocused();
  await disclosure.evaluate(element => { (element as HTMLDetailsElement).open = true; });
  await page.getByRole('textbox', { name: 'Your words' }).fill('Opened natively.');
  await disclosure.evaluate(element => { (element as HTMLDetailsElement).open = false; });
  await expect(summary).toBeFocused();
  await expect(disclosure.locator('.colophon-content')).toHaveAttribute('inert', '');
  await expect(disclosure).not.toHaveAttribute('data-fold');
  expect(errors).toEqual([]);
});
