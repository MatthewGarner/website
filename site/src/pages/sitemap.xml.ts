import { publishedNotes, noteHref } from '../lib/content';
export async function GET() {
  const routes = ['/', '/writing', '/about', ...(await publishedNotes()).filter((note) => !note.data.unlisted).map((note) => noteHref(note.id))];
  const xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + routes.map((route) => `<url><loc>https://www.matthewgarner.me${route.replace(/&/g, '&amp;')}</loc></url>`).join('') + '</urlset>';
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
