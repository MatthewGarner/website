import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { stripComments, stripToolBlocks } from './markdown';

export const CONTENT_DIR = path.resolve(import.meta.dirname, '../../../content');
const excluded = new Set(['private', 'templates']);
export const assetExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.svg', '.ico', '.pdf', '.mp3', '.mp4', '.webm']);

export function contentFiles(root = CONTENT_DIR): string[] {
  const walk = (directory: string): string[] => fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith('.') && !excluded.has(entry.name))
    // Do not follow symlinks back into an excluded folder or outside the vault.
    .flatMap((entry) => entry.isDirectory() ? walk(path.join(directory, entry.name)) : entry.isFile() ? [path.join(directory, entry.name)] : []);
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

export function noteSources(root = CONTENT_DIR, { includeDrafts = false } = {}): NoteSource[] {
  const notes = contentFiles(root).filter((file) => file.endsWith('.md')).flatMap((file) => {
    const { data } = matter.read(file);
    if (!includeDrafts && !isPublished(data)) return [];
    const relative = path.relative(root, file).split(path.sep).join('/');
    const slug = noteSlug(relative, data);
    const aliases = (Array.isArray(data.aliases) ? data.aliases : []).map(String);
    // Source pages and redirects must never shadow the generated PNG endpoints.
    for (const publicPath of [slug, ...aliases.map(safeSlug)]) {
      if (publicPath === 'social' || publicPath.startsWith('social/')) throw new Error(`Reserved generated image path: ${publicPath}`);
    }
    return [{ file, relative, slug, title: String(data.title ?? path.basename(file, '.md')), aliases }];
  });
  validatePublicRoutes(notes);
  return notes;
}

export const noteHref = (slug: string): string => slug === 'index' ? '/about' : `/${slug.split('/').map(encodeURIComponent).join('/')}`;

function validatePublicRoutes(notes: NoteSource[]) {
  const routes = new Map<string, string>();
  const claim = (route: string, destination: string) => {
    const previous = routes.get(route);
    if (previous && previous !== destination) {
      throw new Error(`Conflicting public route /${route}: ${previous} and ${destination}`);
    }
    routes.set(route, destination);
  };
  // Packaging also serves old .html and /index.html addresses. Validate those
  // expanded routes before building, or /foo.html can redirect to another article.
  const page = (slug: string, destination: string) => {
    for (const route of [slug, `${slug}/`, `${slug}.html`, `${slug}/index.html`]) claim(route, destination);
  };
  for (const route of ['', 'index', 'index.html']) claim(route, '/');
  for (const slug of ['writing', 'about', 'now', 'bookshelf', '404']) page(slug, `/${slug}`);
  for (const route of ['index.xml', 'sitemap.xml']) claim(route, `/${route}`);
  for (const note of notes) {
    const destination = noteHref(note.slug);
    page(note.slug === 'index' ? 'about' : note.slug, destination);
    for (const alias of note.aliases) page(safeSlug(alias), destination);
  }
}

export function resolveNote(target: string, from: string, notes: NoteSource[]): NoteSource {
  const key = (value: string) => value.replace(/\.md$/i, '').normalize('NFC').toLowerCase();
  const wanted = key(target);
  const rooted = target.replace(/^\//, '');
  // An explicit vault path can disambiguate names; a bare name must still fail
  // when another note shares its title or alias.
  const candidates = target.startsWith('/') ? [rooted] : [path.posix.join(path.posix.dirname(from), target),
    ...(target.includes('/') || /\.md$/i.test(target) ? [rooted] : [])];
  for (const candidate of candidates) {
    const direct = notes.filter((note) => key(note.relative) === key(path.posix.normalize(candidate)));
    if (direct.length === 1) return direct[0];
    if (direct.length > 1) throw new Error(`Ambiguous note link [[${target}]] in ${from}`);
  }
  const matches = notes.filter((note) => [note.slug, note.title, path.posix.basename(note.relative, '.md'), ...note.aliases]
    .some((candidate) => key(candidate) === wanted));
  if (matches.length !== 1) throw new Error(`${matches.length ? 'Ambiguous' : 'Missing or unpublished'} note link [[${target}]] in ${from}`);
  return matches[0];
}

export function resolveAsset(target: string, from: string, root = CONTENT_DIR): string {
  const normalized = target.replace(/^\//, '');
  const candidates = target.startsWith('/') ? [normalized] : [path.posix.normalize(path.posix.join(path.posix.dirname(from), normalized)), normalized];
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
  return stripToolBlocks(stripComments(markdown)).replace(/!\[.*?\]\(.*?\)|!\[\[.*?\]\]/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, '$1')
    .replace(/<[^>]+>/g, '').replace(/==|[*_`>#]/g, '').replace(/\s+/g, ' ').trim();
}
