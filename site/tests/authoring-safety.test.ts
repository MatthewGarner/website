import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import rehypeSlug from 'rehype-slug';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { prepareMarkdown, stripComments } from '../src/lib/markdown';
import { contentFiles, noteSources, plainText, resolveAsset, resolveNote } from '../src/lib/publishing';
import { obsidianMarkdown } from '../src/lib/obsidian';

function vault() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'site-authoring-'));
  const write = (name: string, content: string) => {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    return file;
  };
  write('essays/Original name.md', '---\ntitle: A renamed essay\nslug: stable-address\n---\n## A_b: 😃');
  write('Pet peeves #1.md', '---\ntitle: Pet peeves\n---\nA thought.');
  write('Draft.md', '---\ntitle: Draft\ndraft: true\n---\nUnpublished.');
  write('images/cover #1.png', 'image');
  write('notes/images/cover #1.png', 'different image');
  return { root, write, remove: () => fs.rmSync(root, { recursive: true, force: true }) };
}

test('comment Markdown cannot disguise subsequent private comments as code', async () => {
  const source = 'Before %%\n```\nPRIVATE FIRST\n%%\nVisible %% PRIVATE SECOND %% after.\n\n`%% literal %%`';
  const prepared = prepareMarkdown(source);
  assert.doesNotMatch(prepared, /PRIVATE/);
  assert.doesNotMatch(plainText(source), /PRIVATE/);
  assert.match(prepared, /`%% literal %%`/);
  const renderer = await createMarkdownProcessor();
  assert.doesNotMatch((await renderer.render(prepared)).code, /PRIVATE/);
  assert.throws(() => stripComments('%%\n```\nPRIVATE\n%%\nVisible %% unclosed'), /Unclosed Obsidian comment/);
});

test('vault-qualified note paths resolve independently of custom slugs and Unicode composition', () => {
  const { root, write, remove } = vault();
  try {
    write('essays/Cafe\u0301.md', '---\ntitle: Café\n---\nCoffee.');
    const notes = noteSources(root);
    for (const target of ['essays/Original name', '/essays/Original name.md', '../essays/Original name.md']) {
      assert.equal(resolveNote(target, 'notes/Start.md', notes).slug, 'stable-address');
    }
    assert.equal(resolveNote('essays/Café.md', 'notes/Start.md', notes).slug, 'essays/café');
    assert.equal(resolveAsset('/images/cover #1.png', 'notes/Start.md', root), '/images/cover%20%231.png');
    assert.equal(resolveAsset('images/cover #1.png', 'notes/Start.md', root), '/notes/images/cover%20%231.png');
  } finally { remove(); }
});

test('symlinks cannot publish notes or attachments from excluded folders', () => {
  const { root, write, remove } = vault();
  try {
    const secret = write('private/Secret.md', '---\ntitle: Secret\n---\nPrivate.');
    const image = write('private/secret.png', 'Private image.');
    fs.symlinkSync(secret, path.join(root, 'Accidental publication.md'));
    fs.symlinkSync(image, path.join(root, 'secret.png'));
    fs.symlinkSync(path.join(root, 'private'), path.join(root, 'shortcut'), 'dir');
    assert.ok(contentFiles(root).every((file) => !/private|secret|Accidental|shortcut/.test(file)));
    assert.throws(() => resolveNote('Accidental publication', 'index.md', noteSources(root)), /Missing or unpublished/);
    assert.throws(() => resolveAsset('secret.png', 'index.md', root), /Missing or ambiguous/);
  } finally { remove(); }
});

test('Markdown URLs preserve encoded filename delimiters and resolve reference links and image definitions', async () => {
  const { root, remove } = vault();
  try {
    const renderer = await createMarkdownProcessor({ remarkPlugins: [[obsidianMarkdown, { root }]] });
    const result = await renderer.render([
      '[Peeves](../Pet%20peeves%20%231.md)',
      '[Essay][essay]',
      '![Cover][cover]',
      '[Download](/images/cover%20%231.png)',
      '[essay]: /essays/Original%20name.md#A_b:%20%F0%9F%98%83',
      '[cover]: /images/cover%20%231.png?size=2#preview',
    ].join('\n\n'), { fileURL: pathToFileURL(path.join(root, 'notes/Start.md')) });
    assert.match(result.code, /href="\/pet-peeves-1">Peeves/);
    assert.match(result.code, /href="\/stable-address#a_b-">Essay/);
    assert.match(result.code, /src="\/images\/cover%20%231.png\?size=2#preview"/);
    assert.match(result.code, /href="\/images\/cover%20%231.png">Download/);
    const transform = obsidianMarkdown({ root });
    assert.throws(() => transform(fromMarkdown('[Draft][hidden]\n\n[hidden]: Draft.md'), {}), /Missing or unpublished/);
    assert.throws(() => transform(fromMarkdown('[Draft](/Draft.md)'), {}), /Missing or unpublished/);
  } finally { remove(); }
});

test('wikilinks retain filename punctuation through typography and respect Markdown escapes', async () => {
  const { root, write, remove } = vault();
  try {
    write("I'll stay home.md", "---\ntitle: I'll stay home\n---\nHome.");
    const renderer = await createMarkdownProcessor({ remarkPlugins: [[obsidianMarkdown, { root }]] });
    const { code } = await renderer.render(String.raw`\[[Missing]] then [[I'll stay home]] and \[[Also missing]].

\[\[Missing too]] and [[I'll stay home]].

&#91;&#91;Entity literal]] and [[I'll stay home]].`);
    assert.match(code, /\[\[Missing\]\]/);
    assert.match(code, /href="\/i&#x27;ll-stay-home">I’ll stay home<\/a>/);
    assert.match(code, /\[\[Also missing\]\]/);
    assert.match(code, /\[\[Missing too\]\] and <a/);
    assert.match(code, /\[\[Entity literal\]\] and <a/);
    assert.equal((code.match(/href="\/i&#x27;ll-stay-home"/g) ?? []).length, 3);
  } finally { remove(); }
});

test('heading wikilinks have visible labels and fragments that match rendered heading IDs', async () => {
  const { root, remove } = vault();
  try {
    const renderer = await createMarkdownProcessor({ remarkPlugins: [[obsidianMarkdown, { root }]], rehypePlugins: [rehypeSlug] });
    const { code } = await renderer.render("[[#A_b: 😃]] and [[essays/Original name#A_b: 😃|Elsewhere]].\n\n## A_b: 😃\n\n[[#It's fine]]\n\n## It's fine");
    assert.match(code, /href="#a_b-">A_b: 😃<\/a>/);
    assert.match(code, /href="\/stable-address#a_b-">Elsewhere<\/a>/);
    assert.match(code, /<h2 id="a_b-">/);
    assert.match(code, /href="#its-fine">It’s fine<\/a>/);
    assert.match(code, /<h2 id="its-fine">/);
  } finally { remove(); }
});
