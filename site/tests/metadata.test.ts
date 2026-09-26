import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { noteSources, noteHref } from '../src/lib/publishing';

test('canonical and social URLs point directly to the public page, without a redirect', () => {
  const pages = [
    ['index.html', '/'],
    ['writing/index.html', '/writing'],
    ['about/index.html', '/about'],
    ...noteSources().filter(note => note.slug !== 'index').map(note => [`${note.slug}/index.html`, noteHref(note.slug)]),
  ];
  for (const [file, route] of pages) {
    const html = fs.readFileSync(path.join('dist', file), 'utf8');
    const expected = `https://www.matthewgarner.me${route}`;
    assert.equal(html.match(/<link rel="canonical" href="([^"]+)"/)?.[1], expected, file);
    assert.equal(html.match(/<meta property="og:url" content="([^"]+)"/)?.[1], expected, file);
  }
});
