import { fromMarkdown } from 'mdast-util-from-markdown';
import { visit } from 'unist-util-visit';

type Range = { start: number; end: number };
function codeRanges(source: string): Range[] {
  const ranges: Range[] = [];
  visit(fromMarkdown(source), (node) => {
    if (node.type !== 'code' && node.type !== 'inlineCode') return;
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start !== undefined && end !== undefined) ranges.push({ start, end });
  });
  return ranges;
}
function escaped(source: string, index: number) {
  let slashes = 0;
  while (index > 0 && source[--index] === '\\') slashes++;
  return slashes % 2 === 1;
}
function marker(source: string, delimiter: string, from: number, protectedRanges: Range[] = []): number {
  let index = source.indexOf(delimiter, from);
  while (index !== -1) {
    const code = protectedRanges.find((range) => index >= range.start && index < range.end);
    if (!escaped(source, index) && !code) return index;
    index = source.indexOf(delimiter, code?.end ?? index + delimiter.length);
  }
  return -1;
}

/** Remove comments before parsing links or deriving public descriptions, never just with CSS. */
export function stripComments(source: string): string {
  const ranges = codeRanges(source);
  let result = '';
  let cursor = 0;
  for (let start = marker(source, '%%', cursor, ranges); start !== -1; start = marker(source, '%%', cursor, ranges)) {
    const end = marker(source, '%%', start + 2);
    if (end === -1) throw new Error('Unclosed Obsidian comment: add a closing %% before publishing.');
    result += source.slice(cursor, start);
    // Preserve paragraph boundaries, including comments spanning several Markdown blocks.
    result += source.slice(start, end + 2).replace(/[^\n]/g, '');
    cursor = end + 2;
  }
  return result + source.slice(cursor);
}

export function prepareMarkdown(source: string): string {
  const visible = stripComments(source);
  const ranges = codeRanges(visible);
  let result = '';
  let cursor = 0;
  let searchFrom = 0;
  for (let start = marker(visible, '==', searchFrom, ranges); start !== -1; start = marker(visible, '==', searchFrom, ranges)) {
    const end = marker(visible, '==', start + 2, ranges);
    const value = end === -1 ? '' : visible.slice(start + 2, end);
    if (!value || /^\s|\s$/.test(value) || /\n\s*\n/.test(value) || visible[start - 1] === '=' || visible[start + 2] === '=') {
      searchFrom = start + 2;
      continue;
    }
    result += visible.slice(cursor, start) + '<mark>' + value + '</mark>';
    cursor = end + 2;
    searchFrom = cursor;
  }
  return result + visible.slice(cursor);
}
