# Design QA

final result: passed

Source: `/Users/matthew/.codex/generated_images/01a0c35c-e15c-7770-8851-adbaea6a2a83/exec-ee8c0565-04a0-4b35-8d27-b5119f031611.png` (1536 × 1024).
Implementation: `http://127.0.0.1:4321`, viewport 1200 × 1366 CSS pixels, device scale 1.

Full comparisons: `qa/comparison-light-final.png` and `qa/comparison-dark-final.png`. Source crops: light (38, 120)–(754, 935); dark (783, 120)–(1499, 935), each 716 × 815. Browser screenshots `qa/home-light-final.png` and `qa/home-dark-final.png` are 1200 × 1366, scaled to 716 × 815 beside the source. Both show the homepage with gardening selected and appearance closed. The browser full-page screenshot API produced incorrect scaling, so viewport captures are used. Text, spacing and controls are legible in these combined views; no extra focused crop was needed.

Comparison history:

1. `qa/comparison-light-first.png`: P2 — type too heavy, body too small and lower page too compressed. Enlarged navigation and reading text, increased row spacing, enabled Newsreader optical sizing and tried a narrower display face.
2. `qa/comparison-light-revised.png`: P2 — oversized display text wrapped the headline and running title. Settled on Oswald, reduced headline to 98px and list titles to 37px, and adjusted line height and tracking. The serif intro now follows the reference's four-line structure.
3. Final side-by-side comparisons above: three-line headline restored, list titles fit, preview and projects sections align closely. No outstanding P0/P1/P2 findings.

Fidelity surfaces:

- Typography: self-hosted Oswald and Newsreader preserve the condensed/serif pairing. Generated reference glyphs are not an identifiable exact font; slightly different letter shapes and lower-page density remain P3 polish.
- Layout: modest identity, two-column introduction, selected list and preview, projects row and restrained footer. Mobile stacks the introduction and gives each article an inline disclosure.
- Colour: cream/ink with purple actions; charcoal/lavender with lime actions in dark mode. Accent identifies interaction or selection. Focus outlines remain visible in both themes.
- Assets: no artwork in the home reference. Appearance and back icons use Phosphor; About uses the original profile attachment. No substitute illustrations or decorative shapes.
- Copy: reference homepage copy retained. “All writing” is an intentional addition for access to the complete archive. Article bodies come directly from the original Markdown.

Browser validation: desktop 1200 × 1366 and mobile 390 × 844; screenshots `qa/mobile-light.png`, `qa/article-mobile-light.png`, `qa/article-dark.png`. Preview selection works by click and Enter; mobile disclosure opens and its essay link navigates. Archive and About navigation work, profile attachment loads, dark appearance persists across pages, and System remains selected after reload. Escape closes appearance and restores focus. Mobile has no horizontal overflow. The old `/posts/ill-stay-home-thanks` alias reaches its canonical article. Console checks returned no errors or warnings.

Build completed: nine pages plus five redirects, feed and sitemap. Three publishing tests passed; Astro check returned zero errors, warnings or hints. Live OS colour-scheme changes and full assistive-technology testing were not exercised; System selection and persisted navigation were.

Implementation checklist complete. Optional P3 follow-up: refine the exact display typeface with the user after trying the working site. No deployment has been made.

## Article and authoring pass — 26 September 2026

Passed at `http://127.0.0.1:4322`: compact note layout, longer illustrated writing, captions, meaningful highlights, callouts, footnote jump/return, and code colours in light and dark appearances. Mobile checked at 390 × 844: images fit the column and the document remains 390px wide; a 512px table scrolls by keyboard within its 350px container. Dark code comments use the more legible `github-dark-default` palette. Screenshots: `qa/authoring-note-light.png`, `qa/authoring-caption-light.png`, `qa/authoring-article-mobile-dark.png`, `qa/authoring-table-mobile-dark.png`, `qa/authoring-callout-mobile-dark.png`, and `qa/authoring-prose-mobile-light.png`.

A temporary copy of `tests/fixtures/reading-sample.md` demonstrated new-note discovery, saved body edits updating the open page without a manual reload, and homepage selection/order driven by Markdown properties. Setting `draft: true` removed it from the homepage and made its URL return the site's 404 page. The temporary content file was removed before the final build; the sample remains only as a test fixture. The original homepage selection is retained, with Drifting labelled as a note.

Final build: nine pages plus the existing redirects, feed and sitemap. All eight tests passed; Astro check reported zero errors, warnings or hints. Browser console reported no errors. Print rules were added but not visually checked in a print preview. The production site remains unchanged.

## Hosted preview — 26 September 2026

Deployment `dpl_CamF7cERd79HzpsSrybHADenb3jw` is READY: [preview](https://my-web-quartz-ksacicpot-matthew-garners-projects.vercel.app). The package contains 32 public files and five generated HTTP redirects. All nine local tests passed; Astro check returned zero errors, warnings or hints across 24 files.

All 21 authenticated HTTP checks passed: homepage, all five articles, About, Writing, all five old aliases, trailing-slash and legacy `.html` redirects, profile image, stylesheet, feed, sitemap, missing-page response and excluded template source. Preview responses include `X-Robots-Tag: noindex`; the hashed stylesheet is cached as immutable. The homepage's production ETag remained `b1314e9effcbc62c977d130efb4c59c0` before and after deployment.

The hosted browser reaches Vercel's sign-in screen. This browser session has no Vercel login and its supported controls cannot attach the trusted request header, so hosted visual/interactivity checks remain for the signed-in review; the local browser results above still apply. Deployment protection was retained. Reproduction and cutover steps are in `HOSTING.md`.

## Appearance toggle — 26 September 2026

Replaced the menu with one button: system appearance by default, then a remembered light/dark choice. A 380ms crossfade and rotating half-circle provide the transition; reduced motion skips it and older browsers get a colour-transition fallback. The initial theme still applies before paint.

Local browser checks passed for the current system default, clicks, Space, rapid double-clicks, mobile activation, and persistence through article navigation and reload. The mobile target is 44px tall and the document fits a 390px viewport. Console errors: none. Screenshot: `qa/theme-toggle-mobile-dark.png`. Reduced-motion and older-browser branches were not emulated. Nine tests and the Astro check passed; the final stylesheet rebuild passed.

Updated preview: [single-button theme toggle](https://my-web-quartz-8nhkewvox-matthew-garners-projects.vercel.app), deployment `dpl_CmK2fihn4BEPkmGgtFVFGhzmYW6H`. Production remains on Quartz.

## Production migration — 26 September 2026

Astro is live at https://www.matthewgarner.me through the Git publishing workflow, merged in PR #84. Production deployment `dpl_8XSTDCeFgqR6yMX23cJ3TTwxFRTp` came from `f7926fb87882366473dd577a94e7a90e92ebce32`. Both clean remote builds passed the 10 publishing tests and type checks. The hosted preview passed 23 HTTP checks; production passed those checks at `www` and validated the apex domain’s permanent redirects, including query-string preservation. All five original RSS article GUIDs are preserved.

Live browser checks passed for desktop dark appearance, a 390px mobile layout without horizontal overflow, expanding the Drifting preview, opening the note and retaining the chosen appearance. The initial live visit followed the light system appearance. The previous preview browser sign-in limitation no longer applies to the public domain. The unchanged reduced-motion and older-browser branches remain un-emulated.

The migration review found and fixed an RSS identity change and a clean-build dependency accidentally supplied by the old Quartz installation. The live-domain checker now accounts for the existing apex-to-www redirect. Hosting configuration, remaining public-attachment behaviour and rollback are documented in `HOSTING.md`.
