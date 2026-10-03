import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { articleTools, readExample, validateExample, exampleURLs } from '../src/lib/tool-embeds';
import { plainText } from '../src/lib/publishing';

test('authored tool blocks produce a static fallback, initial-state link and opt-in interaction', async () => {
  const renderer = await createMarkdownProcessor({ remarkPlugins: [articleTools] });
  const { code } = await renderer.render('Before.\n\n```tool\nexample: flow-queues-v1\ncaption: "Try <this> & that"\n```\n\nAfter.');
  assert.match(code, /<figure class="tool-demo" data-tool-src="https:\/\/tools.matthewgarner.me\/embed\/v1\/flow\//);
  assert.match(code, /<img[^>]+flow-queues-v1.svg[^>]+alt=/);
  // Astro serializes named entities as numeric entities; both must remain text.
  assert.match(code, /<figcaption>Try (?:&lt;|&#x3C;)this(?:&gt;|>) (?:&amp;|&#x26;) that<\/figcaption>/);
  assert.match(code, /data-tool-start(?:="")? hidden/);
  assert.doesNotMatch(code, /<iframe|<script|language-tool/);
  const full = exampleURLs(readExample('flow-queues-v1')).full;
  assert.deepEqual(JSON.parse(Buffer.from(new URL(full).hash.slice(1), 'base64').toString()), { d: 8, s: 2, t: 4, w: 4, v: 'med' });
  const figure = await renderer.render('```tool\nexample: flow-queues-v1\nmode: figure\n```');
  assert.doesNotMatch(figure.code, /data-tool-src|data-tool-start/);
  assert.match(figure.code, /Open full tool/);
});

test('mistyped options, unsafe paths and unsupported models fail publishing', async () => {
  const renderer = await createMarkdownProcessor({ remarkPlugins: [articleTools] });
  for (const source of ['example: ../private/note', 'example: flow-queues-v1\ncontrols: all', 'example: flow-queues-v1\nmode: surprise']) {
    await assert.rejects(renderer.render(`\`\`\`tool\n${source}\n\`\`\``));
  }
  const example = readExample('flow-queues-v1');
  assert.throws(() => validateExample({ ...example, version: 2 }), /Unsupported/);
  assert.throws(() => validateExample({ ...example, seed: 42 }), /fixed seed/);
  assert.throws(() => validateExample({ ...example, params: { ...example.params, demandPerWeek: -1 } }), /Invalid Flow/);
  assert.throws(() => validateExample({ ...example, controls: ['team'] }), /controls/);
  assert.throws(() => validateExample({ ...example, tool: ['flow'] }), /Unsupported/);
  assert.throws(() => validateExample({ ...example, params: { ...example.params, cov: ['med'] } }), /Invalid Flow/);
  assert.throws(() => validateExample({ ...example, image: 'https://example.com/a.svg' }), /local image/);
  assert.throws(() => articleTools({ origin: 'https://example.com' }), /origin/);
});

test('examples cannot read through symlinks and their configuration stays out of prose', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tool-examples-'));
  try {
    fs.mkdirSync(path.join(root, 'tool-examples'));
    fs.writeFileSync(path.join(root, 'private.json'), JSON.stringify(readExample('flow-queues-v1')));
    fs.symlinkSync(path.join(root, 'private.json'), path.join(root, 'tool-examples/linked.json'));
    assert.throws(() => readExample('linked', root), /symlinks/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
  assert.equal(plainText('Before.\n\n```tool\nexample: flow-queues-v1\ncaption: Config\n```\n\nAfter.'), 'Before. After.');
  assert.match(plainText('`tool` is a word.'), /tool is a word/);
});
