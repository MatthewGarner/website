import path from 'node:path';
import { slug as headingSlug } from 'github-slugger';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { visit } from 'unist-util-visit';
import type { Root, PhrasingContent } from 'mdast';
import { CONTENT_DIR, assetExtensions, noteSources, noteHref, resolveAsset, resolveNote } from './publishing';

/** Resolve published notes by default; local development can explicitly include draft links. */
export function obsidianMarkdown({ root = CONTENT_DIR, includeDrafts = false } = {}) {
  return (tree: Root, file: { path?: string; value?: string | Uint8Array }) => {
    const notes = noteSources(root, { includeDrafts });
    const from = file.path ? path.relative(root, file.path).split(path.sep).join('/') : 'index.md';
    const source = typeof file.value === 'string' ? file.value : file.value ? new TextDecoder().decode(file.value) : undefined;
    const link = (name: string, heading = '') => {
      const fragment = heading ? `#${headingSlug(heading)}` : '';
      return (name ? noteHref(resolveNote(name, from, notes).slug) : '') + fragment;
    };
    const markdownUrl = (url: string, image = false) => {
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(url)) return url;
      // Split URL syntax before decoding, so a literal %23 in a filename remains
      // part of the note name while an actual # still introduces a heading.
      const [, pathname, query = '', heading] = url.match(/^([^?#]*)(\?[^#]*)?(?:#(.*))?$/)!;
      const name = decodeURIComponent(pathname);
      if (/\.md$/i.test(name)) {
        if (image) throw new Error(`Note transclusion is not supported yet: ${name}`);
        return noteHref(resolveNote(name, from, notes).slug) + query + (heading ? `#${headingSlug(decodeURIComponent(heading))}` : '');
      }
      if (image || assetExtensions.has(path.extname(name).toLowerCase())) {
        return resolveAsset(name, from, root) + query + (heading === undefined ? '' : `#${heading}`);
      }
      return url;
    };

    visit(tree, 'image', (node) => {
      node.url = markdownUrl(node.url, true);
    });
    visit(tree, 'link', (node) => {
      node.url = markdownUrl(node.url);
    });
    const references = new Set<string>();
    const imageReferences = new Set<string>();
    visit(tree, ['linkReference', 'imageReference'], (node) => {
      if (node.type !== 'linkReference' && node.type !== 'imageReference') return;
      references.add(node.identifier);
      if (node.type === 'imageReference') imageReferences.add(node.identifier);
    });
    visit(tree, 'definition', (node) => {
      if (references.has(node.identifier)) node.url = markdownUrl(node.url, imageReferences.has(node.identifier));
    });

    visit(tree, 'text', (node, index, parent) => {
      if (index === undefined || !parent || parent.type === 'link' || parent.type === 'linkReference') return;
      const parts: PhrasingContent[] = [];
      const raw = source?.slice(node.position?.start.offset, node.position?.end.offset);
      const originals = raw === undefined ? undefined : new Map<number, RegExpExecArray>();
      if (raw !== undefined) {
        for (const original of raw.matchAll(/(!?)\[\[([^\]]+)\]\]/g)) {
          // Escapes and entities can produce literal [[...]] in the parsed text.
          // Count those too, so they cannot consume a subsequent real link.
          let prefix = '';
          visit(fromMarkdown(raw.slice(0, original.index)), 'text', (part) => { prefix += part.value; });
          const preceding = [...prefix.matchAll(/(!?)\[\[([^\]]+)\]\]/g)].length;
          originals!.set(preceding, original);
        }
      }
      let occurrence = 0;
      let cursor = 0;
      for (const match of node.value.matchAll(/(!?)\[\[([^\]]+)\]\]/g)) {
        const original = originals?.get(occurrence++);
        // Markdown unescapes punctuation and smart typography can change quotes
        // in text nodes. Resolve the original filename, respecting escaped syntax.
        if (originals && (!original || (raw!.slice(0, original.index).match(/\\+$/)?.[0].length ?? 0) % 2)) continue;
        const offset = match.index!;
        if (offset > cursor) parts.push({ type: 'text', value: node.value.slice(cursor, offset) });
        const [displayTarget, label] = match[2].split('|');
        // Obsidian escapes the alias/size separator inside tables. Preserve raw
        // filename punctuation, but do not treat that separator escape as a filename.
        const target = original?.[2].replace(/\\\|/g, '|').split('|')[0] ?? displayTarget;
        if (match[1]) {
          if (/\.md(?:#|$)/i.test(target) || !path.extname(target)) throw new Error(`Note transclusion is not supported yet: ${target}`);
          const size = label?.match(/^(\d+)(?:x(\d+))?$/);
          parts.push({ type: 'image', url: resolveAsset(target, from, root),
            alt: label && !size ? label : path.basename(target, path.extname(target)).replace(/[-_]/g, ' '),
            data: size ? { hProperties: { width: Number(size[1]), ...(size[2] ? { height: Number(size[2]) } : {}) } } : undefined });
        } else {
          const hash = target.indexOf('#');
          const name = hash === -1 ? target : target.slice(0, hash);
          const heading = hash === -1 ? '' : target.slice(hash + 1);
          parts.push({ type: 'link', url: link(name, heading), children: [{ type: 'text', value: label ?? (displayTarget.split('#')[0] || displayTarget.slice(1)) }] });
        }
        cursor = offset + match[0].length;
      }
      if (!parts.length) return;
      if (cursor < node.value.length) parts.push({ type: 'text', value: node.value.slice(cursor) });
      parent.children.splice(index, 1, ...parts);
      return index + parts.length;
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
