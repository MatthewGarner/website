# Matthew Garner’s website

[Live site](https://www.matthewgarner.me) · [Repository](https://github.com/MatthewGarner/website)

Write in Obsidian, save Markdown in `content/`, then commit and push to `v5` to publish. Vercel builds the Astro site and updates the live website when its checks pass. Saving a file alone does not publish it, unless your Git tool is configured to push automatically.

## Guides

| I want to… | Read |
| --- | --- |
| Write or edit a piece, add images, choose homepage articles | [Writing and editing](site/AUTHORING.md) |
| Update Now or add a book to Bookshelf | [Personal pages](site/AUTHORING.md#now-and-bookshelf) |
| Publish, review a preview or take a piece down | [Publishing](site/PUBLISHING.md) |
| Run the site locally, change the design or fix a build | [Running and customising the site](site/README.md) |
| Manage hosting or roll back a deployment | [Hosting and recovery](site/HOSTING.md) |

Keep `draft: true` while writing. Drafts appear under **Local drafts** on the local Writing page, with a banner on each piece. They remain excluded from builds and hosted previews.

## Start a local preview

Use Node.js 24. Run these commands from the repository folder (`/Users/matthew/repos/website` on this Mac):

```sh
npm ci
npm run dev
```

Open the local address printed in the terminal, usually http://127.0.0.1:4321. Leave the command running while editing; press **Ctrl+C** to stop it. If Codex starts it in the background, use `npm run dev -- stop` instead. [More setup and troubleshooting](site/README.md).

The website code lives in `site/`; the original Markdown stays in `content/`. Root commands run Astro. The former Quartz site is preserved in the Git tag `quartz-rollback-2026-09-26`; its old source and dependencies have been removed from the current branch.
