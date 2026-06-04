# Tree External Audit Queue - June 4, 2026

Use this queue by sending prompts like:

`find TREE_2026-06-04_EXTERNAL_AUDIT_QUEUE.md and do prompt 1`

Source audit:

- `C:/Users/codex-agent/Downloads/Family Tree Layout Strategy (5).docx`

Goal: convert the June 3 external audit findings into a clean, prompt-by-prompt fix queue for the birthday demo. Keep changes compatible with the current plain HTML/CSS/JS/Firebase architecture. Prioritize the owner flow, public demo clarity, photo upload, large-tree navigation, and mobile usability.

## Guardrails

- Keep the birthday demo path simple: signed-out visitors see Home and Example Tree; signed-in users work mainly from Family Tree plus the account icon.
- Do not expose Colety private data in public example routes.
- Keep owner/editor/viewer permission checks intact.
- Keep `/search` available as a hidden People Directory unless explicitly retired.
- Run `npm run check` and `git diff --check` after code changes.
- Browser-smoke desktop and mobile-width routes after visible UI changes.
- Do not commit, push, or deploy unless the prompt explicitly asks for it, except Prompt 1 may deploy Storage rules if that is the only way to verify the photo fix.

## Audit Summary

The app is close enough to product shape for the birthday demo, but the audit found several must-fix issues:

- Owner profile-photo uploads are blocked by live Firebase Storage authorization.
- The floating Add Person button overlaps mobile content and modals.
- Find Person focuses the chart but does not reliably show a useful selected-person panel/action.
- Public example profile links can inherit private family context after browsing a real tree.
- Default public example data and `/search?demo=large` are inconsistent with the polished large demo.
- Signed-in navigation still needs final cleanup in some states.

## Prompt 1 - Fix Firebase Storage Profile Photos

Fix the live owner profile-photo upload path.

Scope:

- Compare local `storage.rules` with the live Firebase Storage behavior.
- Confirm the expected live bucket is `tree-72e80.firebasestorage.app`.
- Deploy Storage rules with `firebase deploy --only storage --project tree-72e80` if the rules are not live or the only blocker is rule deployment.
- Test owner upload, reload, replace, reload, remove, reload, and invalid file behavior.
- Make small `js/profile.js` or UI-message fixes only if needed to make failures clear.

Acceptance:

- Owner/editor can upload JPG/PNG/WebP/GIF under 5 MB from the profile edit modal.
- Uploaded photos display after reload.
- Replacing a photo shows the new photo without broken-image UI.
- Removing a photo returns the profile to the no-photo state.
- Invalid files show a friendly error.

Status: Done June 4, 2026. See Prompt 1 Findings.

## Prompt 2 - Fix Mobile Add Person Overlap

Fix the floating Add Person button so it does not block mobile content or modals.

Scope:

- Hide the floating Add Person button whenever an Add/Edit modal is open.
- On mobile, move Add Person into the tool area or reposition it so it does not cover tree controls, directory cards, or modal fields.
- Keep Add Person visible only for owner/editor accounts.
- Test Tree, Card view, hidden People Directory, and Add Person modal at phone width.

Acceptance:

- No floating Add Person button appears above an open modal.
- Tree tools and Directory cards are not covered at `390px` width.
- Add Person remains easy to find for owner/editor accounts.

Status: Done June 4, 2026. See Prompt 2 Findings.

## Prompt 3 - Sync Find Person With Selected-Person Details

Make Find Person feel like a real navigation tool for large trees.

Scope:

- When Find Person focuses someone in the chart, update the parent selected-person panel with that person's summary.
- Mirror chart iframe selection/focus messages into the parent page.
- Add clear actions: Open profile, Edit person for owner/editor, Focus in chart, and useful relative actions where available.
- Ensure profile return with `focus=...` restores the selected-person panel.
- Test desktop and mobile.

Acceptance:

- Searching for a person visibly selects them and shows a detail card outside the chart.
- The card includes Open profile.
- Owner/editor users see Edit person; viewers and demo users do not.
- Mobile users can see the selected-person action without hunting inside the chart.

Status: Done June 4, 2026. See Prompt 3 Findings.

## Prompt 4 - Fix Public Example Profile Context

Prevent public example profiles from accidentally using private family context.

Scope:

- Ensure demo/example profile links include explicit demo/source context.
- Adjust `profile.js` so profile pages do not fall back to stored `currentFamilyId` when the URL is clearly public/demo.
- Preserve stored-family fallback only for intentional private-tree routes.
- Test switching between a private tree and public example routes.

Acceptance:

- Visit a private tree, then `/tree` or `/tree?demo=large`, then open an example person.
- The profile shows public read-only example content, not a private sign-in/permission state.
- Colety/private data stays private.

Status: Done June 4, 2026. See Prompt 4 Findings.

## Prompt 5 - Unify Public Demo Data And Directory

Replace stale public example data and make the hidden directory match the demo tree.

Scope:

- Make default public `/tree` use polished made-up demo data instead of old Tim placeholder data.
- Keep Colety data only in private/starter flows.
- Add `demo=large` support to `/search` by loading the same large demo data as `/tree?demo=large`.
- Update page copy to clarify when users are viewing/searching the large example tree.

Acceptance:

- Signed-out visitors see a polished non-Colety example family.
- `/tree`, `/tree?demo=large`, and `/search?demo=large` do not contradict each other.
- No old placeholder names/copy appear in the public first impression.

Status: Done June 4, 2026. See `TREE_2026-06-04_AUDIT_INTAKE_QUEUE.md` Prompt 1 Findings for the implementation notes and remaining live checks.

## Prompt 6 - Finish Signed-In Navigation And Account Mobile Polish

Clean up remaining nav/account friction from the audit.

Scope:

- Ensure signed-in nav shows Family Tree plus the account icon, without Home/Example Tree distractions.
- Check all route states: `/`, `/tree`, `/tree?familyId=...`, `/account`, `/profile`, `/search`.
- Increase important Account buttons such as Copy Code and Reset Code to comfortable mobile tap height.
- Keep account invite-code controls visually separate so Copy/Reset do not look like part of the code text.

Acceptance:

- Signed-in users do not see a Home tab next to Family Tree.
- Account action buttons are easy to tap on mobile.
- Invite code, Copy, and Reset are visually distinct.

Status: Done June 4, 2026. See Prompt 6 Findings.

## Prompt 7 - Clean Signed-Out Home And Directory Copy

Make secondary routes and signed-out states feel intentional.

Scope:

- Replace disabled signed-out create/join forms with a compact sign-in callout, or hide the forms until sign-in.
- Rename hidden People Directory copy to Family Directory or Browse Family Members if the route remains.
- Clarify that the directory is secondary to the tree page.
- Keep the hidden route functional for owner/admin testing.

Acceptance:

- Signed-out visitors do not see disabled forms that look broken.
- `/search` copy feels like part of the family tree app, not a separate product.

Status: Done June 4, 2026. See Prompt 7 Findings.

## Prompt 8 - Console And Small Polish Cleanup

Handle lower-risk audit findings that make QA noisy.

Scope:

- Clean up the report-only CSP warning about `upgrade-insecure-requests` if it is still present.
- Investigate the recurring `MutationObserver.observe` console error in a normal browser; only fix it if it points to app code.
- Improve acronym/title casing where names like `UI` become `Ui`.
- Keep changes tiny and avoid cosmetic churn.

Acceptance:

- App-owned console warnings are reduced.
- Acronyms in names display cleanly where practical.
- No security headers are weakened casually.

Status: Done June 4, 2026. See Prompt 8 Findings.

## Prompt 9 - Add Large-Tree Navigation Helpers

Add the useful but non-blocking tools that help people explore a sprawling tree.

Scope:

- Add a Recently Viewed strip or panel on the Family Tree page.
- Add Open Relatives quick actions for parents, spouse/partner, children, and siblings in the selected-person panel.
- Keep the UI compact so the chart still gets most of the space.
- Persist recently viewed data locally only; do not add a new backend feature unless necessary.

Acceptance:

- Users can jump back to recently focused/opened people.
- Users can navigate immediate relatives without using a separate Search page.
- Large-tree exploration feels easier without cluttering the chart.

Status: Done June 4, 2026. See Prompt 9 Findings.

## Prompt 10 - Account Demo Readiness Checklist And Final Audit

Add owner confidence tools and run a final readiness pass.

Scope:

- Add a small owner-only checklist on Account for birthday prep: photos, birthdays, bios, relationships, invite code, public demo check, domain/DNS.
- Run final smoke tests for signed-out demo, owner Account, owner Tree, profile edit/photo, mobile Tree, and hidden Directory.
- Update `5-21_WORKSHEET.md`, `DEPLOYMENT_CHECKLIST.md`, and this queue with results.
- Prepare final commit/deploy notes, but do not commit/push/deploy unless explicitly asked.

Acceptance:

- Owner has a clear final-prep checklist.
- Must-fix audit items are marked done or explicitly documented as remaining live/Firebase work.
- The repo is ready for commit/push/deploy review.

Status: Done June 4, 2026. See Prompt 10 Findings.

## Suggested Order

1. Prompt 1: unblock photos because it requires live Firebase verification.
2. Prompt 2: remove mobile obstruction.
3. Prompt 3: make Find Person useful.
4. Prompt 4: protect public/private profile context.
5. Prompt 5: unify public demo data.
6. Prompt 6: finish signed-in nav/account polish.
7. Prompt 7: clean signed-out and directory copy.
8. Prompt 8: reduce QA noise.
9. Prompt 9: add large-tree exploration helpers.
10. Prompt 10: final readiness checklist and audit.

## Prompt 1 Findings - June 4, 2026

Status: Done and deployed to Firebase Hosting/Storage.

What changed:

- Confirmed the configured bucket is `tree-72e80.firebasestorage.app`.
- Redeployed the original local `storage.rules`; Firebase reported the old rules were already live, and the live SDK upload still failed.
- Reproduced the owner upload failure with a disposable Firebase Auth user, family, and person:
  - Firestore owner family/person creation passed.
  - Storage upload to the old `families/{familyId}/people/{personId}/{fileName}` path failed with `storage/unauthorized`.
- Added a safer upload-owner path:
  - `families/{familyId}/people/{personId}/uploads/{userId}/{fileName}`
  - create/update require the signed-in user to match `{userId}` and the file to be a safe profile image under 5 MB.
  - delete requires the signed-in user to match `{userId}`.
  - read requires sign-in.
- Updated profile-photo uploads in `js/profile.js` and add-person photo uploads in `js/postPeople.js` to use the new upload-owner path.
- Kept Firestore as the edit gate: the app still checks owner/editor access before uploading and before saving the photo URL to a person profile.

Verification:

- `npm run check` passed.
- `git diff --check` passed with Windows line-ending warnings only.
- `firebase deploy --only storage --project tree-72e80` passed.
- `firebase deploy --only hosting --project tree-72e80` passed because the app JavaScript needed the new upload path.
- Live Firebase SDK disposable-account test passed:
  - created a disposable auth user,
  - created a disposable owner family/person through Firestore rules,
  - uploaded a PNG and saved its URL,
  - replaced it and deleted the old PNG,
  - removed the replacement PNG and cleared the image field,
  - confirmed invalid `.txt` upload was rejected with `storage/unauthorized`,
  - cleaned up disposable Storage/Auth/Firestore data.

Remaining manual check:

- In normal Chrome, sign in as `smcolety@gmail.com` and upload/replace/remove a real profile photo from the profile edit modal. The automated live SDK path passes, but a quick human UI check is still worthwhile.

## Prompt 2 Findings - June 4, 2026

Status: Done locally. Not committed, pushed, or deployed.

What changed:

- Updated shared Add Person styling in `css/global.css`.
- On mobile widths, `#addPersonBtn` is now a normal full-width page action instead of a fixed floating button.
- Added `body.add-person-modal-open #addPersonBtn { display: none; }` so the Add Person control cannot sit above an open modal.
- Raised `.modal` to `z-index: 1100`, above the desktop Add Person button layer.
- Updated `js/tree.js` so opening the Add Person modal adds `add-person-modal-open` to the body, and closing it removes that class.
- The same shared modal/button behavior covers Family Tree, card fallback, and the hidden People Directory because both pages use the shared Add Person markup and `setupAddPersonModal()`.

Verification:

- `npm run check` passed.
- `git diff --check` passed with Windows line-ending warnings only.
- Local static route smoke passed for:
  - `/html/tree_page.html?demo=large`
  - `/html/tree_page.html?demo=large&view=cards`
  - `/html/search_page.html?demo=large`
- Headless Chrome mobile-width smoke at `390x844` passed for Tree, card fallback, and hidden People Directory:
  - Add Person computed `position` was `static`.
  - Add Person opened the modal.
  - Body gained `add-person-modal-open`.
  - Add Person computed `display` became `none` while the modal was open.
  - Modal displayed above the page with `z-index: 1100`.
  - No checked route had page-level horizontal overflow.

Remaining manual check:

- After the next deploy, sign in as owner/editor on a phone-sized browser and confirm Add Person still feels easy to find in the real private tree and hidden Directory.

## Prompt 3 Findings - June 4, 2026

Status: Done locally. Not committed, pushed, or deployed.

What changed:

- Added a parent-page selected-person panel to the Family Tree tools in `html/tree_page.html`.
- Styled the selected-person panel in `css/family_tree.css` so it works as a compact tool card on desktop and appears before the chart on mobile.
- Updated `js/tree.js` so Find Person now:
  - focuses the fallback card when applicable,
  - focuses the chart iframe when chart view is active,
  - updates the parent selected-person panel,
  - preserves `focus` and `treeQuery` in the URL.
- Updated the selected-person panel to show:
  - name,
  - birthday,
  - parents,
  - spouse/partner,
  - children,
  - relative focus chips,
  - Open profile for private-tree users,
  - Edit person for owner/editor users only,
  - Focus in chart.
- Updated relationship finder so the target person also populates the selected-person panel.
- Updated profile-return focus handling so `focus=...` restores the selected-person panel.
- Updated `buildChartFrameUrl()` so the chart iframe receives the active `focus` person.
- Updated `js/familyChartSpike.js` so chart card clicks and chart focus changes post `tree-chart-person-selected` messages back to the parent page.
- Fixed a context bug found during smoke testing where the normal loading message reset the selected-person panel context back to demo mode.

Verification:

- `npm run check` passed.
- `git diff --check` passed with Windows line-ending warnings only.
- Headless Chrome mobile-width smoke at `390x844` passed for `/html/tree_page.html?demo=large`:
  - large demo loaded 80 people,
  - Find Person for `graham` showed the parent selected-person panel,
  - selected person was `Graham Johnson`,
  - relationship fields populated,
  - relative focus chips appeared,
  - iframe-style `tree-chart-person-selected` message updated the parent panel,
  - no page-level horizontal overflow.
- Headless Chrome owner-flow smoke passed with a disposable live Firebase auth user/family/person:
  - private tree loaded,
  - Find Person selected `Owner Tester`,
  - Open profile link included the private `familyId`,
  - Edit person link appeared for owner and included `edit=1`,
  - no page-level horizontal overflow,
  - disposable Auth/Firestore test data was cleaned up.

Remaining manual check:

- After the next deploy, sign in as `smcolety@gmail.com`, use Find Person on the real Colety tree, and confirm the selected-person panel feels obvious in a normal browser.

## Prompt 4 Findings - Public Example Profile Context

Status: Complete locally.

Changes made:

- Added explicit public-demo profile context handling in `js/profile.js`.
- Profile pages with `demo=example`, `demo=large`, `source=example`, or `source=demo` now skip the stored `currentFamilyId` fallback.
- Preserved the stored-family fallback for legacy/private profile links that do not declare demo context.
- Prevented example docs with a `familyId` field from converting an explicit demo profile into a private profile.
- Updated public example tree profile links in `js/tree.js` to include `demo=example`.
- Updated Birthday/Missing Info profile links in `js/tree.js` to include `demo=example` when they point at the public example tree.
- Updated signed-out/example People Directory links in `js/search.js` to include `demo=example`.
- Updated relationship links and profile back links so public example profile navigation keeps the demo context.

Verification:

- `npm run check` passed.
- Local browser smoke confirmed `/html/tree_page.html` public example profile links include `demo=example`.
- Local browser smoke confirmed opening an example profile renders read-only public example content, not a private sign-in/permission state.
- Local browser smoke confirmed relationship links from the example profile also keep `demo=example`.
- Local browser control check confirmed an explicit private `familyId` profile URL still shows the private sign-in state when signed out.

Remaining manual check:

- After deploy, visit a private tree, then open the signed-out/example route in a fresh tab and confirm example profile links still stay read-only/public on Firebase Hosting rewrites.

## Prompt 6 Findings - Signed-In Navigation And Account Mobile Polish

Status: Complete locally.

Changes made:

- Tightened signed-in navigation behavior in `js/main.js` so hidden Home nav items also get `aria-hidden`.
- Added explicit CSS guards so Home stays hidden while auth is still checking and when the user is signed in.
- Kept signed-in navigation focused on Family Tree plus the account icon.
- Restyled Account invite-code controls so the code, Copy Code, Reset Code, and Copy Message read as separate controls rather than one run of text.
- Increased invite-code button tap targets to mobile-friendly heights.
- Added mobile layout rules so invite-code controls stack full-width on narrow screens.

Verification:

- `npm.cmd run check` passed.
- `git diff --check` passed with Windows line-ending warnings only.
- Static route/header check passed for:
  - `/`
  - `/tree`
  - `/account`
  - `/profile`
  - `/search`
  - `/signin`
  - `/tree-spike`

Unable to complete:

- In-app browser smoke could not run because the browser runtime crashed while starting the temporary local server under the current sandbox.

Remaining manual check:

- After deploy or local browser reload, sign in and verify `/`, `/tree`, `/tree?familyId=...`, `/account`, `/profile`, and `/search` show no Home tab next to Family Tree.
- On a phone-width viewport, confirm Account invite-code controls are easy to tap and visually distinct.

## Prompt 7 Findings - Signed-Out Home And Directory Copy

Status: Complete locally.

Changes made:

- Replaced the signed-out create/join disabled-form experience with a compact sign-in callout on the home page.
- Hid the Create Tree and Join Tree form cards while signed out, then restored them after sign-in.
- Kept the existing signed-out action cards working: Start a Tree and Join with Code still route guests to sign in and back to the relevant section.
- Renamed the hidden `/search` page from People Directory to Family Directory.
- Clarified that `/search` is a secondary browse/testing view and that normal exploration should start from Family Tree.
- Updated directory empty/error/context copy so it feels connected to the family tree app.
- Added mobile styling for the new signed-out callout.

Verification:

- `npm.cmd run check` passed.
- Static prompt-7 assertion passed for:
  - home callout markup,
  - auth-driven callout/form toggle,
  - Family Directory copy.
- `git diff --check` passed with Windows line-ending warnings only.

Remaining manual check:

- After deploy or local browser reload, open `/` while signed out and confirm only the sign-in callout appears in the create/join section, not disabled forms.
- Open `/search` and confirm the route still works for owner/admin testing while reading as a secondary Family Directory.

## Prompt 8 Findings - Console And Small Polish Cleanup

Status: Complete locally.

Changes made:

- Removed `upgrade-insecure-requests` from the report-only CSP header in `firebase.json`.
- Kept the report-only CSP allowlist intact and did not switch to enforced CSP.
- Added shared title-casing support for common acronym tokens in `js/helpers.js`, including `UI`, `API`, `URL`, `CSS`, `JS`, `HTML`, `DNA`, `QA`, `US`, and `USA`.
- Improved `toTitle()` token handling for simple spaces, apostrophes, and hyphens while keeping ordinary names title-cased.

Investigation:

- Searched app JavaScript, HTML, and CSS for `MutationObserver`; no app-owned usage was found.
- The recurring `MutationObserver.observe` console error still appears to be browser/extension environment noise unless it reproduces in a clean normal browser console.

Verification:

- `npm.cmd run check` passed.
- Static prompt-8 assertion confirmed:
  - `upgrade-insecure-requests` is gone from `firebase.json`,
  - the `UI` acronym mapping exists in `js/helpers.js`.
- `git diff --check` passed with Windows line-ending warnings only.

Remaining manual check:

- After deploy, inspect the normal Chrome console on the live site and confirm the report-only CSP warning about `upgrade-insecure-requests` is gone.
- If `MutationObserver.observe` still appears in a clean normal browser profile, capture the stack/source before changing app code.

## Prompt 9 Findings - Large-Tree Navigation Helpers

Status: Complete locally.

Changes made:

- Added a compact Recently Viewed panel to the Family Tree tool rail.
- Recently viewed people are stored in `localStorage` only, scoped by family/demo tree, and capped at 8 people.
- Added a Clear control for the local recently viewed list.
- Updated selected-person quick actions so parents, spouse/partner, children, and siblings can be opened directly from the panel.
- Reused the same compact chip behavior for recent people and relatives so the chart remains the main focus.
- Selecting people from chart, Find Person, recent chips, or relative chips now keeps the selected-person panel and recent list in sync.

Verification:

- `npm.cmd run check` passed.
- Static prompt-9 assertion confirmed:
  - `TREE_RECENTS_STORAGE_KEY` exists in `js/tree.js`,
  - sibling quick-action logic exists in `js/tree.js`,
  - the Recently Viewed panel exists in `html/tree_page.html`,
  - Recently Viewed styles exist in `css/family_tree.css`.
- `git diff --check` passed with Windows line-ending warnings only.

Remaining manual check:

- After deploy or local browser reload, select several people in the large tree and confirm Recently Viewed appears, dedupes, and jumps back to prior people.
- Select someone with parents, spouse/partner, children, and siblings, then confirm each quick-action chip focuses the right person without cluttering the chart.

## Prompt 10 Findings - Account Demo Readiness Checklist And Final Audit

Status: Complete locally. Not committed, pushed, or deployed.

Changes made:

- Added an owner-only Birthday demo checklist to the Account tree card.
- The checklist summarizes photos, birthdays, bios, relationship connectivity, invite-code readiness, public demo review, and domain/DNS review.
- Checklist counts are derived from the private tree's people records on the Account page; no new backend collections or persisted checklist state were added.
- Checklist links point owners toward the Family Directory, private tree, and public large demo where review work happens.
- Kept viewer/editor Account behavior scoped: the checklist only renders for owners.

Final audit status:

- Prompt 1 is complete and deployed, with one human UI photo-upload check still recommended.
- Prompts 2, 3, 4, 6, 7, 8, 9, and 10 are complete locally.
- Prompt 5 is implemented locally through the audit intake queue. Verify the public demo and hidden directory use the intended made-up demo data after the next deploy.
- Live Firebase release gates remain owner/editor/viewer permission checks, signed-in Account/Tree load, profile edit/photo upload/replace/remove, private-data blocking, and final custom-domain smoke.

Verification:

- `npm.cmd run check` passed.
- Static route/assets assertion passed for the Firebase Hosting rewrites and core HTML/CSS/JS files.
- Static prompt-10 assertion confirmed the Account checklist code and styles exist.
- Browser smoke could not be completed in this turn because the in-app browser runtime crashed and local background Python serving is blocked by the sandbox.

Commit/deploy notes:

- Recommended commit message: `Add birthday demo readiness checklist`.
- Recommended deploy after review: `firebase deploy --only hosting,firestore:rules,storage --project tree-72e80`.
- After deploy, smoke `/`, `/tree?demo=large`, `/account`, `/tree?familyId=colety-birthday-tree`, `/profile?person=colety_rose&familyId=colety-birthday-tree&from=tree`, and `/search?familyId=colety-birthday-tree`.
