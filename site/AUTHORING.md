# Writing and previewing

Keep writing in the existing `content/` folder in Obsidian. The Astro site reads those Markdown files directly. Save a note while the local development preview is running to see the change in your browser.

For a new piece, insert the [Writing template](../content/templates/Writing.md) using Obsidian's Templates command, or copy it into a new note. Obsidian fills in the date when inserting the template. Change the title and description, write your piece, then change `draft` to `false` when it is ready to appear in the site build.

```yaml
---
title: A small observation
date: 2026-09-26
description: A sentence that gives someone a reason to read.
type: note
draft: false
featured: true
featureOrder: 1
---
```

Only `title` is required. New notes default to published essays unless marked as drafts; the template starts with `draft: true`.

| Property | Effect |
| --- | --- |
| `type` | `essay` is the default; `note` uses a more compact title and reading column. `review` and other short labels work too. |
| `date` | Displayed on the piece; also orders the Writing archive, newest first. |
| `description` | Short introduction below the title, homepage preview copy and search/feed description. Omit it for a quieter article header and an automatically generated description. |
| `featured` | Set to `true` to select a piece for the homepage. |
| `featureOrder` | A positive number: smaller numbers appear first. Ties use the newest date. |
| `excerpt` | Optional longer homepage preview text; otherwise taken from the opening paragraphs. |
| `draft: true` or `publish: false` | Excludes the note from the generated site. |
| `unlisted: true` | Builds a public page but leaves it out of the homepage, archive, feed and sitemap. This is not a private page. |

The homepage shows up to three pieces, filling spare places with recent writing. `index.md` supplies About. The `private/`, `templates/` and hidden folders are excluded.

Filenames determine URLs unless you set `slug`. Keep an established filename or slug stable; add an old path to the `aliases` list if a URL needs to change. Restart the local preview after changing aliases, since redirects are configured at startup.

## Formatting

Use ordinary Markdown for headings, lists, quotations, tables, fenced code and footnotes. Obsidian note links (`[[Drifting]]`), labelled links, heading links, image embeds and basic callouts also work.

- `==A meaningful phrase==` highlights the text in both appearances. Highlights can include emphasis and links.
- `%% A private editing comment %%` is removed before the page, preview or feed is generated. Comments can span paragraphs; an unfinished comment stops the build. Markers inside code examples remain literal.
- `![Alternative text](images/photo.jpg "A visible caption.")` gives an image a caption. Use alternative text to describe the image and the caption to explain its context.
- `![[images/photo.jpg|400]]` embeds an Obsidian image with a chosen width.
- Footnotes use `A thought.[^aside]` and a later `[^aside]: More detail.` Readers can jump back to the sentence.

Place public attachments in `content/images/`. Attachments outside excluded folders are copied to the public site, even if only used by a draft. Missing or ambiguous note links stop the build. Note transclusions and block references are not supported.

## Local preview

From the `site/` directory, run `npm run dev`, then open the address it prints. Leave it running while you write. If a save causes an error, correct the note; the preview may retain the last valid version until the error is fixed.

Before publishing, run `npm run build`, then `npm test` and `npm run check`. These commands check the generated pages, Markdown behaviour and site code. Run the build and check sequentially.

Saving or changing `draft` updates the local preview. Commit and push the content changes to the `v5` branch using your existing Git publishing workflow; Vercel then builds and publishes the site. A failed build leaves the last successful version live. Other branches produce protected previews.

This GitHub repository is public: `draft` and `publish` control the generated website, not access to files committed to Git. Keep private writing and attachments outside the repository.
