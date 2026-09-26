# Running and customising the site

[All guides](../README.md) · [Writing and editing](AUTHORING.md) · [Publishing](PUBLISHING.md) · [Hosting and recovery](HOSTING.md)

The Astro app lives in `site/` and reads the original Markdown from `content/`. **Run the commands in this guide from the repository root** (`/Users/matthew/repos/website` on this Mac). Root commands forward to the Astro app; you do not need to change into `site/`.

## First setup

You need Git and **Node.js 24**, which includes npm. Check your installation:

```sh
node --version
npm --version
```

Node should report `v24…`. If you use nvm, run `nvm use` from the repository root to select the version in `.nvmrc`.

Install the app’s dependencies:

```sh
npm ci
```

This installs the locked app dependencies from `site/` automatically. Repeat it after pulling changes to `site/package-lock.json`. App dependencies are maintained in `site/package.json`; the root package only provides convenient commands. Normal local use needs no Vercel account, environment file or API keys.

## Run while editing

```sh
npm run dev
```

Open the address printed in the terminal, usually http://127.0.0.1:4321. If that port is occupied, use the different address Astro prints. Leave the terminal running and save changes in Obsidian or your editor; the browser updates automatically. Press **Ctrl+C** to stop the server.

When started by Codex, Astro can run in the background and return control to the terminal. Use these commands to manage that server:

```sh
npm run dev -- status
npm run dev -- logs
npm run dev -- stop
```

If it reports that a server is already running, use its printed address or stop it before starting another.

Keep `draft: true` or `publish: false` while you write. Open `/writing` and choose the piece under **Local drafts**, or visit its normal slug. Its page displays a **Draft preview** banner. Saving updates it just like published writing. Drafts stay out of the homepage, RSS and sitemap. About is at `/about`.

Draft previews require a local development server bound to this machine. They are disabled for builds, the built-site preview, CI and Vercel, and when the development server is exposed on a network address. Private, template and hidden folders remain excluded. [Sharing a preview](PUBLISHING.md#preview-unfinished-writing-or-a-design-change) is a separate workflow.

Restart the server after changing filenames, slugs or aliases. After changing Markdown renderer configuration, stop it and restart with:

```sh
npm run dev -- --force
```

This prevents Astro’s configuration restart from retaining previously rendered Markdown.

## Build and check

Use one command before publishing:

```sh
npm run build:release
```

It runs the code check, builds the site, runs the publishing tests and packages the output for Vercel. Success means the command finishes without errors; it does not upload or publish anything. GitHub and Vercel run this same command on deployment.

For a closer look at the built pages:

```sh
npm run preview
```

Run this after a build and open the address it prints. This preview serves the last build; rebuild to see later edits. It does not reproduce Vercel’s domain redirects and routing exactly. [Hosted checks](HOSTING.md#deployment-checks) verify those.

Stop a foreground preview with **Ctrl+C**. For a background preview, use `npm run preview -- stop`; `status` and `logs` work the same way as for the development server.

| Command | Use |
| --- | --- |
| `npm run check` | Check the Astro and TypeScript code without making a deployment package. |
| `npm run build` | Generate pages in `site/dist/`. |
| `npm test` | Run the tests after a fresh build; some tests read the generated pages. |

Run these sequentially. The check and build both initialise Vite’s cache, so running them concurrently can interfere with each other. In a restricted environment that blocks Astro’s preferences directory, prefix the command with `ASTRO_TELEMETRY_DISABLED=1`.

## Change the design or site copy

Use a preview branch for design work. These are the main places to edit; ordinary writing stays in Markdown.

| Change | File |
| --- | --- |
| Article text, titles, dates and homepage selections | Markdown in `content/`; see [the authoring guide](AUTHORING.md). |
| About heading, biography and portrait reference | `content/index.md` |
| Homepage headline, introduction, Projects text and links | [src/pages/index.astro](src/pages/index.astro) |
| Site name, navigation, footer links, default description and theme toggle | [src/layouts/BaseLayout.astro](src/layouts/BaseLayout.astro) |
| Colours, spacing, typography, mobile layouts and transitions | [src/styles/global.css](src/styles/global.css) |
| Article layout, reading time and “Keep reading” | [src/pages/[...slug].astro](src/pages/%5B...slug%5D.astro) |
| Writing archive layout | [src/pages/writing.astro](src/pages/writing.astro) |
| Homepage article preview content | [src/components/Preview.astro](src/components/Preview.astro) |
| About page layout and its search description | [src/pages/about.astro](src/pages/about.astro) |
| Browser icon and shared social image | `content/static/icon.ico` and `content/static/og-image.png` |

The colour variables at the top of `global.css` define light mode; `:root[data-theme='dark']` defines dark mode. Fonts are imported in `BaseLayout.astro` and selected through `--display` and `--serif` in the stylesheet. Both fonts are served locally.

Appearance follows the reader’s system until they toggle it, then remembers their choice. After a visual change, check both themes, a narrow screen, keyboard focus and the article preview interaction. Keep the reduced-motion behaviour when editing transitions.

Do not hand-edit `site/dist/`, `site/.assets/`, `site/.astro/` or `.vercel/output/`; builds regenerate them. Publishing rules live in `src/lib/publishing.ts`, Markdown handling in `src/lib/obsidian.ts` and `src/lib/markdown.ts`, and rendering configuration in `astro.config.ts`.

## When something doesn’t work

| Symptom | What to do |
| --- | --- |
| A new piece is missing | In local development, check **Local drafts** on `/writing`. Builds omit drafts and `publish: false` notes; unlisted pieces require their direct address. Excluded folders never appear. Only three pieces appear on the homepage. |
| A save seems ignored | Read the terminal error. A failed Markdown update can leave the last valid version visible. Fix it, save again and restart after path or renderer changes. |
| Invalid properties or date | Check the `---` block, quote text containing `: `, use unquoted booleans and replace any unexpanded template date. |
| Missing or ambiguous note link / attachment | Check the target spelling and path, whether it is published, and whether two notes or images have the same name. |
| Duplicate or reserved path / conflicting alias | Give the piece and its aliases unique paths. `about`, `writing`, `404`, `index.xml` and `sitemap.xml` are reserved. |
| Tests cannot find built pages | Run `build:release`, which builds before testing. |
| Node or dependency errors | Use Node 24 and rerun `npm ci`. |
| Preview exits before starting, or a local request reports `EPERM` | A restricted execution environment can block listening on or connecting to a local port. Allow local-server access there, or run the command in your normal terminal. |
| A Git push succeeds but the live site stays old | Check the branch and the Vercel build log. Only `v5` publishes production; an errored build leaves the previous site live. |
