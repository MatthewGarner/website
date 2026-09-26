interface EditorialNote {
  id: string;
  data: { title: string; date?: Date; featured?: boolean; featureOrder?: number; draft?: boolean; publish?: boolean; unlisted?: boolean };
}
export function newestFirst(a: EditorialNote, b: EditorialNote) {
  return (b.data.date?.getTime() ?? 0) - (a.data.date?.getTime() ?? 0) || a.data.title.localeCompare(b.data.title);
}
export function selectFeatured<T extends EditorialNote>(notes: T[], limit = 3): T[] {
  const listed = notes.filter(({ id, data }) => id !== 'index' && !data.draft && data.publish !== false && !data.unlisted).sort(newestFirst);
  const featured = listed.filter((note) => note.data.featured)
    .sort((a, b) => (a.data.featureOrder ?? Infinity) - (b.data.featureOrder ?? Infinity) || newestFirst(a, b));
  return [...featured, ...listed.filter((note) => !note.data.featured)].slice(0, limit);
}
