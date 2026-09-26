import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import matter from 'gray-matter';
import { obsidianMarkdown } from '../src/lib/obsidian';
import { CONTENT_DIR, noteSources, resolveNote, noteHref } from '../src/lib/publishing';

test('existing RSS article identities survive the Quartz migration', () => {
  const legacy: string[] = JSON.parse(fs.readFileSync('tests/fixtures/legacy-rss.json', 'utf8'));
  const feed = fs.readFileSync('dist/index.xml', 'utf8');
  const guids = [...feed.matchAll(/<guid[^>]*>(.*?)<\/guid>/g)].map((match) => match[1].replaceAll('&apos;', "'").replaceAll('&#39;', "'"));
  for (const guid of legacy) assert.ok(guids.includes(guid), `Existing RSS GUID changed: ${guid}`);
  assert.equal(new Set(guids).size, guids.length);
});

test('every existing essay and old alias has a built public page', () => {
  const notes = noteSources().filter((note) => note.slug !== 'index');
  assert.ok(notes.length >= 5);
  assert.ok(notes.some((note) => note.relative === 'Pet peeves #1.md' && note.slug === 'pet-peeves-1'));
  for (const note of notes) {
    const html = fs.readFileSync(path.join('dist', note.slug, 'index.html'), 'utf8');
    assert.match(html, /class="prose"/);
    assert.ok(html.includes(`<link rel="canonical" href="https://www.matthewgarner.me${noteHref(note.slug)}`));
    for (const alias of note.aliases) {
      const redirect = fs.readFileSync(path.join('dist', alias, 'index.html'), 'utf8');
      assert.ok(redirect.replaceAll('&#39;', "'").includes(noteHref(note.slug)));
    }
  }
  const about = fs.readFileSync('dist/about/index.html', 'utf8');
  assert.match(about, /src="\/images\/profile.jpg"/);
  assert.ok(!about.includes('![[images/'));
  assert.ok(fs.existsSync('dist/images/profile.jpg'));
  const listed = notes.filter((note) => !matter.read(note.file).data.unlisted);
  assert.equal((fs.readFileSync('dist/index.xml', 'utf8').match(/<item>/g) ?? []).length, listed.length);
  assert.equal((fs.readFileSync('dist/sitemap.xml', 'utf8').match(/<url>/g) ?? []).length, listed.length + 3);
});

test('Obsidian image sizes, wikilinks, callouts and Markdown links render', async () => {
  const processor = await createMarkdownProcessor({ remarkPlugins: [obsidianMarkdown] });
  const result = await processor.render('![[images/profile.jpg|200x200]]\n\n[[The gardening metaphor|An essay]] and [another](Drifting.md).\n\n> [!note] A thought\n> Some words.', { fileURL: pathToFileURL(path.join(CONTENT_DIR, 'index.md')) });
  assert.match(result.code, /src="\/images\/profile.jpg"[^>]*width="200"[^>]*height="200"/);
  assert.match(result.code, /href="\/the-gardening-metaphor">An essay<\/a>/);
  assert.match(result.code, /href="\/drifting">another<\/a>/);
  assert.match(result.code, /class="callout"/);
  assert.match(result.code, /<strong>A thought<\/strong>/);
});

test('drafts, private folders and ambiguous wikilinks cannot silently become public links', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'site-notes-'));
  try {
    fs.mkdirSync(path.join(root, 'private'));
    fs.mkdirSync(path.join(root, 'other'));
    fs.writeFileSync(path.join(root, 'Visible.md'), '---\ntitle: Visible\n---\nPublished.');
    fs.writeFileSync(path.join(root, 'Draft.md'), '---\ntitle: Draft\ndraft: true\n---\nHidden.');
    fs.writeFileSync(path.join(root, 'Secret.md'), '---\ntitle: Secret\npublish: false\n---\nHidden.');
    fs.writeFileSync(path.join(root, 'private', 'Private.md'), '---\ntitle: Private\n---\nHidden.');
    let notes = noteSources(root);
    assert.deepEqual(notes.map((note) => note.title), ['Visible']);
    assert.throws(() => resolveNote('Draft', 'index.md', notes), /Missing or unpublished/);
    fs.writeFileSync(path.join(root, 'other', 'Copy.md'), '---\ntitle: Visible\n---\nOther.');
    notes = noteSources(root);
    assert.throws(() => resolveNote('Visible', 'unrelated/start.md', notes), /Ambiguous/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
