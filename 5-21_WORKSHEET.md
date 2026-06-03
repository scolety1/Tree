# 5-21 Work Sheet

Generated from the six DOCX reports Spencer provided on May 21, 2026. This is the working source of truth for the next hardening pass.

## Report Intake Rules

- Preserve screenshots, URLs, console errors, exact reproduction steps, and suggested fixes from the reports.
- Mark each item as `Fix now`, `Needs confirmation`, or `Defer` during implementation triage.
- Work from blocker/high-risk items first, then visible birthday-demo polish.
- Keep live Firebase/Storage/security-rule items called out when they need console verification.

## Triage Summary

Birthday-release north star: Dad can open the site, sign in, see the Colety family tree, browse/search profiles, and add/edit people/photos without the app looking broken or losing him.

### P0 - Fix Or Verify First

- [ ] Add Family Member submit path. The QA report says the private-tree Add Family Member modal does nothing. Re-test live first, then fix form binding, status feedback, modal close, tree refresh, and new-person highlighting if reproduced.
- [ ] Profile photo upload/display. Partly addressed by recent photo-upload fallback work, but still needs live verification against Firebase Storage rules and Firestore data. A saved photo must appear immediately on the profile and survive refresh.
- [ ] Signed-in navigation/routing. Verify signed-in users only see `Family Tree`, `Search`, and the account silhouette. `Family Tree` must never route to `/account`, and there should be no signed-in `Home` or `Dashboard` tab.
- [ ] Account tree loading for `smcolety@gmail.com`. `/account` and `/tree` must load the seeded `colety-birthday-tree` instead of showing a false permission/empty state. Access code controls must appear only for the owner.
- [ ] Add/edit/remove permission path. Owner/editor accounts can add/edit/remove people and upload photos; viewers can browse only. Permission errors must be visible and written in plain English.

### P1 - Birthday Demo Polish

- [ ] Account invite code UX: label it as an invite/access code, separate Copy/Reset buttons visually, show copied/reset success, and explain who should receive the code.
- [ ] Search/profile browser state: searching, opening a profile, then using browser Back should preserve the query/results and return to the expected profile on Forward.
- [ ] Signed-out create/join flow: signed-out create/join actions should redirect to sign-in or show a clear sign-in-required message, never silently clear inputs.
- [ ] Firebase routing/404 polish: unknown routes and bad private tree URLs should show a branded page or useful sign-in/error state, not the default Firebase 404.
- [x] Tree readability quick wins: stronger text contrast, readable compact mode, clearer generation labels, visible horizontal-scroll affordance, and better card hierarchy.
- [ ] Auth polish: reset password should not fire unexpectedly, and Firebase auth errors should be translated into human-friendly field errors.
- [x] Mobile smoke pass: no horizontal page overflow outside the tree canvas, tappable controls, modals usable on a small viewport, and clear swipe/scroll cues.

### P2 - Worth Doing After P0/P1

- [ ] Profile relationship links: parents, spouse, and children should be clickable profile links.
- [ ] Account member-management polish: role explanations, remove-member confirmation, archive/leave warnings, and cleaner tree edit controls.
- [ ] Loading/error states: spinners or skeletons for tree/search/account loading, with clear retryable errors.
- [ ] Accessibility pass: aria labels for icon buttons, visible keyboard focus, better tab order, and descriptive labels.
- [ ] Profile navigation improvements: breadcrumb, return-to-scroll-position, or side-panel profile view.
- [ ] In-tree search/focus highlight for larger trees.

### Defer Until After Birthday Demo

- Full Family Chart/D3 library migration.
- Pan/zoom/minimap/collapse-branch system.
- Advanced genealogy modeling for remarriages, half-siblings, loops, duplicate branches, and GEDCOM import/export.
- Service worker/performance overhaul, analytics, themes, PDF/image export, and formal privacy-policy page.

### Already Partly Addressed - Still Verify Live

- Randomized access codes and hardened code reset path: `ae08672`.
- Account roles, member access, and profile photo support: `d6a6a19`, `5ac2bc4`, `05ff393`.
- Route/header stabilization and no-cache deploy setup: `941071e`, `f33ef5e`.
- Larger demo/stress tree and header/logo polish: `58359cf`, `3c1294f`.

### Working Order

1. Reproduce and fix P0 issues against the current local build.
2. Run local static checks and browser smoke checks.
3. Deploy to Firebase only after local smoke passes.
4. Re-test live signed-in and signed-out paths, especially `/account`, `/tree`, `/search`, `/profile`, and photo upload.
5. Commit and push only after the live pass is clean.

### Current Pass Progress - May 21

- Done locally: extracted shared starter-tree creation into `js/starterTree.js` and made `/tree`/`/search` able to create a starter Colety tree when a signed-in user has no usable tree yet.
- Done locally: hardened Add Family Member success feedback by returning the saved person id, refreshing the tree, scrolling to the new card, and highlighting it.
- Done locally: preserved search query state in the URL and profile back-links so Search -> Profile -> Back keeps the query.
- Done locally: made profile parent/spouse/child names clickable profile links.
- Done locally: cleaned the account invite-code display so Copy/Reset are controls, not part of the code text.
- Done locally: replaced technical auth errors with friendlier copy and added safe redirect-back behavior after sign-in.
- Done locally: stopped the Firebase-hosted profile page from calling the old `/api/funfact` endpoint, which was producing a 404 console error under Firebase Hosting.
- Done locally: added clean signed-out handling for private search/profile URLs so permission errors become sign-in messages.
- Done locally: added a branded Firebase `404.html` fallback page.
- Done locally: kept embedded photo fallbacks from poisoning the profile edit "Photo URL" field on the next edit.
- Done locally: expanded the large demo tree to 6 generations / 80 people and forced that stress-test view to open in compact mode.
- Done locally: changed large trees into a wrapped generation overview mode, disabled misleading connector lines in that mode, and clamped horizontal page overflow.
- Done locally: bumped static asset versions to `20260522-11` so Firebase/browser cache cannot keep serving the older scripts.
- Verified locally: `npm run check` passes and signed-out home/tree/search/profile smoke checks work against the static server.
- Verified locally: large demo smoke test loads 80 cards across 6 generations in compact mode with no console errors.
- Still needs live Firebase/auth testing: signed-in account tree loading, real Add Family Member save, real edit/remove permissions, and profile photo upload/display.

### Large Tree Layout Spike - May 22

- Done locally: added an isolated Family Chart prototype page at `/tree-spike` / `html/family_chart_spike.html` without replacing the current tree page.
- Done locally: extracted the 6-generation / 80-person stress data into `js/demoTreeData.js` so the current tree and the prototype use the same demo source.
- Done locally: mapped the existing person shape into Family Chart data: `id`, display fields, `rels.parents`, `rels.spouses`, and derived `rels.children`.
- Verified locally: the Family Chart UMD build renders the 80-person demo, supports pan/zoom, focus-by-person, fit-to-screen, and vertical/horizontal orientation controls with no browser console errors.
- Verified locally: the current large demo page still loads 80 people across 6 generations in compact overview mode with no console errors after the demo-data extraction.
- Finding: Family Chart is viable for a larger-family replacement spike. It handles the pan/zoom/focus problem better than the hand-built wrapped grid, but it still needs card styling, mobile review, real Firestore data mapping, and a decision on CDN vs vendored library before replacing `/tree`.
- Finding: the Family Chart ESM CDN path had a D3 transition mismatch in this plain static app. The UMD/global D3 path is the safer prototype route unless we introduce a bundler or import-map strategy.
- Keep next: leave `/tree-spike` as a test route for layout exploration. Do not switch the birthday demo tree page to it until edit/profile links, permissions, loading states, and real signed-in data are proven.

### Relationship Data Model Review - May 22

Current stored person shape:

- Stable fields now being written: `parentIds: string[]`, `spouseIds: string[]`, `familyId`, normalized lowercase `firstName` / `lastName`.
- Legacy compatibility fields still present in older records and still written today for readability/back-compat: `parent1`, `parent2`, `spouseFirstName`, `spouseLastName`.
- Children are not stored directly. They are derived by scanning people where the current person's id is in a child's `parentIds`, with legacy fallback through `parent1` / `parent2`.

Findings:

- `parentIds` is the right long-term source of truth for parent-child edges. It is stable across name changes and maps cleanly into Family Chart `rels.parents`.
- `children` should remain derived, not stored, for now. Storing children creates two-way sync risk every time a parent changes. Large-tree renderers can build `childIdsByParentId` in memory.
- `spouseIds` needs normalization. The app often stores spouse data on the edited/new person only, so one side can say "A is married to B" while B does not explicitly list A. Some helpers handle either direction, but profile display and chart mappings can miss the reciprocal relationship unless we normalize before rendering.
- Legacy name fields are useful only as a read fallback. They break on duplicate names and name edits, so they should not be required by new layout code.
- Large-family layout libraries want a fully normalized in-memory graph: each person has stable `id`, `rels.parents`, symmetric `rels.spouses`, and derived `rels.children`.

Compatibility plan:

- Phase 1 read path: keep reading both ID-based and legacy name-based relationships. Normalize in memory through shared helpers before profile display, search context, tree grouping, and Family Chart mapping.
- Phase 1 write path: continue writing `parentIds` / `spouseIds` for all new edits. Legacy fields can remain as optional compatibility labels during the birthday release, but no new feature should depend on them.
- Phase 2 soft repair: when a profile is edited, save clean ID arrays and delete stale legacy fields if the user selected relationships from dropdown IDs. Do not bulk-edit every person live before the demo.
- Phase 3 migration script: add an owner-run/admin script that scans each family, resolves `parent1` / `parent2` / spouse names to IDs where unambiguous, writes `parentIds` / `spouseIds`, logs duplicate/unknown names, and leaves ambiguous records untouched for manual review.
- Phase 4 schema tightening: once live data is repaired, stop writing legacy relationship name fields and document `parentIds` / `spouseIds` as the canonical model.

Done locally:

- Added shared helper normalization for `resolvePersonParentIds`, `resolvePersonSpouseIds`, and `derivePersonChildren`.
- Updated profile display/edit defaults so legacy parents, ID parents, one-way spouse IDs, and legacy spouse names resolve through the same compatibility layer.
- Updated the Family Chart spike mapper to use the same compatibility layer before producing `rels.parents`, `rels.spouses`, and `rels.children`.

### Large Tree Search/Focus Pass - May 22

- Done locally: added a `Find person` control directly on the tree page toolbar with name suggestions from the currently loaded tree.
- Done locally: tree search highlights all matching cards, dims non-matches, scrolls/centers the active match when possible, and supports `Prev` / `Next` across multiple matches.
- Done locally: large-tree overview copy now points people to `Find person` instead of expecting them to visually scan 80+ cards.
- Done locally: adjusted overview-mode spouse-pair cards so focused results stay readable on mobile instead of squeezing into tiny cards.
- Verified locally: desktop smoke on the 80-person large demo can search `colety`, step to the second of 51 matches, and shows no console errors.
- Verified locally: mobile smoke at 390px can search `milo`, focus the matching card in view, keeps page width contained, and shows no console errors.

### Large Tree Collapse/Expand Pass - May 22

- Done locally: added first-pass collapse for current large-tree overview mode without replacing the renderer or moving to Family Chart.
- Done locally: large trees now show the first 3 generations by default and tuck later generations behind a single `Show N more descendants` control.
- Done locally: expanding/collapsing does not re-render the tree, so users keep their place; collapsing clears focus only if the focused card is in a hidden generation.
- Done locally: tree-page search automatically expands hidden later generations before focusing a matching card.
- Verified locally: desktop large-demo smoke starts with 3 visible generations / 49 visible cards and 3 hidden generations / 31 hidden cards, expands to all 80 cards, collapses back cleanly, and shows no console errors.
- Verified locally: searching `milo` while later generations are collapsed expands the hidden generations and focuses Milo in generation 4 with no console errors.
- Verified locally: mobile smoke at 390px keeps the collapse panel and expand button inside the viewport, expands to all generations, and shows no console errors.

Tradeoffs:

- This is generation-level collapse, not true branch-level collapse. It is simple, stable, and compatible with the current renderer, but it cannot yet collapse one sprawling family branch while leaving another branch open.
- The visible/hidden count is based on rendered generation groups, not genealogical descendant paths from a selected ancestor.
- Family Chart is still the better long-term path for pan/zoom and branch exploration, but the current renderer now has a safer birthday-demo fallback for 5-6 generations.

Still needed:

- Add branch-level collapse once the data model and large-layout strategy settle: "Show Tim's descendants", not only "Show later generations".
- Preserve collapse/expanded state in the URL or session if users navigate away and come back.
- Test with real signed-in Firestore data containing photos, duplicate names, legacy-only relationships, and uneven branch depth.

### Family Chart Integration Decision - May 22

Decision for birthday demo:

- Keep the custom renderer as the real `/tree` experience for the birthday release.
- Do not replace `/tree` with Family Chart before live private-tree testing. The custom renderer already has add/edit/profile links, search/focus, generation collapse, no-overflow behavior, and mobile smoke coverage.
- Treat Family Chart as viable but not yet primary. It is clearly better for pan/zoom/focus exploration, but it still needs real private-tree proof, card/link behavior, CDN/vendor decision, and mobile interaction review before it owns the main demo path.

Smallest safe implementation started:

- Added a `Chart beta` link from the real tree toolbar to `/tree-spike`.
- Updated `/tree-spike` so it can load the signed-in current family tree when available, while still falling back to the 80-person large demo when signed out or using `?demo=large`.
- Kept `/tree-spike` isolated from editing and profile navigation for now. It is a read-only layout proving ground, not the birthday demo source of truth.

Phased Family Chart plan:

- Phase A: opt-in beta only. Keep `/tree` custom; use `/tree-spike` for real-data layout testing, pan/zoom, focus, and mobile checks.
- Phase B: make Family Chart cards useful. Add profile links or a side-panel profile preview, preserve current familyId, and handle private-tree empty/loading/error states.
- Phase C: compare against the custom renderer with real Colety data. Test 5-6 generations, photos, duplicate names, legacy relationships, one-way spouses, and uneven branch depth.
- Phase D: decide default behavior. If Family Chart passes, add a view switch on `/tree` or make it the large-tree-only renderer while keeping the custom card list as fallback.
- Phase E: remove CDN risk. Vendor the UMD assets or introduce a small build/import strategy before relying on Family Chart for the production birthday page.

Verified locally:

- Custom `/tree?demo=large` still starts collapsed with 3 visible generations, 3 hidden later generations, 80 total cards, and no console errors.
- The `Chart beta` link points to `/tree-spike?demo=large` for the demo tree.
- `/tree-spike?demo=large` renders the 80-person Family Chart beta with 80 focus options and no console errors.
- Mobile smoke at 390px keeps both the custom toolbar/link and Family Chart beta panel inside the viewport with no console errors.

Relationship model still needed:

- Add a data audit/debug page or script that lists unresolved legacy names, duplicate full names, one-way spouse links, self-parent/self-spouse mistakes, and missing parent IDs.
- Decide whether add/edit should also write reciprocal spouse IDs immediately, or whether reciprocal spouse edges should stay derived in memory. For the birthday release, deriving reciprocal spouse edges is safer than multi-document updates.
- Before replacing `/tree` with Family Chart, test real private Firestore data that includes legacy-only parents, one-way spouses, duplicate names, and edited names.

### Mobile Large Tree Pass - May 22

Done locally:

- Tightened the current custom tree renderer for phone widths without switching to Family Chart.
- Added phone-specific tree card sizing, padding, tap-target sizing, and internal scroll containment so the page itself does not horizontally overflow.
- Balanced the mobile `Find person` controls into a full-width input plus three equal action buttons.
- Changed large-tree collapse behavior on phones to show only the first 2 generations by default, then tuck later generations behind a single `Show N more descendants` control. Desktop still shows the first 3 generations before the collapse control.
- Kept search/focus as the main large-tree navigation path. Searching for someone in a hidden generation expands the tucked-away generations and scrolls/focuses the matching card.

Verified locally:

- Desktop large demo at 1280px: no page-level horizontal overflow, 49 visible cards, 3 hidden later generations, and search for `milo` expands/focuses correctly.
- Mobile large demo at 390px: document width stays contained at 375px, controls stay inside the viewport, all tree action controls are at least 44px tall, 24 cards are visible by default, 4 later generations are hidden, and search for `milo` expands/focuses correctly.
- Narrow mobile large demo at 320px: document width stays contained at 305px, controls stay inside the viewport, all tree action controls are at least 44px tall, 24 cards are visible by default, 4 later generations are hidden, and search for `milo` expands/focuses correctly.

Still needs live testing:

- Real signed-in Colety tree on an actual phone, especially Safari/iPhone and Android Chrome touch scrolling.
- Add-person modal usability on a phone with the real Firebase write path.
- Photo-heavy profiles/cards on mobile once real family photos are uploaded.
- Whether Dad prefers the phone view to start at 2 generations or wants generation 3 visible by default despite the extra scrolling.

### Final Large-Tree Birthday Demo Polish - May 22

Done locally:

- Added an intentional large-tree summary panel inside the tree canvas: people count, generation count, and hidden descendant count.
- Reworked generation labels from generic `Generation N` only into friendlier labels with counts: `Founders`, `Children`, `Grandchildren`, `Great-grandchildren`, and later numbered generations.
- Added small relationship chips to overview cards, such as child counts, partnered status, or leaf-branch status, so the wrapped overview reads like a family map instead of unrelated cards.
- Gave spouse/partner pairs a subtle grouped background in overview mode so relationships are easier to scan when connector lines are intentionally disabled for large wrapped trees.
- Replaced loose loading/empty/error paragraphs with a reusable tree state card that has a title and plain-language message.
- Improved profile return paths: a profile opened from the tree now returns to `/tree?...&focus=<personId>`, and the tree expands/scrolls/focuses that card on return.
- Bumped static asset keys to `20260522-11`.

Acceptance smoke:

- Desktop large demo at 1280px: 80 people, 6 generations, 49 visible cards by default, 31 hidden descendants, summary panel present, friendly generation labels present, no page-level horizontal overflow.
- Desktop large demo with `focus=demo-g4-11`: hidden generations expand and `Milo Colety` is focused on load.
- Mobile large demo at 390px: 24 visible cards by default, 56 hidden descendants, controls remain inside the viewport, no page-level horizontal overflow, search for `milo` expands/focuses correctly.
- Narrow mobile large demo at 320px: same behavior as 390px with contained page width.
- Profile return-path smoke: `/profile?person=colety_spencer&familyId=colety-birthday-tree&from=tree` produces `/tree?familyId=colety-birthday-tree&focus=colety_spencer`.
- Static checks: `npm run check` passes. `git diff --check` reports only normal Windows CRLF warnings.

Deploy readiness:

- Ready to deploy for visual review of the signed-out large demo and current custom tree renderer.
- Do not call Family Chart the production tree yet; it remains a beta/spike path.
- Live Firebase still needs verification for signed-in `smcolety@gmail.com`, the seeded Colety starter tree, add/edit/remove people, profile photo upload, Firebase Storage fallback behavior, and actual iPhone/Android touch scrolling.

### Family Chart Baseline QA - May 26

Prompt source: `TREE_2026-05-25_IMPROVEMENTS_QUEUE.md` prompt 1.

Checked live:

- `/tree-spike?demo=large` using Family Chart/D3.
- `/tree?demo=large` using the custom renderer.
- Desktop 1280 x 720 and mobile 390 x 844.
- Both routes served current `20260522-11` assets.

Decision:

- Family Chart is the better direction for the final large-family tree because visible relationship paths are central to the experience Spencer wants.
- Family Chart is not ready to replace `/tree` yet. Keep it as the beta path until controls, cards, selected-person details, profile links, and mobile behavior are improved.
- The custom tree remains the safer fallback for profile/edit/add/search flows until Family Chart gets those app integrations.

Key findings:

- Family Chart paths look much closer to a real family tree, but the default view feels disorienting and can open in a random-looking branch cluster.
- Cards are too small, too generic, and not branded enough for the birthday demo.
- Current focus control is a long select dropdown, not a friendly search/focus experience.
- Selected people need stronger highlighting and immediate-family path emphasis.
- The chart needs a selected-person side panel or bottom sheet to explain parents, spouse/partner, children, and profile actions.
- Mobile is technically contained with no page-level overflow, but the chart starts below the first screen because the prototype hero and controls are too tall.
- Profile/edit integration is the largest functional blocker before replacement.

Recommended next work:

1. Improve Family Chart default centering/fit/reset/zoom controls.
2. Restyle chart cards for readability.
3. Add selected-person details.
4. Add search/focus and path highlighting.
5. Wire real private-tree data and profile links.
6. Do a dedicated mobile chart pass.
7. Add a safe `/tree` view switch only after the above is stable.

## 1. Bug Audit Report

_Source: `QA Report Request.docx`_

### Family Tree Web App QA Report

#### Overview

I audited the tree-72e80.web.app family‑tree application and its associated GitHub repository (scolety1/Tree) to find bugs and usability issues. Testing covered the signed‑out experience, sign‑in and account management, the private tree editor, profile pages, add/edit person flows, photo uploading, search, mobile/responsive considerations (as far as possible in this environment), navigation/back‑forward behaviour and selected repository code. All tests were conducted on 21 May 2026 using Chromium on a desktop environment.

#### Summary of major findings

| Severity | Area | Description |

| --- | --- | --- |

| Blocker | Add Family Member flow | Clicking Add Family Member in a private tree does nothing—no person is saved, no feedback is shown and the modal stays open. This prevents adding new people entirely. |

| High | Profile photo upload | Uploading a new profile photo appears to succeed, but the image is not displayed afterwards. No error is shown. |

| Medium | Access‑code reset UX | Resetting the tree access code uses a native confirm dialog. There is no success message and the code appears unchanged until the page refreshes. |

| Medium | Browser back navigation | Going back from a profile to the search page loses the search query. Forward navigation returns to an unexpected page. |

| Low | Mobile/responsive layout | No dedicated mobile layout testing was performed due to tool limitations, but the app appears to use fixed widths in several components. Without responsive adjustments, the tree grid and forms may be difficult to use on smaller screens. |

#### Detailed issues and recommendations

##### 1. Add Family Member flow is broken (Blocker)

- Page/flow: Private Family Tree → Add Family Member modal.

- Steps to reproduce:

- Sign in and open a private family tree.

- Click the floating + button to open the Add Family Member modal.

- Fill in required fields (first name and last name) and optionally select parents/spouse.

- Click Add Family Member.

- Expected: Form submission triggers a save, feedback appears (“Saved X Y”), the modal closes and the new person appears in the tree.

- Actual: Clicking the button does nothing. The modal remains open and no message appears. After closing the modal, the tree still contains the original 8 people. There are no network requests or console messages visible from the front‑end.

- **Likely cause:** The “Add Family Member” button is not bound to the form’s submit event. In postPeople.js the save logic is attached to form.addEventListener('submit')[1], but the modal uses a separate button that is not of type submit or is outside the <form> element, so the event never fires. Another possibility is that the script isn’t loaded on the tree page (the modal is created dynamically, but postPeople.js may only be included on /profile or /postPeople.html).

- **Suggested fix:**

- Ensure the Add Family Member button has type="submit" and is inside the <form id="addPersonForm"> so that the submit listener runs.

- Confirm that postPeople.js is loaded on the family tree page and that addPersonForm exists in the DOM when the modal is rendered.

- Provide user feedback during saving (e.g., disable the button and show “Saving…”), then close the modal on success. Display validation errors using the statusEl element referenced in the script[1].

- **Acceptance test:** Add a new person with first and last name (and optionally parents). After clicking Add Family Member, the modal should close, a toast/message should say “Saved …”, and the person should appear in the tree without requiring a full page reload.

##### 2. Profile photo upload not reflected (High)

- Page/flow: Profile → Edit Profile → Upload photo.

- Steps to reproduce:

- On a private tree, open any person’s profile and click Edit Profile.

- Use the Choose File input to upload a JPEG/PNG file (e.g., placeholder_light_gray_block.png).

- Click Save Changes and wait until the modal closes.

- Expected: The uploaded photo is stored in Firebase Storage and the profile page shows the new image.

- Actual: A status “Uploading photo…” briefly appears, the modal closes, but the profile shows a blank (placeholder) square. Waiting does not load the image.

- **Likely cause:** After uploading, the photo URL may not be saved to the person document, or the image property is not used when rendering the profile. In postPeople.js, uploadPersonImage() sets personData.image = await uploadPersonImage(...)[2] and writes it to Firestore[3]. However, the profile display code (likely in profile.js) may read a different property or fail to handle image.

- **Suggested fix:**

- Verify that the uploaded image URL is stored on the person document (check Firestore). Ensure image field is used consistently (not photoURL or similar).

- In profile.js, update the profile rendering to check for person.image and set the <img> src accordingly; fall back to a placeholder only if no image exists.

- Provide user feedback on upload failure and success. If the upload fails, show the error message returned from uploadPersonImage()[4].

- **Acceptance test:** Upload an image on a profile. After saving, the image should appear immediately on the profile page. Refreshing the page should still display the uploaded image.

##### 3. Access‑code reset lacks feedback (Medium)

- Page/flow: Account → Reset access code.

- Steps to reproduce:

- On the account page, click Reset next to the access code.

- Accept the native confirmation dialog.

- Expected: The access code resets and a message indicates the new code. The interface should update immediately to reflect the new code.

- Actual: A browser confirm() dialog asks for confirmation, but after clicking OK there is no success message. The code appears unchanged until the page is refreshed or some internal state updates. It is unclear whether the reset succeeded.

- **Likely cause:** The UI does not update the displayed access code immediately after the reset. The reset function probably updates Firestore but does not update the DOM or show a toast.

- **Suggested fix:**

- After resetting the code, update the DOM element that shows the code and display a success message (e.g., “Access code reset to P4SQS66ND”).

- Avoid using native confirm() dialogs; use a custom modal so styling matches the rest of the app.

- **Acceptance test:** Reset the access code. The code displayed on the page updates immediately, and a toast informs the user that the code was changed.

##### 4. Browser navigation resets search state (Medium)

- Page/flow: Search → Profile → Browser back/forward.

- Steps to reproduce:

- From the private tree, open the search page and search for a name (e.g., “Tim”).

- Click a result to open that person’s profile.

- Use the browser’s back button to return to the search page.

- Expected: The search page should retain the query and results so the user can continue exploring.

- Actual: The search input is cleared and results are lost. Using the browser’s forward button sometimes navigates to an unexpected page (e.g., account instead of the profile). Only the “Back to Search” button on the profile preserves context.

- **Likely cause:** The search page does not persist the query in the URL or local state. Navigating back reloads a fresh page without the previous search. The forward navigation confusion suggests routes aren’t pushed consistently into the browser history.

- **Suggested fix:**

- Encode search queries in the URL (e.g., /search?query=tim&familyId=…) and read them on page load.

- When navigating to a profile from search results, push the new page onto history properly. Use history.pushState() to preserve states if necessary.

- **Acceptance test:** After searching, opening a profile and clicking the browser back arrow should return to the search page with the previous query and results intact. The forward arrow should return to the profile.

##### 5. Minor usability and layout issues (Low)

- Mobile/responsive layout: While full mobile testing wasn’t possible, several components (tree grid, forms, modals) use fixed widths and may not adapt gracefully on smaller screens. For example, the tree grid requires horizontal scrolling even on desktop, and modal forms may exceed viewport height. Include responsive CSS (@media queries) to adjust the layout for phones and tablets.

- Example vs. private tree messaging: Error messages in the add‑person form refer to the “example tree” even when adding to a private tree[1]. Update messages to reflect whether the user is in the example or private tree.

- Accessibility: Several buttons are represented only by icons (e.g., the floating “+”). Add descriptive aria‑label attributes and tooltips for screen readers.

- User feedback consistency: The app occasionally uses native browser dialogs (e.g., access‑code reset) instead of the site’s styled modals. Consistent styling improves user trust.

#### Additional observations

- Security & permission handling: The postPeople.js script correctly checks whether the user can edit the tree and shows status messages accordingly[1]. However, because the add form doesn’t submit, these messages never appear.

- Profile editing: Editing an existing person works correctly. Changes to the bio are saved and displayed after a reload. The Remove This Person button exists but was not tested for safety reasons.

- Search: Search results are fast and show matched names clearly. Searching within the example tree is read‑only. The private tree search functions similarly but currently loses state when navigating with browser buttons.

#### Conclusion

The family‑tree web app provides a promising interface for collaborative genealogy but suffers from a critical bug that prevents adding new members. Resolving the submission issue in the add‑person form, ensuring images upload/display correctly, and improving user feedback will significantly enhance the usability and reliability of the application. Addressing medium‑ and low‑priority issues (navigation, responsiveness, accessibility) will further polish the experience and reduce friction during demonstrations.

[1] [2] [3] [4] raw.githubusercontent.com

https://raw.githubusercontent.com/scolety1/Tree/main/js/postPeople.js

## 2. Family Tree Page Improvement Report

_Source: `Family Tree Page Review.docx`_

### Family Tree Page Improvement Report

This review focuses on the Family Tree page of the Tree application as deployed at tree-72e80.web.app. The example tree shows a multigenerational family with profile cards connected by vertical lines to denote parent–child relationships and horizontal lines to indicate marriages or partnerships. The page allows selecting different density levels (Comfortable, Dense, Compact), clicking on cards to view a read‑only profile and includes a floating + button to add people. The findings below are organized by UX area and include practical recommendations supported by design guidelines and research.

#### Tree Readability

##### Problems

- Text is small and low‑contrast at dense settings. On the “Compact” setting, names and dates shrink and grey lines are faint. Research into readability stresses that legibility relies on large default font sizes, high contrast text and clean typefaces[1].

- Generational labels are small and compete with the grid. Generation labels (e.g., GENERATION 1) appear in small grey text along the left. The Family Tree Maker guide notes that generation labels can help orient users when dealing with many generations[2], but should not clutter the page.

- Crowded spacing for large trees. When many siblings exist in one generation, cards crowd together and overlapping connector lines make it hard to follow family relationships. The FTM guide warns that overloaded charts with too much information become unmanageable[3] and recommends adjusting spacing to fit the chart[4].

##### Why It Matters

Readability affects whether non‑technical relatives can understand the tree. High readability improves engagement and comprehension[5]. Poor contrast or small fonts can be inaccessible for older family members. Clear generational grouping helps users orient themselves.

##### Suggested Fixes

- Improve default text size and contrast. Use a minimum 14–16 px font for names, increase weight or color contrast in dense/compact modes to maintain legibility[1]. Provide a setting to switch between font sizes.

- Refine generation labels. Increase the label font size and boldness; place them above each row rather than down the side so they remain visible when horizontally scrolling. Allow users to toggle labels on/off (similar to the density control) because generation labels are optional for small trees[2].

- Adjust card spacing algorithm. When the tree exceeds a certain number of siblings, automatically increase horizontal spacing or compress vertical spacing instead of overlapping cards. Offer a “zoom to fit” control so users can scale the tree and avoid crowding.

- Use background shading or alternate row colors to differentiate generations. Negative space improves readability and helps users scan information[6].

##### Complexity

Mostly medium. Updating CSS for fonts and contrast is small; dynamic spacing and generation toggles require medium complexity due to layout calculations.

##### Acceptance Tests

- On the densest setting, the smallest text is at least 14 px with sufficient contrast (meets WCAG guidelines). Users should easily read names on desktop and mobile.

- Generation labels can be toggled. When toggled off, they disappear; when toggled on, they appear above each generation. Labels do not overlap with cards when scrolling.

- Adding multiple siblings (e.g., 6 children) does not cause cards to overlap; horizontal scrolling remains smooth.

#### Profile Card Design

##### Problems

- Information hierarchy is weak. All text within a card (name, birth date, spouse) is the same size and weight, making it hard to distinguish important information. Overloading cards with facts diminishes readability[3].

- Lack of visual cues (gender/photo). Cards show only initials; there is no option to display a small photo or gender indicator. The Family Tree Maker guide suggests using different box shapes or colors for male and female individuals[7].

- Truncated names in compact mode. Long names overflow or wrap awkwardly, causing misalignment.

- Cards are static in the example tree; editing requires going to another page.

##### Why It Matters

Clear hierarchy helps users scan quickly[8]. Distinguishing gender and relationship status reduces cognitive load when navigating large families. Photos personalize the tree and engage non‑technical relatives.

##### Suggested Fixes

- Apply visual hierarchy within cards. Make the name bold and slightly larger than secondary data. Use icons for birth date and spouse rather than text labels to reduce clutter.

- Allow photos or avatars. Display a small circular photo or user‑selected avatar where the initials currently appear. If photos are unavailable, use shape/color differentiation for genders (e.g., blue square for male, pink circle for female) while ensuring adequate contrast[7].

- Responsive name handling. Use CSS to truncate long names with ellipses and show the full name on hover/tap. This prevents cards from expanding unpredictably.

- Inline edit quick‑actions. For private trees, add small edit or plus icons inside each card to add parents, spouses or children without navigating away. Keep these icons large enough to meet the 24×24 px minimum target size for touch controls[9].

##### Complexity

Medium. Updating card templates and adding photo upload functionality require database changes. Implementing responsive truncation is small.

##### Acceptance Tests

- The card name text is noticeably larger than the birth date text; screen readers maintain correct reading order.

- Icons for birth and spouse are visible and the card looks uncluttered when more than two facts are present.

- Users can upload or select a picture on the add/edit form; the avatar appears on the card after saving.

- On mobile, tapping an edit icon opens inline editing without navigating; each interactive icon is at least 24 px with proper spacing[9].

#### Relationship Lines

##### Problems

- Line styles do not communicate relationship types. Currently all lines are solid and grey, making it hard to distinguish marriages from parent‑child connections. The MyHeritage guide explains that horizontal lines connect people of the same generation, vertical lines connect parents to children and solid lines indicate marriage, while dotted lines indicate divorce or separation[10].

- Lines overlap at high density. When many siblings are present, horizontal lines cross through other cards, causing confusion.

##### Why It Matters

Properly encoding relationship types with line styles helps users interpret complex family structures quickly[10]. Reducing visual clutter improves readability and reduces mistakes when exploring ancestral relationships.

##### Suggested Fixes

- Differentiate line styles. Use consistent conventions: solid vertical lines for parent–child, solid horizontal for current marriages, dashed horizontal for divorced/separated partners, and curved connectors for adopted relationships.

- Hover or tap highlights. When a user hovers over (or taps) a card, highlight the lines connecting that individual to their spouse and children. Dim other lines to reduce clutter.

- Avoid line overlap. Increase horizontal spacing or implement a routing algorithm that curves lines around cards in dense branches to avoid crossing paths.

##### Complexity

Medium to large. Implementing line‑routing and hover highlighting requires custom SVG or canvas drawing. Changing line styles is straightforward.

##### Acceptance Tests

- Married couples are connected by a solid horizontal line; divorced couples by a dashed line. Parent–child connections remain vertical.

- Hovering over a person dims unrelated lines and emphasizes their immediate family connections.

- In a test tree with three siblings and two marriages per generation, connector lines do not overlap any cards.

#### Large Family Behavior

##### Problems

- Horizontal scrolling is non‑obvious. The example tree requires horizontal scrolling for wider branches, but there are no indicators (e.g., arrows) and the scroll bar on desktop is small. Non‑technical users may not realize they can scroll sideways.

- No overview or mini‑map. In large families the user may lose track of where they are within the tree.

- Generation labels disappear when scrolled horizontally.

##### Why It Matters

Large trees quickly become unwieldy. Users need orientation aids to find relatives easily. Without cues, they may assume that the tree ends at the current view and not realize more relatives exist.

##### Suggested Fixes

- Add directional affordances. Display subtle arrows or gradient fades on the right and left edges to suggest horizontal scrolling. Use a sticky bottom scroll bar with a clear thumb.

- Provide an overview or mini‑map. Offer a small thumbnail of the entire tree with a viewport rectangle; dragging the rectangle pans the main view. This helps users jump to branches quickly.

- Sticky generation header. Keep generation labels fixed at the top or left as the user scrolls horizontally so context is not lost.

- Zoom controls. Allow users to zoom out to see the entire tree or zoom in on a branch.

##### Complexity

Large. Implementing a mini‑map and zoom may require rewriting the tree renderer. Adding scroll hints is small.

##### Acceptance Tests

- When the tree width exceeds the viewport, gradient overlays or arrows appear at the edges indicating more content. Scrolling horizontally reveals additional nodes.

- A mini‑map icon toggles a thumbnail view; dragging the viewport box pans the main tree.

- Generation labels remain visible as the user scrolls horizontally.

#### Add Person Workflow

##### Problems

- Floating + button may be missed. The button appears only after data loads and is small. WCAG guidelines require touch targets to be at least 24 × 24 px[9]; small targets are hard to tap on mobile.

- No guidance on what information is required. The add person form (in private trees) asks for name and other details, but the example tree does not indicate which fields are mandatory. NN/G research states that using an asterisk to mark required fields improves usability, whereas marking optional fields is confusing[11].

- Unclear parent/spouse selection. Users must manually choose parents and spouse from a list, but the relationship selection is not always obvious. Adding parents first is recommended but not clearly communicated.

- Long form on mobile. On small screens the vertical form may require excessive scrolling, and error messages may not be anchored near the fields.

##### Why It Matters

Adding relatives is the core task for building a tree. A confusing form discourages family members from contributing. Clear indicators of required fields and intuitive parent/spouse selection reduce abandonment and errors[12].

##### Suggested Fixes

- Increase button size and add label. Make the + button at least 44 px (Apple/Google guideline), add a tooltip or label (“Add Person”) so users know its purpose.

- Use progressive disclosure. Start with only essential fields (first and last name, gender) and show additional optional fields (middle name, birth date, description) in an expandable section. This reduces cognitive load.

- Mark required fields explicitly. Use a red asterisk next to required labels[11], and avoid generic “All fields are required” messages. If no information is required for a field, label it “optional”.

- Guided relationship selection. Offer quick‑select buttons like “Add Parent”, “Add Spouse”, “Add Child” that pre‑set the relationship type. When adding a person from an existing card, pre‑populate that card as the parent or spouse.

- Inline validation and clear error placement. Show error messages immediately below the relevant field, and ensure messages persist until the field is corrected. Avoid showing errors at the top of the form.

##### Complexity

Medium. Adjusting button sizes is small. Progressive disclosure and relationship helpers require UI changes and additional logic.

##### Acceptance Tests

- The + button is ≥44 px square and includes a visible label on hover/tap. On mobile the button is easily tappable.

- The add person form displays a red asterisk next to “First Name” and “Last Name” fields and marks optional fields explicitly. Submitting without required data triggers inline error messages.

- When adding a person from within a card, the relationship type is preselected (e.g., clicking “Add Child” on an individual sets that person as a parent on the form).

#### Edit/Profile Navigation

##### Problems

- Two separate pages for viewing and editing. Clicking a card opens a profile page in a new view. To return to the tree, users must click “Back to Family Tree”. Non‑technical users may not understand they have left the tree and may get lost.

- No breadcrumb or context indicator. The profile page does not show where the individual sits within the tree (parents/spouse/children links are not interactive). It merely lists names.

- Edit actions hidden. In a private tree, edit buttons appear only after toggling an editor mode or require another step.

##### Why It Matters

A seamless navigation flow keeps users oriented and reduces frustration. Maintaining context when editing data encourages contributions. Without breadcrumbs, users may need to back‑track multiple times to find their original position.

##### Suggested Fixes

- Open profiles in a side panel or modal. Instead of a separate page, display the profile in a right‑hand drawer or overlay that preserves the tree view in the background. This allows quick reference to the full tree and reduces disorientation.

- Provide breadcrumbs or mini‑tree. At the top of the profile, show a breadcrumb like “Grandfather → Father → [Person]” linking back to each ancestor. Each link returns to that individual’s card in the tree.

- Inline editing within profile. When permitted, allow editing directly within the profile drawer. Use labeled edit icons for each field; ensure controls meet size/spacing guidelines[9].

- Persistent back button. Keep a visible back arrow pinned to the top of the panel. On pressing it, return to the previously viewed location in the tree (preserving scroll position).

##### Complexity

Medium to large. Implementing a profile drawer and breadcrumb navigation requires routing changes. Inline editing may require reworking forms.

##### Acceptance Tests

- Clicking a card opens a panel overlay that slides in and lists details with edit icons (if editing is allowed). Closing the panel returns to the same tree scroll position.

- A breadcrumb path shows the person’s immediate lineage; clicking a parent or child in the breadcrumb scrolls the tree to that card.

#### Empty States

##### Problems

- Blank canvas gives no guidance. When a new tree has no people, the page shows an empty grid and floating + button but no explanation. Non‑technical relatives may not understand what to do.

- Lack of encouragement to invite family. The page does not suggest inviting other relatives or provide an onboarding sequence.

##### Why It Matters

Well‑designed empty states educate and motivate users. Without guidance, first‑time users may abandon the page because they cannot see any content.

##### Suggested Fixes

- Provide an informative empty state message. Display a friendly illustration and copy like “Start building your family tree by adding your first relative” with a prominent “Add Person” button. Keep the text concise and left‑aligned as recommended for readability[8].

- Suggest next steps. Offer quick actions to “Import a GEDCOM file” (if supported) or “Invite relatives by sharing a code”.

- Show examples. Include a link to the example tree or a short video explaining how the tree works. Visual elements help break up text and improve comprehension[13].

##### Complexity

Small. Adding an empty‑state component with copy and illustration can be done using existing components.

##### Acceptance Tests

- When a tree has zero members, an illustration and explanatory text appear, along with a clear “Add Person” button. Once the first person is added, the empty state disappears and the tree displays normally.

- The empty state includes links to example content and the invite/share flow.

#### Mobile and Tablet Behavior

##### Problems

- Cards and buttons are too small on phones. In the Compact density, tapping a small profile card or the + button can be difficult. WCAG requires at least 24×24 px target sizes or adequate spacing[9].

- Horizontal scrolling feels unnatural. Mobile users may not realize they can swipe horizontally to see more family members. The absence of indicators or gestures reduces discoverability.

- Long forms without auto‑scroll to error. If validation fails, the user may not see the error message because it appears above the fold.

- Touch gestures conflict with page scroll. Dragging within the tree sometimes triggers the browser’s page scroll instead of panning the tree, causing frustration.

##### Why It Matters

Most family members will access the tree on mobile devices. If controls are too small or gestures unresponsive, they may give up. Accessibility guidelines emphasize target sizes and spacing for users with dexterity limitations[9].

##### Suggested Fixes

- Increase hit areas and spacing. Ensure every touchable element (cards, + button, toggles) meets the 44 px Apple/Google guideline or at least 24 px WCAG minimum[9]. Expand the tappable area beyond the visible card if necessary.

- Add swipe indicators. Use subtle arrows or a bouncing animation on first load to teach users that they can swipe horizontally to explore the tree. Provide a short tooltip explaining horizontal navigation.

- Sticky control buttons. Keep the + button pinned to the bottom right on mobile with enough spacing from edges, and ensure it doesn’t cover important content.

- Auto‑scroll to field errors. When form submission fails on mobile, automatically scroll the view to the first invalid field and announce the error via accessible labels.

- Gesture conflict resolution. Use a pan gesture handler that prevents vertical page scroll while the user drags the tree horizontally and vice versa. Provide a toggle to switch between pan and page scroll if necessary.

##### Complexity

Medium. Adjusting CSS sizes and adding tutorials is small. Gesture conflict handling and auto‑scroll require event management.

##### Acceptance Tests

- On a 5‑inch phone, tapping any card or button triggers the intended action without mis‑clicks. Buttons are at least 24×24 px with at least 8 px spacing around them.

- On first visit from a mobile device, a brief overlay explains horizontal swiping; users can dismiss it.

- Form validation errors cause the view to scroll to the first invalid field, and error messages are announced via screen readers.

#### Buttons and Labels

##### Problems

- Ambiguous button labels. Labels like “Dense” and “Compact” describe spacing but may not be self‑explanatory for non‑technical users. The density selector uses text buttons that look like tabs and may be mistaken for navigation.

- Small icons without text. The + button has no accompanying text or tooltip, leaving users unsure of its purpose.

- Inconsistent capitalization and wording. Some buttons use title case (e.g., “Go to Family Tree”), others use sentence case (“Sign in”). Inconsistency undermines professionalism and readability[14].

##### Why It Matters

Clear labeling reduces cognitive load and helps users accomplish tasks quickly. Consistent design strengthens brand identity and readability[15].

##### Suggested Fixes

- Rename density controls. Use descriptive labels such as “Normal spacing,” “Medium spacing,” and “Compact spacing.” Add tooltips explaining that spacing affects how much information fits on the screen.

- Add text to icon buttons. Label the + button as “Add Person” and include a tooltip on hover/focus. This aligns with good accessibility practices and meets the target‑size guideline[9].

- Establish a style guide. Standardize capitalization (e.g., Title Case for primary actions), button sizes, and colors across all pages. Use consistent verbs (e.g., “View Profile,” “Edit,” “Delete”).

##### Complexity

Small. Renaming labels and adding tooltips require minor code changes. Creating a style guide requires planning but not major development.

##### Acceptance Tests

- The density control labels read “Normal spacing,” “Medium spacing,” and “Compact spacing,” and hovering or tapping on them displays a tooltip explaining the effect.

- The floating + icon includes the text “Add Person” beside or below it. On hover or focus, a tooltip reads “Add a new family member.”

- All buttons across the site follow the same capitalization and color scheme.

#### Areas Likely To Confuse Non‑Technical Family Members

Beyond the specific issues above, several aspects of the current family tree may confuse older or less technical relatives:

- Sign‑in requirement before adding real data. On the home page, it isn’t clear that the example tree is read‑only and that users must create a private tree to add or edit relatives. A notice should clearly explain this on the family tree page.

- Unknown icons. Icons like the gear (settings) or density control may not be intuitive. Use text labels or tooltips to clarify their function.

- Lack of undo or delete confirmation. If a user accidentally removes a person, they may not know how to undo the change. Provide clear confirmation dialogues with descriptive language.

- Missing search within tree. For large families, scrolling to find a relative is tedious. Implement an in‑tree search that highlights matching cards.

- No visual feedback when adding people. After adding a person, the tree refreshes but does not highlight the newly added card. Briefly highlight or scroll to the new card so users know the action succeeded.

Addressing these usability concerns will make the family tree page feel polished, stable and impressive for the birthday demo.

[1] [5] [6] [8] [13] [14] [15] What is Readability in UX Design? — updated 2026 | IxDF

https://ixdf.org/literature/topics/readability-in-ux-design

[2] [3] [4] [7] [10] 1

https://www.strath.ac.uk/media/1newwebsite/centres/centreforlifelonglearning/documents/Step_by_step_guide_charts.pdf

[9] Understanding Success Criterion 2.5.8: Target Size (Minimum) | WAI | W3C

https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html

[11] [12] Marking Required Fields in Forms - NN/G

https://www.nngroup.com/articles/required-fields/

## 3. Account Settings Page Improvement Report

_Source: `UX_Product Improvement Report.docx`_

### Account/Settings Page Review for Family Tree App

This review is based on the deployed account page (/account) and the source code in the Tree repository. The account page (formerly the dashboard) lists the user’s family tree(s), exposes the access code, controls for copying/resetting it, member management and sign‑out. The goal is to ensure the page clearly communicates a single‑tree experience, supports the birthday demo, and conveys security and privacy.

#### General Observations

- Account hero: The hero section includes the page title and a “Sign Out” button that is hidden when the user is not signed in. For signed‑in users, the header’s right side shows the current email and an “Account” link; signed‑out users see “Sign In” [1]. The hero subtitle currently reads “Manage your sign‑in and family tree access”[2].

- Tree list and empty state: The account page loads the user’s trees and inserts cards into a responsive grid. When no tree is found, it renders an empty state encouraging users to create a tree or join with a code[3].

- Tree cards: Each card contains the following:

- Editable tree name and description for owners (fields disabled for non‑owners)[4].

- Metadata lines: the user’s role (owner/editor/viewer/guest), created date, an “Editing enabled/view‑only” message, and counts of members and people[5].

- An access code shown only to owners. The code is displayed in a strong element with a subtle border and is followed by Copy and Reset text‑buttons[6]. dashboard.js binds click handlers to copy the code to the clipboard and reset it[7].

- A Members disclosure showing each member’s role and name; owners can change roles with a drop‑down (editor/viewer) and remove members[8].

- Actions: links to Open Tree and Search People, and a danger button to Archive (for owners) or Leave (for others)[9].

- Responsive design: The list uses auto-fit with a minimum width of 300 px to create one or more columns depending on viewport[10]. Controls such as the access code and member lists stack vertically on narrow screens thanks to flex‑wrap styling[11].

- Security/Privacy cues: The app relies on Firebase for authentication and Firestore for data. User email is displayed and roles are indicated, but there is no explicit privacy notice or explanation of what data is shared.

#### Detailed Recommendations

| Area | Problem | Suggested fix | Needed for birthday demo? | Complexity | Acceptance test |

| --- | --- | --- | --- | --- | --- |

| Tree overview copy | The section heading and copy (“Your Family Tree” / “Open the birthday tree, copy its random access code, or reset it whenever you want”) assume there is one tree but still use plural language and a generic “random access code” description[12]. Users may not know what the access code is for. | Revise copy to clarify the single‑tree concept and the purpose of the access code. Example: “Your family tree” → “Your family tree” and description → “This tree is private. Share the access code with relatives to let them join.” Use simple language (“access code” rather than “random access code”). | Yes. Clear language is essential for the demo. | Low; update static HTML/text. | When visiting /account as owner, the heading reads “Your family tree” and the description explains that the code lets relatives join. |

| Sign‑out placement | The “Sign Out” button sits within the hero section. On mobile it may be hidden above the fold, forcing users to scroll. Signed‑out users also see a “Sign In” link on the right, but the hero copy still references “Manage your sign‑in…”[2]. | Move the sign‑out button into the header’s account dropdown or the account card itself so it’s consistently placed on desktop and mobile. Change the hero subtitle when signed‑out to simply invite signing in (e.g., “Sign in to manage your family tree”). | Yes; consistent sign‑out placement prevents confusion during demos. | Medium; involves adjusting markup and CSS to relocate the button. | When signed in, a user can access sign‑out from the account link or card without scrolling; when signed out the hero does not mention managing a tree. |

| Access code presentation | The access code is styled as plain text within a paragraph with Copy and Reset buttons[6]. It looks similar to other metadata and may be overlooked. There’s no tooltip or label explaining who can use it. | Emphasize the access code by separating it visually—use its own row with a label (“Invite code”) and provide a copy icon/button. Add a tooltip or small note (“Share this code with family members to let them join your tree”). | Yes; understanding the access code is core to inviting others in the demo. | Medium; moderate UI adjustments and copy changes. | In the tree card, the join code row includes a clear label and a tooltip/description; the copy button uses an icon and works on keyboard and screen readers. |

| Copy and reset controls | The Copy and Reset buttons are plain text actions[6]. Their click targets are small, and there is no confirmation after copying. Reset permanently changes the code without confirmation or indication of impact. | Replace text buttons with small icon‑buttons or pill‑styled buttons with accessible labels. After copying, show a transient “Copied!” message near the code. For reset, prompt the owner with a modal or confirmation toast (“Resetting the code will invalidate the old one. Continue?”). | Yes; better affordance and safety are critical for user trust during the demo. | Medium; requires implementing copy feedback and confirmation modal, but can reuse existing status element. | Copying the code shows a success message; clicking reset shows a confirmation dialog and resets only after confirmation. |

| Member roles | The role dropdown uses labels like “Can view only” and “Can edit people and photos”, but there is no explanation of the difference between editor and viewer roles. Owners can remove members instantly, but there is no confirmation. | Add an inline help icon or tooltip describing each role. Use “viewer” and “editor” names consistently in labels (e.g., “Viewer – can view only”/“Editor – can edit people and photos”). Add a confirmation step when removing a member. | Yes; clarifying roles ensures demo participants understand access levels. | Low‑medium; mostly copy changes and adding a confirm step for removal. | Tooltips on the role select clarify what each role allows; removing a member triggers a confirmation prompt. |

| Archive and leave actions | The Archive (for owners) and Leave (for others) buttons are labelled but do not warn about consequences. Archiving likely hides the tree but this is not clear; leaving might remove membership permanently. | Change the button labels to “Archive tree” / “Leave tree” and add a brief subtitle or tooltip explaining what will happen (e.g., “Archiving will hide this tree from all members” / “You will lose access to this tree”). Include a confirmation dialog before executing the action. | Optional before the demo; nice‑to‑have but not required if the tree cannot actually be archived in the demo. | Medium. | Clicking Archive/Leave prompts a confirmation with descriptive text. |

| Edit form usability | The tree card’s name and description fields are always visible, even when not being edited. It’s not obvious that you must click “Save Changes”. The layout stacks fields above metadata, which could push important info down on mobile. | Collapse the edit form behind an “Edit” button or icon; clicking reveals editable fields. This keeps the card compact and emphasises meta information. Alternatively, reposition metadata above the edit form so users see their role and counts first. | No; can be addressed after the demo. | Medium; requires UI restructuring. | The default view shows the tree name/description as static text with an edit control; editing reveals fields and a Save button. |

| Empty state clarity | The empty state invites users to create or join a tree[3]. However, it doesn’t explain that a starter tree will be created automatically after sign‑in or what a “private family tree” means. | Adjust the empty state to clarify: “You don’t have a family tree yet. Start one now or join an existing tree with a code. A starter tree will be created for you automatically after sign in.” | Optional; low priority for the demo if a starter tree is created automatically. | Low. | The empty state includes the additional sentence about automatic creation. |

| Loading and error states | Status messages such as “Loading your family tree…” and “Could not load your family tree. Check your connection and permissions.” are set via dashboard.js[13]. These messages are functional but could be overlooked on busy pages. | Use a skeleton loader or spinner while loading and present error messages more prominently (e.g., within a colored banner). Provide a retry button or link to documentation if permissions are insufficient. | No; can be improved later. | Medium. | Loading shows a visual spinner; errors are presented in a styled alert with a retry option. |

| Mobile layout | The responsive grid fits one card per row on small screens[10], but long member lists and access‑code actions may still require horizontal scrolling. The form fields push metadata down, and the sign‑out button may not be visible without scrolling. | Conduct a mobile audit: ensure all actions are reachable without horizontal scrolling, stack form fields and metadata efficiently, and reposition the sign‑out and account info into a collapsible header or bottom sheet for mobile. | Yes; mobile is likely for the demo. | Medium. | On a narrow (≈375 px) screen, there is no horizontal scroll; all buttons are reachable and the sign‑out option is accessible within the account section. |

| Security and privacy clarity | The account page shows the user’s email and roles but does not explain how data is secured or who can see the tree. There is no link to a privacy policy. | Add a brief privacy note or link near the access code: “Only people with this code can join. Your tree and personal data are private and stored securely.” Include a link to a privacy statement explaining data handling and Firebase security rules. | Yes; transparency builds trust for the demo. | Low. | The page displays a short privacy note and a link to the privacy policy. |

#### Additional Notes

- Accessibility: Ensure buttons are keyboard navigable and use ARIA labels. The current code attaches click handlers but lacks keyboard shortcuts or focus outlines.

- Demo preparation: Because the app automatically creates a starter tree for new users[14], testers should verify this flow and ensure the account page updates after sign‑in without needing to refresh.

- Future enhancements: After the demo, consider adding multiple‑tree support, invitation management (accept/decline), and better large‑tree navigation. These are outside the birthday‑demo scope but appear in the roadmap.

[1] [2] [12] raw.githubusercontent.com

https://raw.githubusercontent.com/scolety1/Tree/main/html/dashboard.html

[3] [4] [5] [6] [7] [8] [9] [13] [14] raw.githubusercontent.com

https://raw.githubusercontent.com/scolety1/Tree/main/js/dashboard.js

[10] [11] raw.githubusercontent.com

https://raw.githubusercontent.com/scolety1/Tree/main/css/global.css

## 4. Overall Website Improvement Report

_Source: `Website Improvement Review.docx`_

### Family Tree App (Tree) – UX & Quality Improvement Report

#### Overview

The Tree app hosted at tree‑72e80.web.app is a web‑based family tree organizer. Users can view a demo family tree, search for individuals and view profile cards, and (after signing up) create private trees. The application is built with Firebase (Firestore) and exhibits a modern aesthetic with modular JavaScript. I reviewed the live app across desktop and tested form flows, searched the repo for existing docs, and cross‑referenced UX and accessibility best practices. Findings focus on the current user experience and the upcoming birthday demo.

#### Top 10 Highest‑Impact Improvements

| Priority | Area | Improvement | Rationale & Evidence |

| --- | --- | --- | --- |

| 1 | Error messages & validation | Replace generic or technical errors with clear, actionable messages. For example, the sign‑up form displays “Firebase: Password should be at least 6 characters (auth/weak‑password)”. This leaks implementation details (Firebase) and uses jargon. Instead show “Password must be at least 6 characters” and highlight the field in red. Error messages should appear near the field, use plain language and offer next steps[1][2]. | Nielsen Norman Group stresses that error messages must be noticeable, adjacent to the problem, use high‑contrast styling and avoid technical jargon[1]. UX Content Collective recommends messages that are clear, specific and actionable and avoid being playful when the user is stressed[2]. The current messages violate these principles. |

| 2 | Navigation clarity & active state | Highlight the current page in the top navigation with both color and a change in weight (e.g., bold and underline). On small screens, collapse the navigation into a clearly labeled hamburger menu. Ensure the menu items use descriptive labels such as Home, Example Tree, Search and only show relevant actions (e.g., Sign In/Out). | Baymard’s research shows that descriptive labels reduce cognitive load and improve findability[3]. Highlighting the active state builds confidence and is an accessibility requirement; Harvard’s accessibility guidelines note that people with limited memory benefit from clear current‑location indication[4]. The current site has subtle hover/underline only, making it easy to miss which page is active. |

| 3 | Mobile responsiveness | Optimize the layout for narrow screens. Implement a mobile‑first navigation that collapses into a hamburger menu (with the word “Menu”) and ensures search is accessible. Re‑flow the tree layout vertically or enable intuitive horizontal scrolling with visual cues on mobile. | Designing mobile navigation first forces prioritization and improves navigation across breakpoints[5]. Presently the tree uses a wide horizontal layout; on a phone it likely overflows and becomes unusable. |

| 4 | Color contrast & accessibility | Audit color contrast across the site and adjust text/background pairs to meet WCAG 2.1 Level AA (4.5:1 for normal text and 3:1 for large text)[6]. Add dark overlay on the hero image to improve legibility. Ensure interactive elements (links, buttons, tabs) do not rely on color alone and provide sufficient contrast[7]. | WebAIM notes that text must achieve at least a 4.5:1 contrast ratio[6]; the hero tagline on a light tree photo does not. W3C’s accessibility perspectives emphasize that colors used to convey information must be distinguishable[7]. |

| 5 | Loading & feedback states | Provide visual feedback when actions take time: show spinners or skeleton cards while the app loads tree data, search results, or authenticates. Ensure these indicators have accessible aria-live attributes so screen‑reader users perceive progress. | Good error and feedback messages should be visible and preserve user effort[8]. Currently the app briefly shows “Creating account...” but there is no spinner or ARIA feedback. Without clear loading states, users may click multiple times or think the app froze. |

| 6 | Copywriting consistency | Review all headings, button labels and helper texts for consistent voice and tone. Examples: unify “Get Started” call‑to‑action phrasing on the home page; rename ambiguous buttons like “Use an access code” to “Join a tree with an access code”; replace generational labels (G1, G2) with “Generation 1 (parents)”, etc. Keep language simple and descriptive. | Baymard advises descriptive labels over clever names to reduce cognitive load[3]. Consistency builds trust; inconsistent microcopy can confuse or reduce credibility. |

| 7 | Keyboard & screen‑reader accessibility | Add keyboard focus outlines and test tab order across all interactive elements. Provide aria‑labels for form inputs and icons (e.g., search icon). Ensure all images (including the hero background) include informative alt attributes or are marked decorative. Use semantic HTML elements (e.g., <nav>, <main>, <section>) and headings. | W3C’s guidelines note that navigation must be understandable for people using assistive technology[9]. The current site uses icons without alt text and lacks visible focus states. |

| 8 | Security & privacy | Review Firestore rules to ensure users only access their own private trees. Hide API keys and configuration details in environment variables. Add email verification on sign‑up to prevent spam accounts. Provide a brief privacy notice describing how family data is stored and who can view it. | Data privacy is crucial for personal family information. Clear privacy messaging increases user trust, especially when inviting relatives. |

| 9 | Performance optimizations | Compress and lazy‑load images (e.g., hero photo and profile pictures). Minify JavaScript and leverage caching via service workers. Preload fonts and critical CSS to avoid layout shifts. | Faster load times improve perceived quality and retention. Many assets (e.g., background image and icon fonts) could be optimized. |

| 10 | Finish incomplete features / bug fixes | Fix the reset password bug where clicking “Reset password” from the sign‑up screen triggers an email without confirmation. Remove double‑click requirement on menu items (links should respond on first click). Ensure the fun‑fact API gracefully handles missing birthdays (display a friendly message rather than a blank field). | Usability bugs distract from the polished experience needed for the birthday demo. These are quick fixes that prevent confusion. |

#### Blocker Bugs

- Reset password call triggers prematurely – On the sign‑up form, clicking “Reset password” immediately fires a password‑reset call even when the user hasn’t created an account; this may send emails to random addresses and confuse users. This bug should be fixed before the demo.

- Navigation requires double click – The Example Tree and Search links sometimes require two clicks to navigate, suggesting a JavaScript event conflict or double‑link; fix to make navigation responsive on the first click.

- Console errors / unhandled promises – Verify there are no uncaught exceptions when loading large trees or missing data. Unhandled errors will appear as blank spaces without feedback.

#### Quick Wins

- Customize error strings: Replace “Firebase: …” messages with user‑friendly text and highlight the invalid field.

- Add active nav styling: Use CSS to change color and font‑weight of the active link and add a subtle border or underline visible on light/dark backgrounds.

- Improve copy: Edit hero subhead text for clarity; rename ambiguous buttons; add helper text to search input (“Search by first or last name”).

- Accessibility attributes: Add alt text for images and aria‑label on icons; ensure keyboard focus ring is visible.

- Compress images: Use optimized JPEG/WebP for background and placeholder images; this can often be done in a few minutes with image‑optimization tools.

- Fix reset password bug: Adjust event handling to route to a separate reset‑password page instead of sending a request automatically.

#### Deferred Changes (post‑birthday)

- Photo uploads & profile pictures – Non‑essential for the demo; can be added later with Firebase Storage.

- Multi‑user invites & sharing – Complex feature requiring invitation management and security review; defer until after initial release.

- Enhanced tree styling (curved connectors, collapsible generations) – Visual polish beyond core functionality; nice to have but not critical.

- Analytics & user preferences – Logging usage patterns and customizing themes can wait until the core experience is stable.

#### Acceptance Tests for Top Items

- Error message clarity
Given a user fills out the sign‑up form with a password under six characters, when they submit the form, then the password field should highlight red and display the message “Password must be at least 6 characters.” No technical jargon (e.g., “auth/weak‑password”) appears. The error message is next to the field and persists until corrected.

- Navigation active state
Given a user is on the Example Tree page, when they look at the navigation bar, then the Example Tree menu item is visually distinct (e.g., bold text and different background color) and this state persists as they scroll. All other menu items remain normal. On mobile screens (< 768 px), the navigation collapses into a hamburger menu labeled “Menu” with the same active state indicated inside the drawer.

- Mobile responsiveness
Given a user opens the site on a 375×667 px viewport, when they visit the home page, then the header collapses into a hamburger menu, the hero text remains legible, and the “Get Started” cards stack vertically. When they open the family tree, horizontal scrolling is obvious (an arrow or scroll indicator appears) and the tree nodes remain readable without overlapping.

- Color contrast compliance
Given the hero heading and subheading, when measured using a contrast‑ratio tool, then the contrast between the text and background meets or exceeds 4.5:1 for normal text or 3:1 for large text[6]. Similarly, all buttons and links meet contrast requirements. Generational labels on the tree grid are readable under WCAG 2.1 rules.

- Loading feedback
Given the user performs an action that fetches data (e.g., searching for a name or creating an account), when the request is in progress, then a spinner or skeleton loader appears within the relevant section with appropriate aria-live="polite" attributes. Once the data loads, the spinner disappears and results appear. If the request fails, a clear error message is shown with guidance.

- Copywriting consistency
Given a content review session, when the team reads all visible text strings, then they align with the brand tone: clear, friendly, descriptive, and consistent. Buttons use verbs (e.g., “Start a tree”, “Join with code”), and generational labels use full words rather than cryptic abbreviations.

- Keyboard & screen‑reader accessibility
Given a user navigates the site using only the keyboard, when they press the Tab key, then the focus moves sequentially to all interactive elements in a logical order, and each element displays a visible focus outline. Screen readers announce descriptive labels for search fields, buttons, and navigation links. Non‑informative images have empty alt attributes.

- Security & privacy
Given a signed‑in user with a private tree, when another user (without permission) attempts to access the tree via a guessable URL, then the backend denies the request with a 403 error and the UI displays “You don’t have permission to view this tree.” The privacy policy is linked in the footer and explains data handling in plain language.

- Performance optimization
Given a cold‑load of the home page on a typical broadband connection, when measured with Lighthouse, then the site scores above 90 for performance. Images are served in compressed formats (e.g., WebP) and deferred until needed. The CSS and JS bundles are minified and cached.

- Bug fixes
Given a user clicks “Reset password”, when the link is pressed, then they are taken to a dedicated password reset page where they can enter their email, and no password‑reset email is sent automatically. Menu links respond on first click and no double‑click is required.

#### Conclusion

The Tree app has a solid foundation: an appealing layout, dynamic family tree generation and Firestore integration. To shine in the upcoming birthday demo, focus on polish: friendly error messages, clear navigation, accessibility compliance and responsive design. Addressing these issues will improve trust and usability for family members of all ages. Additional features like invitations, photos and analytics can be added after the demo once the core experience is robust.

[1] [8] Error-Message Guidelines - NN/G

https://www.nngroup.com/articles/error-message-guidelines/

[2] How to write error messages | UX Content Collective

https://uxcontent.com/how-to-write-error-messages/

[3] [4] [5] Website Navigation Best Practices for Better UX | Lovable

https://lovable.dev/guides/website-navigation-best-practices-that-convert

[6] WebAIM: Contrast and Color Accessibility - Understanding WCAG 2 Contrast and Color Requirements

https://webaim.org/articles/contrast/

[7] [9] Colors with Good Contrast | Web Accessibility Initiative (WAI) | W3C

https://www.w3.org/WAI/perspective-videos/contrast/

## 5. Signed-Out Experience Report

_Source: `App Signed-Out Experience Review.docx`_

### Family Tree App – Signed‑Out Experience Review (May 21 2026)

#### Overall impressions

The app has a polished UI and clearly communicates its core value — building private family trees and sharing them with relatives. Navigation and the Example Tree showcase help visitors understand the product without signing in. However, several flows leave signed‑out users confused (e.g. buttons that do nothing), and a few pages leak unbranded Firebase error pages when a path is invalid.

#### Home page

Strengths

- The hero section uses a large headline (“Build the family tree without making it a chore”) that immediately conveys the product’s purpose.

- A secondary sentence describes the value proposition — private trees, simple access codes and organized browsing[1].

- Three cards in the Get Started section offer clear choices: start a tree, join with a code, or preview via the example tree. The “Preview the layout” button links to the Example Tree, allowing exploration without an account.

- A later section (“How It Works”) succinctly explains the product steps (create/join, view the tree, add a member, view/edit profiles, search) and uses bullet points to outline required fields when adding members[2].

Issues

| Issue | Severity | Repro Steps | Suggested fix | Acceptance test |

| --- | --- | --- | --- | --- |

| Create/Join forms are active even though sign‑in is required: the “Create a New Family Tree” and “Join an Existing Family Tree” forms appear fully interactive for signed‑out visitors. After typing a family tree name or access code and clicking “Create Private Tree”/“Join Tree,” the form simply clears without any feedback, leaving the user confused. | High – users may think the feature is broken. | 1. Visit the home page while signed out.<br>2. Scroll to “Create or Join Right Here.”<br>3. Enter a value in Family Tree Name.<br>4. Click Create Private Tree.<br>5. Note that the input is cleared, but there is no message or redirect. | Disable the forms for unauthenticated users or wrap the Create Private Tree and Join Tree buttons with a Sign in redirect. A tooltip could explain that sign‑in is required. | When signed out, clicking Create Private Tree or Join Tree should redirect to the sign‑in page or display a clear message telling the user to sign in. The input should not silently clear. |

| Lack of easy route back to the home page after exploring the example tree: once inside the Example Tree or Search pages, the top navigation changes and there’s no visible “Home” link. The logo in the header isn’t clickable, so users must use the browser’s back button. | Medium | 1. Go to the Example Tree.<br>2. Look for a “Home” link or clickable logo; none exist.<br>3. Click the logo – nothing happens. | Make the brand/logo link to the home page or retain a Home tab in the secondary navigation so users can return easily. | From the Example Tree page, clicking the logo or a visible Home tab returns to the home page. |

| “Go to Family Tree” button on home page leads to example tree: in the “How It Works” section, Step 2 describes viewing your family tree but the button points to the Example Tree. This may imply that the visitor already has a tree. | Low | 1. On the home page, scroll to “How It Works.”<br>2. Click Go to Family Tree under Step 2. | Rename the button to View Example Tree or hide the button for signed‑out users. Alternatively, direct it to sign‑in when no tree is selected. | When signed out, the button label makes it clear the example tree will open; the user should not think they’re viewing a personal tree. |

| Inconsistent URL handling and unexpected 404: visiting certain URLs (e.g. https://tree-72e80.web.app/tree/h7qk9m2p4a) first shows the sign‑in form but later leads to a default Firebase “Page Not Found” page revealing deployment instructions[3]. | Medium – the default error page feels unprofessional and leaks config details. | 1. While signed out, manually navigate to an arbitrary /tree/<code> URL (e.g. https://tree-72e80.web.app/tree/h7qk9m2p4a).<br>2. Note that you see a sign‑in form.<br>3. Click Home or use the back button.<br>4. Eventually, the page reloads to the Firebase error page. | Create a custom 404 page and configure Firebase hosting rewrites to serve index.html for unknown routes. Ideally, redirect unknown tree codes to sign‑in and show “Invalid or expired access code.” | Navigating to an unknown /tree/<code> path should either show a branded 404 page or a sign‑in page with an error, not the generic Firebase error page. |

| HTTP vs HTTPS confusion: at least once, loading https://tree-72e80.web.app produced the Firebase 404 page, while http://tree-72e80.web.app worked fine[3]. | Medium – inconsistent protocol handling can reduce trust. | Visit the site via https and http at different times; sometimes https loads correctly, other times it shows the Firebase error page. | Ensure that both HTTP and HTTPS protocols are configured in Firebase hosting to serve the same site. Redirect all HTTP traffic to HTTPS for security. | Accessing the root domain with either protocol should always load the home page; there should be no unbranded error. |

#### Example tree

The example tree is the most compelling way for visitors to understand how the product works. It displays a multi‑generation family tree arranged horizontally with marriage connections and a vertical green line connecting generations. Users can select among Comfortable, Dense and Compact layouts. Clicking a person’s card opens their profile, but editing is disabled and a notice clearly states that the tree is read‑only[4].

Issues

| Issue | Severity | Repro Steps | Suggested fix | Acceptance test |

| --- | --- | --- | --- | --- |

| No navigation hint back to the home page (see home page table) | Medium | Same as above. | Same as above. | Same as above. |

| Profile links in lists not clickable: On a person’s profile page, family member names (e.g. parents, children) are presented as text without links, so users cannot navigate between profiles easily. | Low | 1. From the example tree, open any person’s profile.<br>2. Try clicking a parent’s or child’s name in the list; nothing happens. | Link each related person’s name to their profile within the example tree for smoother exploration. | When signed out, clicking a parent or child in the profile navigates to that relative’s profile (still read‑only). |

| Scrolling hint not obvious: The “Tree view” subtitle says “Scroll sideways to see larger families,” but there is no horizontal scroll bar on desktop and the user must use a trackpad or shift + mouse wheel. | Low | 1. Load the example tree on desktop.<br>2. Attempt to scroll horizontally; if you have a standard mouse, nothing happens. | Add a visible horizontal scroll bar or arrow buttons to indicate that horizontal scrolling is possible. | Users with a mouse can scroll horizontally (or click arrow buttons) to reveal off‑screen nodes. |

#### Search page

The search page is clean and intuitive. Users enter a first or last name and results immediately display cards with names and birthdates. Clicking a result opens the corresponding profile. A message shows how many matches were found[5].

Issues

| Issue | Severity | Repro Steps | Suggested fix | Acceptance test |

| --- | --- | --- | --- | --- |

| Search instruction does not mention read‑only status: The page says “Search the current tree by first or last name, then open a profile from the results,” but does not clarify that editing is unavailable in the example tree. | Low | 1. Go to the search page while signed out.<br>2. Read the introductory text. | Change the text to “then open a (read‑only) profile from the results” or add a note explaining that editing requires signing in. | The search description explicitly mentions that example tree profiles are read‑only when not signed in. |

#### Profile pages (Example Tree)

Profiles show key information (birthday, parents, spouse, children, bio) and a “birthday fun fact” fun‑fact. A banner at the top makes it clear that the example tree is read‑only[4], which is good. The Back to Family Tree or Back to Search buttons return to the previous page.

Issues

| Issue | Severity | Repro Steps | Suggested fix | Acceptance test |

| --- | --- | --- | --- | --- |

| Names in lists are not links (also noted above). | Low | See above. | See above. | See above. |

| Long “birthday fun fact” text may wrap awkwardly on mobile: Without mobile testing I couldn’t verify, but the fun fact paragraphs are long. | Low | Open a profile on a narrow screen (mobile). | Consider truncating fun facts with a “more” link or use shorter sentences for better mobile readability. | On mobile, the profile layout remains readable and the fun fact doesn’t overflow the card. |

#### Sign‑in page

The sign‑in page uses a centered card with fields for email and password, a “Continue with Google” button, links to create an account or reset the password, and a short description explaining why you need to sign in[6]. This clarity is good.

Issues

| Issue | Severity | Repro Steps | Suggested fix | Acceptance test |

| --- | --- | --- | --- | --- |

| Sign‑in button appears both in the header and on the form: the header still contains a Sign In button when already on the sign‑in page. | Low | Navigate to /signin and notice duplicate sign‑in buttons. | Hide the header’s Sign In button when the sign‑in page is active. | On the sign‑in page, the header either omits the sign‑in button or displays “Sign up” instead. |

| No return to previous page after sign‑in: the sign‑in flow (not testable here) may not remember the page you tried to access (e.g. private tree URL) and redirect you back after authentication. | Medium (if unimplemented) | 1. Attempt to access a private tree URL; get redirected to sign‑in.<br>2. After sign‑in (untested), you may land on the dashboard rather than the original URL. | Preserve the intended destination in a query parameter (e.g. ?redirect=...) and return the user to the original page after signing in. | After signing in from a protected route, the user is returned to that route rather than always to a default dashboard. |

#### Unauthorized access (private tree URLs)

Entering a private tree code (e.g. /tree/h7qk9m2p4a) while signed out initially shows a sign‑in page, so data is protected. However, returning to the home page from that route sometimes results in the Firebase 404 page with deployment instructions[3]. This exposes internal configuration details.

Recommendation

- Add proper routing and a custom 404 page.

- Ensure that unknown codes prompt “Invalid or expired access code” and redirect to sign‑in rather than exposing a generic Firebase 404.

#### Mobile layout observations

I could not fully test responsive behavior due to environment limitations. Observations from a standard desktop:

- Sections likely stack vertically on smaller screens, but long headlines and paragraphs (e.g. the hero heading or fun‑fact paragraphs) might require manual line breaks on small devices.

- Without a visible horizontal scroll bar, navigating a wide tree on mobile could be difficult; arrow buttons or a mini‑map might help.

Suggestions

- Use responsive typography for very large headings so they don’t wrap awkwardly on narrow screens.

- Confirm that call‑to‑action buttons (e.g. Start a Tree, Join with Code) remain visible without requiring excessive scrolling.

- Test on actual mobile devices or browser dev tools to ensure forms and navigation are easy to use.

#### Summary of recommendations

- Guide signed‑out users: Disable or hide create/join forms and actions that require authentication. When clicked, clearly prompt the user to sign in.

- Improve routing and error pages: Configure Firebase hosting rewrites to avoid exposing the default 404 page and to support HTTPS consistently. Add a branded 404 page.

- Enhance navigation: Provide a persistent way to return to the home page (clickable logo or a Home tab) from all pages.

- Link related profiles: Make parent/child names clickable on profile pages, enabling easier navigation through the example tree.

- Add horizontal scroll cues: Make it obvious how to navigate wide trees, such as a visible scrollbar or arrow controls.

- Clarify messaging: Ensure button labels and step descriptions accurately reflect what happens (e.g. “View Example Tree” vs. “Go to Family Tree”).

- Responsive design: Verify that headings and long paragraphs render well on mobile and that interactive elements are easy to tap.

These improvements will make the signed‑out experience smoother, reduce confusion, and better showcase the app’s capabilities.

[1] [2] Our Family Tree

https://tree-72e80.web.app/

[3] Page Not Found

https://tree-72e80.web.app/tree/h7qk9m2p4a

[4] Family Profile

https://tree-72e80.web.app/profile

[5] Our Family Tree

https://tree-72e80.web.app/search

[6] Sign In | Family Tree

https://tree-72e80.web.app/signin

## 6. Large Family Tree Layout Strategy Report

_Source: `Family Tree Layout Strategy.docx`_

### Technical Strategy for Scaling the Tree Layout

#### Why the Current Layout Breaks Down

- Horizontal sprawl and fixed generational rows. The current implementation draws each generation on a single horizontal row and allocates a card for every individual. When there are many siblings in a generation (e.g., 8–10 children), the horizontal line becomes very long and requires lateral scrolling. As more generations and branches are added, the family stretches horizontally by dozens or hundreds of cards, causing users to lose context and making the layout hard to navigate. Research on genealogical visualization notes that pure tree drawings of large genealogies waste a lot of space and mix individuals from different families[1].

- Assumptions of a single root and strict tree structure. Real genealogical data form directed acyclic graphs (DAGs) in which most individuals have two parents and there may be multiple founders. A genealogical graph contains undirected cycles due to remarriages, cousin marriages and half-siblings[2]. Classical tree‑drawing algorithms (breadth‑first, depth‑first, Reingold‑Tilford) assume a single root and one parent per node[3], so they duplicate subtrees or produce edge crossings when faced with multiple parents. The current layout tries to connect two parents with a horizontal line, but as the number of couples grows the lines overlap and the algorithm cannot prevent crossings.

- No support for multiple spouses or remarriages. The current visualization draws a single horizontal line between a pair of parents. Families with divorces, remarriages or half‑siblings would require multiple spouse links. Without a model to group partners or show multiple marriages, the layout must duplicate children and creates confusing vertical lines. Research on genealogical visualization highlights that directed hierarchical layouts (e.g., Graphviz’s dot) often place individuals of different generations on the same layer and mix children from multiple families[4].

- Lack of grouping or aggregation. At large scale, showing every node is overwhelming. The genealogical graph may contain thousands of individuals; without aggregation, the browser must render all cards and edges. Efficient algorithms for large genealogy trees recommend clustering closely related individuals and using recursive, space‑partitioning layouts that allocate more space to important subtrees[5].

- No pan/zoom or mini‑map. The current tree requires horizontal scrolling but lacks pinch‑zoom or a minimap. Users cannot zoom out to view overall structure or zoom in for details; they must scroll horizontally in a fixed zoom level. Literature on genealogy visualization warns that users may lose their position or context when navigating through large trees[6].

- No search or focus mode. Locating a person inside a sprawling tree is difficult without search. Genealogical tools often provide search, highlight of the found person, and the ability to center the view on that person.

#### Candidate Layout Models for Large Genealogical Trees

| Layout model | Features & notes | Pros | Cons |

| --- | --- | --- | --- |

| Layered DAG (Sugiyama) layout | Places nodes in horizontal layers based on generation; crossing minimization and edge routing; used by Graphviz’s dot and yEd. Research adapts this approach to genealogies by adding constraints to group family members (parents and their children) within the same layer[7]. | Familiar representation; keeps chronological order; easy to implement using existing algorithms. | Without custom constraints, individuals with multiple spouses or children may end up far apart; hard to prevent edge crossings and mixing of families[7]. Large graphs still sprawl horizontally; no built‑in collapsing. |

| Radial or concentric layout | Roots (founders) placed at the centre; each generation drawn as a ring; couples shown around the circle. Useful for showing ancestors or descendants relative to a main person. | Compact; emphasises generational distance; easy to understand for a single root. | Works poorly when there are multiple founders or when two parents belong to different branches; couples may be far apart; not ideal for modern genealogical DAGs. |

| Force‑directed layout with genealogical forces | Adaptation of force‑directed graphs with additional forces for sibling cohesion, generation alignment and spousal cohesion[8]. Nodes repel each other to avoid overlaps while sibling and spouse forces pull related individuals together. | Flexible; does not require a root; can handle cycles and general DAGs; siblings and spouses cluster naturally. | Needs parameter tuning; can sprawl without global structure; algorithmic complexity O(n log n) per iteration[9]; generational ordering is approximate; may still produce clutter[10]. |

| Fractal / recursive space‑partitioning layout | Each individual is drawn as a rectangle and their descendants occupy a sub‑rectangle. Splits alternate between horizontal and vertical and allocate more space to larger subtrees[5]. Allows infinite zoom: users can drill into sub‑families without losing context. | Highly space‑efficient; avoids edge crossings; supports thousands of nodes; intuitive zooming akin to fractals[5]. | Conceptually different from traditional node-link trees; less intuitive for novice users; complex to implement and interact with; duplicates individuals when they appear in multiple branches, requiring arrows or links to avoid redundancy[5]. |

| Matrix or tabular alignment (Lineage) | Aligns the genealogical graph to a tabular view to incorporate multivariate attributes. Uses data‑driven aggregation and focuses on analytic tasks rather than aesthetics[11]. | Good for research tasks (e.g., genetics); scales to multiple families; integrates attributes. | Not ideal for family‑tree storytelling; emphasises data analysis rather than intuitive relationships. |

| Pedigree or fan charts | Traditional descendant or ancestor diagrams used in genealogy software. Each ring or slice represents a generation; often used for individual‑centric views. | Simple; well‑known; easy to read. | Only works for single ancestors/descendants; cannot represent multiple spouses or intermarriages; duplicates individuals when there are loops; not suitable for complete family networks[12]. |

#### Recommended Approach: Adopt a Proven Family‑Tree Library and Add Aggregation/Navigation Features

##### 1. Use an existing genealogical tree library

The Family Chart library (https://donatso.github.io/family-chart/) is an open‑source D3.js‑based library explicitly designed for interactive family trees. In its API the data for each person includes spouses, children, and parents arrays[13], enabling representation of spouses, remarriages and half‑siblings. The library offers:

- Customizable layouts and orientation. It supports horizontal and vertical tree orientations and separates spouses from children with connectors similar to the current app. Functions such as SortChildrenFunction and SortSpousesFunction allow custom ordering[14].

- Card templates and editing. Cards can be customized to show names, dates, pictures and other fields[15].

- Interactive controls. Built‑in zooming, panning and history navigation; the API includes properties like progenyDepth and duplicateBranchToggle to limit the number of generations and collapse repeated branches[14]. These features help manage large families and avoid duplication of individuals.

- Open-source and maintained. The repository is active and widely used; using it avoids reinventing a complex layout algorithm.

Integrating Family Chart into the app would require mapping the existing data model to the library’s id, data, and rels structure. The library is built in TypeScript and D3, compatible with the current React/TypeScript stack (per the repository). It provides editing hooks, so the current custom editing UI can be reused.

##### 2. Introduce pan/zoom and context navigation

Regardless of the layout, the app needs continuous pan and zoom. Users should be able to zoom out to view the entire tree and zoom in to explore details; this is essential for 5–6 generation graphs where the horizontal extent spans hundreds of cards. A mini‑map overlay in the corner can indicate the current viewport and allow quick jumps.

Implementing pan/zoom with D3’s zoom behavior is straightforward and supported by Family Chart; if a custom layout is retained, the drawing should be placed inside an SVG and the d3-zoom module should manage transformations.

##### 3. Support collapsing branches and limited depth

To prevent clutter, provide controls to collapse or expand branches. For example, children of distant cousins can be collapsed into a single “+N more” node; clicking it expands that branch. Similarly, only the first 2–3 generations could be shown by default, with deeper generations hidden until requested. Family Chart offers progenyDepth for limiting depth and duplicateBranchToggle to avoid drawing the same person multiple times[14].

##### 4. Search and focus mode

Add a search bar that allows users to type a person’s name and jump to their node. When a person is selected, highlight them, center the view, and optionally grey out unrelated branches. For example, clicking on someone’s card could load a focus view with only their ancestors and descendants (an hourglass or fan chart), which is easier to read. This dual-mode view (overview and focus) is a common pattern in genealogical visualizations and mitigates clutter[12].

##### 5. Represent complex relationships

- Spouses and remarriages: Represent each partnership as a connector between two person cards. When an individual has multiple spouses, place them close together or arrange them vertically with connectors to the same children. Family Chart’s data model allows a spouses array; during rendering, multiple partnership links will be drawn.

- Half‑siblings: Children who share one parent should be grouped horizontally and connected to both parents. The algorithm should not duplicate the parent card; instead, draw a single parent card with links to all children.

- Unknown parents: Show a placeholder card (e.g., “Unknown”) for missing parents. The API includes UnknownCardLabel for this purpose[14]. Alternatively, collapse unknown parents into a small icon to reduce clutter.

- Multiple branches or loops: In genealogical DAGs there may be loops due to cousin marriages. When a person appears in multiple branches, show a single card and draw linking arrows to indicate the repeated connection, or allow toggling duplicates (as in duplicateBranchToggle).

##### 6. Mobile behaviour

On mobile devices, the tree must be responsive. Use vertical orientation to reduce horizontal scrolling. Provide pinch‑zoom and a collapsible sidebar for search and navigation. Simplify cards (initials instead of full names) to fit smaller screens. Because mobile screens cannot display many nodes at once, a focus mode (showing a subset around a selected person) is critical.

##### 7. Data model considerations and migration

The existing data model in the GitHub repository likely stores id, name, birthDate, and arrays of parents and children. To support multiple spouses and remarriages, ensure the model includes:

- spouses: string[] – list of IDs of current/former partners.

- children: string[] – list of child IDs.

- parents: string[] – list of parent IDs (often two). Unknown parents can be represented by an empty array or null values.

- Additional metadata (birth, death, pictures, notes) remains unchanged.

Migration risk is low because the new fields extend existing records. A migration script can iterate through existing relationships and populate the spouses array based on marriage events. During transition, the app can still render the tree using the old layout while exposing the new data to Family Chart.

#### Alternative Approaches

- Custom force‑directed layout with genealogical forces – Implement the adapted force‑directed algorithm described by Racine and colleagues, adding sibling cohesion, generation alignment and spousal cohesion forces[8]. This would allow a flexible layout that handles DAGs and multiple parents. Pros: Control over layout aesthetics; can embed generation curves and keep siblings together; no dependency on external libraries. Cons: Complex to tune; may still sprawl; requires significant development effort and performance optimisation; still lacks collapsing and mini‑map features.

- Fractal or space‑partitioning layout – Adopt a recursive rectangular subdivision where each person’s rectangle contains their descendants[5]. This scales to tens of thousands of nodes and supports infinite zoom. Pros: Highly space‑efficient; eliminates edge crossings; intuitive zooming. Cons: Departure from familiar node-link diagrams; users may find the nested rectangles unintuitive; duplicates individuals when loops exist; implementation is non‑trivial.

- Hybrid layered and clustering approach – Use the Sugiyama layered algorithm to place generations and then cluster siblings and spouses into compartments to reduce horizontal sprawl[7]. Combine this with interactive collapsing and bundling of edges. Pros: Retains familiar generation rows; easier to implement than full force‑directed; clusters reduce clutter. Cons: Still a custom implementation; may not handle loops elegantly; reliant on post‑processing to avoid crossings.

#### Implementation Phases

- Research and prototyping (before the birthday demo)

- Evaluate Family Chart by creating a proof‑of‑concept using the existing large demo dataset. Prototype pan/zoom and search features. Evaluate how the library handles multiple spouses and half‑siblings.

- Refactor the data model to include spouses and parents arrays. Write migration scripts to populate these fields from existing relationships.

- Add a search bar and highlight mechanism. Implement a simple mini‑map using SVG to indicate viewport.

- Prepare acceptance tests (see below) using a synthetic 5–6 generation family.

- Integration and UX refinement

- Replace the current custom layout with Family Chart’s rendering or plug in the adapted force‑directed layout if you choose the custom route.

- Implement controls for collapsing branches and limiting depth. Add toggles for hiding duplicate branches and unknown parents.

- Fine‑tune card sizes and spacing for desktop and mobile; implement pinch‑zoom and responsive design.

- Advanced features and analytics (post‑demo)

- Add a focus mode to display an hourglass view (ancestors and descendants of a selected person) and integrate with the full overview.

- Integrate a timeline or event view to display life events along the horizontal axis. This aligns with multivariate genealogical tools like Lineage that map genealogies to tables[11].

- Support exporting the tree to PDF or images; provide print‑friendly layouts.

- Explore clustering or fractal layouts for extremely large datasets.

#### Acceptance Tests (using a 5–6 generation family)

- Spouse and remarriage handling – Create a test dataset with a person who marries three times, each marriage producing children. Verify that the layout draws the individual only once, shows separate connectors for each spouse, and groups children under the correct parents. Half‑siblings should be aligned horizontally and connected to the appropriate parent(s).

- Half‑siblings and loops – Simulate a cousin marriage producing children. Verify that the algorithm does not duplicate the individuals but instead shows appropriate connecting lines or indicates repeated nodes via arrows or toggled duplicates.

- Navigation and search – With a family of ~100 individuals across 6 generations, test that the user can zoom out to see the entire tree, zoom in to an individual, search by name, and that the viewport recenters on the selected person. The mini‑map should indicate current position and size relative to the whole tree.

- Collapsing branches – Collapse distant branches by default. Verify that a collapsed node displays a count (e.g., “+12 more”) and expands when clicked. Check that collapsing does not break the parent-child connections of visible nodes.

- Mobile responsiveness – On a smartphone view, ensure that the layout switches to vertical orientation, cards shrink appropriately, pinch‑zoom works smoothly and search/focus modes remain usable.

- Performance – Load a dataset with hundreds of individuals and measure rendering and interaction times. Interactions (zoom, pan, expand) should remain responsive (<200 ms per frame) on a mid‑range device. Test memory usage and ensure there are no leaks.

#### Tasks Before the Birthday Demo

- Finalize the data model with spouses and parents arrays; migrate existing data.

- Build a prototype using Family Chart (or the chosen library) that demonstrates:

- display of a 5–6 generation family with multiple spouses and half‑siblings;

- pan/zoom and mini‑map;

- search functionality.

- Implement UI controls for collapsing branches and toggling duplicate branches.

- Ensure basic mobile support (responsive layout and pinch‑zoom). Focus mode and advanced analytics can be deferred.

#### Tasks After the Demo

- Implement hourglass/fan views and additional analytics (e.g., timelines, statistics).

- Add export/print features.

- Explore clustering, fractal or hybrid layouts if the tree must scale to thousands of individuals.

- Conduct user testing with real family data and iterate on the UI.

#### Conclusion

The current layout performs well for small trees but cannot scale to sprawling, multi‑root genealogical networks with remarriages and half‑siblings. Genealogical graphs violate classical tree assumptions by having two parents per child, multiple founders and undirected cycles[16]; as a result, traditional tree‑drawing algorithms break down. A more robust approach is needed. Adopting a proven library such as Family Chart provides out‑of‑the‑box support for multiple spouses, pan/zoom, collapsing, and duplicate handling[13]. Coupled with thoughtful UX enhancements—search, mini‑map, branch collapsing, and mobile‑friendly design—the app can handle families spanning dozens of people across five or six generations. Alternative approaches such as force‑directed or fractal layouts offer opportunities for customisation and future experimentation, but they require significant development effort and may not be necessary for the near‑term goal of a polished, usable family tree application.

[1] [4] [7] [12] 218.pdf

https://ceur-ws.org/Vol-1649/218.pdf

[2] [3] [5] [6] [8] [9] [10] [16] Efficient Algorithms for Drawing Large Genealogy Trees

https://repositum.tuwien.at/bitstream/20.500.12708/220457/1/Racine%20Florian%20-%202025%20-%20Efficient%20Algorithms%20for%20Drawing%20Large%20Genealogy%20Trees.pdf

[11] Lineage: Visualizing Multivariate Clinical Data in Genealogy Graphs - PMC

https://pmc.ncbi.nlm.nih.gov/articles/PMC6170727/

[13] [15] Family Chart API Documentation - v0.9.0

https://donatso.github.io/family-chart/

[14] default | Family Chart API Documentation - v0.9.0

https://donatso.github.io/family-chart/modules/default.html

## Implementation Queue

### Fix Now - P0

- Verify and fix the Add Family Member modal save path.
- Verify and fix profile photo upload/display across Storage, Firestore, profile rendering, and tree-card rendering.
- Verify signed-in navigation/routing: no `Home`, no `Dashboard`, account silhouette works, and `Family Tree` routes only to `/tree`.
- Verify `smcolety@gmail.com` gets `colety-birthday-tree` on `/account` and `/tree`.
- Verify owner/editor/viewer write permissions for add, edit, remove, and photo upload.

### Next - P1

- Improve account invite-code UX: label, copy/reset feedback, reset confirmation, and explanatory copy.
- Preserve search state in URL/history when navigating search to profile to browser back/forward.
- Fix signed-out create/join actions so they redirect to sign-in or show a clear sign-in-required state.
- Add branded fallback routing for bad URLs/private codes and avoid Firebase default 404 leaks.
- Apply tree readability quick wins: text contrast, card hierarchy, generation labels, scroll cues, and density labels.
- Clean auth/reset-password error handling and replace technical Firebase messages.
- Run a mobile polish pass for nav, modals, add/edit forms, and horizontal tree exploration.

### Later - P2

- Link relationship names on profile pages.
- Add member role help, remove confirmation, and archive/leave warnings.
- Add stronger loading, empty, and error states.
- Add accessibility labels, focus states, and keyboard tab-order checks.
- Improve profile return paths with breadcrumbs, preserved scroll position, or a side panel.
- Add in-tree search/focus/highlight behavior for larger trees.

### Defer

- Full Family Chart/D3 migration and layout algorithm replacement.
- Pan/zoom/minimap/collapsible branch system.
- Advanced genealogy support for remarriages, half-siblings, loops, duplicate branches, and GEDCOM.
- Service worker/performance overhaul, analytics, themes, print/export, and formal privacy-policy page.

## Verification Checklist

- Run `npm run check`.
- Run `git diff --check`.
- Deploy to Firebase when ready.
- Smoke-test signed-out home, example tree, search, and sign-in.
- Smoke-test signed-in account, tree, search, add person, edit profile, remove person, and photo upload.
- Test owner/editor/viewer behavior against Firestore and Storage rules.
- Test a large 5-6 generation tree on desktop and mobile, including profile return paths.

## Family Chart Controls And Default View - May 26

Status: Prompt 2 from `TREE_2026-05-25_IMPROVEMENTS_QUEUE.md` is implemented locally on `/tree-spike` only.

What changed:

- Added `Fit tree`, `Reset view`, `Zoom in`, and `Zoom out` controls to the Family Chart beta.
- Changed the large demo's first render to use Family Chart's fit-to-view behavior, with a second fit after layout settles.
- Kept relationship paths visible through the Family Chart renderer.
- Made reset restore the vertical overview around the initial demo person.
- Improved control grouping and mobile button layout for the beta page.

Verification:

- `npm run check` passed.
- `git diff --check` passed with only existing LF/CRLF warnings from the Windows checkout.
- Local browser smoke passed on desktop `1280 x 720` and mobile `390 x 844`: controls render, chart SVG renders, 80 people are available in focus, control clicks update status, no console errors, and no page-level horizontal overflow.

Needs review:

- Confirm the default fitted overview feels less confusing with the actual large demo once deployed.
- Zoom controls depend on Family Chart's D3 zoom listener; keep testing this as the page moves toward production.

## Family Chart Card Styling - May 26

Status: Prompt 3 from `TREE_2026-05-25_IMPROVEMENTS_QUEUE.md` is implemented locally on `/tree-spike` only.

What changed:

- Replaced the default Family Chart bubble cards with custom cards that match the app's green/gold visual system.
- Added photo support from `person.image`; cards fall back to initials when no photo is available.
- Added clearer name and birth-year hierarchy.
- Increased card dimensions and chart spacing for readable zoomed navigation.
- Preserved Family Chart's connected relationship paths and made the connector/path styling stronger.

Verification:

- `npm run check` passed.
- `git diff --check` passed with only existing LF/CRLF warnings from the Windows checkout.
- Local browser smoke passed on desktop `1280 x 720` and mobile `390 x 844`: styled cards render, initials render, relationship links remain present, no console errors, and no page-level horizontal overflow.

Needs review:

- The fitted map overview necessarily scales cards down. The cards are much clearer after zooming in, but the next prompts should add selected-person details and path highlighting so the overview is easier to understand without needing to read every card.

## Family Chart Selected-Person Panel - May 26

Status: Prompt 4 from `TREE_2026-05-25_IMPROVEMENTS_QUEUE.md` is implemented locally on `/tree-spike` only.

What changed:

- Added a selected-person panel with name, birthday, parents, spouse/partner, and children.
- Card clicks and focus dropdown changes now update the panel and selected-card state.
- Added a `Focus in chart` action.
- Added `Open profile` for private tree data when a real `familyId` exists; demo mode stays read-only and hides profile linking.
- Kept Family Chart relationship paths visible and untouched.

Verification:

- `npm run check` passed.
- `git diff --check` passed with only existing LF/CRLF warnings from the Windows checkout.
- Local browser smoke passed on desktop `1280 x 720` and mobile `390 x 844`: panel initializes, dropdown updates details, card click updates details, one selected card remains highlighted, relationship links remain present, no console errors, and no page-level horizontal overflow.

Needs review:

- Live private-tree testing should confirm `Open profile` preserves `familyId` correctly once `/tree-spike` is used with signed-in data.
- Prompt 5 should emphasize the selected person's immediate family path so the chart explains relationships visually, not only in the panel.

## Family Chart Search And Path Highlighting - May 26

Status: Prompt 5 from `TREE_2026-05-25_IMPROVEMENTS_QUEUE.md` is implemented locally on `/tree-spike` only.

What changed:

- Added a `Search by name` field and `Find` button with person-name suggestions.
- Search supports first name, last name, full name, and last-name-first matching.
- Searching centers the matched person, syncs the focus dropdown, updates the selected-person panel, and updates the search field.
- Selected person cards are highlighted.
- Visible parents, spouse/partner, and children are highlighted as immediate family.
- Other visible cards are gently dimmed while keeping the broader family map readable.
- Relationship lines remain visible. The Family Chart SVG links do not expose person IDs, so this pass highlights the path through cards instead of per-link SVG classes.

Verification:

- `npm run check` passed.
- `git diff --check` passed with only existing LF/CRLF warnings from the Windows checkout.
- Local browser smoke passed on desktop `1280 x 720` and mobile `390 x 844`: searching `Tim` selected and centered Tim Colety, highlighted 1 selected card plus 7 immediate-family cards, dimmed unrelated visible cards, preserved 38 relationship links, no console errors, and no page-level horizontal overflow.

Needs review:

- Confirm the dimming strength feels helpful, not too aggressive, when Dad is browsing a real family tree.
- Prompt 6 should test the same search/focus path against signed-in `colety-birthday-tree` data and real profile links.

## Family Chart Real Data Mapping And Profile Links - May 26

Status: Prompt 6 from `TREE_2026-05-25_IMPROVEMENTS_QUEUE.md` is implemented locally on `/tree-spike` only.

What changed:

- Private-tree mode remains wired through `resolveCurrentUserFamilyId()` and `getAllPeople(familyId)`.
- URL `familyId` support remains available for `/tree-spike?familyId=...`.
- Added a relationship mapping audit for parent links, spouse links, child links, missing stable IDs, and unresolved legacy relationship names.
- Added a visible relationship mapping status below the chart controls.
- Centralized private profile URLs so `Open profile` preserves `person`, `familyId`, and `from=tree-spike`.
- Demo mode and unauthenticated fallback mode keep `Open profile` hidden.
- Unauthenticated private-route attempts now clearly explain that the demo fallback is showing until the user signs in.

Verification:

- `npm run check` passed.
- `git diff --check` passed with only existing LF/CRLF warnings from the Windows checkout.
- Local browser smoke passed for demo route: 80 focus options, relationship audit success, links present, no console errors, and no page-level horizontal overflow.
- Local browser smoke passed for `familyId=colety-birthday-tree` route while localhost was not signed in: safe demo fallback, sign-in-required status, relationship audit success for fallback data, no console errors, and no page-level horizontal overflow on desktop and mobile.

Needs live Firebase testing:

- Deploy, then open `/tree-spike?familyId=colety-birthday-tree` while signed in on the Firebase Hosting origin.
- Confirm real Colety people load instead of fallback demo data.
- Confirm `Open profile` appears for selected people and preserves `familyId`.
- Review any relationship mapping notes for unresolved legacy parent/spouse fields.

## Family Chart Mobile Pass - May 26

Status: Prompt 7 from `TREE_2026-05-25_IMPROVEMENTS_QUEUE.md` is implemented locally on `/tree-spike` only.

What changed:

- Tightened the beta page at phone widths so the hero and controls do not bury the chart as badly.
- Made mobile chart controls, search, focus, and selected-person actions larger and easier to tap.
- Kept the chart canvas touch-contained for pan/zoom and prevented page-level horizontal overflow.
- Added mobile-aware scroll behavior so selecting/finding a person brings the details panel into view, and chart actions bring the chart itself into view.
- Preserved Family Chart's visible family relationship paths.

Verification:

- `npm run check` passed.
- `git diff --check` passed with only existing LF/CRLF warnings from the Windows checkout.
- Desktop `1280 x 720`: chart SVG rendered, relationship links remained visible, no console errors, and no page-level horizontal overflow.
- Mobile `390 x 844`: focusing Tim Colety selected the correct person, highlighted 1 selected card plus 7 immediate-family cards, preserved 38 relationship links, kept visible controls/inputs at 46px tall, and had no page-level horizontal overflow.
- Narrow mobile `320 x 740`: focusing Tim Colety and tapping `Focus in chart` scrolled the chart into view, preserved 38 relationship links, kept visible controls/inputs at 46px tall, and had no page-level horizontal overflow.

Notes:

- Browser automation could not type into the search input because its virtual clipboard was unavailable. The focus/select path and mobile search-control layout were verified; the search matching logic itself was already covered in Prompt 5 and only gained mobile scroll behavior here.
- Still needs live Firebase testing on an actual phone after deployment, especially pinch zoom, one-finger panning, and signed-in private-tree profile links.

## Family Chart Safe Switch On `/tree` - May 26

Status: Prompt 8 from `TREE_2026-05-25_IMPROVEMENTS_QUEUE.md` is implemented locally.

What changed:

- Added a `Chart view` / `Card view` switch to the real `/tree` page.
- Kept the custom card renderer as the safe fallback with existing search, density, collapse, add-person, and profile-link behavior.
- Embedded the Family Chart beta as the Chart view instead of replacing `/tree` outright.
- Chart view uses `/tree-spike?demo=large&embed=tree` for the large demo and `/tree-spike?familyId=...&embed=tree` for private trees.
- Embedded chart mode hides the beta page's duplicate header, hero, notes, and footer.
- Embedded private-tree profile links open in the top page so profile navigation is not trapped inside the iframe.
- Changed Firebase Hosting `X-Frame-Options` from `DENY` to `SAMEORIGIN` so this same-origin embed can work after deployment.

Verification:

- `npm run check` passed.
- `git diff --check` passed with only existing LF/CRLF warnings from the Windows checkout.
- Desktop `1280 x 720`: `/tree?demo=large&view=chart` activated Chart view, hid Card view, rendered the embedded Family Chart SVG, preserved relationship links, and had no page-level horizontal overflow.
- Desktop `1280 x 720`: switching to Card view restored the 80-card custom renderer, card search, density controls, and contained page width.
- Mobile `390 x 844`: Chart view rendered in the page, kept the switch buttons tappable at 44px, hid card-only controls, preserved embedded chart links, and had no page-level horizontal overflow.
- Mobile `390 x 844`: Card view fallback restored 80 cards, card search, density controls, and contained page width.

Still needs live Firebase testing:

- Deploy before judging the real signed-in experience; local smoke cannot prove Firebase Auth inside the embedded chart frame.
- Open `/tree?familyId=colety-birthday-tree&view=chart` while signed in on Firebase Hosting.
- Confirm real Colety people load, `Open profile` exits the iframe to the top page, and Card view add/edit refreshes Chart view afterward.

## Family Chart Default Decision - May 26

Status: Prompt 9 from `TREE_2026-05-25_IMPROVEMENTS_QUEUE.md` is implemented locally.

Decision:

- Make Family Chart the default for the large demo and the known Colety birthday starter tree.
- Keep Card view as the safe fallback for editing, profile-link confidence, and any chart rendering surprises.
- Do not delete the custom renderer before live Firebase testing.

What changed:

- Fresh `/tree?demo=large` visits now open Chart view by default.
- Fresh signed-in `/tree?familyId=colety-birthday-tree` visits are intended to open Chart view by default.
- `?view=chart` and `?view=cards` remain explicit overrides.
- A saved view preference still wins, so anyone can switch back to Card view and stay there.
- Updated `DEPLOYMENT_CHECKLIST.md` so the release smoke test covers Chart view default, Card view fallback, `/tree-spike`, and the `X-Frame-Options: SAMEORIGIN` header.

Verification:

- `npm run check` passed.
- Desktop `1280 x 720`: `/tree?demo=large` opened Chart view by default, rendered the embedded Family Chart SVG, preserved relationship links, and had no page-level horizontal overflow.
- Desktop `1280 x 720`: `/tree?demo=large&view=cards` forced the fallback Card view, rendered all 80 cards, and kept card search/density controls visible.
- Mobile `390 x 844`: `/tree?demo=large` opened Chart view by default, rendered the embedded Family Chart SVG, preserved relationship links, kept the view switch tappable, and had no page-level horizontal overflow.

Still needs live Firebase testing:

- Local smoke cannot prove signed-in private Firestore data inside the same-origin iframe.
- Deploy, then test signed-in `/tree?familyId=colety-birthday-tree` on Firebase Hosting.
- Confirm the private tree defaults to Chart view, real people load, `Open profile` escapes the iframe correctly, and `?view=cards` remains a reliable fallback.

## Final Pre-Demo Polish - May 26

Status: Prompt 10 from `TREE_2026-05-25_IMPROVEMENTS_QUEUE.md` is implemented locally.

What changed:

- Cleaned up the connected chart page copy so the standalone `/tree-spike` route no longer reads like an internal prototype.
- Updated `/tree` Chart view helper copy to make the browsing/editing split clearer: Chart view is for exploring, Card view is for add/edit work.
- Hid the floating add-person button in Chart view so users do not try to edit inside the embedded chart.
- Preserved `view=chart` and `view=cards` through profile back links, relationship profile links, and delete redirects.
- Hid success-only mapping diagnostics in the embedded chart while leaving warning diagnostics visible.

Deploy readiness:

- Ready for a deploy check once local checks are clean.
- Keep Card view available as the fallback and editing path.
- Keep `/tree-spike?demo=large` available as the standalone chart review route.

Still needs live Firebase testing:

- Signed-in `/tree?familyId=colety-birthday-tree` should default to Chart view and load real Colety data.
- Opening a profile from Chart view should leave the iframe and return back to Chart view with focus preserved.
- Card view add/edit/photo flows should still work against Firestore and Storage rules.
- Test the final birthday demo path on desktop and phone before moving the domain.

## QA Report Queue Intake - May 26

Source: `Family Tree Layout Strategy (2).docx`

Created active queue: `TREE_2026-05-26_QA_REPORT_QUEUE.md`

Triage notes:

- The report reviewed the 20-file review bundle, not the whole repo. Its missing-file findings for `main.js`, `firebase.js`, `auth.js`, `starterTree.js`, `demoTreeData.js`, and `signin.html` are likely false positives because those files exist in the repo.
- The new queue still starts with deploy/import verification so a real Firebase deploy cannot silently miss those files.
- Highest-risk real items from the report are navigation context preservation, Chart view blank fallback, profile error states, signed-out create/join clarity, search empty states, modal accessibility, and Firebase rules/privacy hardening.

## QA Queue Prompt 1 - Deploy Bundle And Import Graph - May 27

Status: Done locally.

Findings:

- The QA report's missing-file concern was confirmed as a 20-file bundle artifact, not a real repo issue.
- `main.js`, `firebase.js`, `auth.js`, `starterTree.js`, `demoTreeData.js`, `signin.html`, `404.html`, Firestore rules, Storage rules, and Firestore indexes all exist in the repo.
- A local import/asset scan checked 69 local references and found 0 missing files.
- Firebase Hosting rewrites cover the birthday routes: `/`, `/home`, `/signin`, `/account`, `/dashboard`, `/tree`, `/tree-spike`, `/search`, and `/profile`.

Verification:

- `npm run check` passed.
- `git diff --check` passed with only Windows LF/CRLF warnings.
- Local route smoke passed for `/`, `/signin`, `/account`, `/tree`, `/tree?demo=large`, `/tree-spike?demo=large`, `/search`, and `/profile`.
- The large demo still defaults to Chart view and renders the embedded Family Chart SVG.

Still needs live Firebase testing:

- Deployed Firebase Hosting should be checked for the same rewrites, headers, custom `404.html`, and signed-in auth behavior.

## QA Queue Prompt 2 - Signed-In Navigation Context - May 27

Status: Done locally.

What changed:

- Shared header navigation now preserves signed-in family context across Family Tree, Search, Account, and Profile flows.
- Signed-in users see `Family Tree`; signed-out users still see `Example Tree`.
- `familyId` is kept on signed-in Family Tree, Search, and Account links.
- `view=chart` / `view=cards` is kept on Family Tree links when relevant.
- Profile pages can link back to the tree with `focus=<personId>`.
- Search query context is kept on Search links when the current route has `query=...`.
- Card view profile links now include `view=cards` so returning from profile does not unexpectedly switch modes.

Verification:

- `npm run check` passed.
- `git diff --check` passed with only Windows LF/CRLF warnings.
- Browser smoke passed for signed-out nav and signed-in-equivalent nav using a local auth stub.

Still needs live Firebase testing:

- Confirm the same nav behavior after real Firebase sign-in.
- Confirm `/account?familyId=...` still renders the account page normally and does not confuse dashboard loading.

## QA Queue Prompt 3 - Chart View Loading And Fallback Safety - May 27

Status: Done locally.

What changed:

- `/tree` now shows a real Chart view loading panel while the embedded Family Chart iframe starts.
- The Chart view has timeout, iframe error, and chart runtime error handling.
- Failed or stalled Chart view loads show a clear error state with a `Switch to Card view` button.
- The embedded `/tree-spike?...&embed=tree` page now reports `ready` or `error` back to `/tree` with same-origin messages.
- Card view remains the safe fallback for browsing plus add/edit/photo work.

Verification:

- `npm run check` passed.
- `git diff --check` passed with only Windows LF/CRLF warnings.
- Browser smoke passed for `/tree?demo=large`, `/tree?demo=large&view=chart`, and `/tree?demo=large&view=cards`.
- A simulated broken chart route produced the visible fallback panel, and the fallback button switched back to Card view with all 80 demo cards available.

Still needs live Firebase testing:

- Confirm live Firebase Hosting rewrites allow `/tree` and `/tree-spike` to communicate as same-origin pages.
- Confirm the signed-in Colety tree reports Chart view ready on live data.
- Confirm Card view still handles add/edit/photo flows against live Firestore and Storage rules.

## QA Queue Prompt 4 - Profile Error States And Return Paths - May 27

Status: Done locally.

What changed:

- Profile back-link HTML now starts neutral as `Back`; JS sets `Back to Family Tree` or `Back to Search` after reading route context.
- Missing profile IDs, bad person IDs, signed-out private profile URLs, and profile load failures now render complete friendly states instead of half-loaded profile cards.
- Unavailable profile states hide the empty photo area and fill profile fields with clear placeholder copy.
- Relationship profile links now preserve `familyId`, tree `view`, and search `query` context where appropriate.
- Search-origin relationship navigation keeps `from=search` so back links return to Search instead of unexpectedly jumping to the tree.

Verification:

- `npm run check` passed.
- `git diff --check` passed with only Windows LF/CRLF warnings.
- Browser smoke passed for missing-person `/profile`.
- Browser smoke passed for signed-out private tree-origin and search-origin profile URLs.
- Browser smoke passed for an explicit public/example bad-person URL with `familyId=` clearing stored private context.

Still needs live Firebase testing:

- Open a real Colety profile while signed in and confirm owner/editor/viewer edit states are correct.
- Click parent/spouse/child links on real profiles and confirm `familyId` plus `view=chart/cards` are preserved.
- Open a profile from Search, click a related profile, and confirm the back link returns to the same live search query.

## QA Queue Prompt 5 - Signed-Out Home Create/Join Flow - May 27

Status: Done locally.

What changed:

- Fixed the home page to load `js/home.js`, which was the reason the create/join controls could appear inert.
- Signed-out users now see `Sign In to Start` and `Sign In to Join` on the main action cards.
- Signed-out create/join forms are intentionally disabled and show sign-in notes with links back to the exact create/join section.
- The sign-in redirect preserves either `/#createTreeFormCard` or `/#joinTreeFormCard`.
- Signed-in users see enabled create/join forms, normal button labels, and copy that says they can create or join now.

Verification:

- `npm run check` passed.
- `git diff --check` passed with only Windows LF/CRLF warnings.
- Browser smoke with signed-out auth stub confirmed disabled controls, clear notes, and redirect to `/signin?redirect=%2F%23createTreeFormCard`.
- Browser smoke with signed-in auth stub confirmed enabled controls and no signed-out notes.

Still needs live Firebase testing:

- Sign out on Firebase Hosting, use both create/join buttons, sign in, and confirm the redirect lands back on the intended home section.
- While signed in, create a manual family tree and join with a real access code against live Firestore rules.

## QA Queue Prompt 6 - Search Context And Empty States - May 27

Status: Done locally.

What changed:

- Added a search context line that names the current scope: read-only example tree, private tree, or no connected family tree.
- Signed-out private-family search URLs now disable the search form and show a clear sign-in-required state.
- Signed-in/no-family and search-load failure states now use structured friendly empty-state cards.
- Empty search and no-results copy now mention the active search scope.
- Query URLs rebuild the search field/results on browser back/forward.
- Search result profile links continue preserving `query=...` and `from=search`.

Verification:

- `npm run check` passed.
- `git diff --check` passed with only Windows LF/CRLF warnings.
- Browser smoke passed for signed-out example search, demo `query=tim`, signed-out private-family URL search, no-results search, and Search -> Profile -> browser Back.

Still needs live Firebase testing:

- Confirm signed-in private search names and searches the real Colety tree.
- Confirm Search -> Profile -> related profile -> Back to Search preserves `familyId` and `query` on live private data.
- Confirm no-family copy only appears for accounts with no accessible family tree.

## QA Queue Prompt 7 - Add/Edit Modal Accessibility And Mobile Usability - May 27

Status: Done locally.

What changed:

- Add-person and edit-profile modals now have dialog semantics, modal title labels, real close buttons, and hidden closed states.
- Opening either modal moves focus to the first field.
- Escape closes each modal, and normal user-opened desktop modals restore focus to the trigger.
- Added a simple Tab loop inside each modal.
- Modal panels now cap to the viewport and scroll internally on mobile.
- Existing add/profile status messages remain `aria-live="polite"`.

Verification:

- `npm run check` passed.
- `git diff --check` passed with only Windows LF/CRLF warnings.
- Desktop browser smoke passed for the add-person modal and edit-profile modal.
- Mobile headless Chrome smoke at 390x844 passed for add-person and edit-profile modal open/focus/size/scroll/Escape behavior.

Still needs live Firebase testing:

- Test the add-person modal on a real editable private tree.
- Test edit-profile modal save/cancel/photo-upload error behavior on a real editable profile.

## QA Queue Prompt 8 - Firebase Rules Privacy Hardening Review - May 27

Status: Done locally.

What changed:

- `joinCodes` can be fetched by exact code, but cannot be listed.
- New join-code docs must use the generated 10-character access-code format.
- Joining a family now requires the submitted code in the family update, so knowing only a `familyId` is not enough to self-add.
- The join flow writes a temporary `joinCodeAttempt` marker and clears it after the join succeeds.
- Members leaving a tree can remove only themselves and their own role entry.
- User profile docs are self-readable only; no client-side listing.
- Storage profile images now require owner/editor access, safe image filenames, image MIME types, and max 5 MB size.
- Deployment checklist now includes rules-load and live privacy tests.

Verification:

- `npm run check` passed.
- `firebase emulators:exec --only firestore,storage --log-verbosity QUIET "node -p 1"` passed.
- `git diff --check` passed with only Windows LF/CRLF warnings.

Still needs live Firebase testing:

- New tree creation writes a valid random invite code.
- Joining with the exact code works from another account.
- Joining by guessed `familyId` without `joinCodeAttempt` is denied.
- Resetting an invite code invalidates the old code.
- Photo uploads accept valid images under 5 MB and reject non-images.
- Account member names may fall back to `Family member` until a safer shared-profile schema is added.

## External Audit Triage - Family Tree Layout Strategy (3) - May 27

Source: `C:\Users\codex-agent\Downloads\Family Tree Layout Strategy (3).docx`

Created follow-up queue: `TREE_2026-05-27_EXTERNAL_AUDIT_QUEUE.md`

Audit verdict:

- The app is close to birthday-demo ready.
- The audit's P0 items mostly match work already completed locally in the QA queue.
- The remaining highest-value work is not a rewrite; it is context persistence, add/search modal behavior, photo upload polish, mobile Card-view cues, and live Firebase testing.

Already handled locally:

- Main import/deploy shape and route rewrites.
- Sign-in wiring through `main.js` and `auth.js`.
- Chart-view loading/error fallback to Card view.
- Firestore/Storage privacy hardening.
- Modal dialog semantics, Escape close, focus-on-open, and mobile modal sizing.

Still actionable:

- Preserve Tree/Search/Profile context more aggressively through view switches, density changes, and profile returns.
- Keep Add Person modal open on validation errors and preserve form state.
- Preserve Search query/results after adding someone from Search.
- Align photo input types/copy/errors with Storage rules and investigate old-photo cleanup.
- Add clearer mobile sideways-scroll affordance for Card view.
- Restore context-aware profile back-link labels.
- Run live Firebase owner/editor/viewer tests after these local fixes.

## External Audit Queue Prompt 1 - Cross-Check And Live-Test Checklist - May 27

Status: Done locally.

Compact cross-check:

| Audit item | Status | Next action |
| --- | --- | --- |
| Main/module imports | Fixed locally | Reconfirm after deploy. |
| Sign-in wiring | Fixed locally | Live sign-in test. |
| Chart fallback | Fixed locally | Live `/tree?demo=large` and private-tree smoke. |
| Rules alignment | Hardened locally | Live owner/editor/viewer Firebase tests. |
| Navigation context | Still valid | External audit prompt 2. |
| Tree search/focus persistence | Still valid | External audit prompt 2. |
| Add modal validation state | Still valid | External audit prompt 3. |
| Orphaned Storage images | Still valid | External audit prompt 4. |
| Photo type/size UX | Still valid | External audit prompt 4. |
| Mobile Card scroll cue | Still valid | External audit prompt 5. |
| Modal accessibility | Fixed locally | Live add/edit smoke. |
| Search add-person query preservation | Still valid | External audit prompt 3. |
| Profile back-link label | Still valid | External audit prompt 5. |

Exact Spencer manual-test checklist:

Owner:

1. Sign in at `/signin`.
2. Open `/account` and confirm the Colety tree plus owner-only invite code.
3. Copy and reset the invite code.
4. Open `/tree?familyId=colety-birthday-tree`; confirm Chart view or Card fallback.
5. Switch to Card view, search/focus a known person, open profile, and Back to the right tree/view.
6. Open `/search?familyId=colety-birthday-tree`, search `Colety`, open profile, and Back with query preserved.
7. Add a harmless test person in Card view.
8. Edit that person's name/bio/relationships.
9. Upload a valid JPG/PNG/WebP/GIF under 5 MB.
10. Try a non-image/unsupported file and confirm friendly failure.

Viewer:

1. Sign in as second account.
2. Join with the current invite code.
3. Confirm tree/profile read access.
4. Confirm add/edit/remove controls are hidden or blocked.
5. Confirm the old reset invite code no longer works.

Editor:

1. Owner promotes second account to editor.
2. Editor reloads the tree.
3. Confirm add/edit controls are available.
4. Add/edit a test person and upload a valid image.

Negative/privacy:

1. Signed-out `/tree?familyId=colety-birthday-tree` does not show private data.
2. Signed-in non-member `/tree?familyId=colety-birthday-tree` does not show private data.
3. Non-member cannot join with familyId alone; exact invite code is required.
4. Uploaded family images are available to family members but not signed-out users.

## External Audit Queue Prompt 2 - Navigation And Focus Persistence - May 27

Status: Done locally; live signed-in Firebase smoke still needed after deploy.

What changed:

- Header navigation now carries the current tree context forward instead of dropping focus when already on `/tree`.
- Tree search state uses `treeQuery` plus `focus`, so Card view, Chart view, profile opens, profile Back, and relationship profile links can return to the same working spot.
- Card profile links are refreshed when the user changes between Card and Chart views or updates the tree search.
- Profile remove-person redirect keeps the tree view/search context when possible.

Checks:

- `npm run check` passed.
- `git diff --check` passed.
- Local browser smoke passed for large-demo tree search/focus, Card/Chart toggles, tree-origin profile Back link context, and Search query preservation.

Spencer live check:

1. Sign in as `smcolety@gmail.com`.
2. Open the Colety tree in Card view.
3. Use Find person for a known person, open their profile, and click Back to Family Tree.
4. Confirm the same `familyId`, `view`, `treeQuery`, and focused card return.
5. Open Search, search a name, open a profile, and confirm Back to Search preserves the query.

## External Audit Queue Prompt 3 - Add/Search Modal Validation And Query Preservation - May 27

Status: Done locally; live owner/editor add-person success still needs Firebase testing.

What changed:

- Add Person forms now use inline app validation instead of browser-required popups.
- Validation errors mark the relevant field, keep the modal open, and preserve typed values.
- Successful add events include the page/search context.
- Search now keeps the current query and URL intact while refreshing after a person is added.
- Invalid fields now have a visible red outline.

Checks:

- `npm run check` passed.
- `git diff --check` passed.
- Browser smoke passed for Tree add-modal presence/read-only state, inline validation ownership, Search query restoration, and Search URL query updates while typing.

Spencer live check:

1. Sign in as an owner/editor.
2. Open Card view and Add Person.
3. Try missing first name, missing last name, duplicate parents, and an invalid photo URL; confirm the modal stays open and entered values remain.
4. Open `/search?query=Colety`, add a harmless test person, and confirm the same search query remains after the refresh.

## External Audit Queue Prompt 4 - Profile Photo Upload, Replace, And Remove Polish - May 27

Status: Done locally; live Firebase Storage tests still matter.

What changed:

- Add Person and Edit Profile file inputs now allow only JPG/JPEG, PNG, WebP, or GIF.
- Photo helper validation rejects HEIC/HEIF, unsupported types, and files over 5 MB before upload.
- Upload failures no longer silently embed data URLs into Firestore; they surface clear Storage/photo errors.
- Replacing or removing a Firebase-hosted profile photo attempts to delete the old Storage object only when the URL is clearly inside that same family's/person's Storage folder.

Checks:

- `npm run check` passed.
- `git diff --check` passed.
- Browser smoke passed for Tree/Profile photo accept attributes and 5 MB/HEIC copy.

Spencer live check:

1. Upload a valid JPG/PNG/WebP/GIF under 5 MB to a test person.
2. Try HEIC and a file over 5 MB; confirm friendly errors.
3. Replace the uploaded test image and check Firebase Storage for old-object cleanup.
4. Remove the uploaded test image and confirm the profile clears.
5. Paste an external HTTPS image URL, then replace/remove it; confirm cleanup does not try to delete the external file.

## External Audit Queue Prompt 5 - Mobile Card View And Back-Link Polish - May 27

Status: Done locally; phone-sized live smoke still recommended after deploy.

What changed:

- Added a mobile-only Card view cue: `Swipe sideways to see more relatives in Card view.`
- The cue only appears when a normal Card layout is actually rendered. It stays hidden in Chart view, overview mode, empty states, and private-tree message states.
- Profile Back link now has a good default label in HTML and remains runtime context-aware for Tree/Search.
- Large-tree overview heading now says `Family map` instead of birthday-demo-specific language.
- Starter-tree profile copy no longer says `birthday-demo`.

Checks:

- `npm run check` passed.
- `git diff --check` passed.
- Browser smoke passed on desktop and a 390px mobile viewport for cue visibility, no body horizontal overflow, neutral large-tree heading, and Tree/Search profile Back labels.

Spencer live check:

1. On mobile, open a normal Card view with enough relatives to scroll sideways and confirm the swipe cue appears.
2. Open Chart view and confirm the cue disappears.
3. Open a profile from Search and Tree and confirm the Back label/destination match the source.

## External Audit Queue Prompt 6 - Final Acceptance Pass - May 27

Status: Done locally; ready for a deploy candidate after Spencer's live Firebase checks.

What passed:

- `npm run check`
- `git diff --check` with line-ending warnings only
- Local static route smoke for `/`, `/signin`, `/account`, `/tree`, `/tree?demo=large`, `/tree?demo=large&view=cards`, `/tree-spike?demo=large`, `/search`, and `/profile?person=colety_rose&familyId=colety-birthday-tree&from=search&query=Rose`
- Chart fallback control exists on `/tree`
- Card add-form shell is present and uses app-owned validation
- Search-origin profile Back link says `Back to Search` and preserves `familyId` and `query`
- Mobile viewport smoke passed with no body-level horizontal overflow

Notes:

- The initial Search smoke used an old selector name. The page is correct with `#search-input`, and the corrected smoke passed.
- Repeated `MutationObserver.observe` browser errors had no matching repo source. Treat this as likely browser/extension noise unless it appears in the real deployed site console.

Spencer live check:

1. Sign in with `smcolety@gmail.com`.
2. Confirm `/account` loads the Colety tree and owner tools.
3. Copy and reset the invite code, then confirm the old code no longer joins.
4. Open `/tree?familyId=colety-birthday-tree`, test Chart view and Card fallback, then search/focus/open profile/back.
5. Use a second account to test viewer access, editor promotion, and blocked non-member access.
6. Upload, replace, and remove a valid profile photo; test HEIC, oversized, and unsupported file failures.
7. After deploy, repeat the route smoke on Firebase Hosting and then on `coletys.com`.

## Extract Summary

- `QA Report Request.docx`: 79 extracted text blocks, 0 embedded media files.
- `Family Tree Page Review.docx`: 179 extracted text blocks, 0 embedded media files.
- `UX_Product Improvement Report.docx`: 37 extracted text blocks, 0 embedded media files.
- `Website Improvement Review.docx`: 55 extracted text blocks, 0 embedded media files.
- `App Signed-Out Experience Review.docx`: 77 extracted text blocks, 0 embedded media files.
- `Family Tree Layout Strategy.docx`: 97 extracted text blocks, 0 embedded media files.

## External Audit Round 2 Intake - May 27

Source report: `C:\Users\codex-agent\Downloads\Family Tree Layout Strategy (4).docx`

Extracted copy: `TREE_EXTERNAL_AUDIT_2026-05-27_REPORT.txt`

Queue created: `TREE_2026-05-27_EXTERNAL_AUDIT_ROUND2_QUEUE.md`

Main takeaway:

- The second external audit did not identify a new code-only P0 blocker in the local bundle.
- The remaining P0 risk is live Firebase behavior: Auth redirects, real Account tree loading, invite-code reset/join, owner/editor/viewer permissions, Storage photo upload/replace/remove, and private-tree blocking.
- Local checks and browser smoke are useful, but the birthday release still needs Spencer's live Firebase pass before deploy confidence is real.

Round 2 queue focus:

1. Clean up and dedupe the live-test checklist.
2. Review auth redirect safety.
3. Recheck Account and invite-code flows.
4. Stress navigation context edge cases.
5. Harden Add/Search/Profile flows.
6. Add lightweight loading/error polish.
7. Improve relationship form clarity and accessibility.
8. Review Firebase rules and Storage assumptions.
9. Evaluate CSP feasibility.
10. Run final round-two acceptance.

## External Audit Round 2 Prompt 1 - Live-Test Checklist And Release Gate Cleanup - May 27

Status: Done; documentation-only.

What changed:

- Added one canonical `Spencer Live Release Gate` section to `DEPLOYMENT_CHECKLIST.md`.
- Marked round-two prompt 1 done in `TREE_2026-05-27_EXTERNAL_AUDIT_ROUND2_QUEUE.md`.
- Kept the older prompt findings in place for detail, but the deployment checklist is now the fastest source of truth for live testing.

Release-gate summary:

1. Owner signs in, confirms Account loads the Colety tree, and tests invite-code copy/reset.
2. Owner verifies Tree, Chart/Card, search/focus, profile Back, and Search Back behavior.
3. Owner optionally adds/edits/removes a harmless test person if editing will be shown.
4. Owner tests valid and invalid photo upload/replace/remove flows.
5. Second account joins as viewer and confirms read-only behavior.
6. Owner promotes the second account to editor and confirms editor-only edit behavior.
7. Signed-out and non-member users are blocked from private family data.
8. Any live console `MutationObserver.observe` errors are checked to see whether they are app-side or browser-extension noise.

## External Audit Round 2 Prompt 2 - Auth Redirect Safety Review - May 27

Status: Done locally; live Firebase sign-in return still needs testing.

What changed:

- `js/auth.js` now whitelists sign-in redirect destinations to known in-app routes.
- Off-site redirects were already blocked by origin checks; same-origin unknown routes and `/signin` redirect loops are now sent to `/account` instead.
- Legitimate return paths still work for signed-out create/join flows, tree routes, search routes, profile routes, and account.

Checks:

- `npm run check` passed.
- `git diff --check` passed with line-ending warnings only.
- Local browser smoke confirmed signed-out Start and Join CTAs point to:
  - `/signin?redirect=%2F%23createTreeFormCard`
  - `/signin?redirect=%2F%23joinTreeFormCard`
- Local browser smoke confirmed `/signin` loads with create, join, tree-context, external, and sign-in-loop redirect params.

Spencer live check:

1. Signed out, click `Sign In to Start`, sign in, and confirm you return to the create-tree section.
2. Signed out, click `Sign In to Join`, sign in, and confirm you return to the join-code section.
3. Try a real protected tree/search/profile URL that sends you through sign-in and confirm it returns to the intended in-app path.

## External Audit Round 2 Prompt 3 - Account Tree And Invite-Code Flow Review - May 27

Status: Done locally; live owner/viewer/editor Firebase checks remain.

What changed:

- `js/dashboard.js` no longer tries to read other members' private `/users/{uid}` documents.
- Account member labels now use the current user's readable profile and generic `Family member` labels for everyone else unless a future public profile model is added.
- This matches the current Firestore rule that `/users/{uid}` is self-only and avoids Account-page permission noise.

Review notes:

- Account tree loading uses both `memberIds` and `ownerId` queries, so owner-owned legacy trees can still appear even if `memberIds` is missing or stale.
- Legacy account repair still handles missing owner membership, owner role, and missing join code.
- Resetting an invite code writes a new code, updates the family, and deletes the old code. Even if old-code deletion fails, Firestore rules compare `joinCodeAttempt` against the current family `joinCode`, so the old code should not join.
- Owners should see invite copy/reset and member controls. Viewers/editors should not see invite reset controls.

Checks:

- `npm run check` passed.
- `git diff --check` passed with line-ending warnings only.
- Firestore/Storage emulator rules-load command passed.
- Local `/account` browser smoke passed for signed-out render state.

Spencer live check:

1. Sign in as `smcolety@gmail.com`; confirm `/account` shows the Colety tree.
2. Confirm owner-only invite-code and member-management controls appear.
3. Reset the invite code and confirm the old code cannot join.
4. Join as a second account and confirm viewer read-only behavior.
5. Promote the second account to editor and confirm editor can edit people/photos but cannot reset invite codes.

## External Audit Round 2 Prompt 4 - Tree Navigation Context Edge-Case Pass - May 27

Status: Done locally; signed-in header behavior still needs live smoke.

What changed:

- `js/main.js` now bridges Tree's `treeQuery` and Search's `query`.
- Header Search links preserve the active Tree search term.
- Header Family Tree links preserve Search/Profile search terms as Tree focus context.
- Profile-origin Tree links keep the profile person as `focus`.

Checks:

- `npm run check` passed.
- `git diff --check` passed with line-ending warnings only.
- Static signed-in URL-building check passed for Tree -> Search, Search -> Tree, search-origin Profile -> Tree, and tree-origin Profile -> Tree.
- Local browser smoke passed on desktop and mobile-sized viewports for Tree, Search, Profile, and Account routes with no body-level horizontal overflow.

Spencer live check:

1. Signed in, use Tree search/focus, then click Search; confirm the term carries over.
2. Signed in, use Search, then click Family Tree; confirm the term carries over as tree context.
3. Open a profile from Search and confirm `Back to Search` plus the header Family Tree link preserve context.
4. Open a profile from Chart view and confirm returning preserves `view=chart`.

## External Audit Round 2 Prompt 5 - Add/Search/Profile Flow Hardening - May 27

Status: Done locally; live owner/editor add/edit success still needs Firebase testing.

What changed:

- Search Add Person now has the same optional bio and profile-photo fields as Tree Add Person.
- Search Add Person uses the same supported file types and 5 MB photo copy.
- Edit Profile now uses app-owned inline validation with `noValidate`.
- Edit Profile validation keeps the modal open, marks invalid fields, focuses the issue, and shows clear status text.

Checks:

- `npm run check` passed.
- `git diff --check` passed with line-ending warnings only.
- Browser smoke passed for Search empty/query/private states, Search-origin Profile, Tree-origin Profile, missing-person Profile, and mobile Search/Profile routes.
- Profile Back labels and return hrefs stayed correct.

Spencer live check:

1. As owner/editor, submit Search Add Person with missing first/last name and confirm values stay in the modal.
2. Add a harmless person from Search with bio/photo; confirm the query stays after refresh.
3. Edit that profile and test required-name validation, duplicate parents, descendant parent, bad photo URL, valid upload, and save.
4. Confirm viewers see read-only messaging and cannot add/edit.

## External Audit Round 2 Prompt 6 - Loading And Error-State Polish - May 27

Status: Done locally; live Firebase failure states still need owner/editor/viewer testing.

What changed:

- Account now shows an intentional loading skeleton instead of an empty gap while family tree data loads.
- Account Firebase failures now render a visible unavailable state with refresh/access guidance.
- Account action messages now use loading/success/error styling for copy/reset, save, archive, leave, member removal, and role changes.
- Tree/Search/Profile/Add Person failure copy now points to the likely fix: refresh, sign in, confirm access, or use an editor account.
- Shared status styling now includes success tones alongside the existing loading/error treatment.

Checks:

- `npm run check` passed.
- `git diff --check` passed with line-ending warnings only.
- Headless Chrome smoke passed for desktop Account, Large Demo Tree, Search, private-tree Search, private Profile, Sign In, and mobile Account/Search/Large Demo routes.
- Smoke found no page exceptions and no body-level horizontal overflow on checked routes.

Spencer live check:

1. Open `/account` signed in and confirm loading, loaded, and unavailable states feel understandable.
2. Test invite-code copy/reset plus tree save/member role actions and confirm messages are readable.
3. Test valid/invalid photo upload from Add Person and Edit Profile and confirm Storage errors are clear.
4. Test viewer account read-only behavior and confirm denied actions are explained instead of feeling broken.

## External Audit Round 2 Prompt 7 - Relationship Form Clarity And Accessibility Polish - May 27

Status: Done locally; live owner/editor modal smoke remains.

What changed:

- Add Person on Tree and Search now groups parent/spouse selectors under a clear `Relationships` fieldset.
- Edit Profile uses the same relationship helper pattern.
- Blank relationship options now read as unknown/not listed instead of vague select placeholders.
- The tree access-code chip can be copied with keyboard focus plus Enter/Space.
- Density/view controls and Account invite/member controls have clearer ARIA labels/tooltips.

Checks:

- `npm run check` passed.
- `git diff --check` passed with line-ending warnings only.
- Headless Chrome smoke confirmed helper text, `aria-describedby`, access-code role, density/view labels, no page exceptions, and no body-level horizontal overflow on checked Tree/Search/Profile routes.

Spencer live check:

1. As owner/editor, open Add Person from Tree and Search and read through the relationship fields.
2. Edit an existing profile and confirm selected parent/spouse values remain correct.
3. Keyboard-focus the tree access code and press Enter or Space to copy.
4. Check Account invite-code and member-access controls for understandable labels.

## External Audit Round 2 Prompt 8 - Firebase Rules And Storage Preflight - May 27

Status: Done locally; deployed Firebase owner/editor/viewer testing still required.

Review result:

- No rules code changes were needed in this pass.
- Firestore family reads are owner/member-only.
- Family writes are owner-only except narrow join, leave, and join-code-attempt cleanup paths.
- Join requires the exact current family `joinCode`; a guessed `familyId` alone should not work.
- Exact `joinCodes/{code}` lookup is allowed to signed-in users, but listing is denied.
- `/users/{uid}` remains self-only.
- People writes require owner/editor access; viewers can read only.
- Storage images are member-readable and owner/editor-writable, with type/size/filename checks.
- Old Storage image deletion is best-effort and should not block profile save.

Checks:

- `firebase emulators:exec --only firestore,storage --log-verbosity QUIET "node -p 1"` passed.
- `npm run check` passed.
- `git diff --check` passed with line-ending warnings only.
- `DEPLOYMENT_CHECKLIST.md` now includes a dedicated rules/privacy preflight section.

Spencer live check:

1. Deploy Firestore and Storage rules.
2. Owner: reset invite code, manage member roles, add/edit/remove people, and upload/replace/remove photos.
3. Viewer: read tree/profile only; blocked from add/edit/remove/photo upload/invite reset.
4. Editor: can add/edit/photo upload but cannot reset invite codes.
5. Signed-out/non-member: denied from private family, people, and image reads.
6. Join flow: current exact invite code works, old reset code fails, guessed `familyId` alone fails.

## External Audit Round 2 Prompt 9 - CSP And Hosting Header Feasibility - May 27

Status: Done locally; report-only CSP added, enforcement deferred.

Decision:

- Do not enforce CSP before the birthday demo.
- The app relies on Firebase SDK modules, Auth/Firestore/Storage network calls, jsDelivr chart assets, a same-origin chart iframe, Firebase Storage images, and arbitrary HTTPS profile image URLs.
- A blocking CSP could break live signed-in flows if any Firebase/CDN endpoint is missing from the allowlist.

What changed:

- `firebase.json` now includes `Content-Security-Policy-Report-Only`.
- `DEPLOYMENT_CHECKLIST.md` now has a CSP hardening plan and live header/console checks.

Checks:

- `npm run check` passed.
- `git diff --check` passed with line-ending warnings only.
- `firebase emulators:exec --only hosting --project tree-72e80 --log-verbosity QUIET "node -p 1"` passed.
- Local Hosting emulator started, but `curl -I` did not expose custom headers; verify headers on deployed Firebase Hosting.

Spencer live check:

1. After deploy, confirm the live response includes `Content-Security-Policy-Report-Only`.
2. Open the main routes and watch the browser console for CSP reports.
3. Run signed-in Auth, Account, Tree Chart/Card, Search, Profile, Add/Edit, and photo-upload flows.
4. Keep CSP report-only for the demo; enforce only after live reports are reviewed.

## External Audit Round 2 Prompt 10 - Final Acceptance Pass - May 27

Status: Done locally. Ready for Spencer's live Firebase pass; not final-release approved until live checks pass.

Checks:

- `npm run check` passed.
- `git diff --check` passed with line-ending warnings only.
- `firebase emulators:exec --only firestore,storage --log-verbosity QUIET "node -p 1"` passed.
- Local static server returned 200 for the app shell.

Browser smoke:

- Desktop routes passed: Home, Sign In, Account, Large Demo Tree, Large Demo Card fallback, Family Chart spike, Search, signed-out private Search/Profile states, and branded 404.
- Mobile-sized routes passed: Home, Large Demo Tree, Search, and Account.
- No page exceptions were detected.
- No body-level horizontal overflow was detected.

Readiness call:

- Locally, this is a deploy candidate for the live Firebase pass.
- The app still needs live owner/viewer/editor Auth, Firestore, Storage, Hosting-header, and CSP report-only verification before the birthday release.

Spencer live checklist:

1. Sign in as `smcolety@gmail.com` and confirm Account loads the Colety tree.
2. Reset/copy invite code and confirm the old code fails.
3. Join with a second account and verify viewer behavior.
4. Promote second account to editor and verify editor add/edit/photo behavior.
5. Confirm viewer/editor cannot reset invite codes.
6. Confirm signed-out/non-member private data is blocked.
7. Upload, replace, remove, and reject invalid photos.
8. Confirm Chart view and Card fallback work with real Colety data.
9. Confirm report-only CSP header exists and watch console reports.

## Fun Tools Prompt 10 - Release Readiness - May 28

Status: Done locally; not deployed. The fun-tools batch is a local deploy candidate for Spencer's next live Firebase pass.

Ready locally:

- Tree page now feels like the main product surface: Family Chart map, Find person, Full Screen, selected-person details, Relationship Finder, Birthdays, Missing info, Family stats, Key, and Display options.
- People Directory is the companion browse page instead of a redundant search-only page.
- Profile return links preserve People Directory context, including `familyId`, `query`, and `sort`.
- Account remains the admin/account surface.
- Large demo Chart view and Card list fallback both load without page exceptions.
- Phone-width smoke had no body-level horizontal overflow on Home, Tree, Card list, People Directory, or Account.

Checks:

- `npm run check` passed.
- `git diff --check` passed with Windows line-ending warnings only.
- `firebase emulators:exec --only firestore,storage --log-verbosity QUIET "node -p 1"` passed.
- Desktop browser smoke passed for Home, Large Demo Tree, Large Demo Card list, People Directory, Large Demo People Directory, private-profile signed-out state, and Account.
- Phone-width headless Chrome smoke passed for Home, Large Demo Tree, Large Demo Card list, People Directory, and Account.

Spencer live check:

1. Sign in as `smcolety@gmail.com`.
2. Open Account and confirm the Colety tree loads with owner tools.
3. Open the Colety tree and confirm Chart view is the default working view.
4. Use Find person, Full Screen, selected-person actions, Relationship Finder, Birthdays, Missing info, and Family stats.
5. Open People Directory for the private tree, sort/filter, open a profile, and confirm Back to People preserves the query/sort.
6. Upload, replace, and remove a real profile photo.
7. Confirm viewer/editor/member permissions with a second account.
8. Confirm signed-out and non-member users cannot read private tree/profile/photo data.
9. Confirm the deployed Firebase Hosting response includes CSP report-only and no scary console reports block the app.

Deferred until after birthday demo:

- Standalone Memory Wall writing/comments.
- Notification/reminder tooling.
- Deeper relationship wording beyond the current path output.
- Dedicated Tools route.
- CSP enforcement.

## Release Fix Prompt 3 - Local Acceptance - June 3

Status: Done locally; not committed, pushed, or deployed.

What is ready:

- The simplified birthday-demo nav passed local acceptance.
- Signed-out users see `Home | Example Tree`.
- Simulated signed-in users see only `Family Tree` plus the account icon.
- The old visible Search/People tab is removed from the shared header, but `/search` still works as the hidden People Directory route.
- Add Person is present in the Tree/Card/Search shells and remains hidden/disabled until owner/editor access is confirmed.
- Demo/read-only selected-person panels do not expose edit or private profile actions.
- Signed-out profile `?edit=1` does not open the edit modal.
- Desktop and phone-width smoke found no page exceptions and no body-level horizontal overflow on the checked routes.

Checks:

- `npm run check` passed.
- `git diff --check` passed with Windows line-ending warnings only.
- Local static app shell returned 200.
- Desktop smoke covered Home, Tree, Large Demo Tree, Card list fallback, hidden People Directory, Account, and profile view/edit URLs.
- Phone-width smoke covered Home, Tree, Large Demo Tree, Card list fallback, hidden People Directory, Account, and profile edit URL.

Spencer live check:

1. Sign in as `smcolety@gmail.com` and confirm the real header has no Home/Search tab while signed in.
2. Confirm the real Colety tree loads from `/tree?familyId=colety-birthday-tree`.
3. Confirm owner/editor Add Person appears in Chart view, Card list, and hidden People Directory.
4. Select a person and confirm owner/editor users see `Edit person`; viewers do not.
5. Open a profile with `?edit=1` as owner/editor and confirm the edit modal opens.
6. Confirm viewers cannot add, edit, remove, upload photos, or reset invite codes.
7. Confirm signed-out and non-member users cannot read private Colety tree/profile/photo data.
8. Upload, replace, and remove a valid profile photo against live Storage rules.
