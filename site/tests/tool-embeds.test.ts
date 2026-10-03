import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { articleTools, readExample, validateExample, exampleURLs, toolCatalogue } from '../src/lib/tool-embeds';
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


const manifestFor = (definition: typeof toolCatalogue.tools[number]) => ({
  tool: definition.id, version: definition.version, view: definition.defaultView,
  title: definition.title, summary: definition.description,
  image: '/images/demonstrations/flow-queues-v1.svg', alt: 'Test illustration',
  state: structuredClone(definition.initialState),
  controls: [...(definition.views[definition.defaultView].defaultControls ?? definition.views[definition.defaultView].controls)],
});

test('every exported tool can create a validated article URL without tool-specific website code', () => {
  assert.ok(toolCatalogue.tools.length > 1);
  for (const definition of toolCatalogue.tools) {
    const example = validateExample(manifestFor(definition));
    const urls = exampleURLs(example);
    const embedded = new URL(urls.src);
    assert.equal(embedded.origin, 'https://tools.matthewgarner.me');
    assert.equal(embedded.pathname, definition.route);
    assert.deepEqual(JSON.parse(decodeURIComponent(embedded.hash.slice(1))), {
      state: definition.initialState, view: definition.defaultView, controls: example.controls,
    });
    assert.ok(['https://tools.matthewgarner.me', 'https://energy.matthewgarner.me'].includes(new URL(urls.full).origin));
    assert.ok(new URL(urls.full).hash.length > 1);
    assert.deepEqual(manifestFor(definition).state, definition.initialState, 'validation must not mutate the example');
  }
});

test('generic authoring rejects malformed state, unknown views and repeated or unsupported controls', () => {
  const definition = toolCatalogue.tools.find((tool: { id: string }) => tool.id === 'rank')!;
  const example = manifestFor(definition);
  assert.throws(() => validateExample({ ...example, state: undefined }));
  assert.throws(() => validateExample({ ...example, state: { ...example.state, extra: 1 } }), /unknown property/);
  assert.throws(() => validateExample({ ...example, view: 'missing' }), /view/);
  assert.throws(() => validateExample({ ...example, controls: ['value', 'value'] }), /duplicate/);
  assert.throws(() => validateExample({ ...example, controls: ['missing'] }), /unsupported/);
  assert.throws(() => validateExample({ ...example, controls: undefined }), /explicit|controls/);
  assert.throws(() => validateExample({ ...example, state: JSON.parse('{"__proto__":{}}') }), /property/);
  assert.throws(() => validateExample({ ...example, state: { ...example.state, w: Infinity } }), /finite/);
  assert.throws(() => validateExample({ ...example, version: '1' }), /Unsupported/);
  assert.throws(() => validateExample({ ...example, url: 'https://example.com' }), /Unknown/);
  const immutable = validateExample({ ...example, controls: [] });
  assert.deepEqual(immutable.controls, []);
  const urls = exampleURLs(immutable, 'http://127.0.0.1:8087');
  assert.equal(new URL(urls.src).origin, 'http://127.0.0.1:8087');
  assert.equal(new URL(urls.full).origin, 'http://127.0.0.1:8087');
});

test('a new catalogue tool renders using the same safe figure path as a legacy example', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'generic-tool-example-'));
  try {
    fs.mkdirSync(path.join(root, 'tool-examples'));
    fs.mkdirSync(path.join(root, 'images'));
    fs.writeFileSync(path.join(root, 'images/example.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
    const definition = toolCatalogue.tools.find((tool: { id: string }) => tool.id === 'rank')!;
    const title = '<script>unsafe</script>\" onclick=\"unsafe';
    fs.writeFileSync(path.join(root, 'tool-examples/rank-example.json'), JSON.stringify({ ...manifestFor(definition), image: '/images/example.svg', title }));
    const renderer = await createMarkdownProcessor({ remarkPlugins: [[articleTools, { root }]] });
    const { code } = await renderer.render('```tool\nexample: rank-example\n```');
    assert.match(code, /data-tool-src="https:\/\/tools.matthewgarner.me\/embed\/rank\/v1\//);
    assert.match(code, /src="\/images\/example.svg"/);
    // Astro can serialize literal angle brackets safely inside quoted attributes.
    // Only a literal quote could escape that attribute; it must remain encoded.
    assert.match(code, /data-tool-title="[^"]*(?:&#x22;|&quot;) onclick=(?:&#x22;|&quot;)unsafe"/);
    assert.doesNotMatch(code, / onclick="/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
