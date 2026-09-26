import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import matter from 'gray-matter';
import type { Loader } from 'astro/loaders';
import { CONTENT_DIR, noteSources } from './publishing';
import { prepareMarkdown } from './markdown';

export function obsidianNotes(): Loader {
  return {
    name: 'obsidian-notes',
    async load({ store, parseData, renderMarkdown, generateDigest, watcher, logger }) {
      async function sync() {
        const entries = [];
        for (const note of noteSources()) {
          const source = fs.readFileSync(note.file, 'utf8');
          const { data, content } = matter(source);
          const parsed = await parseData({ id: note.slug, data, filePath: note.file });
          // pathToFileURL preserves literal # and ? in Obsidian filenames. Astro's
          // glob loader currently treats them as URL fragments/query strings.
          const body = prepareMarkdown(content);
          const rendered = await renderMarkdown(body, { fileURL: pathToFileURL(note.file) });
          entries.push({ id: note.slug, data: parsed, body, rendered, digest: generateDigest(source) });
        }
        store.clear();
        entries.forEach((entry) => store.set(entry));
      }
      await sync();
      if (watcher) {
        watcher.add(CONTENT_DIR);
        let queue = Promise.resolve();
        watcher.on('all', (_event, file) => {
          if (!file.startsWith(CONTENT_DIR + path.sep) || !file.endsWith('.md')) return;
          queue = queue.then(sync).catch((error) => logger.error(String(error)));
        });
      }
    },
  };
}
