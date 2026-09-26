import fs from 'node:fs';
import path from 'node:path';
import { noteSources, noteHref, safeSlug } from '../src/lib/publishing';

const site = path.resolve(import.meta.dirname, '..');
const dist = path.join(site, 'dist');
// Git builds run at the repository root so the sibling content folder is present.
// Local prebuilt previews can still be packaged from the linked site directory.
const output = path.join(process.argv.includes('--root') ? path.dirname(site) : site, '.vercel/output');
const literal = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
type Route = { src: string; dest?: string; status?: number; headers?: Record<string, string>; continue?: boolean } | { handle: 'filesystem' };

// Package only rendered public files. Source notes, drafts, tests and local
// project settings must never enter the deployment's static directory.
for (const file of ['index.html', '404.html', 'index.xml', 'sitemap.xml']) {
  if (!fs.existsSync(path.join(dist, file))) throw new Error(`Missing ${file}; build the site before packaging.`);
}
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
fs.cpSync(dist, path.join(output, 'static'), { recursive: true });

const routes: Route[] = [
  { src: '^/_astro/.*$', headers: { 'Cache-Control': 'public, max-age=31536000, immutable' }, continue: true },
];
const aliases = new Set<string>();
for (const note of noteSources()) {
  for (const alias of note.aliases) {
    const slug = safeSlug(alias);
    if (slug === note.slug) continue;
    aliases.add(slug);
    routes.push({ src: `^/${literal(slug)}(?:/|\\.html|/index\\.html)?$`, status: 308, headers: { Location: noteHref(note.slug) } });
  }
}

const walk = (directory: string): string[] => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const file = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(file) : [path.relative(dist, file).split(path.sep).join('/')];
});
for (const file of walk(dist)) {
  if (file !== 'index.html' && !file.endsWith('/index.html')) continue;
  const slug = file === 'index.html' ? '' : file.slice(0, -'/index.html'.length);
  if (aliases.has(slug)) continue;
  const canonical = slug ? `/${slug.split('/').map(encodeURIComponent).join('/')}` : '/';
  const alternatives = slug ? `/${literal(slug)}(?:/|\\.html|/index\\.html)` : '/index(?:\\.html)?';
  routes.push({ src: `^${alternatives}$`, status: 308, headers: { Location: canonical } });
  routes.push({ src: `^${literal(canonical)}$`, dest: `/${file}` });
}
routes.push({ handle: 'filesystem' }, { src: '^/.*$', dest: '/404.html', status: 404 });

fs.writeFileSync(path.join(output, 'config.json'), JSON.stringify({
  version: 3,
  routes,
  overrides: {
    'index.xml': { contentType: 'application/rss+xml; charset=utf-8' },
    'sitemap.xml': { contentType: 'application/xml; charset=utf-8' },
  },
}, null, 2) + '\n');
console.log(`Packaged ${walk(dist).length} public files for Vercel, including ${aliases.size} permanent article redirects.`);
