# Astro site

[Live site](https://www.matthewgarner.me) · [Deployment and rollback guide](HOSTING.md)

Run from this directory with Node 24:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4321. Production checks: `npm run build`, then `npm test` and `npm run check`. Run the build and check sequentially: both initialise Vite's shared dependency cache. In a sandbox that restricts the user preferences directory, prefix Astro commands with `ASTRO_TELEMETRY_DISABLED=1`.

After changing Markdown renderer configuration, fully restart the development server with `npm run dev -- --force`. Astro's configuration hot restart can retain already-rendered content with the previous syntax theme.

The site reads `../content/` directly. Keep writing ordinary Markdown in Obsidian; no second copy or MDX conversion is needed. `index.md` supplies About. Every other listed, published note enters Writing automatically. Homepage selections, order and preview copy live in each note's properties. See [the authoring guide](AUTHORING.md) and [Obsidian template](../content/templates/Writing.md).

Use `title` and optionally `date`, `description`, `type`, `featured`, `featureOrder`, `excerpt`, `slug`, and `aliases` in frontmatter. `draft: true` or `publish: false` excludes a note; `unlisted: true` gives it a page without listing it. `private/`, `templates/` and hidden folders are excluded. Titles with punctuation are supported, including the existing `Pet peeves #1.md` filename. The custom loader uses file URLs that preserve literal punctuation.

Supported Obsidian syntax: note wikilinks and labels, heading links, image embeds and dimensions, basic callouts, highlights and hidden comments. Comments are removed before rendering and metadata generation; unfinished comments stop the build. Ambiguous or unpublished note links stop the build. Note transclusions, block references and advanced Quartz plugins are not supported. Standard Markdown, captioned images, scrollable tables, footnotes and code styled for both themes work normally. Notes use a compact reading layout; other writing types share the essay layout.

Existing article URLs, `/posts/...` aliases, `/index.xml` and a sitemap are generated. `npm run build:vercel` packages the public output with permanent HTTP redirects and a genuine 404 response. Appearance follows the system until the reader toggles it, then remembers their choice across pages. A short crossfade respects reduced-motion preferences. All fonts are served locally.

Pushing to `v5` deploys Astro through the root `vercel.json`; other branches produce protected previews. `npm run build:release` runs the checks and packages the site for this Git workflow. Quartz source remains at the repository root for rollback.
