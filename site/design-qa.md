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

## Reading interactions — 26 September 2026

Added native title continuity from selected writing into an article, contextual footnotes, and selected-passage copying with attribution and a text-fragment link. Unsupported features retain ordinary links or manual copying. Tools stays a quiet homepage link.

Release checks passed: 34 files checked without diagnostics, 13 tests, and the production package built. All 22 Chromium/WebKit browser checks passed, covering title transitions and Back, stable previews, keyboard focus/escape, touch dismissal, native no-JavaScript links, system theme changes, blocked storage, reduced motion, missing animation/popover APIs, clipboard denial, and light/dark accessibility scans. Actual clipboard writing/reading was exercised in Chromium; WebKit's successful write was stubbed, with its denial and touch paths exercised. No accessibility-rule violations were reported in the checked states.

The isolated reading sample was visually checked in the in-app browser, including the light desktop and dark phone footnote panels. All three pages of the generated A4 PDF were rendered and inspected: readable code, tables, captions and endnotes, no floating controls or clipping. This closes the earlier reduced-motion, feature-fallback and print-verification gaps. Tests caught and fixed canonical quote URLs, Safari suppressing touch clicks when pointerdown was cancelled, and dark print margins caused by the inline colour scheme. Contrast checks wait for entry animations to finish.

These checks run through `npm run test:browser` and are included in GitHub CI. The sample is built in a temporary copy, outside publishable content. Physical-device and screen-reader usability remain manual checks; this is not a full assistive-technology audit. Changes remain on the local review branch.

## Editorial motion — 26 September 2026

Added a variable-weight headline response with fixed glyph widths, a touch ripple, paper-stack preview changes, sheet-to-article continuity and a circular theme reveal from the appearance icon. Effects settle when idle; touch gestures retain native scrolling. System theme changes still crossfade. Reduced-motion changes cancel active effects, and unavailable snapshot animation falls back to a working theme switch.

Release build passed with 38 files checked without diagnostics and all 13 publishing tests. All 34 Chromium/WebKit browser checks passed, including pointer/touch response, stable layout at 320/390/768/1200px, rapid selection, snapshot cleanup, live reduced-motion changes, rejected snapshot animation, and existing reading/accessibility/print checks. Visual inspection caught overlapping title snapshots: fitting the article title to its text and matching snapshot heights corrected this. The 10 affected navigation, layout, touch and accessibility checks passed again after that refinement.

Inspected the actual theme reveal and paper opening in the in-app browser, plus desktop light/dark and the 390px dark phone layout. A deliberately skipped navigation snapshot exposed an unhandled `ready` rejection; the navigation handler now consumes that rejection, with a regression check for ordinary article-to-article navigation. Physical-phone gestures and VoiceOver remain manual checks. This pass is prepared on `codex/editorial-motion` for review.

## Motion release and typography playground — 26 September 2026

PR #89 is live at https://www.matthewgarner.me, merge `7bc40e7d60ce4eb442c9f7cfd984fca234c29891`, deployment `dpl_4Kc2rrY8HQnqs3pgEdQd7pMpNuvY`. Production CI passed all 13 publishing and 36 browser tests. Hosted checks passed at both domains, including apex redirects. Live browser checks exercised the headline, appearance switch, writing preview and article navigation.

The new footer disclosure holds an editable type specimen with font, weight and paper controls. It keeps experiments local to the panel, adds no dependencies or storage, respects reduced motion, remains useful without JavaScript and stays out of print. Opening brings the specimen into view; Escape closes it and restores focus. Safari's pointer focus behaviour required explicitly focusing action buttons so Escape continues to work after Reset.

Code checks passed across 40 files without diagnostics. The build and 13 publishing tests passed. All 10 new Chromium/WebKit cases passed across focused runs after the focus fix and a corrected assertion for scrolling at the document end; the complete suite now contains 46 checks. Coverage includes keyboard, 320px touch layout with long text, reset, no JavaScript, print, live reduced-motion changes and accessibility scans of all three paper colours in both themes. The desktop playground was also inspected in the in-app browser. Physical-device and VoiceOver usability remain manual checks. This addition is prepared on `codex/type-playground` for review.

## Reading details — 26 September 2026

Added ink-drawn underlines to navigation and title links, directional arrow feedback, a prose-based reading marker and a single entrance for the article end mark and recommendation. Prose keeps native underlines. The marker appears only above one and a half screens of prose, sits in the desktop margin and becomes a 2px line below 1051px. It updates after font/image reflow, ignores footer expansion and adds no authoring requirements. Reduced motion leaves a static ending and hides the marker; print omits both. Missing JavaScript or animation/observer APIs leaves the content and navigation usable.

The release build passed with no diagnostics across 42 files and all 13 publishing tests. All 62 Chromium/WebKit browser checks passed, including 16 new cases for keyboard and pointer feedback, stable layout, article progress, footer isolation, reflow at 320/390/768px, short articles, one-time endings, live motion changes, feature fallbacks, no JavaScript, print, both themes and forced colours. The first print assertion incorrectly targeted two elements; separate assertions now verify each decoration is hidden.

Inspected the desktop marker and the phone layout and ending in both themes using the isolated reading sample; browser errors were empty. The final browser screenshots also cover the settled end mark and revised recommendation link. Physical-device gestures and VoiceOver remain manual checks. Verification runs through the existing release and browser commands; no new dependencies were added.

## Homepage arrival and folding colophon — 26 September 2026

Added a coordinated homepage entrance: three headline lines, the introduction, drawn section rules and a brief paper fan settle within 870ms. Links stay stationary. The entrance runs once per tab session and skips internal navigation, Back, hash destinations and reduced motion; early input settles it immediately. The footer playground unfolds over 480ms and folds closed over 320ms. Repeated clicks reverse the same timeline, entering a control settles it, and closing immediately removes its controls from keyboard navigation.

The release build passed with no diagnostics across 45 files and all 13 publishing tests. All 82 Chromium/WebKit browser cases passed across the full run and a focused correction: the new arrival assertion had checked for a later staggered effect too early; it now waits for every expected animation start. Coverage includes blocked storage, missing animation APIs, no JavaScript, history and lifecycle restoration, live reduced-motion changes, rapid reversal, early input, print and widths from 320 to 1200px.

Inspected the entrance mid-frame and at rest, plus the footer playground on desktop and a 390px phone in both themes. The phone document fits its viewport and browser errors were empty. Existing accessibility scans passed for all paper colours in both themes. Physical-device gestures and VoiceOver remain manual checks. No animation dependencies or authoring changes were added.
