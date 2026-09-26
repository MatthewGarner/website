import path from 'node:path';
import { visit } from 'unist-util-visit';
import type { Root, PhrasingContent } from 'mdast';
import { CONTENT_DIR, noteSources, noteHref, resolveAsset, resolveNote } from './publishing';

/** Resolve published notes by default; local development can explicitly include draft links. */
export function obsidianMarkdown({ root = CONTENT_DIR, includeDrafts = false } = {}) {
  return (tree: Root, file: { path?: string }) => {
    const notes = noteSources(root, { includeDrafts });
    const from = file.path ? path.relative(root, file.path).split(path.sep).join('/') : 'index.md';
    const link = (target: string) => {
      const [name, heading] = target.split('#');
      const fragment = heading ? `#${heading.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s/g, '-')}` : '';
      return (name ? noteHref(resolveNote(name, from, notes).slug) : '') + fragment;
    };

    visit(tree, 'text', (node, index, parent) => {
      if (index === undefined || !parent || parent.type === 'link') return;
      const parts: PhrasingContent[] = [];
      let cursor = 0;
      for (const match of node.value.matchAll(/(!?)\[\[([^\]]+)\]\]/g)) {
        const offset = match.index!;
        if (offset > cursor) parts.push({ type: 'text', value: node.value.slice(cursor, offset) });
        const [target, label] = match[2].split('|');
        if (match[1]) {
          if (/\.md(?:#|$)/i.test(target) || !path.extname(target)) throw new Error(`Note transclusion is not supported yet: ${target}`);
          const size = label?.match(/^(\d+)(?:x(\d+))?$/);
          parts.push({ type: 'image', url: resolveAsset(target, from, root),
            alt: label && !size ? label : path.basename(target, path.extname(target)).replace(/[-_]/g, ' '),
            data: size ? { hProperties: { width: Number(size[1]), ...(size[2] ? { height: Number(size[2]) } : {}) } } : undefined });
        } else {
          parts.push({ type: 'link', url: link(target), children: [{ type: 'text', value: label ?? target.split('#')[0] ?? target }] });
        }
        cursor = offset + match[0].length;
      }
      if (!parts.length) return;
      if (cursor < node.value.length) parts.push({ type: 'text', value: node.value.slice(cursor) });
      parent.children.splice(index, 1, ...parts);
      return index + parts.length;
    });

    visit(tree, 'image', (node) => {
      if (!/^(https?:|data:|\/)/.test(node.url)) node.url = resolveAsset(decodeURI(node.url), from, root);
    });
    visit(tree, 'link', (node) => {
      if (!/^(https?:|mailto:|#|\/)/.test(node.url) && /\.md(?:#|$)/i.test(node.url)) node.url = link(decodeURI(node.url));
    });
    visit(tree, 'blockquote', (node) => {
      const paragraph = node.children[0];
      if (paragraph?.type !== 'paragraph' || paragraph.children[0]?.type !== 'text') return;
      const first = paragraph.children[0];
      const marker = first.value.match(/^\[!([a-z-]+)\][+-]?(?:[ \t]+([^\n]+))?(?:\n|$)/i);
      if (!marker) return;
      first.value = first.value.slice(marker[0].length);
      paragraph.children.unshift({ type: 'strong', children: [{ type: 'text', value: marker[2] ?? marker[1] }] }, { type: 'break' });
      node.data = { hProperties: { className: ['callout'], 'data-callout': marker[1].toLowerCase() } };
    });
  };
}
