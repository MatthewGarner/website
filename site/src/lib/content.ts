import { getCollection, type CollectionEntry } from 'astro:content';
import { isPublished, plainText, noteHref } from './publishing';
import { newestFirst, selectFeatured } from './editorial';
import { isPersonalPage } from './personal-pages';

export type Note = CollectionEntry<'notes'>;
export const isLocalDraft = (note: Note) => import.meta.env.DEV && note.data.localDraft;
export const publishedNotes = () => getCollection('notes', (note) => note.id !== 'index' && isPublished(note.data));
export const localDrafts = async () => (await getCollection('notes', (note) => note.id !== 'index' && isLocalDraft(note))).sort(newestFirst);
export const readableNotes = async () => [...await publishedNotes(), ...await localDrafts()];
export async function writing() {
  return (await publishedNotes()).filter((note) => !isPersonalPage(note.id) && !note.data.unlisted)
    .sort(newestFirst);
}
export async function selectedWriting() {
  return selectFeatured(await writing());
}
export const listedPersonalPages = async () => (await publishedNotes()).filter((note) => isPersonalPage(note.id) && !note.data.unlisted);
function shorten(text: string, limit: number) {
  if (text.length <= limit) return text;
  return text.slice(0, limit).replace(/\s+\S*$/, '').replace(/[.,;:]$/, '') + '…';
}
export const description = (note: Note) => plainText(note.data.description || shorten(plainText(note.body ?? ''), 155));
export const excerpt = (note: Note) => plainText(note.data.excerpt || shorten(plainText((note.body ?? '').split(/\n\s*\n/).find((part) => plainText(part).length > 30) ?? note.body ?? ''), 250));
export const writingType = (note: Note) => note.data.type.toLowerCase();
export const readLabel = (note: Note) => ['essay', 'note', 'review'].includes(writingType(note)) ? `Read the ${writingType(note)}` : 'Read this piece';
export const readingMinutes = (note: Note) => Math.max(1, Math.round(plainText(note.body ?? '').split(/\s+/).length / 220));
export const shortDate = (date?: Date) => date ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date) : '';
export const longDate = (date?: Date) => date ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date) : '';
export { noteHref };
