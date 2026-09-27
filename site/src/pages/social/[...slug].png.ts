import type { APIRoute } from 'astro';
import { publishedNotes, type Note } from '../../lib/content';
import { renderSocialCard } from '../../lib/social-card';

export async function getStaticPaths() {
  return (await publishedNotes())
    .filter((note) => !['index', 'now', 'bookshelf'].includes(note.id))
    .map((note) => ({ params: { slug: note.id }, props: { note } }));
}

export const GET: APIRoute = async ({ props }) => {
  const note = props.note as Note;
  return new Response(new Uint8Array(await renderSocialCard(note.data)), { headers: { 'Content-Type': 'image/png' } });
};
