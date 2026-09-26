import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

test('the deployable package keeps old URLs, canonical pages and genuine 404 responses', () => {
  execFileSync(process.execPath, ['--import', 'tsx', 'scripts/package-vercel.ts']);
  const { routes, overrides } = JSON.parse(fs.readFileSync('.vercel/output/config.json', 'utf8'));
  const resolve = (url: string) => routes.find((route: { src?: string; continue?: boolean }) => route.src && !route.continue && new RegExp(route.src).test(url));
  for (const suffix of ['', '/', '.html', '/index.html']) {
    const alias = resolve('/posts/ill-stay-home-thanks' + suffix);
    assert.equal(alias.status, 308);
    assert.equal(alias.headers.Location, "/i'll-stay-home-thanks");
  }
  assert.equal(resolve('/drifting').dest, '/drifting/index.html');
  assert.equal(resolve("/i'll-stay-home-thanks").dest, "/i'll-stay-home-thanks/index.html");
  assert.equal(resolve('/drifting/').headers.Location, '/drifting');
  assert.equal(resolve('/index.html').headers.Location, '/');
  assert.equal(resolve('/').dest, '/index.html');
  assert.equal(resolve('/missing-article').status, 404);
  assert.equal(resolve('/missing-article').dest, '/404.html');
  assert.match(overrides['index.xml'].contentType, /application\/rss\+xml/);
  assert.ok(fs.existsSync('.vercel/output/static/images/profile.jpg'));
  const files = fs.readdirSync('.vercel/output/static', { recursive: true }).map(String);
  assert.ok(files.every((file) => !/\.(?:md|ts|astro|map)$/.test(file)));
  assert.ok(!files.some((file) => /(?:^|\/)(?:private|templates|tests)(?:\/|$)/.test(file)));
});
