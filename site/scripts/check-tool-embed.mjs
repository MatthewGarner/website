import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium, webkit, expect } from '@playwright/test';

// Real cross-repository integration. Protocol/failure mocks live in the browser suite.
const article = process.argv[2] || 'http://127.0.0.1:4321/tool-demonstration-preview';
const output = new URL('../test-results/tool-embed/', import.meta.url);
fs.mkdirSync(output, { recursive: true });
const examples = [
  { id: 'flow-standard-v2', control: 'demand', value: '9.5', path: ['d'], popup: '#demand' },
  { id: 'rank-priorities-v1', control: 'value', value: '6', path: ['c', 0, 1], popup: 'input.weight[aria-label="Value weight"]' },
  { id: 'lab-knowledge-v1', control: 'start', value: '5', path: ['sessions', 0, 'start'], popup: '#start' },
].map(example => ({ ...example, manifest: JSON.parse(fs.readFileSync(new URL(`../../content/tool-examples/${example.id}.json`, import.meta.url))) }));
const readStorage = frame => frame.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
const fullLink = frame => frame.locator('.embed-footer a[href]');
async function readState(frame) {
  const fragment = new URL(await fullLink(frame).getAttribute('href')).hash.slice(1);
  return fragment.startsWith('article:')
    ? JSON.parse(Buffer.from(fragment.slice(8), 'base64url').toString('utf8')).state
    : JSON.parse(Buffer.from(fragment, 'base64').toString('utf8'));
}
async function settled(frame) {
  await expect(frame.locator('.embed-stage')).toHaveAttribute('aria-busy', 'false');
  await expect(fullLink(frame)).toHaveAttribute('href', /#/);
}
async function start(figure) {
  await figure.getByRole('button', { name: 'Explore this example' }).click();
  await expect(figure).toHaveAttribute('data-tool-state', 'ready');
  const handle = await figure.locator('iframe').elementHandle();
  const frame = await handle.contentFrame();
  assert.ok(frame);
  await expect(figure.locator('.tool-demo-actions a')).not.toBeVisible();
  return frame;
}

for (const [name, browserType] of Object.entries({ chromium, webkit })) {
  const browser = await browserType.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage(), errors = [], requests = [];
    context.on('page', popup => popup.on('pageerror', error => errors.push(error.message)));
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('request', request => requests.push(request.url()));
    await page.goto(article);
    const figures = page.locator('.tool-demo');
    await expect(figures).toHaveCount(4);
    await expect(page.locator('iframe')).toHaveCount(0);
    assert.equal(requests.some(url => new URL(url).pathname.startsWith('/embed/')), false, 'tools must not load before exploration');

    const legacyFigure = figures.nth(0), legacy = await start(legacyFigure);
    const initialLegacy = await legacy.locator('#result').innerText();
    assert.match(initialLegacy, /1 working day waiting.*8 items\/week/);
    await legacy.locator('#demand').fill('9.5');
    await legacy.locator('#demand').dispatchEvent('input');
    await expect(legacy.locator('#result')).toContainText('9.5 items/week');
    const legacyPopupPromise = page.waitForEvent('popup');
    await legacy.getByRole('link', { name: 'Open full Flow' }).click();
    const legacyPopup = await legacyPopupPromise;
    await expect(legacyPopup.locator('#demand')).toHaveValue('9.5');
    await legacyPopup.close();
    await legacy.locator('#demand').fill('10');
    await legacy.locator('#demand').dispatchEvent('input');
    await expect(legacy.locator('#result')).toContainText('No stable waiting time');
    await legacy.getByRole('button', { name: 'Reset example' }).click();
    await expect(legacy.locator('#result')).toHaveText(initialLegacy);

    const frames = [];
    for (let index = 0; index < examples.length; index++) {
      const frame = await start(figures.nth(index + 1));
      await settled(frame);
      assert.deepEqual(await readState(frame), examples[index].manifest.state);
      frames.push(frame);
    }
    for (let index = 0; index < examples.length; index++) {
      const example = examples[index], frame = frames[index];
      // fill() does not scroll its owning iframe into view; WebKit can suspend its rAF.
      await figures.nth(index + 1).scrollIntoViewIfNeeded();
      await settled(frame);
      const beforeStorage = await readStorage(frame);
      const initialImage = await frame.locator('.embed-stage').innerHTML();
      const changed = structuredClone(example.manifest.state);
      let parent = changed;
      for (const key of example.path.slice(0, -1)) parent = parent[key];
      parent[example.path.at(-1)] = Number(example.value);
      await frame.locator('#control-' + example.control).fill(example.value);
      await frame.locator('#control-' + example.control).dispatchEvent('input');
      await expect.poll(() => readState(frame)).toEqual(changed);
      await settled(frame);
      assert.notEqual(await frame.locator('.embed-stage').innerHTML(), initialImage);
      assert.deepEqual(await readStorage(frame), beforeStorage, 'embedded interactions must not change saved work');
      for (let other = 0; other < frames.length; other++) if (other !== index) {
        assert.deepEqual(await readState(frames[other]), examples[other].manifest.state, 'other instances must retain their authored state');
      }
      await expect(legacy.locator('#demand')).toHaveValue('8');
      const popupPromise = page.waitForEvent('popup');
      await fullLink(frame).click();
      const popup = await popupPromise;
      await expect(popup.locator(example.popup)).toHaveValue(example.value);
      if (example.manifest.tool === 'lab-knowledge') {
        await expect(popup.locator('[data-article-example]')).toContainText('Article example');
        assert.equal(await popup.evaluate(() => localStorage.getItem('thinking-lab:knowledge:v1')), beforeStorage['thinking-lab:knowledge:v1'] ?? null);
      }
      await popup.close();
      await frame.getByRole('button', { name: 'Reset example' }).click();
      await expect.poll(() => readState(frame)).toEqual(example.manifest.state);
      await settled(frame);
    }

    const allFrames = [legacy, ...frames];
    for (const [size, viewport] of Object.entries({ desktop: { width: 1280, height: 900 }, phone: { width: 390, height: 844 } })) {
      await page.setViewportSize(viewport);
      for (const theme of ['light', 'dark']) {
        await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
        for (let index = 0; index < allFrames.length; index++) {
          const frame = allFrames[index];
          // Browsers suspend animation frames in offscreen iframes; bring the
          // example into view before waiting for its responsive/theme render.
          await figures.nth(index).scrollIntoViewIfNeeded();
          await expect(frame.locator('html')).toHaveAttribute('data-theme', theme);
          if (index) await settled(frame);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
          assert.equal(await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
          // A tall view may scroll inside its named illustration region, not overflow the article.
          await expect.poll(() => frame.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
          const id = index ? examples[index - 1].id : 'flow-legacy-v1';
          await figures.nth(index).screenshot({ path: new URL(`${name}-${id}-${size}-${theme}.png`, output).pathname });
        }
      }
    }
    await page.emulateMedia({ media: 'print' });
    for (let index = 0; index < 4; index++) {
      await expect(figures.nth(index).locator('.tool-demo-poster')).toBeVisible();
      await expect(figures.nth(index).locator('iframe')).not.toBeVisible();
      await expect(figures.nth(index).locator('.tool-demo-actions a')).toBeVisible();
    }
    assert.deepEqual(errors, []);
    await context.close();

    const staticContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const staticPage = await staticContext.newPage();
    await staticPage.goto(article);
    await expect(staticPage.locator('.tool-demo')).toHaveCount(4);
    await expect(staticPage.locator('iframe')).toHaveCount(0);
    assert.equal(await staticPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    for (let index = 0; index < 4; index++) {
      const figure = staticPage.locator('.tool-demo').nth(index);
      await expect(figure.locator('.tool-demo-poster')).toBeVisible();
      await expect(figure.locator('.tool-demo-actions a')).toBeVisible();
      await expect(figure.getByRole('button')).toHaveCount(0);
    }
    await staticContext.close();
    console.log(`${name}: legacy + 3 generic tools, independent state, controls/reset, native handoffs, storage isolation, themes, phone, print and no-JS passed`);
  } finally { await browser.close(); }
}
console.log(`Screenshots: ${output.pathname}`);
