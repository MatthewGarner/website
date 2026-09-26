import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { prepareMarkdown, stripComments } from '../src/lib/markdown';
import { plainText, CONTENT_DIR, noteSources } from '../src/lib/publishing';
import { obsidianMarkdown } from '../src/lib/obsidian';
import { readingProse } from '../src/lib/prose';
import { selectFeatured } from '../src/lib/editorial';
import matter from 'gray-matter';

test('homepage curation follows properties, ignores hidden notes, and fills spare spaces by date', () => {
  const note = (id: string, data = {}) => ({ id, data: { title: id, date: new Date('2026-01-01'), ...data } });
  const notes = [note('recent', { date: new Date('2026-02-01') }), note('second', { featured: true, featureOrder: 2 }),
    note('first', { featured: true, featureOrder: 1 }), note('draft', { featured: true, draft: true }),
    note('unlisted', { featured: true, unlisted: true }), note('private', { featured: true, publish: false }), note('old')];
  assert.deepEqual(selectFeatured(notes).map(({ id }) => id), ['first', 'second', 'recent']);
  assert.deepEqual(selectFeatured([note('old'), note('recent', { date: new Date('2026-02-01') })]).map(({ id }) => id), ['recent', 'old']);
  assert.deepEqual(selectFeatured([note('index'), note('draft', { draft: true })]), []);
});

test('comments vanish before link resolution, previews and rendering; code and escaped syntax survive', async () => {
  const source = 'Visible %% PRIVATE\n\n[[Missing secret note]] **private words** %% text.\n\n`%% literal %%` and `==literal==`\n\n```txt\n%% fenced example %%\n==literal==\n```\n\n\\%% escaped delimiters \\%%';
  const prepared = prepareMarkdown(source);
  assert.ok(!prepared.includes('PRIVATE') && !prepared.includes('Missing secret'));
  assert.match(prepared, /`%% literal %%`/);
  assert.match(prepared, /%% fenced example %%/);
  assert.match(prepared, /\\%% escaped delimiters \\%%/);
  assert.equal(plainText('Hello %% PRIVATE %% ==world==.'), 'Hello world.');
  assert.throws(() => stripComments('Visible %% accidentally unfinished'), /Unclosed Obsidian comment/);
  const renderer = await createMarkdownProcessor({ remarkPlugins: [obsidianMarkdown] });
  const result = await renderer.render(prepared);
  assert.ok(!result.code.includes('PRIVATE'));
  assert.match(result.code, /<code>%% literal %%<\/code>/);
});

test('highlights support emphasis and links, while literals and separate paragraphs remain intact', async () => {
  const renderer = await createMarkdownProcessor({ remarkPlugins: [obsidianMarkdown] });
  const source = '==**A thought** and [[Drifting|a note]]==. Also ==another==.\n\n`==code==` and \\==escaped==\n\n==unfinished\n\na different paragraph==';
  const result = await renderer.render(prepareMarkdown(source));
  assert.match(result.code, /<mark><strong>A thought<\/strong> and <a href="\/drifting">a note<\/a><\/mark>/);
  assert.match(result.code, /<mark>another<\/mark>/);
  assert.match(result.code, /<code>==code==<\/code>/);
  assert.match(result.code, /==escaped==/);
  assert.match(result.code, /==unfinished/);
});

test('the reading sample renders captions, footnotes, scrollable tables and callouts without its private annotation', async () => {
  const renderer = await createMarkdownProcessor({ remarkPlugins: [obsidianMarkdown], rehypePlugins: [readingProse] });
  const sample = matter.read('tests/fixtures/reading-sample.md').content;
  const { code } = await renderer.render(prepareMarkdown(sample), { fileURL: pathToFileURL(`${CONTENT_DIR}/reading-sample.md`) });
  assert.ok(!code.includes('private annotation') && !code.includes('private note that does not exist'));
  assert.match(code, /<figure><img[^>]+><figcaption>An existing image/);
  assert.match(code, /class="table-scroll" tabindex="0" role="region" aria-label="Table"/);
  assert.match(code, /data-footnote-backref/);
  assert.match(code, /class="callout"/);
  assert.match(code, /<mark><strong>emphasis within a highlight<\/strong><\/mark>/);
});

test('the built homepage selection matches the Markdown properties', () => {
  const html = fs.readFileSync('dist/index.html', 'utf8');
  const notes = noteSources().map((note) => {
    const { data } = matter.read(note.file);
    return { id: note.slug, data: { ...data, title: note.title, date: data.date ? new Date(data.date) : undefined } };
  });
  const expected = selectFeatured(notes).map(({ id }) => id);
  const actual = [...html.matchAll(/data-note="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(actual, expected);
});
