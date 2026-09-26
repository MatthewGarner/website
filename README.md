# Matthew Garner’s website

[Visit the site](https://www.matthewgarner.me) · [Writing in Obsidian](site/AUTHORING.md) · [Hosting and rollback](site/HOSTING.md)

The website uses Astro in `site/` and reads Markdown directly from `content/`. Pushing to `v5` publishes through Vercel; other branches produce protected previews. Builds check the site and its publishing behaviour before deployment.

For local development, use Node 24 and run:

```sh
npm ci --prefix site
npm --prefix site run dev
```

Run the complete production build with `npm --prefix site run build:release`. See [the site guide](site/README.md) for supported Markdown and design details.

The former Quartz implementation remains at the repository root for rollback. Its source and original licence are retained; it no longer supplies the production build.
