import type { Root, Element } from 'hast';
import { visit } from 'unist-util-visit';

/** Give Markdown images with titles visible captions and keep wide tables locally scrollable. */
export function readingProse() {
  return (tree: Root) => {
    visit(tree, 'element', (node, index, parent) => {
      if (index === undefined || !parent) return;
      if (node.tagName === 'p' && node.children.length === 1) {
        const child = node.children[0];
        if (child.type === 'element' && child.tagName === 'img' && child.properties.title) {
          const caption: Element = { type: 'element', tagName: 'figcaption', properties: {}, children: [{ type: 'text', value: String(child.properties.title) }] };
          delete child.properties.title;
          node.tagName = 'figure';
          node.children.push(caption);
        }
      }
      if (node.tagName === 'table') {
        parent.children[index] = { type: 'element', tagName: 'div', properties: { className: ['table-scroll'], tabIndex: 0, role: 'region', ariaLabel: 'Table' }, children: [node] };
        return 'skip';
      }
    });
  };
}
