import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { CONTENT_DIR, contentFiles, resolveAsset } from '../src/lib/publishing';
import { prepareMarkdown } from '../src/lib/markdown';
import { articleTools, readExample } from '../src/lib/tool-embeds';

// Unlike production rendering, this authoring check includes unfinished articles.
const directory = path.join(CONTENT_DIR, 'tool-examples');
let examples = 0, blocks = 0;
for (const name of fs.readdirSync(directory).filter(name => name.endsWith('.json'))) {
  const example = readExample(name.slice(0, -5));
  resolveAsset(example.image, 'index.md');
  examples++;
}
for (const file of contentFiles().filter(file => file.endsWith('.md'))) {
  const tree = fromMarkdown(prepareMarkdown(matter.read(file).content));
  const before = JSON.stringify(tree).match(/"lang":"tool"/g)?.length ?? 0;
  if (!before) continue;
  try { articleTools()(tree, { path: file }); }
  catch (error) { throw new Error(`${path.relative(CONTENT_DIR, file)}: ${String(error)}`); }
  blocks += before;
}
console.log(`Validated ${examples} tool examples and ${blocks} article tool blocks, including drafts.`);
