import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium, webkit } from '@playwright/test';

// Run against both real preview servers; protocol-only browser fixtures live separately.
const article = process.argv[2] || 'http://127.0.0.1:4321/tool-demonstration-preview';
const output = new URL('../test-results/tool-embed/', import.meta.url);
fs.mkdirSync(output, { recursive: true });
for (const [name, browserType] of Object.entries({ chromium, webkit })) {
  const browser = await browserType.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(article);
    const figure = page.locator('.tool-demo').first();
    await figure.getByRole('button', { name: 'Explore this example' }).click();
    await page.waitForFunction(() => document.querySelector('.tool-demo')?.dataset.toolState === 'ready');
    const frame = await figure.locator('iframe').elementHandle().then(handle => handle.contentFrame());
    assert.ok(frame);
    assert.equal(await figure.locator('.tool-demo-actions a').isVisible(), false);
    const initial = await frame.locator('#result').innerText();
    assert.match(initial, /1 working day waiting.*8 items\/week/);
    await frame.locator('#demand').fill('9.5');
    await frame.locator('#demand').dispatchEvent('input');
    await frame.waitForFunction(() => document.querySelector('#result').textContent.includes('9.5 items/week'));
    assert.notEqual(await frame.locator('#result').innerText(), initial);
    await frame.waitForFunction(() => document.querySelector('#full-tool').hasAttribute('href'));
    const popupPromise = page.waitForEvent('popup');
    await frame.getByRole('link', { name: 'Open full Flow' }).click();
    const popup = await popupPromise;
    await popup.waitForFunction(() => document.querySelector('#demand')?.value === '9.5');
    await popup.close();
    await frame.locator('#demand').fill('10');
    await frame.locator('#demand').dispatchEvent('input');
    assert.match(await frame.locator('#result').innerText(), /No stable waiting time/);
    await frame.getByRole('button', { name: 'Reset example' }).click();
    assert.equal(await frame.locator('#result').innerText(), initial);
    assert.equal(await frame.evaluate(() => { try { return localStorage.length; } catch { return 0; } }), 0);

    for (const [size, viewport] of Object.entries({ desktop: { width: 1280, height: 900 }, phone: { width: 390, height: 844 } })) {
      await page.setViewportSize(viewport);
      for (const theme of ['light', 'dark']) {
        await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
        await frame.waitForFunction(theme => document.documentElement.dataset.theme === theme, theme);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        assert.equal(await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await frame.waitForFunction(() => document.documentElement.scrollHeight <= innerHeight + 1);
        await figure.screenshot({ path: new URL(`${name}-${size}-${theme}.png`, output).pathname });
      }
    }
    await page.emulateMedia({ media: 'print' });
    assert.equal(await figure.locator('.tool-demo-poster').isVisible(), true);
    assert.equal(await figure.locator('iframe').isVisible(), false);
    assert.equal(await figure.locator('.tool-demo-actions a').isVisible(), true);
    assert.deepEqual(errors, []);
    console.log(`${name}: demand, unstable capacity, reset, full-tool handoff, no saved state, themes, phone fit and print passed`);
    await context.close();
  } finally { await browser.close(); }
}
console.log(`Screenshots: ${output.pathname}`);
