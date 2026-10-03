# Writing with tool demonstrations

[Writing guide](AUTHORING.md) · [Publishing](PUBLISHING.md) · [Tools contract](https://github.com/MatthewGarner/tools/blob/main/embed/README.md)

Any released tool/view in the [local catalogue](src/lib/tool-contract/catalogue.json)
can appear in an article without website code changes. Each example names an exact
version, starting state, view and controls. The catalogue records the available
views, input schema, `initialState` and each view's `defaultControls`.

Articles live in this repository's `content/`. The separate **Matt** Obsidian vault
holds planning notes and does not publish automatically. Use Node 24 and keep
unfinished articles as `draft: true`.

## Create the example and matching illustration

From an up-to-date Tools checkout, install its browser dependencies once:

```sh
npm ci --prefix dev/pw
```

Create an example using a released tool's default state and view:

```sh
node dev/create-tool-example.mjs rank priorities-under-pressure-v1 \
  --content /Users/matthew/repos/website/content \
  --version 1 --view ranking --controls value,wobble
```

Replace the path with the website checkout you are editing. This writes both
`content/tool-examples/priorities-under-pressure-v1.json` and
`content/assets/tool-examples/priorities-under-pressure-v1.png`. It validates the
state with the frozen tool definition and renders the actual demonstration to
produce the illustration. Read the generated summary and alternative text; edit
them to explain the result and its role in the article.

Omit `--view` and `--controls` to use the selected release's defaults. Use
`--controls none` for a live view with fixed inputs. A controls list must be a subset
of that view's allowed controls. Omitting `--version` selects the latest released
version, but the resulting manifest always records an explicit version.

To use your own scenario, copy the selected tool's `initialState` from the catalogue
into a JSON file, edit it according to `stateSchema`, then supply
`--state /absolute/path/scenario.json`. State is the tool's native JSON model: some
tools use numbers and arrays, others contain an authored text document. Do not
translate it into another tool's input format. The command also accepts
`--title`, `--summary`, `--alt` and `--width` (320–1600 pixels; default 900).

The command refuses to overwrite an existing manifest or picture. Give changed
inputs a new example ID and update the article's reference. This protects other
articles using an existing example, including ones already published. If the
command rejects the scenario, fix it before authoring the article; website schema
checks cannot interpret every tool's domain language.

## Write the article

Create `content/When priorities are fragile.md`:

````markdown
---
title: When priorities are fragile
slug: when-priorities-are-fragile
date: 2026-10-03
description: What survives a small change in our assumptions?
type: essay
draft: true
---

A ranking can look precise while depending on uncertain judgements.

```tool
example: priorities-under-pressure-v1
caption: Change the value weight and uncertainty. Which priorities stay near the top?
```

The model tests the stated scores and weights; it does not tell us what to value.
````

Choose the actual publication date. `example` is the manifest filename without
`.json`; names use lowercase letters/numbers separated by hyphens. `caption` is
optional and defaults to the example's summary. Quote a caption containing a colon.
Only `example`, `caption` and `mode` are valid block keys.

The illustration loads first. **Explore this example** loads the tool on demand;
**Show illustration** closes it. Reset restores the authored state. Repeated
examples are independent. The static **Open full tool** link carries the starting
state; the running demonstration's link carries the reader's current state.

Add `mode: figure` for only the saved image, caption and full-tool link.
`mode: interactive` is the default. A manifest with `controls: []` still renders a
live view; it simply exposes no editable inputs.

Obsidian displays the block as source; preview the article on the website. Print
uses the image and caption. Without JavaScript, or if the child fails to load, the
image and full-tool link remain usable. RSS supplies article descriptions and links,
not article bodies or interactive content.

## The example manifest

The generated JSON contains these required fields:

| Field | Purpose |
| --- | --- |
| `tool`, `version`, `view` | Exact released tool and named view from the catalogue. |
| `state` | Complete native JSON starting state, validated against that release. |
| `controls` | Explicit list of allowed controls to expose; `[]` fixes all inputs. |
| `title` | The frame's accessible name. |
| `summary` | Default caption; explain the model's useful conclusion and limitations. |
| `image` | Matching local public picture, such as `/assets/tool-examples/example.png`. |
| `alt` | Useful description of the picture, not a repetition of its filename. |

A leading `/` on `image` resolves from `content/`, independently of the article's
subfolder. Remote fallback images are not supported. Manifest JSON is read at build
time and is not published as an attachment. Images outside private folders are
public attachments, including images referenced only by drafts.

Keep published manifests, image paths and tool versions stable. A new example ID
represents a new scenario. A new tool version represents a changed model or view
contract. Old release routes remain available. **Open full tool** opens the current
full application with matching inputs; the embedded model is version-pinned.

Existing **Flow v1 / waiting-time** manifests using `params` and `seed: 61709` remain
supported unchanged through the Tools-owned compatibility module. Their legacy
illustration command remains available:

```sh
node dev/generate-embed-poster.mjs \
  --example /absolute/website/content/tool-examples/flow-queues-v1.json \
  --output /absolute/website/content/images/demonstrations/flow-queues-v1.svg
```

Use the new example command for new tools and current Flow versions. Do not rename
legacy `params` to `state`; they are different released contracts.

## Preview and validate

Use two terminals:

```sh
# Tools checkout
node dev/serve.mjs 8087
```

```sh
# Website checkout
TOOL_EMBED_ORIGIN=http://127.0.0.1:8087 npm run dev
```

Open `http://127.0.0.1:4321/when-priorities-are-fragile`. Keep the website on port
4321; the local Tools server permits article ports 4321 and 4335. Restart Astro
after changing example JSON, syncing the catalogue or changing the override.

Production embeds allow only `https://www.matthewgarner.me` and
`https://matthewgarner.me` as parents. Hosted `*.vercel.app` article previews and a
local article without the local Tools override retain the static fallback. Use
paired local servers for interaction and protected hosted previews for layout and
fallback review; do not widen production framing rules to preview wildcards.

From the website root, run:

```sh
npm run check:tool-examples
npm run build:release
```

The first command checks all manifests and tool blocks, including drafts. It checks
catalogue identity, schemas, control bounds and attachments. The release build
checks published content. Domain parsing and actual rendering were checked by the
Tools example command; regenerate a new example after changing state, rather than
relying on the website check alone.

Exercise the actual article on desktop and phone, in both themes: loading,
changing each exposed control, Reset, full-tool handoff, closing and printing.
Check that the illustration, caption and alternative text agree with the starting
state. Embedded controls must remain useful in the article's narrower layout.

## Publish and add newly released tools

Follow [Publishing](PUBLISHING.md). Set the article's `draft: false`, remove
`publish: false` if present, and commit its Markdown, manifest and image together.
A `v5` merge publishes the website. For a version already in the website catalogue,
ordinary article work changes content only.

When Tools releases a new tool or version, deploy Tools **first**, then refresh the
website's portable catalogue from that released checkout:

```sh
npm run sync:tool-contract -- /absolute/tools/embed/portable
npm run sync:tool-contract -- /absolute/tools/embed/portable --check
```

Commit the generated `site/src/lib/tool-contract/` files with the article. Sync
validates metadata and copies exactly five portable contract files. `--check`
compares their bytes without updating them. Website builds use this committed
snapshot and never fetch a catalogue or import tool engines. New tools need no
per-tool website changes.

After deployment, open the article on its canonical live domain and exercise the
demo and full-tool handoff. Check the published image too. Preserve older embed
routes during releases and rollbacks; the picture is a fallback, not a substitute
for restoring a broken release.

## Troubleshooting and agent guidance

| Symptom | Check |
| --- | --- |
| Unsupported tool/version/view | Sync the released portable catalogue; inspect that version's exact view names. |
| Invalid state or control | Use the selected release's schema and view controls, then rerun the Tools example command. |
| Missing example or attachment | Match the block name and manifest image path exactly, including case. |
| JSON changes do not appear | Restart the website dev server. |
| Interaction fails | Check both servers, ports, the local override and the allowed parent origin; inspect CSP/network errors. |
| Draft missing from a hosted preview | Hosted builds exclude drafts. Make it publishable on the preview branch only when deliberately sharing it. |
| Picture differs from the start | Generate a new example and picture together, then update the article reference. |

Read applicable `AGENTS.md` files before code changes. Tools owns schemas, codecs,
model validation, released renderers, example generation and framing. The website
owns Markdown, local attachments, safe HTML, loading/failure UI, theme/size messages
and print fallback. Never duplicate a tool's maths or add tool-specific branches to
`site/src/lib/tool-embeds.ts`; extend the Tools definition and sync its export.
Generated contract files are not edited by hand.

For embed implementation changes, run the focused tests in
`site/tests/tool-embeds.test.ts`, `site/tests/tool-contract-sync.test.ts` and
`site/tests/browser/tool-embeds.spec.ts`, then the release checks. Preserve exact
message origin/source validation and independent instances. The existing
`node site/scripts/check-tool-embed.mjs` checks the supplied draft
against paired servers, covering legacy Flow plus standard Flow, Rank and Knowledge.
Pass an alternate draft URL as its first argument when using another local port.
Its assertions are specific to those examples, not a generic article checker. Follow the
[Tools contract](https://github.com/MatthewGarner/tools/blob/main/embed/README.md)
for new-tool scaffolding and release validation.
