import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { localDraftsEnabled } from '../src/lib/drafts';

test('draft preview requires local development, even when environment flags suggest otherwise', () => {
  assert.equal(localDraftsEnabled(true, '127.0.0.1', {}), true);
  assert.equal(localDraftsEnabled(false, '127.0.0.1', { NODE_ENV: 'development' }), false);
  for (const host of [true, '0.0.0.0', '::', '192.168.1.2']) assert.equal(localDraftsEnabled(true, host, {}), false);
  for (const env of [{ CI: 'true' }, { VERCEL: '1' }, { VERCEL_ENV: 'preview' }, { VERCEL_ENV: 'production' }]) {
    assert.equal(localDraftsEnabled(true, 'localhost', env), false);
  }
});

test('drafts render locally, refresh on save, and cannot survive into builds or hosted development', { timeout: 120_000 }, async () => {
  // Use an isolated copy, never test notes in the author's real Obsidian folder.
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'site-draft-preview-'));
  const project = path.join(directory, 'site');
  const source = path.resolve(import.meta.dirname, '..');
  const require = createRequire(import.meta.url);
  // Resolve the installed CLI entry point; its filename changes between Astro releases.
  const astro = path.resolve(path.dirname(require.resolve('astro/package.json')), require('astro/package.json').bin.astro);
  const run = promisify(execFile);
  const localEnv: NodeJS.ProcessEnv = { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' };
  for (const key of ['CI', 'VERCEL', 'VERCEL_ENV']) delete localEnv[key];
  let server: ReturnType<typeof spawn> | undefined;
  let serverClosed: Promise<void> | undefined;
  let logs = '';

  async function start(env = localEnv) {
    logs = '';
    server = spawn(process.execPath, [astro, 'dev', '--ignore-lock', '--port', '0'], { cwd: project, env, stdio: ['ignore', 'pipe', 'pipe'] });
    serverClosed = new Promise((resolve) => server!.once('close', () => resolve()));
    server.stdout!.on('data', (chunk) => { logs += chunk; });
    server.stderr!.on('data', (chunk) => { logs += chunk; });
    for (let attempt = 0; attempt < 300; attempt++) {
      const url = logs.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
      if (url) return url;
      if (server.exitCode !== null) throw new Error(`Local preview stopped: ${logs}`);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Local preview did not start: ${logs}`);
  }

  async function stop() {
    if (!server || server.exitCode !== null) return;
    server.kill('SIGTERM');
    await serverClosed;
    server = undefined;
  }

  try {
    fs.mkdirSync(project);
    for (const entry of ['src', 'astro.config.ts', 'tsconfig.json', 'package.json']) {
      fs.cpSync(path.join(source, entry), path.join(project, entry), { recursive: true });
    }
    fs.symlinkSync(path.join(source, 'node_modules'), path.join(project, 'node_modules'), 'dir');
    fs.cpSync(path.join(source, '../content'), path.join(directory, 'content'), { recursive: true });
    const draft = path.join(directory, 'content/Local draft sentinel.md');
    const body = '---\ntitle: Unpublished sentinel\ndraft: true\nfeatured: true\naliases: [unpublished-alias]\n---\nDraft body sentinel. See [[Withheld sentinel]].';
    fs.writeFileSync(draft, body);
    fs.writeFileSync(path.join(directory, 'content/Withheld sentinel.md'), '---\ntitle: Withheld sentinel\npublish: false\nlocalDraft: true\n---\nWithheld body sentinel.');
    fs.writeFileSync(path.join(directory, 'content/Now.md'), '---\ntitle: Now\nslug: now\ndraft: true\nexcerpt: Unpublished now sentinel\n---\nUnpublished now sentinel.');
    fs.writeFileSync(path.join(directory, 'content/Bookshelf.md'), '---\ntitle: Bookshelf\nslug: bookshelf\ndraft: true\nbooks:\n  - title: Unpublished book sentinel\n    author: Test author\n---\nUnpublished bookshelf sentinel.');
    fs.mkdirSync(path.join(directory, 'content/private'), { recursive: true });
    fs.writeFileSync(path.join(directory, 'content/private/Hidden sentinel.md'), '---\ntitle: Hidden sentinel\n---\nExcluded folder sentinel.');
    const url = await start();
    const get = async (route: string) => {
      const response = await fetch(url + route);
      return { status: response.status, body: await response.text() };
    };
    const archive = await get('/writing');
    assert.equal(archive.status, 200, logs);
    assert.match(archive.body, /Local drafts/);
    assert.match(archive.body, /Unpublished sentinel/);
    assert.match(archive.body, /Withheld sentinel/);
    const page = await get('/local-draft-sentinel');
    assert.equal(page.status, 200, logs);
    assert.match(page.body, /Draft preview/);
    assert.match(page.body, /noindex, nofollow/);
    assert.match(page.body, /href="\/withheld-sentinel"/);
    assert.equal((await get('/withheld-sentinel')).status, 200);
    const now = await get('/now');
    assert.equal(now.status, 200, logs);
    assert.match(now.body, /Unpublished now sentinel/);
    assert.match(now.body, /Draft preview/);
    const shelf = await get('/bookshelf');
    assert.equal(shelf.status, 200, logs);
    assert.match(shelf.body, /Unpublished book sentinel/);
    assert.match(shelf.body, /noindex, nofollow/);
    assert.doesNotMatch((await get('/')).body, /href="\/(?:now|bookshelf)"/);
    assert.equal((await get('/private/hidden-sentinel')).status, 404);
    for (const route of ['/', '/index.xml', '/sitemap.xml']) {
      assert.doesNotMatch((await get(route)).body, /[Uu]npublished|[Ww]ithheld|local-draft-sentinel/);
    }
    fs.writeFileSync(draft, body.replace('Draft body sentinel.', 'Updated draft body sentinel.'));
    let updated = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if ((await get('/local-draft-sentinel')).body.includes('Updated draft body sentinel.')) { updated = true; break; }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(updated, 'Saving a draft should refresh its rendered page.');
    await stop();

    // Reuse the warmed dev cache: it must not carry unpublished entries into a build.
    await run(process.execPath, [astro, 'build'], { cwd: project, env: { ...localEnv, NODE_ENV: 'development' }, maxBuffer: 4 * 1024 * 1024 });
    const dist = path.join(project, 'dist');
    assert.ok(!fs.existsSync(path.join(dist, 'now')));
    assert.ok(!fs.existsSync(path.join(dist, 'bookshelf')));
    for (const file of fs.readdirSync(dist, { recursive: true }).map(String)) {
      assert.doesNotMatch(file, /local-draft-sentinel|withheld-sentinel|unpublished-alias|hidden-sentinel/);
      if (/\.(?:html|xml)$/.test(file)) {
        assert.doesNotMatch(fs.readFileSync(path.join(dist, file), 'utf8'), /[Uu]npublished sentinel|[Ww]ithheld body sentinel|Draft preview|Local drafts/);
      }
    }
    const hosted = await start({ ...localEnv, CI: 'true', VERCEL: '1', VERCEL_ENV: 'preview' });
    assert.equal((await fetch(hosted + '/local-draft-sentinel')).status, 404);
    assert.doesNotMatch(await (await fetch(hosted + '/writing')).text(), /Local drafts|Unpublished sentinel/);
  } finally {
    await stop();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
