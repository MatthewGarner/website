export const socialImageHref = (slug: string) => `/social/${slug.split('/').map(encodeURIComponent).join('/')}.png`;
