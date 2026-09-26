# Publishing

[All guides](../README.md) · [Writing and editing](AUTHORING.md) · [Running locally](README.md)

**Save locally → commit → push → Vercel builds → the website updates.** Push to `v5` to publish the live site. A different branch produces a protected preview. A failed build leaves the previous successful version live.

All commands below run from the repository folder, not inside `site/`. Replace example filenames with the files you actually changed.

## Publish a new piece or an edit

1. Before editing, use your Git app to switch to `v5` and pull the latest changes. With a clean working copy, the terminal equivalent is:

   ```sh
   git switch v5
   git pull --ff-only origin v5
   ```

   If you already have uncommitted work, keep it; commit it on its current branch or resolve it before switching. If Git reports conflicts, resolve them before publishing rather than forcing a push.

2. Edit the Markdown in `content/`. For a new piece, set `draft: false` and remove `publish: false` if present. Include any images it needs. [Property reference](AUTHORING.md#properties).
3. Check the piece locally and run the release checks:

   ```sh
   npm run build:release
   ```

   This checks the code, builds the pages, runs publishing tests and prepares the deployment. It does not publish anything. Stop if it reports an error; the [running guide](README.md#when-something-doesnt-work) explains common causes.

4. In your Git app, review and commit the intended files, then push `v5` to `origin`. The terminal equivalent for one piece is:

   ```sh
   git status --short
   git add -- "content/Small observations.md"
   git diff --cached
   git commit -m "Publish Small observations"
   git push origin v5
   ```

   Add any new images separately before committing. For an edit, use a message describing the change. Check the staged files so unrelated work is not included.
5. Wait for the deployment to show **Ready** in [Vercel](https://vercel.com/matthew-garners-projects/my-web-quartz). Open the [live site](https://www.matthewgarner.me), then the piece itself. New listed pieces appear in [Writing](https://www.matthewgarner.me/writing); the homepage follows its own featured selection.

If Obsidian or another Git tool automatically commits and pushes to `v5`, making a note publishable can send it live on the next sync. Keep `draft: true` during local writing and previewing.

## Preview unfinished writing or a design change

For everyday writing, leave `draft: true` (or `publish: false`), run `npm run dev` and open `/writing`. The **Local drafts** section links to unfinished pieces, each with a **Draft preview** banner. You can edit, save and check the layout without changing the publishing flag. Local draft previews never enter production builds or hosted branch previews.

For a shareable preview of an unfinished piece or design change:

1. Starting from an up-to-date `v5`, create a branch with an unused name:

   ```sh
   git switch -c codex/site-preview
   ```

2. For a piece to appear in the hosted preview, set `draft: false` and remove `publish: false` **on that branch**. This is only needed for sharing; local draft previews need neither change. Check the design locally and run `npm run build:release`.
3. Commit the chosen files, then push the branch:

   ```sh
   git push -u origin codex/site-preview
   ```

4. Open a pull request into **`v5`** in [your website repository](https://github.com/MatthewGarner/website). Follow its Vercel deployment link and sign in when prompted. Check the page on a phone-sized screen and in both appearances.
5. Merge only when the piece and checks are ready: that merge publishes production. To merge design changes while keeping a piece unpublished, restore its draft flag first. Return your local checkout to `v5` and pull before starting the next piece.

A preview branch leaves the live site unchanged, but its source is still in a public repository. If your Git tool auto-syncs, check that it is pushing the branch you intend.

## Correct or remove something

For a correction, edit the existing Markdown and publish again. Keep the same filename or slug so existing links and feed identities stay stable.

To take a piece off the website, set `draft: true` and publish that change. Remove or update links to it from other published notes; otherwise the build will fail. Its old URL will return 404 after a successful deployment. Attachments remain public until separately removed, and copies already fetched by RSS readers are not recalled.

The five articles present at the Quartz migration have tests that require their original RSS identities to remain. Removing, unlisting or changing the URLs of those articles needs a deliberate update to those migration expectations in `site/tests/publishing.test.ts` and `site/tests/fixtures/legacy-rss.json`. Do not delete the checks just to make a failed build pass. `content/index.md` is required for About and must remain published.

If an entire deployment needs reversing, use the [hosting and recovery guide](HOSTING.md#rollback).
