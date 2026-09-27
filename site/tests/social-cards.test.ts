import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { layoutSocialTitle, renderSocialCard, socialCardSize } from '../src/lib/social-card';
import { socialImageHref } from '../src/lib/social-card-url';
import { noteSources } from '../src/lib/publishing';

test('cards render deterministic PNGs with the site colours and title inside its reserved space', async () => {
  for (const title of ['Drifting', 'Rediscovering the joy of running', 'Łódź, café & déjà vu — “a little more room”', 'A very long title about the things that matter '.repeat(20)]) {
    const input = { title, date: new Date('2025-04-06'), type: 'essay' };
    const png = await renderSocialCard(input);
    assert.deepEqual(png, await renderSocialCard(input), title);
    const metadata = await sharp(png).metadata();
    assert.equal(metadata.format, 'png');
    assert.equal(metadata.width, socialCardSize.width);
    assert.equal(metadata.height, socialCardSize.height);
    const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.deepEqual([...data.subarray(0, 3)], [250, 248, 242]);
    let ink = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const pixel = (y * info.width + x) * info.channels;
        // Only the title uses dark ink; all other text and rules are purple.
        if (data[pixel] < 60 && data[pixel + 1] < 55 && data[pixel + 2] < 65) {
          ink++;
          assert.ok(x >= 70 && x < 1130 && y >= 145 && y < 490, `Title escaped its box at ${x},${y}: ${title}`);
        }
      }
    }
    assert.ok(ink > 1000, 'The title must actually appear in the image');
  }
});

test('wrapping preserves ordinary titles and graphemes while ellipsising unusually long titles', () => {
  const title = 'Rediscovering the joy of running';
  const short = layoutSocialTitle(title);
  assert.equal(short.lines.join(' '), title);
  assert.equal(short.truncated, false);
  assert.ok(short.lines.at(-1)?.includes(' '), 'Avoid a single-word final line');
  const unicode = layoutSocialTitle('Łódź, cafe\u0301 & déjà vu — “a little more room”');
  assert.equal(unicode.lines.join(' '), 'Łódź, café & déjà vu — “a little more room”');
  const long = layoutSocialTitle('A long title with lots to say about making things '.repeat(30));
  assert.equal(long.truncated, true);
  assert.ok(long.lines.at(-1)?.endsWith('…'));
  assert.ok(long.height <= 334);
  const word = layoutSocialTitle('é'.repeat(100));
  assert.equal(word.lines.join(''), 'é'.repeat(100));
});

test('published writing has generated cards and URL-safe nested paths', async () => {
  assert.equal(socialImageHref('notes/café & tea'), '/social/notes/caf%C3%A9%20%26%20tea.png');
  const essays = noteSources().filter((note) => !['index', 'now', 'bookshelf'].includes(note.slug));
  for (const note of essays) {
    const file = path.join('dist', decodeURIComponent(socialImageHref(note.slug)));
    const metadata = await sharp(fs.readFileSync(file)).metadata();
    assert.equal(metadata.width, 1200, file);
    assert.equal(metadata.height, 630, file);
    const html = fs.readFileSync(path.join('dist', note.slug, 'index.html'), 'utf8');
    assert.ok(html.includes(`content="https://www.matthewgarner.me${socialImageHref(note.slug)}"`), `Missing social card metadata for ${note.slug}`);
  }
  for (const slug of ['index', 'now', 'bookshelf']) assert.equal(fs.existsSync(`dist/social/${slug}.png`), false);
  for (const note of noteSources(undefined, { includeDrafts: true })) {
    if (!essays.some((essay) => essay.slug === note.slug)) assert.equal(fs.existsSync(path.join('dist', decodeURIComponent(socialImageHref(note.slug)))), false);
  }
});
