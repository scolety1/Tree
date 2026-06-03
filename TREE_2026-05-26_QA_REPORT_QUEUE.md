# Tree QA Report Improvements Queue - May 26, 2026

Use this queue by sending prompts like:

`find TREE_2026-05-26_QA_REPORT_QUEUE.md and do prompt 1`

Source report: `C:\Users\codex-agent\Downloads\Family Tree Layout Strategy (2).docx`

Goal: turn the external QA report into a practical birthday-demo hardening pass. Prioritize the real demo path: sign in, open the Colety family tree, browse Chart view, search, open profiles, return to the tree, and use Card view for add/edit/photo flows.

Important report caveat:

- The report reviewed a limited 20-file bundle, not the whole repo. Its "missing modules" and "missing sign-in page" findings appear to be bundle artifacts because the repo currently contains `js/main.js`, `js/firebase.js`, `js/auth.js`, `js/starterTree.js`, `js/demoTreeData.js`, and `html/signin.html`.
- Treat those items as deploy/import verification work, not as proof that the repo is missing those files.

## Prompt 1 - Deploy Bundle And Import Graph Verification

Verify the report's P0 missing-file concerns against the real repo and Firebase deploy shape. Inspect every HTML module import, versioned asset URL, Firebase Hosting rewrite, and referenced route. Confirm `main.js`, `firebase.js`, `auth.js`, `starterTree.js`, `demoTreeData.js`, `signin.html`, `404.html`, CSS, and Firebase rule files will be included in deploys. Fix any real broken imports, stale version query strings, missing rewrites, or bad route destinations. Keep changes scoped. Run `npm run check`, `git diff --check`, and a local route smoke for `/`, `/signin`, `/account`, `/tree`, `/tree?demo=large`, `/tree-spike?demo=large`, `/search`, and `/profile`. Do not deploy.

Status: Done May 27, 2026. See "Prompt 1 Findings" below.

## Prompt 2 - Signed-In Navigation Context And Labels

Fix or verify signed-in navigation context. Header links should preserve `familyId` and relevant `view` context when moving between Family Tree, Search, Account, and Profile flows. Signed-in users should see `Family Tree` and `Search`, not misleading `Example Tree` copy. Search should keep the current family context. Profile return paths should preserve `familyId`, `from`, `query`, `focus`, and `view` where appropriate. Run local browser smoke signed-out and signed-in-equivalent URL checks. Update the queue with findings.

Status: Done May 27, 2026. See "Prompt 2 Findings" below.

## Prompt 3 - Chart View Loading And Fallback Safety

Harden Chart view so a failed iframe, blocked CDN, slow Family Chart load, or chart runtime error does not leave a blank tree. Add visible loading/error states and a clear `Switch to Card view` fallback when the chart cannot load. Keep Card view as the safe editing fallback. Test by simulating a bad chart URL or blocked script where feasible. Run checks and browser smoke for `/tree?demo=large`, `/tree?demo=large&view=chart`, and `/tree?demo=large&view=cards`.

Status: Done May 27, 2026. See "Prompt 3 Findings" below.

## Prompt 4 - Profile Error States And Return Paths

Improve profile-page edge cases from the report. `/profile` without `person`, unknown person IDs, private-profile signed-out states, and failed profile loads should show a friendly state with a useful back link. Back link text should start neutral in HTML and be set by JS once the source is known. Relationship links should preserve family/view/search context where appropriate. Run checks and browser smoke for tree-to-profile, search-to-profile, missing person, and bad person routes.

Status: Done May 27, 2026. See "Prompt 4 Findings" below.

## Prompt 5 - Signed-Out Home Create/Join Flow

Fix the signed-out home page create/join experience. When signed out, create/join controls should not look like broken working forms. Either hide/disable them with clear copy or route users to sign-in while preserving the intended action/destination. When signed in, make the create/join path clear and avoid silent input clearing. Run checks and browser smoke signed-out home, sign-in redirect URL, and signed-in-equivalent button states.

Status: Done May 27, 2026. See "Prompt 5 Findings" below.

## Prompt 6 - Search Context And Empty States

Polish Search per the report. Show which family is being searched when known, clarify signed-out/example-tree behavior, and show helpful empty/error states when no family is selected or results are unavailable. Preserve query state through profile navigation and browser back/forward. Keep changes scoped to search, shared context helpers, and copy. Run checks and browser smoke for signed-out search, demo search, private-family URL search, search-to-profile, and back-to-search.

Status: Done May 27, 2026. See "Prompt 6 Findings" below.

## Prompt 7 - Add/Edit Modal Accessibility And Mobile Usability

Improve Add/Edit modal accessibility without redesigning the app. Add proper dialog semantics, focus on open, Escape-to-close, restore focus on close, and reduce keyboard/focus traps. Confirm the modal remains usable on mobile-sized viewports and that status messages are announced. Run checks and browser smoke for opening/closing the add-person modal and edit-profile modal on desktop and mobile.

Status: Done May 27, 2026. See "Prompt 7 Findings" below.

## Prompt 8 - Firebase Rules Privacy Hardening Review

Review and tighten Firestore/Storage privacy based on the report. Focus on `joinCodes` enumeration, broad `/users/{userId}` reads, family membership checks, editor-only writes, and Storage upload size/type expectations. Make safe rule changes only if the client can still create/join/reset access codes and display family members. If a rule change needs Firebase live testing, document the exact test. Run rules/static checks available locally and update deployment notes.

Status: Done May 27, 2026. See "Prompt 8 Findings" below.

## Prompt 9 - Security Headers And Production Error Hygiene

Add or improve production security headers without breaking Firebase, Family Chart, or auth. Consider a practical Content-Security-Policy for Firebase Auth/Firestore/Storage, jsDelivr, and same-origin assets. Review console errors and user-facing error messages so production failures are friendly and do not expose internal detail. Keep this lightweight and reversible. Run checks and browser smoke after header changes.

Status: Pending.

## Prompt 10 - Relationship Model Copy And Demo-Safe Limits

Address the report's unknown-parent/remarriage concern at birthday-demo scope. Do not build a full genealogy model rewrite. Add helper copy where parent/spouse fields appear so users understand blank means unknown/not recorded. Verify `spouseIds` arrays and current helpers can handle existing multi-spouse data if present, but defer complex multi-spouse UI unless a tiny safe improvement exists. Update docs with deferred relationship-model work.

Status: Pending.

## Prompt 11 - End-To-End Birthday Acceptance Smoke

Run the report's acceptance tests as a local smoke pass and prepare the live Firebase checklist. Cover sign-in route, account page, Colety tree URL shape, Chart view default, Card view fallback, search/focus, profile return, add/edit modal opening, photo-upload UI path, mobile viewport, and access-denied states where possible. Fix tiny obvious issues discovered during smoke; otherwise add concrete follow-up prompts. Do not deploy unless explicitly asked.

Status: Pending.

## Prompt 12 - Final Queue Cleanup And Deploy Readiness

After prompts 1-11, update `5-21_WORKSHEET.md`, `DEPLOYMENT_CHECKLIST.md`, and this queue with what is done, what still needs Firebase Console/live testing, and the final deploy-readiness verdict. Keep it concise and actionable. Run `npm run check`, `git diff --check`, and a final browser smoke. Do not commit, push, or deploy unless Spencer asks.

Status: Pending.

## Triage Notes From The Report

P0 items converted into queue work:

- Missing modules/sign-in page: likely false positive from the 20-file review bundle. Verify deploy/import graph in Prompt 1.
- Navigation resets family context: Prompt 2.
- Chart blank fallback risk: Prompt 3.
- `/profile` without `person` and bad person routes: Prompt 4.
- Loading states stuck if auth fails: Prompts 1, 3, 4, 6.

P1 items converted into queue work:

- Misleading nav labels: Prompt 2.
- Search context and empty states: Prompt 6.
- Profile back copy: Prompt 4.
- Modal accessibility: Prompt 7.
- Mobile scroll/large tree cues: Prompt 11 unless prompt-specific smoke finds a regression earlier.
- Signed-out create/join forms: Prompt 5.
- Unknown parents/remarriages: Prompt 10.

Security/privacy items converted into queue work:

- Join code enumeration: Prompt 8.
- Storage upload limits/type expectations: Prompt 8.
- Public user profile reads: Prompt 8.
- Production error hygiene: Prompt 9.
- CSP/security headers: Prompt 9.

Deferred unless they become tiny:

- Full multi-spouse editor UI.
- Mini-map/overview redesign beyond the current Family Chart controls.
- Cloud Functions image processing.
- Server-side rate limiting.

## Prompt 1 Findings - May 27, 2026

Decision:

- The report's missing-module/sign-in warning is a false positive caused by reviewing the limited 20-file zip instead of the full repo.
- No deploy/import code fix was needed in this pass.

Verified present in the repo:

- `js/main.js`
- `js/firebase.js`
- `js/auth.js`
- `js/starterTree.js`
- `js/demoTreeData.js`
- `html/signin.html`
- `404.html`
- `firestore.rules`
- `storage.rules`
- `firestore.indexes.json`

Import and asset graph:

- Scanned local HTML/CSS/JS references for scripts, stylesheets, images, CSS `url(...)`, and ES module imports.
- Checked 69 local references.
- Found 0 missing local files.
- Asset cache versions are consistently using `v=20260522-11` across the current static pages and modules.

Firebase deploy shape:

- `firebase.json` Hosting `public` is `.` so `html`, `js`, `css`, `assets`, and `404.html` are in the hosting deploy source.
- Hosting ignores exclude repo/admin files such as markdown, package files, `firestore.rules`, `storage.rules`, and scripts from static hosting, which is expected.
- Firestore and Storage deploy config still points to `firestore.rules`, `firestore.indexes.json`, and `storage.rules`.
- Rewrites exist for `/`, `/home`, `/signin`, `/account`, `/dashboard`, `/tree`, `/tree-spike`, `/search`, and `/profile`.

Verification:

- `npm run check` passed.
- `git diff --check` passed with only existing LF/CRLF warnings from the Windows checkout.
- Local route smoke passed for `/`, `/signin`, `/account`, `/tree`, `/tree?demo=large`, `/tree-spike?demo=large`, `/search`, and `/profile`.
- `/tree?demo=large` opened Chart view by default and rendered the embedded Family Chart SVG.
- `/tree-spike?demo=large` rendered the Family Chart SVG and exposed 80 focus options.

Notes:

- `/profile` intentionally has no `<main>` element right now, so the smoke script reported an empty `main` excerpt even though the profile page loaded. Prompt 4 will handle profile empty/error-state polish.
- Browser dev logs showed one `MutationObserver` error, but the repo has no `MutationObserver` usage. This appears to come from the browser environment/extension, not app code.

Still needs live Firebase testing:

- Confirm Firebase Hosting deploy includes the same files and rewrites.
- Confirm deployed headers and custom `404.html` behavior on the Firebase origin.
- Confirm live signed-in auth works on `/signin`, `/account`, `/tree`, `/search`, and `/profile`.

## Prompt 2 Findings - May 27, 2026

Implemented:

- Updated the shared header navigation in `js/main.js` so signed-in users see `Family Tree`, not `Example Tree`.
- Preserved `familyId` on signed-in `Family Tree`, `Search`, and `Account` header links.
- Preserved `view=chart` / `view=cards` on the signed-in `Family Tree` header link when that view context is present.
- Preserved search `query` on the signed-in `Search` header link when moving from search/profile flows.
- Added profile-to-tree focus context on the signed-in `Family Tree` header link, so profile pages can return to `/tree?...&focus=<personId>`.
- Removed a tree-page one-off nav rewrite that could overwrite the shared nav logic.
- Added the current tree view to Card view profile links, so profiles opened from Card view can return to `view=cards`.

Verification:

- `npm run check` passed.
- `git diff --check` passed with only existing LF/CRLF warnings from the Windows checkout.
- Signed-out browser smoke: home page shows `Example Tree`, `/tree`, `/search`, and `/signin`.
- Signed-in-equivalent browser smoke with an auth stub:
  - `/tree?familyId=fam-123&view=chart` produced `/tree?familyId=fam-123&view=chart`, `/search?familyId=fam-123`, and `/account?familyId=fam-123`.
  - `/profile?person=person-9&familyId=fam-123&from=tree&view=chart` produced `/tree?familyId=fam-123&view=chart&focus=person-9`.
  - `/profile?person=person-9&familyId=fam-123&from=search&query=rose` produced `/search?familyId=fam-123&query=rose`.
  - `/search?familyId=fam-123&query=rose` kept the search query on the Search header link.

Notes:

- The browser dev log still shows one `MutationObserver` error from the browser environment. The repo does not use `MutationObserver`, so this does not appear to be app code.

Still needs live Firebase testing:

- Confirm the same nav behavior with a real Firebase-authenticated session.
- Confirm account links with `familyId` do not confuse the account page and still show the user's family tree normally.

## Prompt 3 Findings - May 27, 2026

Implemented:

- Added a visible Chart view loading state inside `/tree` while the embedded Family Chart iframe starts.
- Added timeout and iframe error handling so Chart view no longer fails as a blank tree.
- Added a visible error state with a `Switch to Card view` fallback button when the chart frame fails, stalls, or reports a render error.
- Kept Card view as the safe editing fallback; the fallback button switches the current `/tree` page to `view=cards`.
- Wired the embedded `/tree-spike?...&embed=tree` chart to post same-origin `ready` / `error` status messages to its parent page.
- Added chart error reporting for empty data, missing Family Chart bundle, and chart runtime failures.

Verification:

- `npm run check` passed.
- `git diff --check` passed with only existing Windows LF/CRLF warnings.
- Local browser smoke passed for `/tree?demo=large`: defaulted to Chart view, received the embedded chart `ready` status, and had no page-level horizontal overflow.
- Local browser smoke passed for `/tree?demo=large&view=chart`: opened Chart view explicitly, rendered the embedded Family Chart SVG, and hid the loading panel.
- Local browser smoke passed for `/tree?demo=large&view=cards`: opened Card view explicitly and rendered all 80 demo cards.
- Simulated a broken `/tree-spike` response locally; `/tree?demo=large&view=chart` showed the Chart view error panel and `Switch to Card view` button after timeout.
- Clicking `Switch to Card view` changed the page to Card view and preserved all 80 demo cards.

Notes:

- Browser dev logs still show the known `MutationObserver` error from the browser environment. The repo does not use `MutationObserver`, so this does not appear to be app code.

Still needs live Firebase testing:

- Deploy and confirm the same fallback behavior on Firebase Hosting.
- Confirm the same-origin iframe status message works on the live `/tree` and `/tree-spike` rewrites.
- Confirm a real signed-in private family tree defaults to Chart view, reports ready, and still lets Card view handle add/edit/photo flows.

## Prompt 4 Findings - May 27, 2026

Implemented:

- Changed the static profile back-link copy in HTML to neutral `Back`; profile JS now sets the specific destination label after reading URL context.
- Added centralized unavailable states for profile edge cases instead of leaving half-loaded fields on the page.
- `/profile` without `person` now shows a friendly "Choose a family member" state with complete field placeholders.
- Signed-out private profile URLs now show a private-profile sign-in state, hide the empty photo, and keep a useful back link.
- Bad/missing person IDs now show a friendly "Profile not found" state with complete field placeholders.
- Profile load failures now show a friendly "Could not load profile" state rather than only replacing the heading.
- Relationship profile links now preserve `familyId`, `view=chart/cards`, and search `query` context where appropriate.
- Search-origin profile flows keep `from=search` and `query=...` when moving through related profile links.

Verification:

- `npm run check` passed.
- `git diff --check` passed with only existing Windows LF/CRLF warnings.
- Browser smoke passed for `/profile`: friendly missing-person state, neutral fields, no empty photo, no page overflow.
- Browser smoke passed for `/profile?person=missing-private&familyId=fam-123&from=tree&view=chart`: signed-out private state and back link `/tree?familyId=fam-123&focus=missing-private&view=chart`.
- Browser smoke passed for `/profile?person=missing-private&familyId=fam-123&from=search&query=rose`: signed-out private state and back link `/search?familyId=fam-123&query=rose`.
- Browser smoke passed for `/profile?person=definitely-not-real&familyId=&from=tree&view=cards`: public/example bad-person state and back link `/tree?focus=definitely-not-real&view=cards`.

Notes:

- A plain `/profile?person=...` can still use the last stored `familyId` from session storage by design. Passing `familyId=` explicitly clears that context for public/example profile checks.
- Browser dev logs still show the known `MutationObserver` error from the browser environment. The repo does not use `MutationObserver`, so this does not appear to be app code.

Still needs live Firebase testing:

- Confirm a real signed-in profile loads normally with owner/editor/viewer permissions.
- Confirm relationship links on real Colety profiles preserve `familyId` and `view` while navigating between relatives.
- Confirm search-result to profile to related-profile to back-to-search preserves the live search query.

## Prompt 5 Findings - May 27, 2026

Implemented:

- Fixed the home page so it actually loads `js/home.js`; the create/join controls now have their intended behavior.
- Signed-out home buttons now read `Sign In to Start` and `Sign In to Join`.
- Signed-out create/join forms are disabled intentionally and show clear sign-in notes instead of looking silently broken.
- Sign-in links and signed-out button redirects preserve the intended return section with `/signin?redirect=%2F%23createTreeFormCard` or `/signin?redirect=%2F%23joinTreeFormCard`.
- Signed-in home state restores `Start a Tree`, `Join with Code`, enabled form controls, and direct create/join copy.
- Create/join form submits now also preserve the intended create/join section if auth is missing at submit time.

Verification:

- `npm run check` passed.
- `git diff --check` passed with only existing Windows LF/CRLF warnings.
- Browser smoke with a signed-out auth stub confirmed disabled create/join controls, clear sign-in notes, no page-level horizontal overflow, and redirect to `/signin?redirect=%2F%23createTreeFormCard` after clicking `Sign In to Start`.
- Browser smoke with a signed-in auth stub confirmed enabled create/join controls, no sign-in notes, and signed-in copy.

Notes:

- Browser dev logs still show the known `MutationObserver` error from the browser environment. The repo does not use `MutationObserver`, so this does not appear to be app code.

Still needs live Firebase testing:

- Sign out on Firebase Hosting, click both home create/join buttons, sign in, and confirm Firebase returns to the correct home section.
- While signed in on Firebase Hosting, create a manual tree and join a tree with a real access code to confirm Firestore rules allow the flows.

## Prompt 6 Findings - May 27, 2026

Implemented:

- Added a `searchContext` line so Search now names what it is searching.
- Signed-out/example search now says it is searching the read-only example tree and points users toward sign-in for private search.
- Private-family URL search while signed out now disables the form and shows a clear sign-in-required empty state.
- Signed-in/no-family state now disables the form and points users to Account to create or join a tree.
- Search loading failures now render a structured friendly state instead of a loose error paragraph.
- Empty/no-query and no-results copy now includes the active search scope.
- Search result profile links continue to preserve `query=...` and `from=search`.
- Added browser back/forward handling so query URLs rebuild the search field and results on `popstate`.

Verification:

- `npm run check` passed.
- `git diff --check` passed with only existing Windows LF/CRLF warnings.
- Browser smoke passed for signed-out `/search?familyId=`: example-tree context, enabled search form, and no page-level horizontal overflow.
- Browser smoke passed for demo query `/search?familyId=&query=tim`: query restored from URL, 10 results rendered, profile links included `query=tim&from=search`.
- Browser smoke passed for private signed-out URL `/search?familyId=fam-123&query=rose`: form disabled and sign-in-required state shown.
- Browser smoke passed for no-results demo search: clear no-match copy with active search scope.
- Browser smoke passed for Search -> Profile -> browser Back: profile back link was `/search?query=tim`, and browser Back restored the `tim` query plus results.

Notes:

- Browser dev logs still show the known `MutationObserver` error from the browser environment. The repo does not use `MutationObserver`, so this does not appear to be app code.

Still needs live Firebase testing:

- Confirm signed-in `/search?familyId=colety-birthday-tree&query=...` loads real Colety people and names the family tree.
- Confirm Search -> Profile -> related profile -> Back to Search preserves `familyId` and `query` on live private data.
- Confirm signed-in no-family state only appears for accounts that truly have no accessible family tree.

## Prompt 7 Findings - May 27, 2026

Implemented:

- Added `role="dialog"`, `aria-modal="true"`, and explicit modal title labels to the add-person and edit-profile modals.
- Converted modal close controls to real `button type="button"` elements with accessible labels.
- Added hidden/display-safe modal state via `hidden` plus `.is-open` so dialogs are not exposed when closed.
- Focus now moves into the first relevant field when a modal opens.
- Escape closes the modal.
- Focus returns to the opening button after keyboard close on normal user-opened modals.
- Added a simple Tab loop inside each modal to reduce keyboard escape/trap weirdness.
- Modal content is capped to the viewport and scrolls internally, including mobile-sized screens.
- Existing add/profile status elements remain `aria-live="polite"` for announced save/error messages.

Verification:

- `npm run check` passed.
- `git diff --check` passed with only existing Windows LF/CRLF warnings.
- Desktop browser smoke passed for opening/closing the add-person modal from `/tree?demo=large&view=cards`.
- Desktop browser smoke passed for opening/closing the edit-profile modal from `/profile`.
- Desktop smoke verified dialog semantics, labelled titles, safe close buttons, focus-on-open, Escape close, close-button close, focus restore, and live status regions.
- Mobile headless Chrome smoke at 390x844 passed for add-person and edit-profile modals.
- Mobile smoke verified the dialogs open through the real handlers, focus the first field, stay within the viewport, scroll internally, expose live status regions, and close with Escape.

Notes:

- The mobile smoke used local auth/data shims so it could exercise modal behavior without depending on a live signed-in Firebase session.
- Auto-opened mobile smoke cannot meaningfully prove trigger focus restoration because the opening click is script-driven; desktop user-click smoke covers focus restoration.

Still needs live Firebase testing:

- Open a real signed-in private tree in Card view, click `+`, add/cancel with keyboard and mouse, and confirm focus returns cleanly.
- Open a real editable profile, click `Edit Profile`, test Escape/close button/save failure messaging, and confirm photo-upload errors announce in the profile status area.

## Prompt 8 Findings - May 27, 2026

Implemented:

- Changed `joinCodes` rules from broad signed-in `read` to exact-document `get` only; listing/querying join codes is now denied.
- Required new join-code docs to use the 10-character generated access-code format.
- Tightened self-join rules so a signed-in user can no longer add themselves to any family by knowing only a `familyId`.
- Updated the join flow to include a one-time `joinCodeAttempt` field when adding the current user, then clear that marker immediately after the join succeeds.
- Added a narrow rule that lets the newly joined member clear only `joinCodeAttempt`.
- Tightened leave-family rules so a leaving member can remove only themselves and only their own member-role entry.
- Changed `/users/{userId}` rules from broad signed-in reads to self-only `get` and no listing.
- Tightened Storage profile image writes to editor/owner accounts only, common image MIME types only, safe image-like filenames only, and 5 MB max size.
- Split Storage write into create/update with validation and delete for family editors.
- Updated `DEPLOYMENT_CHECKLIST.md` with rules-load and live Firebase privacy tests.

Verification:

- `npm run check` passed.
- `firebase emulators:exec --only firestore,storage --log-verbosity QUIET "node -p 1"` passed, confirming Firestore and Storage rules load in the local emulators.
- `git diff --check` passed with only existing Windows LF/CRLF warnings.

Notes:

- Member profile display on Account may now fall back to `Family member` for other members because `/users/{userId}` is no longer broadly readable. That is the privacy-favoring tradeoff until the app has a safer shared-member-profile schema.
- Exact invite-code lookup still works by design because the join form does `getDoc(doc(db, "joinCodes", code))`, not a collection query.

Still needs live Firebase testing:

- Create a new tree and confirm its random invite code is written.
- Join with the exact invite code from another signed-in account.
- Confirm joining by only opening `/tree?familyId=...` or calling the family update without `joinCodeAttempt` is denied.
- Reset an invite code from Account and confirm the old code stops working.
- Upload JPG/PNG/WebP/GIF photos under 5 MB from add/edit profile flows.
- Confirm non-image uploads are rejected by Storage rules.
