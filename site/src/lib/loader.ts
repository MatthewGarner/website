import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import matter from 'gray-matter';
import type { Loader } from 'astro/loaders';
import { CONTENT_DIR, noteSources, isPublished } from './publishing';
import { prepareMarkdown } from './markdown';
import { localDraftsEnabled } from './drafts';

export function obsidianNotes(): Loader {
  return {
    name: 'obsidian-notes',
    async load({ store, parseData, renderMarkdown, generateDigest, watcher, logger, config }) {
      const includeDrafts = localDraftsEnabled(Boolean(watcher), config.server.host);
      async function sync() {
        const entries = [];
        const notes = noteSources(CONTENT_DIR, { includeDrafts });
        const paths = new Set(['writing', 'about', '404', 'index.xml', 'sitemap.xml']);
        for (const note of notes) {
          if (paths.has(note.slug)) throw new Error(`Duplicate or reserved note path: ${note.slug}`);
          paths.add(note.slug);
          const source = fs.readFileSync(note.file, 'utf8');
          const { data, content } = matter(source);
          // A frontmatter property cannot opt a draft into a build. The loader owns
          // this marker and clears the previous dev cache on every production sync.
          const parsed = await parseData({ id: note.slug, data: { ...data, localDraft: includeDrafts && !isPublished(data) }, filePath: note.file });
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
