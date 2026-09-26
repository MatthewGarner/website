import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { stripComments } from './markdown';

export const CONTENT_DIR = path.resolve(import.meta.dirname, '../../../content');
const excluded = new Set(['private', 'templates']);
export const assetExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.svg', '.ico', '.pdf', '.mp3', '.mp4', '.webm']);

export function contentFiles(root = CONTENT_DIR): string[] {
  const walk = (directory: string): string[] => fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith('.') && !excluded.has(entry.name))
    .flatMap((entry) => entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
  return walk(root).sort();
}

export function slugify(value: string): string {
  return value.replace(/\.md$/i, '').normalize('NFC').toLowerCase()
    .replace(/[?#%&]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
    .replace(/^\/+|\/+$/g, '');
}

export function safeSlug(value: string): string {
  const slug = slugify(value);
  if (!slug || slug.split('/').some((part) => !part || part === '.' || part === '..') || /[\\:<>]/.test(slug)) {
    throw new Error(`Invalid public path: ${value}`);
  }
  return slug;
}

export function noteSlug(entry: string, data: Record<string, unknown> = {}): string {
  return safeSlug(typeof data.slug === 'string' ? data.slug : entry);
}

export function isPublished(data: Record<string, unknown>): boolean {
  return data.draft !== true && data.publish !== false;
}

export interface NoteSource {
  file: string;
  relative: string;
  slug: string;
  title: string;
  aliases: string[];
}

export function noteSources(root = CONTENT_DIR): NoteSource[] {
  return contentFiles(root).filter((file) => file.endsWith('.md')).flatMap((file) => {
    const { data } = matter.read(file);
    if (!isPublished(data)) return [];
    const relative = path.relative(root, file).split(path.sep).join('/');
    return [{ file, relative, slug: noteSlug(relative, data), title: String(data.title ?? path.basename(file, '.md')),
      aliases: (Array.isArray(data.aliases) ? data.aliases : []).map(String) }];
  });
}

export const noteHref = (slug: string): string => slug === 'index' ? '/about' : `/${slug.split('/').map(encodeURIComponent).join('/')}`;

export function resolveNote(target: string, from: string, notes: NoteSource[]): NoteSource {
  const wanted = target.replace(/\.md$/i, '').toLowerCase();
  const relative = path.posix.normalize(path.posix.join(path.posix.dirname(from), target)).replace(/\.md$/i, '').toLowerCase();
  const direct = notes.filter((note) => note.relative.replace(/\.md$/i, '').toLowerCase() === relative);
  if (direct.length === 1) return direct[0];
  const matches = notes.filter((note) => [note.slug, note.title, path.posix.basename(note.relative, '.md'), ...note.aliases]
    .some((candidate) => candidate.toLowerCase() === wanted));
  if (matches.length !== 1) throw new Error(`${matches.length ? 'Ambiguous' : 'Missing or unpublished'} note link [[${target}]] in ${from}`);
  return matches[0];
}

export function resolveAsset(target: string, from: string, root = CONTENT_DIR): string {
  const normalized = target.replace(/^\//, '');
  const candidates = [path.posix.normalize(path.posix.join(path.posix.dirname(from), normalized)), normalized];
  const assets = contentFiles(root).filter((file) => assetExtensions.has(path.extname(file).toLowerCase()));
  const relative = assets.map((file) => path.relative(root, file).split(path.sep).join('/'));
  let match = candidates.find((candidate) => relative.includes(candidate));
  if (!match) {
    const matches = relative.filter((candidate) => path.posix.basename(candidate) === normalized);
    if (matches.length === 1) match = matches[0];
  }
  if (!match) throw new Error(`Missing or ambiguous attachment ${target} in ${from}`);
  return `/${match.split('/').map(encodeURIComponent).join('/')}`;
}

export function plainText(markdown: string): string {
  return stripComments(markdown).replace(/!\[.*?\]\(.*?\)|!\[\[.*?\]\]/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, '$1')
    .replace(/<[^>]+>/g, '').replace(/==|[*_`>#]/g, '').replace(/\s+/g, ' ').trim();
}
