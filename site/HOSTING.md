# Hosting and recovery

[All guides](../README.md) · [Everyday publishing](PUBLISHING.md) · [Running locally](README.md)

The site is hosted on Vercel at [www.matthewgarner.me](https://www.matthewgarner.me). The apex domain, `matthewgarner.me`, redirects permanently to `www`, preserving the path and query string. Ordinary writing changes need no manual deployment or domain changes.

## Deployment configuration

| Setting | Value |
| --- | --- |
| GitHub repository | `MatthewGarner/website` |
| Production branch | `v5` |
| Vercel project | [matthew-garners-projects/my-web-quartz](https://vercel.com/matthew-garners-projects/my-web-quartz) |
| Project ID | `prj_8vVA6l6X8f3iSH5QqGmLr7oe9fuj` |
| Project root | Repository root |
| Node version | 24 |
| Install command | `npm ci` |
| Build command | `npm run build:release` |

Root [vercel.json](../vercel.json) supplies the build commands, using the root Astro wrapper commands. Keep the project root at the repository root: Astro needs access to the sibling `content/` folder.

The release command checks the code, builds, runs publishing tests and writes `.vercel/output/` at the repository root. Vercel reads this [Build Output API](https://vercel.com/docs/build-output-api) package; its static directory contains only rendered public files. Generated routing supplies permanent article redirects and genuine 404 responses. The [Astro publishing workflow](../.github/workflows/astro.yaml) runs the same checks on GitHub. Failed checks within the Vercel build prevent deployment.

Quartz source, dependencies and inactive upstream workflows have been removed from the current branch. The named Git tag `quartz-rollback-2026-09-26` preserves the last Quartz production source. `npm ci` installs the app through the root package’s postinstall command; maintain app dependencies in `site/package.json` and its lockfile. Astro declares its own Node types: relying on the parent Quartz installation previously passed locally but failed in a clean remote build.

This repository retains an upstream Quartz remote. For GitHub CLI operations, specify `--repo MatthewGarner/website`; otherwise the CLI can select the upstream repository.

## Deployment checks

Run from the repository root. After a production deployment, check both public domains:

```sh
npm run check:hosted -- https://www.matthewgarner.me --production
npm run check:hosted -- https://matthewgarner.me --production
```

For a preview, replace the example with its exact Vercel deployment URL:

```sh
npm run check:hosted -- https://YOUR-PREVIEW.vercel.app
```

Preview checks require authenticated Vercel CLI access to this project and retain its sign-in protection. Production checks use public requests without credentials. They check articles, aliases, RSS identities, images, the stylesheet, sitemap and missing/source-file responses. Preview responses must have `noindex`; production must permit indexing.

The apex domain’s existing 308 redirect is checked before the final page response. Expecting a direct 200 there would incorrectly fail a healthy deployment. Small interaction scripts may be inline in the page: a missing external script URL does not itself mean the script was lost.

`npm run build:vercel` is an optional local packaging command for prebuilt previews; it writes `site/.vercel/output/` instead. The normal Git workflow uses `build:release`. Local `.vercel/` settings and `.env*` files are ignored and must stay out of Git.

## Rollback

For a problem with article text, publish a correction using the [normal workflow](PUBLISHING.md#correct-or-remove-something). For a broken deployment:

1. Open this project’s deployments in Vercel, find the last known good production deployment and use its rollback action to restore service.
2. Revert the offending change on `v5`, preserving later writing, so the next Git deployment does not reintroduce it. Use a revert commit rather than resetting the branch or force-pushing.
3. After deployment, run the public checks above and open the affected page.

### Emergency return to Quartz

The pre-migration release is `dpl_EkPHexonygBAyACyVkLbG2HAMYhx` ([deployment](https://my-web-quartz-kicju3xpk-matthew-garners-projects.vercel.app)); its source commit is `a2341546234c55d7596b12180cc8fe17c5ecdb7c`. This is a fallback for the framework migration, not the usual rollback target for later edits.

The complete old source and configuration are preserved in the annotated tag `quartz-rollback-2026-09-26`. To inspect or rebuild it without disturbing current work:

```sh
git fetch origin tag quartz-rollback-2026-09-26
git worktree add --detach ../website-quartz-rollback quartz-rollback-2026-09-26
```

Use a new directory name if that one already exists. Restoring the old deployment does not restore its Git publishing configuration. A continued return to Quartz requires bringing its tagged source and build configuration back deliberately while preserving later writing. Do not replace the current branch wholesale with the tag. The old Quartz dependency alerts belong to that historical version; assess them before rebuilding it for continued use. Confirm both domains and the feed afterwards.

## Migration record

[PR #84](https://github.com/MatthewGarner/website/pull/84) moved production to Astro on 26 September 2026, merge commit `f7926fb87882366473dd577a94e7a90e92ebce32`. The first production deployment was `dpl_8XSTDCeFgqR6yMX23cJ3TTwxFRTp`.

Existing article paths and aliases were retained. RSS keeps the original apex-domain, slashless article identities so subscribers do not receive old writing again; the fixture in `tests/fixtures/legacy-rss.json` protects those five entries. The feed now lists writing only. Draft and source-file exclusions, clean builds, live routing and both appearances were checked; details are in [the dated verification record](design-qa.md). Public attachment behaviour is documented in [the authoring guide](AUTHORING.md#what-stays-off-the-site).

## Local draft isolation

Local drafts require Astro’s development watcher, a loopback-only server and no CI/Vercel environment. The loader controls the preview marker; a note cannot enable it through frontmatter. Published lists, RSS and the sitemap continue to use published notes only. Builds replace the content store, so cached draft previews cannot survive into output.

The release tests create an isolated copy with draft notes, exercise their pages and saved edits, then build from the warmed cache and check for leaked paths or text. They also check that a hosted development environment excludes drafts. Test notes never enter the real Obsidian folder.

## Dependency advisory assessment — 3 October 2026

`npm --prefix site audit` reports [GHSA-ch52-4w7c-c8xp](https://github.com/advisories/GHSA-ch52-4w7c-c8xp)
in `http-cache-semantics` 4.2.0 through Astro 7.3.5. No patched package is available.
The flaw concerns shared caches serving another user's response after a client
supplies `max-stale`. Astro uses this dependency for build-time remote-image cache
lifetimes; this site uses local images and deploys static files without a server
response cache or sessions. That leaves no identified exploit path here.

Reassess when a patch appears or before introducing server rendering, authenticated
fetches or shared response caching. Do not use `npm audit fix --force`: its proposed
Astro 2 downgrade would remove the current publishing APIs, not safely fix this site.
