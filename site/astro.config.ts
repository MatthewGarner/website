import { defineConfig } from 'astro/config';
import type { AstroIntegration } from 'astro';
import { unified } from '@astrojs/markdown-remark';
import fs from 'node:fs';
import path from 'node:path';
import rehypeSlug from 'rehype-slug';
import { obsidianMarkdown } from './src/lib/obsidian';
import { readingProse } from './src/lib/prose';
import { articleTools } from './src/lib/tool-embeds';
import { CONTENT_DIR, contentFiles, assetExtensions, noteSources, safeSlug, noteHref } from './src/lib/publishing';
import { localDraftsEnabled } from './src/lib/drafts';
import { isPersonalPage } from './src/lib/personal-pages';

const markdownProcessor = (includeDrafts = false) => unified({
  remarkPlugins: [[obsidianMarkdown, { includeDrafts }], [articleTools, {
    ...(includeDrafts && process.env.TOOL_EMBED_ORIGIN ? { origin: process.env.TOOL_EMBED_ORIGIN } : {}),
  }]], rehypePlugins: [rehypeSlug, readingProse],
});

const assetDir = path.join(import.meta.dirname, '.assets');
function syncAssets() {
  // This generated directory contains attachments only, never raw notes or frontmatter.
  fs.rmSync(assetDir, { recursive: true, force: true });
  fs.mkdirSync(assetDir, { recursive: true });
  for (const file of contentFiles()) {
    if (!assetExtensions.has(path.extname(file).toLowerCase())) continue;
    const destination = path.join(assetDir, path.relative(CONTENT_DIR, file));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(file, destination);
  }
}

const contentAssets: AstroIntegration = {
  name: 'obsidian-attachments',
  hooks: {
    'astro:config:setup': ({ command, config, updateConfig }) => {
      syncAssets();
      if (localDraftsEnabled(command === 'dev', config.server.host)) {
        updateConfig({ markdown: { processor: markdownProcessor(true) } });
      }
    },
    'astro:server:setup': ({ server }) => {
      server.watcher.add(CONTENT_DIR);
      server.watcher.on('all', (_event, file) => {
        if (file.startsWith(CONTENT_DIR + path.sep) && assetExtensions.has(path.extname(file).toLowerCase())) syncAssets();
      });
    },
  },
};

const redirects: Record<string, string> = {};
const reserved = new Set(['index', 'writing', 'about', 'now', 'bookshelf', '404', 'index.xml', 'sitemap.xml']);
const notes = noteSources();
const slugs = new Set<string>();
for (const note of notes) {
  if ((note.slug !== 'index' && !isPersonalPage(note.slug) && reserved.has(note.slug)) || slugs.has(note.slug)) throw new Error(`Duplicate or reserved note path: ${note.slug}`);
  slugs.add(note.slug);
}
for (const note of notes) {
  for (const alias of note.aliases) {
    const slug = safeSlug(alias);
    if (slug === note.slug) continue;
    if (slugs.has(slug) || reserved.has(slug) || redirects[`/${slug}`]) throw new Error(`Conflicting alias: ${alias}`);
    redirects[`/${slug}`] = noteHref(note.slug);
  }
}

export default defineConfig({
  site: 'https://www.matthewgarner.me',
  output: 'static',
  publicDir: './.assets',
  redirects,
  integrations: [contentAssets],
  markdown: {
    processor: markdownProcessor(),
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark-default' }, defaultColor: false },
  },
  devToolbar: { enabled: false },
  server: { host: '127.0.0.1', port: 4321 },
});
