# Writing with tool demonstrations

[Writing guide](AUTHORING.md) · [Publishing](PUBLISHING.md) · [Tools adapter contract](https://github.com/MatthewGarner/tools/blob/main/embed/README.md)

Articles live in this repository's `content/` folder. Ideas in the separate **Matt**
Obsidian vault are planning notes; they do not publish automatically. Create the
article in `content/`, or deliberately copy its prose there, and keep `draft: true`
while writing. Use Node 24 and run website commands from the repository root.

## Start with an existing example

Create `content/Why spare capacity matters.md`:

````markdown
---
title: Why spare capacity matters
slug: why-spare-capacity-matters
date: 2026-10-03
description: What a little room in the system buys us.
type: essay
draft: true
---

Work can wait even when a team has enough capacity on average.

```tool
example: flow-queues-v1
caption: Increase demand towards capacity. What happens to waiting?
```

The model holds the team and average item size fixed. It illustrates a
mechanism; it does not forecast a particular team's delivery.
````

Choose the actual publication date. `example` is the JSON filename without `.json`.
Names use lowercase letters/numbers separated by hyphens. `caption` is optional;
the example's `summary` is the default. Quote a caption containing a colon.
Only `example`, `caption` and `mode` are valid block keys.

The illustration loads first. **Explore this example** opens the interactive view;
**Show illustration** closes it. Reset restores the authored inputs. Each occurrence
is independent, even when the same example appears twice in one article. The static
full-tool link carries the starting inputs; the link inside the running demo carries
the reader's current inputs. Reader changes are not saved.

Add `mode: figure` to show only the saved image, caption and full-tool link.
`mode: interactive` is the default. A manifest with `controls: []` loads the live
view without a demand slider; that is different from a static figure.

Obsidian displays the block as source. Preview the rendered article on the website.
Print uses the image and caption. Without JavaScript or if the frame fails to load,
the image and full-tool link remain usable. RSS contains descriptions and article
links, not article bodies or interactive content.

## Create a different starting example

Copy `content/tool-examples/flow-queues-v1.json` to a new name, such as
`content/tool-examples/spare-capacity-v1.json`. Set its image to a new path too.
All these fields are required:

```json
{
  "tool": "flow",
  "version": 1,
  "view": "waiting-time",
  "title": "Demand and waiting time",
  "summary": "Increase demand while the team stays the same size.",
  "image": "/images/demonstrations/spare-capacity-v1.svg",
  "alt": "A Flow simulation shows waiting increasing as demand approaches capacity.",
  "params": {
    "demandPerWeek": 7,
    "itemDays": 2,
    "team": 4,
    "wipLimit": 4,
    "cov": "med"
  },
  "seed": 61709,
  "controls": ["demand"]
}
```

`title` supplies the frame's accessible name. `summary` supplies the default caption;
`alt` describes the fallback image and its useful conclusion. Keep all three accurate
for the selected inputs. Images must be local public attachments; a leading `/`
resolves from `content/`, independently of the article's subfolder. Example JSON is
read at build time; it is not copied as a public attachment.

Currently only **Flow / version 1 / waiting-time** is supported. Its permitted inputs:

| Setting | Accepted values |
| --- | --- |
| `demandPerWeek` | 0.5–10, in steps of 0.5 |
| `itemDays` | Whole numbers 1–15, working days per item on average |
| `team` | Whole numbers 1–10 |
| `wipLimit` | Whole numbers 1–20, or 40 for full Flow's “no limit” setting |
| `cov` | `"low"`, `"med"`, `"high"` |
| `seed` | Exactly `61709` |
| `controls` | `["demand"]` or `[]` |

These bounds preserve the full-tool handoff. The seed and calculation are fixed for
v1. At or above effective capacity, the display states that no stable waiting time
exists. Do not describe those states as steady delivery forecasts.

### Generate the matching illustration

Use the Tools repo's generator, which computes from the same frozen model as the
interactive view. From a current Tools checkout, replacing these paths as needed:

```sh
node dev/generate-embed-poster.mjs \
  --example /Users/matthew/repos/website/content/tool-examples/spare-capacity-v1.json \
  --output /Users/matthew/repos/website/content/images/demonstrations/spare-capacity-v1.svg
```

Use the printed model description to refine `alt`; keep the caption focused on the
article's argument. Inspect the SVG. Regenerate whenever inputs change before
publication. For an unchanged existing example, reuse its existing illustration.
The website build has no dependency on a Tools checkout or a network fetch.

Published examples are snapshots. Give a revised example a new filename and image
path; changing a shared JSON file changes every article that references it. A new
simulation seed or model behaviour requires a new Tools embed version, not an edit
to the frozen v1 model. **Open full tool** uses the current full app with matching
inputs; only the embedded calculation is version-pinned.

## Preview and validate

Use two terminals when checking an interactive article locally:

```sh
# Terminal 1: Tools repository or its feature worktree
node dev/serve.mjs 8087
```

```sh
# Terminal 2: website repository
TOOL_EMBED_ORIGIN=http://127.0.0.1:8087 npm run dev
```

Open `http://127.0.0.1:4321/why-spare-capacity-matters`. If Astro chooses a different
port, free 4321 and restart: the local embed permits parent ports 4321 and 4335.
Restart Astro after changing example JSON (it watches Markdown and images, not JSON)
or the override. Use `npm run dev -- stop` to stop a background server.

The production embed allows only `https://www.matthewgarner.me` and
`https://matthewgarner.me` as parents. A local article with no local Tools override,
and a hosted `*.vercel.app` article preview, will retain the static fallback when
interaction is attempted. Do not weaken production framing restrictions to make a
preview work. Local paired servers provide the interactive review; a protected
hosted preview provides the final article layout and fallback review.

Run these before publication:

```sh
npm run check:tool-examples
npm run build:release
```

The first command validates every example and tool block, including drafts; the
release build validates published content. Check the actual article on desktop and
phone, in both themes: illustration, changing the exposed input, reset, full-tool
handoff and print. Confirm the caption and alternative text match the picture.

For changes to the embed implementation, also run `npm run test:browser` and, with
both local servers running, `node site/scripts/check-tool-embed.mjs`. The latter is
a regression for the default `tool-demonstration-preview` draft; its numerical
assertions are not a generic checker for arbitrary article examples.

## Publish

Follow [Publishing](PUBLISHING.md): set the article's `draft: false`, remove
`publish: false` if present, and include the Markdown, JSON manifest and image in the
same commit. A `v5` merge publishes the website. For an already deployed adapter,
only the website repo needs changing. New adapters must pass Tools CI and deploy to
Tools production **before** the website article is published. Keep the supplied
demonstration-preview note as a draft unless deliberately publishing it.

After deployment, open the article on the canonical live domain and exercise its
demo and full-tool handoff. Check the published image too. If an embed release must
be rolled back, retain older versioned routes used by existing articles; the static
image is a fallback, not a replacement for restoring the affected route.

## When something fails

| Symptom | What to check |
| --- | --- |
| Missing example or attachment | Match the block's name to `content/tool-examples/<name>.json`; match the manifest's image path and filename case. |
| Unsupported tool/view/input | Check the supported values above. A catalogue tool is not automatically an embed adapter. |
| JSON edits do not appear | Restart the website dev server. |
| “Could not load” after ten seconds | Check both servers and ports, the local override, or whether the parent is a permitted production domain. Check the browser console for CSP or missing-file errors. |
| Draft missing on hosted preview | Hosted builds exclude drafts. Make it publishable only on the preview branch if sharing it. |
| Picture differs from the interactive start | Regenerate from the same manifest and update the alternative text. |

## Agent implementation map

Read this guide and applicable `AGENTS.md` files first. Ordinary article creation
touches content only. To support another tool or view, use the
[Tools adapter contract](https://github.com/MatthewGarner/tools/blob/main/embed/README.md)
and update both repos: the website's `ToolExample` type, `validateExample`, `views`
and `exampleURLs` in `site/src/lib/tool-embeds.ts` currently have Flow-specific logic.
Adding one registry entry alone is insufficient.

Tools owns model validation, a frozen dependency graph, rendering, current-input
handoff, the poster generator, response headers and bridge messages. The website
owns Markdown authoring, local image resolution, safe HTML, loading failure,
theme/size messages and print fallback. Keep both validators and their tests in
agreement. Reuse the real tool's calculations; never duplicate its maths in an
article. Preserve independent instances and exact-origin/source message checks.
Record any new supported combination in these authoring docs after implementing it.
