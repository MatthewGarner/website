import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { noteSources, noteHref, safeSlug } from '../src/lib/publishing';

const deployment = new URL(process.argv[2]);
const production = process.argv.includes('--production');
assert.equal(deployment.protocol, 'https:');
assert.ok(production
  ? ['matthewgarner.me', 'www.matthewgarner.me'].includes(deployment.hostname)
  : deployment.hostname.endsWith('.vercel.app'), 'Pass the exact preview URL, or a live domain with --production.');
const run = promisify(execFile);
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'astro-hosted-'));
const results: { origin: string; path: string; status: number; location?: string }[] = [];
let sequence = 0;

async function get(urlPath: string, expected: number, origin = deployment.origin): Promise<{ headers: Record<string, string>; body: string }> {
  const id = sequence++;
  const headersFile = path.join(directory, `${id}.headers`);
  const bodyFile = path.join(directory, `${id}.body`);
  // `vercel curl` handles existing protection. Unlike other CLI commands,
  // version 60.1.3 forwards --non-interactive to curl, where it is invalid.
  const curlOptions = ['--silent', '--show-error', '--max-time', '30', '--dump-header', headersFile,
    '--output', bodyFile, '--write-out', '%{http_code}'];
  // Live checks deliberately use unauthenticated requests to catch accidental protection.
  const { stdout } = await run(production ? 'curl' : 'npx', production
    ? [new URL(urlPath, origin).href, ...curlOptions]
    : ['--yes', 'vercel@60.1.3', 'curl', urlPath, '--deployment', deployment.origin,
      '--scope', 'matthew-garners-projects', '--', ...curlOptions], { maxBuffer: 2 * 1024 * 1024 });
  const status = Number(stdout.trim());
  const headerBlock = fs.readFileSync(headersFile, 'utf8').trim().split(/\r?\n\r?\n/).at(-1)!;
  const headers = Object.fromEntries(headerBlock.split(/\r?\n/).slice(1).map((line) => {
    const colon = line.indexOf(':');
    return [line.slice(0, colon).toLowerCase(), line.slice(colon + 1).trim()];
  }));
  results.push({ origin, path: urlPath, status, ...(headers.location ? { location: headers.location } : {}) });
  if (production && origin === 'https://matthewgarner.me') {
    // The existing domain-level redirect runs before application routes, including
    // 404s and aliases. Validate its destination, then test the canonical response.
    const canonical = 'https://www.matthewgarner.me';
    assert.equal(status, 308, `The apex domain must redirect ${urlPath} to www.`);
    assert.equal(headers.location, new URL(urlPath, canonical).href);
    return get(urlPath, expected, canonical);
  }
  assert.equal(status, expected, `${urlPath}: expected ${expected}, got ${status}`);
  return { headers, body: fs.readFileSync(bodyFile, 'utf8') };
}

try {
  const home = await get('/', 200);
  assert.match(home.body, /A few things/);
  if (production) {
    assert.doesNotMatch(home.headers['x-robots-tag'] ?? '', /noindex/i, 'Production must allow indexing.');
    assert.doesNotMatch(home.body, /<meta[^>]+name="robots"[^>]+noindex/i);
  } else assert.match(home.headers['x-robots-tag'] ?? '', /noindex/, 'Preview should be excluded from search indexing.');
  for (const note of noteSources()) {
    await get(noteHref(note.slug), 200);
    for (const alias of note.aliases) {
      const response = await get(`/${safeSlug(alias)}`, 308);
      assert.equal(response.headers.location, noteHref(note.slug));
    }
  }
  const resources = await Promise.allSettled([
    get('/writing', 200), get('/images/profile.jpg', 200),
    get('/sitemap.xml', 200), get('/not-a-real-article', 404), get('/templates/Writing.md', 404),
    get('/content/Drifting.md', 404), get('/.env.local', 404),
    get('/drifting/', 308), get('/posts/ill-stay-home-thanks.html', 308),
  ]);
  for (const resource of resources) if (resource.status === 'rejected') throw resource.reason;
  const feed = await get('/index.xml', 200);
  if (production && deployment.hostname === 'matthewgarner.me') await get('/index.xml?migration-check=1', 200);
  assert.match(feed.headers['content-type'], /application\/rss\+xml/);
  const guids = [...feed.body.matchAll(/<guid[^>]*>(.*?)<\/guid>/g)].map((match) => match[1].replaceAll('&apos;', "'").replaceAll('&#39;', "'"));
  const legacy: string[] = JSON.parse(fs.readFileSync(new URL('../tests/fixtures/legacy-rss.json', import.meta.url), 'utf8'));
  for (const guid of legacy) assert.ok(guids.includes(guid), `Existing RSS GUID changed: ${guid}`);
  const stylesheet = home.body.match(/href="(\/_astro\/[^"?]+\.css)"/);
  assert.ok(stylesheet, 'The homepage should include its stylesheet.');
  const css = await get(stylesheet[1], 200);
  assert.match(css.headers['content-type'], /text\/css/);
  assert.match(css.headers['cache-control'], /immutable/);
  console.log(JSON.stringify({ deployment: deployment.origin, checkedAt: new Date().toISOString(), result: 'passed', checks: results }, null, 2));
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
