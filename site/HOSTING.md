# Publishing and rollback

Production: [www.matthewgarner.me](https://www.matthewgarner.me), with [matthewgarner.me](https://matthewgarner.me) permanently redirecting to `www` while preserving the path and query string.

The existing Vercel project is `matthew-garners-projects/my-web-quartz` (`prj_8vVA6l6X8f3iSH5QqGmLr7oe9fuj`). Its Git connection publishes `MatthewGarner/website`, production branch `v5`. No DNS change is needed.

## Git publishing

Keep the project root at the repository root so Astro can read the sibling `content/` directory. Root `vercel.json` overrides the old dashboard commands: install with `npm ci --prefix site`, then `npm --prefix site run build:release`. Use Node 24. The release command checks types, builds, runs publishing tests and writes `.vercel/output/` at the repository root. Astro declares its own Node types: relying on Quartz’s parent `node_modules` passed locally but failed in a clean Vercel build.

Vercel consumes the [Build Output API](https://vercel.com/docs/build-output-api). Only rendered public files enter its static directory; routing supplies permanent article redirects and real 404 responses. The GitHub “Astro publishing” workflow runs the same build. The Vercel build itself runs all checks, so it cannot publish a failed build even if GitHub checks finish later.

This repository retains an upstream Quartz remote. Use `gh --repo MatthewGarner/website` for repository operations; GitHub CLI can otherwise select the upstream repository.

Push a branch to get a protected Vercel preview. Verify it before merging into `v5`:

```sh
cd site
npm run check:hosted -- https://THE-RETURNED-PREVIEW.vercel.app
```

After production is ready, check both public domains without authentication:

```sh
npm run check:hosted -- https://www.matthewgarner.me --production
npm run check:hosted -- https://matthewgarner.me --production
```

Preview checks use the authenticated Vercel CLI and require `noindex`. Production checks use ordinary public requests and reject `noindex`. The apex domain’s existing 308 redirect is validated before checking the destination; expecting a direct 200 at the apex would incorrectly fail a healthy deployment. Both check articles, aliases, feed identities, public assets and missing/source-file responses. Small interaction scripts may be inline in HTML, so an absent script `src` is not itself a failure.

For an occasional local prebuilt preview, `npm run build:vercel` creates `site/.vercel/output/`. Link `site/` to the existing project first, then deploy with `npx --yes vercel@60.1.3 deploy --prebuilt --target preview --scope matthew-garners-projects --project prj_8vVA6l6X8f3iSH5QqGmLr7oe9fuj --non-interactive --yes`. Local `.vercel/` and `.env*` files are ignored and must stay out of Git.

## Migration review — 26 September 2026

| Risk | Resolution |
| --- | --- |
| A later Markdown push could rebuild Quartz | Build commands live in versioned root configuration and the Git preview validates that path. |
| Existing RSS posts could appear new | Preserve Quartz’s exact apex-domain, slashless article GUIDs; a captured fixture guards all five. The feed now lists writing only. |
| Old links could break or missing pages return 200 | Keep all five article URLs and aliases; generated hosting routes supply 308 redirects and 404 responses. |
| Drafts or source files could leak into the deployed bundle | Package only rendered output. Draft/private/template exclusions are tested. The current asset inventory contains only the existing public profile and icons. |
| A protected or non-indexable preview could become the live experience | Check both live domains without credentials, including indexing headers, after cutover. |

Attachments in public content folders are copied even when referenced only by a draft. Keep private attachments outside this public repository. `unlisted` is discoverability, not access control.

The migration merged in [PR #84](https://github.com/MatthewGarner/website/pull/84), commit `f7926fb87882366473dd577a94e7a90e92ebce32`. Its first production deployment, `dpl_8XSTDCeFgqR6yMX23cJ3TTwxFRTp`, became ready on 26 September 2026. The clean GitHub/Vercel builds passed all 10 tests. Public HTTP checks passed on both domains, including preserved RSS identities and apex redirects; the runtime dependency audit found no known vulnerabilities.

## Rollback

The pre-migration Quartz release is `dpl_EkPHexonygBAyACyVkLbG2HAMYhx`: [deployment](https://my-web-quartz-kicju3xpk-matthew-garners-projects.vercel.app). Its source is commit `a2341546234c55d7596b12180cc8fe17c5ecdb7c`.

If the cutover fails, use Vercel’s rollback action for that deployment in the existing project. Revert the Astro migration merge on `v5` as well, preserving any later writing changes, so future pushes use the Quartz build again. Do not reset the branch or overwrite newer articles. The dashboard’s original Quartz commands are deliberately retained; reverting root `vercel.json` restores them. Confirm both domains and the feed after rollback.
