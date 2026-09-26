/** Drafts require an actual local development server, never just NODE_ENV or a build flag. */
export function localDraftsEnabled(development: boolean, host: string | boolean, env: NodeJS.ProcessEnv = process.env): boolean {
  return development && [false, 'localhost', '127.0.0.1', '::1'].includes(host)
    && !env.CI && !env.VERCEL && !env.VERCEL_ENV;
}
