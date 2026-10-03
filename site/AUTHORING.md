# Writing and editing

[All guides](../README.md) · [Publish your changes](PUBLISHING.md) · [Run a local preview](README.md)

The site reads the Markdown in `content/` directly. Edit it in Obsidian or any text editor; there is no export step or second copy to maintain.

Readers can open Markdown footnotes beside the sentence and select prose to copy a quotation with a link to that passage. Neither feature needs extra properties. Print output keeps the writing and endnotes and hides the floating controls.

## Start a new piece

1. Create a note such as `content/Small observations.md`.
2. Insert the [Writing template](../content/templates/Writing.md) using Obsidian’s Templates command, or use the example below.
3. Set the title, date and description, then write below the properties.
4. Leave `draft: true` and [run the local site](README.md#run-while-editing). Find the piece under **Local drafts** on `/writing`; its normal page has a **Draft preview** banner.
5. Follow the [publishing steps](PUBLISHING.md) when ready to put it live.

```markdown
---
title: Small observations
date: 2026-09-26
description: A few things I have noticed lately.
type: note
draft: true
---

Start with the thought you want to share.
```

The block between `---` lines contains the note’s properties, also called frontmatter. Only `title` is required. Use your intended publication date in `YYYY-MM-DD` format. When copying the template file manually, replace `{{date:YYYY-MM-DD}}` yourself; Obsidian fills it in only when inserting the template.

Use unquoted `true` and `false` for switches and numbers for `featureOrder`. Quote a title or description containing a colon followed by a space: `title: "A thought: on attention"`.

## Edit an existing piece

Open its file in `content/`, change the text or properties and save. Keep its filename and folder unchanged to preserve its address. You can change the displayed `title` freely. Publish the edit through the same Git workflow as a new piece.

Edit `content/index.md` to change **About**, including its heading and biography. Keep that note published and named `index.md`. The homepage introduction and Projects text live separately in the [site code](README.md#change-the-design-or-site-copy).

## Now and Bookshelf

Edit `content/Now.md` and `content/Bookshelf.md` in Obsidian. Both start as drafts: preview them through **Local drafts** on `/writing`, then set `draft: false` when ready. Published pages appear in the navigation, but never in Writing or the RSS feed. `unlisted: true` also hides their navigation links and homepage mentions while keeping the pages available by their direct addresses. Keep their `slug` values unchanged.

For **Now**, write a few short sections in the body. Set `updated: 2026-09-27` to the date of your actual update. An optional `excerpt` supplies the short **Lately** section on the homepage; otherwise it uses your opening paragraph. The date changes only when you edit it.

For **Bookshelf**, add entries to the `books` property. Use `reading` for current books and `favourite` for keepers. Order within each section follows the file. The body below the properties is an optional introduction.

```yaml
books:
  - title: Book title
    author: Author name
    status: favourite
    note: A sentence about why it stayed with me.
    cover: images/books/book-cover.jpg
    url: https://example.com/book
```

Only `title` and `author` are required for each book; omitted status means `favourite`. The `note` is plain text. Store optional cover images in `content/images/books/` and use their vault path as shown. Without a cover, the site creates a simple typographic jacket from the title and author. The optional `url` makes the title a link. Remove example paths and links rather than leaving them as placeholders.

## Sharing images

Published writing gets a matching social image automatically during the normal build. Its title appears with the site's typography and colours, so sharing a link needs no separate image upload. Editing a title regenerates its image on the next build; social services may take time to refresh a previously cached preview. Drafts use the site's default image and never generate public cards.

The `/social/` URL space is reserved for these generated images; do not use it for note slugs or aliases.

## Properties

| Property | What it changes |
| --- | --- |
| `title` | The displayed title. Required. |
| `date` | The displayed date and ordering in Writing, newest first. A future date does **not** delay publication. Undated pieces sort after dated ones. |
| `description` | The introduction below the article title, plus archive, preview and feed copy. If omitted, the article has no introduction and listing text is drawn from its body. |
| `type` | `essay` is the default. `note` has a more compact reading layout. `review` and other short labels use the essay layout. |
| `draft: true` | Excludes the piece from builds and deployments. It remains available as a labelled local draft. Set to `false` when it should be published. |
| `publish: false` | Also excludes the piece from builds, while allowing a labelled local draft. Remove it or set it to `true` to publish; `draft: true` still takes precedence. |
| `unlisted: true` | Creates a public page but leaves it out of the homepage, Writing, RSS and sitemap. |
| `featured: true` | Prioritises the piece for the homepage. |
| `featureOrder` | Orders featured pieces: `1` first, then `2`, then `3`. Ties use the date. |
| `excerpt` | Optional longer text for the homepage preview; otherwise taken from the opening text. |
| `slug` | Fixes the URL independently of the filename. Example: `slug: small-observations`. |
| `aliases` | A list of old URL paths that should redirect to this piece. |

New pieces are published by default if neither exclusion flag is set. The supplied template starts with `draft: true`.

## Choose the homepage writing

The homepage shows up to three pieces. Add these properties to each chosen piece, using a different order number:

```yaml
featured: true
featureOrder: 1
```

If fewer than three pieces are featured, recent writing fills the remaining spaces. `featured: false` therefore does not guarantee that a piece stays off the homepage. Drafts and unlisted pieces are never selected.

## Links, images and formatting

Use ordinary Markdown for headings, lists, quotations, tables, code and footnotes. These Obsidian features also work:

```markdown
[[Drifting]]
[[The gardening metaphor|A related essay]]
==A phrase worth highlighting==

> [!note] A thought
> A short aside.

A sentence with a footnote.[^aside]

[^aside]: A little more detail.
```

Note links can include headings. Local drafts can link to each other. In published builds, missing, unpublished or ambiguous note links stop the build; give a link the exact note path when two notes share a name. Whole-note embeds such as `![[Drifting]]`, block references and collapsible Obsidian callouts are not supported; basic callouts render as visible asides.

Put public images in `content/images/` and refer to them from a note:

```markdown
![A path through the trees](images/woodland.jpg "An early morning walk.")
![[images/woodland.jpg|400]]
```

The first form supplies descriptive alternative text and a visible caption. The second requests an image width. Markdown images and tables adapt to the reading layout; wide tables scroll horizontally.

Text inside `%% editing comments %%` is removed from the generated pages, previews and feed. Close both markers: an unfinished comment stops the build. Markers inside code examples remain literal.

## Tool demonstrations

Use a named example between paragraphs:

````markdown
```tool
example: flow-queues-v1
caption: Increase demand towards capacity. What happens to waiting?
```
````

The default is an interactive figure; add `mode: figure` for a saved illustration
and full-tool link. Choose any released tool/view in the local catalogue; new tools
need a catalogue sync, not website code changes.

Follow [Writing with tool demonstrations](TOOL-ARTICLES.md) for the complete
workflow: choosing a released tool/view, creating an example, matching image
generation, allowed controls, local and hosted previews, validation and publishing.

## Keep published addresses stable

`Small observations.md` normally becomes `/small-observations`. Changing its title property leaves that address alone; renaming or moving the file can change it. Before moving a published file, set `slug` to its existing URL path without the leading slash.

If an address must change, preserve the old one as a redirect:

```yaml
slug: new-address
aliases:
  - old-address
```

Use paths, not full web addresses. Restart the local server after changing filenames, slugs or aliases. Changing a published URL also changes its RSS identity, so retaining the existing slug is preferable. The five original articles have additional migration checks protecting their feed identities.

## What stays off the site

`private/`, `templates/` and folders beginning with a dot are excluded. Draft flags apply to notes; attachments outside excluded folders are still copied, even if used only by a draft.

This GitHub repository is public. Drafts, unlisted pages and editing comments are not a way to keep committed writing confidential. Keep private material outside the repository.
