# Deployment Checklist

Use this before the birthday release and before any last-minute deploy.

## Local Checks

1. Run `npm run check`.
2. Confirm JavaScript syntax passes.
3. Confirm JSON config parsing passes.
4. Confirm unsafe rendering scan passes.
5. Run `firebase emulators:exec --only firestore,storage --log-verbosity QUIET "node -p 1"` after rules changes to confirm Firestore/Storage rules load.
6. Review `git status --short` so only intentional files are changed.

## GitHub Checks

1. Push changes to GitHub.
2. Confirm the `Checks` GitHub Actions workflow runs.
3. Confirm the workflow passes before treating the branch as release-ready.

## Firebase Hosting Checks

1. Confirm Firebase Hosting is enabled for the intended Firebase project.
2. Deploy the latest commit with `firebase deploy --only hosting,firestore:rules --project tree-72e80`.
3. Open the Firebase Hosting URL first, then the custom domain after DNS connects.
4. Confirm these routes load:
   - `/`
   - `/home`
   - `/signin`
   - `/account`
   - `/dashboard` as a compatibility route
   - `/tree`
   - `/tree?demo=large` defaults to Chart view
   - `/tree?demo=large&view=cards` keeps the Card view fallback
   - `/tree-spike?demo=large`
   - `/search`
   - `/profile`
5. Confirm response headers include `X-Frame-Options: SAMEORIGIN` so `/tree` can embed the same-origin chart view.
6. Confirm response headers include `Content-Security-Policy-Report-Only`; review browser console reports without treating them as demo blockers unless they reveal a real broken feature.
7. Confirm `coletys.com` and `www.coletys.com` are connected or pending SSL in Firebase Hosting only after the app itself is approved.
8. Confirm `/api/funfact` is treated as deferred unless it has been moved to a Firebase Function.

## Firebase Checks

1. Confirm the app is pointed at the intended Firebase project.
2. Confirm Firestore rules are deployed from `firestore.rules`.
3. Confirm Storage rules are deployed from `storage.rules`.
4. Confirm Email/password auth is enabled.
5. Confirm Google sign-in only if it will be shown.
6. Confirm `coletys.com`, `www.coletys.com`, and the Firebase Hosting preview/live domains are authorized in Firebase Auth.
7. Review Firebase API key restrictions in Google Cloud.
8. Confirm an exact invite code can join a tree, and a signed-in user cannot join a private tree by guessing only `familyId`.
9. Confirm invite-code docs cannot be listed from the client, but exact-code lookup still works.
10. Confirm profile photo upload accepts JPG/PNG/WebP/GIF under 5 MB and rejects non-image files.

Rules/privacy preflight to verify live:

- `families/{familyId}` reads are limited to the owner or listed members.
- Owners can reset invite codes and manage member roles; viewers/editors cannot reset invite codes.
- Joining requires the exact current invite code through `joinCodeAttempt`; a guessed `familyId` alone is denied.
- Old invite codes stop working after reset, even if the old `joinCodes/{code}` document lingers.
- `/users/{uid}` reads are self-only; Account should not need to read other users' private profile docs.
- `people/{personId}` writes are limited to owners/editors; viewers can read but cannot add/edit/remove.
- Storage reads for `families/{familyId}/people/{personId}/...` are member-only.
- Storage uploads require owner/editor access, image MIME type JPG/PNG/WebP/GIF, safe filename, and max 5 MB.
- Replacing/removing a photo attempts old-object cleanup, but cleanup failure should not block the profile save.

## CSP Hardening Plan

The current deploy uses `Content-Security-Policy-Report-Only`, not enforcing CSP. Keep it report-only for the birthday demo because Firebase Auth/Firestore/Storage, arbitrary HTTPS profile photo URLs, same-origin chart iframe loading, and the jsDelivr Family Chart prototype all need live browser observation before enforcement.

Before switching to enforced `Content-Security-Policy`:

1. Deploy and open `/`, `/signin`, `/account`, `/tree`, `/tree?view=chart`, `/tree-spike?demo=large`, `/search`, and `/profile` on Firebase Hosting.
2. Sign in, load the private Colety tree, upload/view/remove a profile photo, and inspect console CSP reports.
3. Confirm Firebase Auth, Firestore, Storage, Google API calls, jsDelivr chart assets, same-origin iframe messages, and external HTTPS profile images are covered.
4. Remove unnecessary allowances only after the live console is quiet for the real demo flows.
5. Convert the header from `Content-Security-Policy-Report-Only` to `Content-Security-Policy` after the birthday release.

## Spencer Live Release Gate

Run this on Firebase Hosting after deploy and before showing the app to family. This is the canonical live checklist for the remaining audit risk.

Preparation:

1. Have the owner account ready: `smcolety@gmail.com`.
2. Have a second test account ready for viewer/editor checks.
3. Have one valid JPG/PNG/WebP/GIF under 5 MB ready.
4. Have one unsupported or oversized photo ready, ideally HEIC plus a file over 5 MB.

Owner account:

1. Sign in at `/signin`; confirm the header switches to the signed-in nav.
2. Open `/account`; confirm it shows the Colety tree and owner-only invite-code controls.
3. Copy the invite code.
4. Reset the invite code; confirm the displayed code changes.
5. Open `/tree?familyId=colety-birthday-tree`; confirm Chart view loads or Card fallback works.
6. Switch between Chart and Card view; confirm the selected view is respected.
7. Search/focus a known person, open their profile, then click Back; confirm the same family, view, search, and focus return.
8. Open `/search?familyId=colety-birthday-tree`, search `Colety`, open a profile, then click Back; confirm the query is preserved.
9. Add a harmless test person only if editing is part of the demo.
10. Edit that person's name, bio, and relationships; confirm changes persist after reload.
11. Upload a valid profile photo; confirm it displays after reload.
12. Replace and remove that photo; confirm the profile updates cleanly.
13. Try HEIC, oversized, and unsupported files; confirm friendly errors.

Viewer/editor account:

1. Sign in with the second test account.
2. Join with the current invite code.
3. Confirm the tree opens and profile pages are readable.
4. Confirm viewer access cannot add, edit, remove people, upload photos, or reset invite codes.
5. Try the old reset invite code; confirm it no longer works.
6. Promote the second account to editor from the owner account.
7. Reload as the editor; confirm add/edit/photo upload controls work as expected.
8. Confirm editor access still cannot use owner-only invite reset controls.

Negative/privacy:

1. Signed-out `/tree?familyId=colety-birthday-tree` does not reveal private family data.
2. Signed-in non-member `/tree?familyId=colety-birthday-tree` does not reveal private family data.
3. A non-member cannot join with `familyId` alone; the exact current invite code is required.
4. Uploaded family images are visible to family members but not signed-out users.
5. If browser console shows `MutationObserver.observe` errors, confirm whether they come from the app or a browser extension.

## Birthday Demo Smoke Test

1. Sign in with the prepared demo account.
2. Open Account.
3. Open the birthday family tree.
4. Confirm it opens in Chart view by default for the Colety birthday tree.
5. Use Chart view search/focus, then open at least one profile from the selected-person panel.
6. Switch to Card view and click at least three person cards.
7. Confirm profile back buttons return to the right place, including `view=chart` when the profile was opened from Chart view.
8. Search for a known person in Card view.
9. Add or edit a test person only if those flows are part of the demo, then confirm Chart view refreshes after returning.
10. Check both Chart view and Card view on a phone.

## May 27 Local Acceptance Pass

Status: Local deploy-candidate checks passed again after External Audit Round 2. The repo is ready for Spencer's live Firebase pass, but the birthday release is not fully approved until those live checks pass.

Passed locally:

- `npm run check`
- `git diff --check` with line-ending warnings only
- `firebase emulators:exec --only firestore,storage --log-verbosity QUIET "node -p 1"`
- Static browser smoke for `/`, `/signin`, `/account`, `/tree`, `/tree?demo=large`, `/tree?demo=large&view=cards`, `/tree-spike?demo=large`, `/search`, `/search?familyId=colety-birthday-tree&query=Rose`, `/profile?person=colety_rose&familyId=colety-birthday-tree&from=search&query=Rose`, and `/404.html`
- Phone-width smoke for Home, Tree large demo, Search, and Account
- Chart fallback control presence
- Card add-form shell and `noValidate` validation ownership
- Search profile return label and URL context
- Phone-width smoke with no body-level horizontal overflow
- No page exceptions in the final local browser smoke

Must still be tested live on Firebase:

- Auth sign-in with the prepared owner account
- Account page owner tools, invite-code copy/reset, and current Colety tree loading
- Owner/editor/viewer permissions against deployed Firestore rules
- Private-tree blocking for signed-out and signed-in non-member users
- Exact invite-code join flow and old-code rejection after reset
- Storage upload/replace/remove for supported profile photos, plus HEIC/oversized/unsupported-file failures
- Report-only CSP header presence and console reports
- Firebase Hosting route smoke after deploy, then custom-domain smoke after DNS/SSL finishes

## May 28 Fun Tools Acceptance Pass

Status: Fun-tools batch passed local acceptance; still needs live Firebase verification after deploy.

Passed locally:

- `npm run check`
- `git diff --check` with line-ending warnings only
- `firebase emulators:exec --only firestore,storage --log-verbosity QUIET "node -p 1"`
- Desktop browser smoke for Home, Large Demo Tree, Large Demo Card list, People Directory, Large Demo People Directory, private-profile signed-out state, and Account
- Phone-width smoke for Home, Large Demo Tree, Large Demo Card list, People Directory, and Account
- No page exceptions in the checked routes
- No body-level horizontal overflow in the checked desktop or phone-width routes

Fun tools ready for live test:

1. Tree Find person and focus behavior.
2. Full Screen tree canvas button.
3. Selected-person details below the chart.
4. Relationship Finder.
5. Birthdays panel.
6. Missing info checklist.
7. Family stats panel.
8. People Directory sorting/filtering/profile links.
9. Account Invite Helper.
10. Read-only Memory Wall content from existing photos/bios.

Must still be tested live on Firebase:

1. Signed-in Colety tree data loads into every fun tool.
2. People Directory private-tree links preserve `familyId`, `query`, and `sort`.
3. Profile photo upload/replace/remove works against deployed Storage rules.
4. Owner/editor/viewer permissions match the deployed Firestore and Storage rules.
5. Signed-out and non-member users cannot read private tree/profile/photo data.
6. CSP report-only header exists and does not produce blocking issues.

## June 3 Release Fix Local Acceptance Pass

Status: Prompts 1-3 from `TREE_2026-06-03_RELEASE_FIX_QUEUE.md` passed local acceptance. The simplified navigation and Add/Edit entry-point cleanup are ready for commit/push, then live Firebase testing.

Passed locally:

- `npm run check`
- `git diff --check` with Windows line-ending warnings only
- Local static server returned 200 for the app shell
- Desktop browser smoke for `/`, `/tree`, `/tree?demo=large`, `/tree?demo=large&view=cards`, `/search`, `/search?query=tim`, `/account`, representative profile view URL, and representative profile `?edit=1` URL
- Phone-width smoke for `/`, `/tree`, `/tree?demo=large`, `/tree?demo=large&view=cards`, `/search`, `/account`, and representative profile `?edit=1` URL
- Simulated signed-in smoke for Home, Profile, and hidden People Directory routes
- No checked routes produced page exceptions
- No checked desktop or phone-width routes had body-level horizontal overflow

Confirmed locally:

- Signed-out header shows `Home | Example Tree`.
- Signed-in header is simplified to `Family Tree` plus the account icon.
- The visible Search/People nav tab is gone, while `/search` still works as a hidden People Directory route.
- Brand and tree links preserve useful `familyId`, focus, and tree search context where available.
- Add Person shells exist on Tree/Card/Search but stay hidden and disabled for signed-out/read-only local states.
- Read-only demo chart data does not expose edit/private-profile actions.
- Signed-out profile `?edit=1` does not open the edit modal.

Must still be tested live on Firebase:

- Owner sign-in with `smcolety@gmail.com` and real Colety tree load.
- Owner/editor Add Person visibility in Chart view, Card list, and hidden People Directory.
- Owner/editor selected-person `Edit person` and profile `?edit=1` modal behavior.
- Viewer read-only behavior with no add/edit/remove/photo/invite-reset controls.
- Signed-out and signed-in non-member private-data blocking.
- Profile photo upload, replace, and remove against deployed Storage rules.

## June 3 Firebase Deploy And Live Guest Smoke

Status: Deployed and guest-smoked on Firebase Hosting. Owner/editor/viewer checks are still the release gate because they require Spencer's signed-in accounts.

Deploy:

- Commit: `7fd0629 Prepare birthday release fixes`
- Command: `firebase deploy --only hosting,firestore:rules,storage --project tree-72e80`
- Hosting URL: `https://tree-72e80.web.app`
- Firestore rules compiled and released.
- Storage rules compiled and released.

Live guest/header checks passed:

- Home: `https://tree-72e80.web.app/?fresh=prompt6-live-smoke`
- Large demo tree: `https://tree-72e80.web.app/tree?demo=large&fresh=prompt6-live-smoke`
- Card list fallback: `https://tree-72e80.web.app/tree?demo=large&view=cards&fresh=prompt6-live-smoke`
- Hidden People Directory: `https://tree-72e80.web.app/search?demo=large&fresh=prompt6-live-smoke`
- Account: `https://tree-72e80.web.app/account?fresh=prompt6-live-smoke`
- Private profile signed-out state: `https://tree-72e80.web.app/profile?person=colety_rose&familyId=colety-birthday-tree&from=tree&fresh=prompt6-live-smoke`
- Signed-out header showed `Home | Example Tree` and `Sign In`.
- Private profile route did not expose Colety profile details while signed out.
- Account route showed signed-out management copy instead of private data.
- Add Person stayed hidden/disabled for signed-out/read-only Tree, Card list, and hidden People Directory routes.
- Desktop smoke found no body-level horizontal overflow.
- Phone-width smoke found no body-level horizontal overflow on Home, Large Demo Tree, Card list fallback, hidden People Directory, and Account.
- Live response headers include `Content-Security-Policy-Report-Only`, `Cache-Control: no-cache, no-store, must-revalidate`, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: SAMEORIGIN`.

Console note:

- The known `MutationObserver.observe` browser error appeared again in the app browser.
- App-code search still finds no `MutationObserver` usage; treat it as likely browser/extension noise unless it appears in Spencer's normal browser console.

Still required before final birthday approval:

- Sign in as `smcolety@gmail.com` and confirm the signed-in header shows only `Family Tree` plus the account icon.
- Confirm the real Colety tree loads from `/tree?familyId=colety-birthday-tree`.
- Confirm owner/editor Add Person visibility in Chart view, Card list, and hidden People Directory.
- Confirm owner/editor selected-person `Edit person` and profile `?edit=1` modal behavior.
- Confirm viewer read-only behavior with no add/edit/remove/photo/invite-reset controls.
- Confirm signed-out and signed-in non-member private-data blocking.
- Upload, replace, and remove a valid profile photo against deployed Storage rules.

## June 4 External Audit Prompt 10 Deploy Candidate

Status: Account readiness checklist is complete locally. Browser smoke is still required after deploy or a successful local server run.

Ready locally:

- Owner-only Account Birthday demo checklist.
- Checklist coverage for photos, birthdays, real bios, relationship connectivity, invite code, public demo review, and domain/DNS review.
- Local checks passed with `npm.cmd run check`.
- Static Firebase Hosting rewrite/core asset assertion passed.

Deploy notes:

- Suggested commit message: `Add birthday demo readiness checklist`.
- Suggested deploy command after review: `firebase deploy --only hosting,firestore:rules,storage --project tree-72e80`.

Post-deploy smoke:

1. Open `/account` as `smcolety@gmail.com`; confirm the checklist appears and counts match the Colety tree.
2. Open `/tree?familyId=colety-birthday-tree`; confirm the tree loads, selected-person panel works, and Recently Viewed/relative chips help navigation.
3. Open `/search?familyId=colety-birthday-tree`; confirm directory filtering, profile links, and Back to People context.
4. Edit a profile and test photo upload, replace, and remove against live Storage.
5. Confirm viewer/editor/non-member permissions before the birthday demo.
6. Open `/tree?demo=large` signed out; confirm public demo data still looks intentional and non-Colety.

## June 4 Audit Intake Prompts 1-6

Status: Prompts 1-6 are complete locally. They are not final-release approved until the live Firebase owner/editor/viewer checks pass after deploy.

Ready locally:

- Public demo data consistency and signed-out/private-route copy were tightened.
- Profile return/context handling was audited and patched where needed.
- Account readiness copy and checklist behavior were cleaned up.
- Hidden Family Directory copy now presents it as a secondary owner/testing view.
- Memory Wall no longer shows a permanent loading state; it stays hidden until real photo/story content exists.
- `README.md`, this checklist, and `5-21_WORKSHEET.md` document the current audit status and live gates.
- Local checks passed with `npm.cmd run check`.

Security and console notes:

- Keep `Content-Security-Policy-Report-Only` for the birthday demo. Do not enforce CSP until Firebase Auth, Firestore, Storage, same-origin route loading, jsDelivr Family Chart assets, and any allowed profile-photo URLs are verified from live browser reports.
- The recurring `MutationObserver.observe` warning has no app-owned source in this repo. Treat it as browser/extension noise unless Spencer can reproduce it in a clean normal browser profile with an app stack trace.

Remaining live release gates:

1. Sign in as the owner and confirm `/account`, `/tree?familyId=colety-birthday-tree`, `/profile`, and `/search?familyId=colety-birthday-tree` all load the private tree correctly.
2. Test owner/editor Add Person, Edit Profile, profile `?edit=1`, invite-code reset/copy, and photo upload/replace/remove against live Firebase rules.
3. Test viewer and non-member accounts to confirm private data and write controls stay blocked.
4. Test public signed-out `/`, `/tree`, `/tree?demo=large`, and `/search?demo=large` after deploy.
5. Watch live console output for CSP reports and any clean-browser `MutationObserver.observe` reproduction.

## June 4 While-Away Upgrades Release Checkpoint

Status: Prompts 1-13 from `TREE_2026-06-04_WHILE_AWAY_UPGRADES_QUEUE.md` are complete locally. This is a release candidate for review, but it has not been committed, pushed, or deployed from this checkpoint.

Proposed commit scope:

- Public/signed-out route polish for Home, Sign In, Account, Tree, hidden Family Directory, and Profile.
- Tree-page fun tools and readability upgrades: presentation/print controls, Recently Viewed, Relationship Finder, Birthdays, Missing info, Family stats, Relative spotlight, Family name cloud, and chart/card fallback cleanup.
- Profile and photo UX tightening, including friendlier upload errors and return-path handling.
- Account readiness/checklist polish and clearer private-tree management copy.
- Documentation and queue updates for audit intake, release readiness, and live Firebase gates.

Passed locally:

- `npm.cmd run check`
- `git diff --check` with Windows line-ending warnings only
- Route-aware static Firebase rewrite and asset check, covering 78 references
- Local browser smoke for Home, Large Demo Tree Chart, Large Demo Tree Card fallback, hidden Family Directory, Sign In, Account, and a large-demo Profile
- No checked public route produced app console errors
- No checked public route had body-level horizontal overflow

Still required before birthday approval:

1. Commit and push only after Spencer review.
2. Confirm GitHub Actions passes on the pushed commit.
3. Deploy with `firebase deploy --only hosting,firestore:rules,storage --project tree-72e80`.
4. Run the owner live pass as `smcolety@gmail.com` for Account, invite-code copy/reset, Colety tree load, Add/Edit Person, selected-person panel, profile `?edit=1`, and profile photo upload/replace/remove.
5. Run viewer/editor/non-member privacy checks against deployed Firestore and Storage rules.
6. Smoke public signed-out `/`, `/tree`, `/tree?demo=large`, `/tree?demo=large&view=cards`, `/search?demo=large`, `/signin`, `/account`, and one demo profile on Firebase Hosting.
7. Review live browser console for CSP report-only output and any clean-browser `MutationObserver.observe` reproduction.

## June 4 Work Shift Prompt 1 Release Sweep

Status: Changed-file release sweep passed locally. No new app-code changes were needed beyond the profile empty-image cleanup already in the local working tree. This is still not committed, pushed, or deployed.

Passed locally:

- `npm.cmd run check`
- `git diff --check` with Windows line-ending warnings only
- Route-aware Firebase rewrite and asset check, covering 78 references
- Browser smoke for Home, Sign In, Account, Large Demo Tree Chart, Large Demo Tree Card fallback, Example Tree, hidden Family Directory, valid large-demo Profile, and missing-profile state
- URL-state smoke for Tree `treeQuery=graham` and hidden Family Directory `query=graham`
- No checked route produced app console errors, visible broken images, suspicious `undefined`/`null`/`NaN` text, or page-level horizontal overflow

Notes:

- Browser automation could not type into fields because the local automation virtual clipboard was unavailable; equivalent query-state flows were smoke-tested through URLs.
- Remaining Vercel mentions are in legacy/deferred docs or the ignored `api/funfact.js` endpoint, not Firebase-hosted app calls.
- Live owner/editor/viewer and Storage photo tests remain the release gate.

## June 4 Work Shift Prompt 2 Audit Baseline

Status: Commit scope and future external-audit package scope are documented. No zip/package was created for this checkpoint, and nothing was committed, pushed, or deployed.

Current proposed commit scope:

- Public/signed-out polish for Home, Sign In, Account, Tree, hidden Family Directory, and Profile.
- Tree page improvements: embedded chart defaults, card fallback, presentation/print controls, guided tour, Find person, Recently Viewed, selected-person details, Relationship Finder, Birthdays, Missing info, Family stats, Relative spotlight, Family name cloud, and clearer empty/loading/error states.
- Profile/photo polish: intentional empty-photo placeholders, warmer profile states, friendlier photo validation/error copy, and safer return-path handling.
- Account readiness polish: private-tree management copy, invite-code guidance, owner checklist, and clearer signed-out account state.
- Release documentation and audit queues for the current local release candidate.

Future external audit package should include:

- App shell/routes: `404.html`, `html/*.html`, `css/*.css`, `js/*.js`, and `assets/*` if present.
- Firebase/release config: `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`, `package.json`, and `.gitignore`.
- Current docs: `README.md`, `DEPLOYMENT_CHECKLIST.md`, `5-21_WORKSHEET.md`, `SPENCER_PHASE_CHECKLIST.md`, `BIRTHDAY_RELEASE_ROADMAP.md`, `BIRTHDAY_RELEASE_PUNCH_LIST.md`, `BIRTHDAY_RELEASE_ISSUES.md`, `TREE_2026-06-04_AUDIT_INTAKE_QUEUE.md`, `TREE_2026-06-04_WHILE_AWAY_UPGRADES_QUEUE.md`, and `TREE_2026-06-04_WORK_SHIFT_UPGRADES_QUEUE.md`.
- Optional historical context only if the auditor needs it: older `TREE_2026-*QUEUE.md` files and `ROADMAP.md`.

Keep out of git and audit commits:

- Generated audit packages/reports: `TREE_EXTERNAL_AUDIT_*`, `TREE_EXTERNAL_AUDIT_PACKAGE_*`, and `TREE_QA_REVIEW_*`.
- Firebase local artifacts: `.firebase/`, `firestore-debug.log`, and any `firebase-debug.log`.
- Dependencies/build artifacts: `node_modules/` and temporary local server files such as `.tmp_*`.
- Secrets or credentials. Test account details should be shared only in the audit prompt if Spencer explicitly approves.

Latest local readiness:

- `npm.cmd run check` passed.
- `git diff --check` passed with Windows line-ending warnings only.
- Route-aware Firebase rewrite/asset check passed with 78 references checked.
- Public browser smoke passed in Work Shift Prompt 1.
- External audit should wait until Spencer either approves this local candidate or asks to package it anyway.

## June 4 Work Shift Prompt 3 Tree First Impression

Status: Tree first-impression polish is complete locally. Nothing was committed, pushed, or deployed for this checkpoint.

Ready locally:

- Tree pages now show a contextual subtitle for large demo, example, missing, archived, and private tree states.
- Public tree helper copy now starts with "Start here" guidance and tells visitors to search a name or click a person card.
- The tour/key copy better explains selected people, relationship lines, and C1/C2 couple markers.
- Chart fallback copy now says "Use card list instead."
- Mobile first viewport keeps the chart visible sooner by placing the canvas before the deeper tool stack at narrow widths.
- Mobile header, title, subtitle, and print controls wrap without page-level horizontal overflow.

Passed locally:

- Desktop smoke for public large demo Chart view, Card list fallback, and real-tree shell route.
- Phone-width CDP smoke for public large demo Chart view at 390px, with no body/document horizontal overflow.
- `npm.cmd run check`
- `git diff --check` with Windows line-ending warnings only.

Still required live:

- After deploy, spot-check signed-in private-tree title/subtitle/copy with the owner account.
- Confirm the mobile chart-first order feels right on a real phone browser.

## June 4 Work Shift Prompt 4 Selected Person Actions

Status: Selected-person action polish is complete locally. Nothing was committed, pushed, or deployed for this checkpoint.

Ready locally:

- Selected-person panel now has a compact Clear control.
- Clear selection hides the panel, removes focused-card styling, and clears stale `focus` URL state.
- Public demo selections now expose `View demo details` through the existing read-only demo profile route.
- Owner/editor-capable private trees still use `Edit profile`; viewer/read-only states do not show edit controls.
- Selected-person action copy is clearer for demo, owner/editor, and private viewer states.
- Mobile selected-person actions meet 44px tap-target checks.

Passed locally:

- `npm.cmd run check`
- `git diff --check` with Windows line-ending warnings only.
- Desktop selected-person smoke in public large-demo Chart view.
- Read-only demo profile smoke from the selected-person panel.
- Phone-width selected-person smoke at 390px, with no body/document horizontal overflow.

Still required live:

- Verify owner/editor selected-person `Edit profile` appears after signed-in Firebase access is confirmed.
- Verify viewer and signed-out states do not expose edit controls on private trees.

## June 4 Work Shift Prompt 5 Tree Tools Drawer Cleanup

Status: Tree sidebar drawer cleanup is complete locally. Nothing was committed, pushed, or deployed for this checkpoint.

Ready locally:

- Sidebar tools are grouped into `Map basics`, `Explore`, and `Review`.
- Drawer labels are clearer: `Map key`, `View settings`, `Relationship finder`, `Birthdays`, `Profiles to finish`, `Family snapshot`, and `Data checks`.
- Each drawer has a short description so users can tell what it does before opening it.
- Drawer summaries now look like compact controls with plus/minus affordances.
- Map key and view settings sit near the primary map actions; review/audit tools sit lower so they do not distract from finding relatives.

Passed locally:

- `npm.cmd run check`
- `git diff --check` with Windows line-ending warnings only.
- Browser smoke for public large-demo Chart view, Card list fallback, and 390px mobile.
- Browser smoke confirmed 7 tool drawers, 3 group labels, no empty summaries, and no body/document horizontal overflow.

Still required live:

- Spot-check tool content with the real signed-in Colety tree after deploy, since live people/photos/birthdays can change panel content length.

## June 4 Work Shift Prompt 6 Profile Page Story Pass

Status: Profile page story polish is complete locally. Nothing was committed, pushed, or deployed for this checkpoint.

Ready locally:

- Profile pages now have a story lead that adapts to demo, private, missing, and real-person states.
- Empty profile facts now read like intentional placeholders instead of blanks: birthday, parents, spouse/partner, children, bio, and birthday note.
- Profiles without photos keep a styled initials/photo placeholder so the layout still feels complete.
- Missing-person, wrong-family, and signed-out private states have complete copy and protected-data messaging.
- Back links preserve tree focus/view context and People Directory query/sort context, with clearer titles and aria labels.
- Edit modal behavior remains in place, with slightly clearer dialog/help wiring.

Passed locally:

- `npm.cmd run check`
- `git diff --check` with Windows line-ending warnings only.
- Browser smoke for valid large-demo profile, People Directory return path, missing profile, signed-out private profile, and 390px mobile profile.

Still required live:

- Verify signed-in owner/editor profile edit controls still appear for the real Colety tree.
- Verify live Firebase Storage photo display/upload/replace/remove behavior.
- Spot-check real Colety profile return paths after deploy.

## Final Release Order

1. Finish code changes locally.
2. Run `npm run check` and `git diff --check`.
3. Review the changed UI locally or on Firebase Hosting preview/live.
4. Commit and push only after the local checks pass.
5. Confirm GitHub Actions passes.
6. Deploy Firebase Hosting and Firestore rules.
7. Run the birthday demo smoke test on the Firebase Hosting URL.
8. Finish or verify the Porkbun domain transfer last.
9. Add or confirm Firebase DNS records in Porkbun.
10. Add `coletys.com` and `www.coletys.com` to Firebase Auth authorized domains.
11. Run one last desktop and phone smoke test on the final custom domain.

## Branch Protection Recommendation

In GitHub repository settings, protect `main`:

- Require status checks to pass before merging.
- Require the `Checks / Static checks` workflow.
- Block force pushes.
- Require pull requests if more than one person is actively editing the repo.
