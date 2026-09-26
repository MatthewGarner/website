import rss from '@astrojs/rss';
import { writing, description, noteHref } from '../lib/content';
export async function GET() {
  return rss({ title: 'Matthew Garner', description: 'Occasional writing on technology, work and the things in between.', site: 'https://www.matthewgarner.me',
    trailingSlash: false,
    // RSS derives GUIDs from links. Keep Quartz's apex origin and slashless URLs
    // so existing subscribers do not receive the same articles as new entries.
    items: (await writing()).map((note) => ({ title: note.data.title, pubDate: note.data.date, description: description(note), link: `https://matthewgarner.me${noteHref(note.id)}` })) });
}
