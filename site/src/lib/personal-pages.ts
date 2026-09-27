export const personalPages = [
  { id: 'now', title: 'Now' },
  { id: 'bookshelf', title: 'Bookshelf' },
] as const;

export const isPersonalPage = (id: string) => personalPages.some((page) => page.id === id);
