import { test, expect } from '@playwright/test';

// Exercise the actual parent protocol even when Tools has not yet been deployed.
const child = `<!doctype html><html><body><button>Example control</button><script>
const origin = new URL(location.href).searchParams.get('parent');
parent.postMessage({type:'mg-tool:ready',version:1},origin);
parent.postMessage({type:'mg-tool:resize',version:1,height:320},origin);
addEventListener('message', e => {
  if(e.source===parent && e.origin===origin && e.data.type==='mg-tool:theme') document.documentElement.dataset.theme=e.data.theme;
});
</script></body></html>`;

test('two article figures load independently, match appearance and restore their illustrations for print', async ({ page }) => {
  await page.route('https://tools.matthewgarner.me/embed/**', route => route.fulfill({ contentType: 'text/html', body: child }));
  await page.goto('/tool-embed-sample');
  const figures = page.locator('.tool-demo');
  await expect(figures).toHaveCount(2);
  await expect(page.locator('iframe')).toHaveCount(0);
  await figures.first().getByRole('button').focus();
  await page.keyboard.press('Enter');
  await expect(figures.first()).toHaveAttribute('data-tool-state', 'ready');
  await expect(figures.first().locator('iframe')).toHaveCSS('height', '320px');
  await expect(figures.first().locator('.tool-demo-poster')).not.toBeVisible();
  await expect(figures.last().locator('.tool-demo-poster')).toBeVisible();
  const theme = await page.locator('html').getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  await page.locator('button.appearance').click();
  // View transitions apply the theme asynchronously; reading immediately after click can capture the old value.
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.frameLocator('iframe').locator('html')).toHaveAttribute('data-theme', theme);
  // Messages from another window may not hide figures or resize their frames.
  await page.evaluate(() => window.postMessage({ type: 'mg-tool:resize', version: 1, height: 1200 }, location.origin));
  await expect(figures.first().locator('iframe')).toHaveCSS('height', '320px');
  await page.emulateMedia({ media: 'print' });
  await expect(figures.first().locator('.tool-demo-poster')).toBeVisible();
  await expect(page.locator('iframe')).not.toBeVisible();
  await page.emulateMedia({ media: 'screen' });
  await figures.first().getByRole('button', { name: 'Show illustration' }).click();
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(figures.first().locator('.tool-demo-poster')).toBeVisible();
});

test('a blocked frame retains its figure and usable full-tool link', async ({ page }) => {
  await page.route('https://tools.matthewgarner.me/embed/**', route => route.abort());
  await page.goto('/tool-embed-sample');
  await page.clock.install();
  const figure = page.locator('.tool-demo').first();
  await figure.getByRole('button').click();
  await page.clock.fastForward(10_100);
  await expect(figure.getByRole('status')).toContainText('could not load');
  await expect(figure.locator('.tool-demo-poster')).toBeVisible();
  await expect(figure.getByRole('link', { name: 'Open full tool' })).toHaveAttribute('href', /\/flow\/#/);
  await expect(figure.getByRole('button')).toHaveText('Try interactive example');
});

test('without JavaScript the illustration, caption and model link still work', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 744 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4335/tool-embed-sample');
  const figure = page.locator('.tool-demo').first();
  await expect(figure.locator('img')).toBeVisible();
  await expect(figure.locator('figcaption')).toContainText('Increase demand');
  await expect(figure.getByRole('button')).toHaveCount(0);
  await expect(figure.getByRole('link')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});
