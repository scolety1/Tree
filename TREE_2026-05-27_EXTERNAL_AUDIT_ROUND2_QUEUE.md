# Tree External Audit Round 2 Queue - May 27, 2026

Use this queue by sending prompts like:

`find TREE_2026-05-27_EXTERNAL_AUDIT_ROUND2_QUEUE.md and do prompt 1`

Source report: `C:\Users\codex-agent\Downloads\Family Tree Layout Strategy (4).docx`

Extracted text copy: `TREE_EXTERNAL_AUDIT_2026-05-27_REPORT.txt`

## Audit Summary

The second external audit found no obvious new code-only P0 blocker in the static bundle. The remaining P0 risk is mostly live Firebase behavior: Auth redirects, owner/editor/viewer Firestore permissions, invite-code reset/join behavior, and Storage upload/delete behavior.

Local readiness is good, but the app is not birthday-demo ready until live Firebase checks pass.

## Prompt 1 - Live-Test Checklist And Release Gate Cleanup

Cross-check the new audit against `DEPLOYMENT_CHECKLIST.md`, `5-21_WORKSHEET.md`, and `TREE_2026-05-27_EXTERNAL_AUDIT_QUEUE.md`. Make sure the live Firebase tests are deduplicated, clear, and ordered so Spencer can run them quickly. Do not make code changes unless there is a tiny obvious documentation or checklist fix. Update this queue with findings.

Status: Done May 27, 2026. See "Prompt 1 Findings" below.

## Prompt 2 - Auth Redirect Safety Review

Review sign-in/sign-up redirect handling for open-redirect or broken-return risks. Ensure redirects only point to safe in-app paths and preserve intended create/join/search/tree destinations. Make small scoped fixes if needed. Run checks and smoke `/`, `/signin`, signed-out create/join CTAs, and redirected return URLs locally.

Status: Done May 27, 2026. See "Prompt 2 Findings" below.

## Prompt 3 - Account Tree And Invite-Code Flow Review

Review `js/dashboard.js`, `js/familyContext.js`, helpers, Firestore rules, and account-page UI for the owner tree loading flow, copy/reset invite-code flow, old-code invalidation, and viewer/editor visibility. Make code fixes where they can be verified locally; document live-only checks clearly. Run checks.

Status: Done May 27, 2026. See "Prompt 3 Findings" below.

## Prompt 4 - Tree Navigation Context Edge-Case Pass

Stress navigation context across Tree, Chart/Card view, Search, Profile, Account, browser Back, and header links. Preserve `familyId`, `view`, `focus`, `treeQuery`, and Search `query` where appropriate. Fix only confirmed losses. Run browser smoke on desktop and mobile.

Status: Done May 27, 2026. See "Prompt 4 Findings" below.

## Prompt 5 - Add/Search/Profile Flow Hardening

Test and tighten add-person validation state, Search query preservation after add, Profile Back labels, signed-out/private-tree empty messages, and profile return paths. Make small UX or logic fixes for any confirmed issue. Run checks and browser smoke.

Status: Done May 27, 2026. See "Prompt 5 Findings" below.

## Prompt 6 - Loading And Error-State Polish

Add lightweight loading, empty, and friendly error states where the audit calls out abrupt jumps or vague Firebase failures, especially Account, Tree, Search, Auth, and Storage/photo flows. Keep the current visual system and avoid a redesign. Run checks and browser smoke.

Status: Done May 27, 2026. See "Prompt 6 Findings" below.

## Prompt 7 - Relationship Form Clarity And Accessibility Polish

Improve helper text and accessibility around parent/spouse selectors, blank/unknown relationships, density/view controls, copy/reset controls, and modal focus/labels where needed. Keep copy dad-friendly and concise. Run checks.

Status: Done May 27, 2026. See "Prompt 7 Findings" below.

## Prompt 8 - Firebase Rules And Storage Preflight

Review Firestore and Storage rules against the audit's security/privacy concerns: exact invite-code lookup, self-join restrictions, owner/editor/viewer writes, `/users/{uid}` self-only reads, profile image type/size limits, and old-image cleanup assumptions. Run emulator rules-load checks if possible and update live-test notes.

Status: Done May 27, 2026. See "Prompt 8 Findings" below.

## Prompt 9 - CSP And Hosting Header Feasibility

Evaluate whether a Content-Security-Policy can be safely added without breaking Firebase Auth, Firestore, Storage, Google APIs, same-origin chart iframe, or the Family Chart CDN/prototype. If safe, propose or implement a conservative report-ready CSP. If risky before the birthday demo, document the deferred plan.

Status: Done May 27, 2026. See "Prompt 9 Findings" below.

## Prompt 10 - Final Round 2 Acceptance Pass

After prompts 1-9, run local checks and browser smoke for the audit routes and flows. Update `DEPLOYMENT_CHECKLIST.md`, `5-21_WORKSHEET.md`, and this queue with final deploy readiness, remaining live Firebase tests, and whether the app is ready for Spencer's live pass. Do not deploy unless asked.

Status: Done May 27, 2026. See "Prompt 10 Findings" below.

## Live Firebase Tests That Cannot Be Replaced Locally

Owner account:

1. Sign in at `/signin`.
2. Confirm `/account` lists the Colety tree and owner-only invite-code controls.
3. Copy and reset the invite code; confirm the code changes.
4. Confirm the old invite code no longer works.
5. Open `/tree?familyId=colety-birthday-tree`; confirm Chart view loads or Card fallback works.
6. Switch views, search/focus a person, open profile, and use Back.
7. Add/edit/remove a harmless test person if that is part of the demo.
8. Upload, replace, and remove a valid profile image.
9. Try HEIC, oversized, and unsupported files; confirm friendly errors and rules blocking.

Viewer/editor account:

1. Join using the current invite code.
2. Confirm viewer can read but cannot add/edit/remove/reset invite codes.
3. Promote the second account to editor.
4. Confirm editor can add/edit expected data but cannot owner-only reset controls.

Negative/privacy:

1. Signed-out `/tree?familyId=colety-birthday-tree` does not reveal private data.
2. Signed-in non-member cannot open private tree data.
3. Non-member cannot join with `familyId` alone.
4. `/users/{uid}` reads are self-only unless intentionally changed.
5. Uploaded family images are available to members but not signed-out users.

## Prompt 1 Findings - May 27, 2026

Status: Done; documentation-only cleanup.

Cross-check result:

- The new audit, `DEPLOYMENT_CHECKLIST.md`, `5-21_WORKSHEET.md`, and `TREE_2026-05-27_EXTERNAL_AUDIT_QUEUE.md` all identify the same remaining release risk: live Firebase/Auth/Storage behavior.
- No new code-only P0 blocker was identified by the audit.
- The important live checks were duplicated across files with slightly different wording, so `DEPLOYMENT_CHECKLIST.md` now has one canonical `Spencer Live Release Gate` section.

Canonical live gate now covers:

1. Owner sign-in and Account tree loading.
2. Invite-code copy/reset and old-code rejection.
3. Tree Chart/Card behavior, search/focus, profile return, and Search return.
4. Optional add/edit/remove test-person flow.
5. Profile photo upload, replace, remove, and invalid-file failures.
6. Viewer join/read-only behavior.
7. Editor promotion and editor edit behavior.
8. Signed-out and non-member privacy blocking.
9. Final note to verify whether any `MutationObserver.observe` console error is app-side or extension-side.

Files updated:

- `DEPLOYMENT_CHECKLIST.md`
- `5-21_WORKSHEET.md`
- `TREE_2026-05-27_EXTERNAL_AUDIT_ROUND2_QUEUE.md`

Next prompt:

- Prompt 2 should review auth redirect safety and signed-out create/join return paths.

## Prompt 2 Findings - May 27, 2026

Status: Done locally; live Firebase sign-in return still needs one deployed smoke.

Code change:

- `js/auth.js`: sign-in redirect targets are now restricted to known in-app routes with `SAFE_REDIRECT_PATHS`. Off-origin redirects were already blocked; this also blocks stale or unsafe same-origin targets such as `/signin?...`, `/api/...`, unknown routes, or accidental loops. Valid app paths like `/`, `/account`, `/tree`, `/search`, `/profile`, and `/tree-spike` remain allowed.

Local verification:

- `npm run check` passed.
- `git diff --check` passed with line-ending warnings only.
- Local browser smoke confirmed signed-out home CTAs produce safe return URLs:
  - Start flow: `/signin?redirect=%2F%23createTreeFormCard`
  - Join flow: `/signin?redirect=%2F%23joinTreeFormCard`
- Local browser smoke confirmed `/signin` loads normally with create, join, tree, external, and sign-in-loop redirect params.
- Static auth-code check confirmed the redirect helper has same-origin blocking, known-route whitelisting, and still allows home hash/tree/search/profile return paths.

Remaining live check:

1. On Firebase Hosting, while signed out, click `Sign In to Start`, sign in, and confirm the page returns to the create-tree section with forms enabled.
2. Repeat with `Sign In to Join` and confirm the page returns to the join-code section.
3. Open a private-tree/profile/search redirect that requires sign-in and confirm successful sign-in lands on the expected in-app path, not `/account`, unless the redirect is invalid.

## Prompt 3 Findings - May 27, 2026

Status: Done locally; invite-code reset/join and owner tree loading still need live Firebase testing.

Code change:

- `js/dashboard.js`: Account now only reads the current user's `/users/{uid}` profile. Other members remain labeled generically as `Family member`, which matches the current self-only `/users/{uid}` Firestore privacy rule and avoids noisy permission-denied reads while loading the Members list.

Flow review:

- Owner tree loading uses both membership and owner queries, then dedupes results. This should find the Colety tree whether the owner is in `memberIds` already or only has `ownerId` on older data.
- Legacy owner data repair still adds missing owner membership, owner role, and missing join code when the owner can update the tree.
- Invite-code reset creates the new `joinCodes/{newCode}` doc, updates `families/{familyId}.joinCode`, then deletes the old join-code doc. If old-code deletion ever fails, the rules still compare `joinCodeAttempt` to the current family `joinCode`, so the old code should not join.
- Viewer/editor visibility remains role-based: only owners see invite-code copy/reset and member access controls; editors can edit people/photos but should not see owner-only invite reset controls.

Local verification:

- `npm run check` passed.
- `git diff --check` passed with line-ending warnings only.
- `firebase emulators:exec --only firestore,storage --log-verbosity QUIET "node -p 1"` passed, confirming rules load.
- Local browser smoke confirmed `/account` renders the signed-out Account shell and status without layout overflow.

Remaining live checks:

1. Sign in as `smcolety@gmail.com` and confirm `/account` shows the Colety tree.
2. Confirm owner-only controls appear: invite code, `Copy Code`, `Reset Code`, member role controls, and archive.
3. Reset the invite code, copy the new code, and confirm the old code can no longer join.
4. Sign in as a second account, join with the new code, and confirm the tree appears as read-only viewer access.
5. Promote that account to editor and confirm editor edit controls work while invite reset remains owner-only.

## Prompt 4 Findings - May 27, 2026

Status: Done locally; signed-in header behavior still needs live Firebase smoke.

Code change:

- `js/main.js`: header navigation now translates between Tree's `treeQuery` parameter and Search's `query` parameter. Moving from Tree/Profile to Search preserves the active search term, and moving from Search or a search-origin Profile back to Tree carries that term as `treeQuery`. Profile-origin Tree links still keep the current person as `focus`.

Verified context paths:

- Tree with `view=cards&treeQuery=Rose&focus=colety_rose` to Search becomes `/search?familyId=...&query=Rose`.
- Search with `query=Rose` to Tree becomes `/tree?familyId=...&treeQuery=Rose`.
- Search-origin Profile with `query=Rose` to Tree becomes `/tree?familyId=...&focus=personId&treeQuery=Rose`.
- Tree-origin Profile with `view=chart&treeQuery=Rose` to Tree Back remains `/tree?familyId=...&treeQuery=Rose&focus=personId&view=chart`.

Local verification:

- `npm run check` passed.
- `git diff --check` passed with line-ending warnings only.
- Static signed-in URL-building check passed for Tree, Search, Profile, and Account header destinations.
- Local browser smoke passed for Tree/Search/Profile/Account routes on desktop and Tree/Search on a phone-sized viewport with no body-level horizontal overflow.
- Profile Back links preserved Search and Tree return contexts in browser smoke.

Remaining live checks:

1. Signed in, open Tree Card view, search/focus a person, then click Search in the header; confirm the same term appears on Search.
2. Signed in, search for a person, then click Family Tree in the header; confirm the tree opens with the same term as tree focus/search context.
3. Open a profile from Search, then use both `Back to Search` and the header Family Tree link; confirm both preserve context.
4. Repeat once from Chart view and confirm `view=chart` is preserved when returning from a tree-origin profile.

## Prompt 5 Findings - May 27, 2026

Status: Done locally; live owner/editor add/edit success still needs Firebase testing.

Code changes:

- `html/search_page.html`: Search Add Person now includes the same optional bio note, secure photo URL, profile-photo upload, file type restriction, and 5 MB copy as the Tree Add Person modal.
- `js/profile.js`: Edit Profile now uses app-owned inline validation (`noValidate`) instead of browser-native required popups. Missing first/last name, duplicate parents, descendant-as-parent, and insecure photo URLs keep the modal open, mark fields with `aria-invalid`, focus the relevant field, and show the existing profile status message.

Local verification:

- `npm run check` passed.
- `git diff --check` passed with line-ending warnings only.
- Browser smoke passed for `/search`, `/search?query=Rose`, signed-out private Search, Search-origin Profile, Tree-origin Profile, missing-person Profile, and mobile Search/Profile routes.
- Search query preservation is intact.
- Search private-tree message is clear while signed out.
- Profile Back labels and hrefs are correct for Search and Tree sources.
- Search Add Person form has `noValidate`, bio/photo fields, and JPG/PNG/WebP/GIF accept restrictions.
- Profile edit form has `noValidate`.

Remaining live checks:

1. Signed in as owner/editor, submit Add Person from Search with missing required fields and confirm the modal stays open with values preserved.
2. Add a harmless person from Search with a bio/photo and confirm the current search query remains after refresh.
3. Edit that person from Profile; test missing first/last name, duplicate parents, descendant parent, insecure photo URL, valid photo upload, and save success.
4. Confirm viewer accounts cannot add/edit and see clear read-only messaging.

## Prompt 6 Findings - May 27, 2026

Status: Done locally; live Firebase failure states still need one owner/editor pass.

Code changes:

- `css/global.css`: shared status boxes now support success, loading, and error tones across form, Account, and family-tree-card messages.
- `js/dashboard.js`: Account now renders a loading skeleton while the family tree query runs, replaces it cleanly with the starter tree or empty state, and shows a friendlier unavailable state if Firebase denies or fails the load.
- `js/dashboard.js`: Account card actions now use loading/success/error status tones and clearer copy for invite-code reset, tree save/archive/leave, member removal, and role updates.
- `js/tree.js`: tree load failure copy now tells the user to refresh and confirm account access instead of only saying permissions failed.
- `js/search.js`: private-tree search load failure copy now points users to refresh and account access checks.
- `js/postPeople.js` and `js/profile.js`: add/edit/remove profile failures now mention editor access and retry steps instead of generic failure text.

Local verification:

- `npm run check` passed.
- `git diff --check` passed with line-ending warnings only.
- Headless Chrome smoke passed for Account, Large Demo Tree, Search, private-tree Search, private Profile, Sign In, plus mobile Account/Search/Large Demo routes.
- Smoke found no page-level horizontal overflow and no page exceptions on the checked routes.

Remaining live checks:

1. Signed in as owner, briefly throttle/reload `/account` and confirm loading then tree card states feel clear.
2. Try invite-code copy/reset, tree save, and member access changes; confirm success/error messages are readable.
3. Try valid and invalid profile-photo uploads from Add Person and Edit Profile; confirm Storage-denied and unsupported-file messages are friendly.
4. Confirm viewer accounts see clear read-only copy and do not see owner/editor-only actions.

## Prompt 7 Findings - May 27, 2026

Status: Done locally; live edit-modal behavior still needs owner/editor smoke.

Code changes:

- `html/tree_page.html` and `html/search_page.html`: Add Person relationship selectors now live in a `Relationships` fieldset with concise helper text explaining that blank means unknown/not added yet.
- `html/profile.html`: Edit Profile relationship selectors use the same fieldset/helper pattern.
- `js/profile.js`: Edit Profile relationship placeholder text now matches the clearer blank/unknown language.
- `css/global.css`: added light fieldset styling that matches the current modal/card visual system.
- `html/tree_page.html` and `js/tree.js`: the tree access-code chip is now keyboard accessible with `role="button"`, `tabindex="0"`, Enter/Space support, and clearer copy hint text.
- `html/tree_page.html`: density and view controls now have more descriptive ARIA labels.
- `js/dashboard.js`: Account copy/reset/member controls now include more specific ARIA labels and role-select title help.

Local verification:

- `npm run check` passed.
- `git diff --check` passed with line-ending warnings only.
- Headless Chrome smoke confirmed relationship helper text/ARIA wiring on Tree, Search, Profile, and mobile Tree routes.
- Smoke confirmed no page exceptions and no body-level horizontal overflow on checked routes.

Remaining live checks:

1. Signed in as owner/editor, open Add Person from Tree and Search and confirm the relationship fieldset reads naturally.
2. Open Edit Profile and confirm parent/spouse selectors keep current values while using the new unknown/not-listed placeholder copy.
3. Confirm keyboard users can focus the tree access code and press Enter or Space to copy it.
4. Confirm Account invite-code and member-role controls are understandable with screen reader labels/tooltips.

## Prompt 8 Findings - May 27, 2026

Status: Done locally; no rules code changes needed in this pass. Live deployed-rule testing remains required.

Rules review:

- Firestore `families/{familyId}` reads are limited to owners or users in `memberIds`.
- Family updates are owner-only except the narrow join, leave, and join-code-attempt cleanup paths.
- Join flow requires `joinCodeAttempt` to match the current `families/{familyId}.joinCode`, so knowing only `familyId` is not enough.
- `joinCodes/{code}` can be fetched by exact code by signed-in users and cannot be listed. New code docs must match the generated `^[A-Z2-9]{10}$` format and be created by the family owner.
- Old invite-code cleanup is best-effort in app code; if old `joinCodes/{code}` deletion fails, the family join rule still compares against the current family `joinCode`, so the old code should not join.
- `/users/{uid}` remains self-only for reads and writes, matching the Account-page change that avoids reading other members' private user docs.
- `people/{personId}` reads are family-member-only, while create/update/delete require owner/editor access.
- Storage profile images are member-readable and owner/editor-writable only under `families/{familyId}/people/{personId}/{fileName}`.
- Storage writes require safe file names, JPG/PNG/WebP/GIF MIME types, and max 5 MB size.
- Old photo cleanup is intentionally non-blocking in app code: profile save can succeed even if deleting the prior Storage object fails.

Local verification:

- `firebase emulators:exec --only firestore,storage --log-verbosity QUIET "node -p 1"` passed, confirming Firestore and Storage rules load.
- `npm run check` passed.
- `git diff --check` passed with line-ending warnings only.
- `DEPLOYMENT_CHECKLIST.md` now has a dedicated rules/privacy preflight list for Spencer's live pass.

Remaining live checks:

1. Deploy the current `firestore.rules` and `storage.rules` to `tree-72e80`.
2. As owner, confirm invite-code reset, member role management, add/edit/remove people, and photo upload/replace/remove work.
3. As viewer, confirm private reads work but add/edit/remove/photo upload/invite reset fail gracefully.
4. As editor, confirm add/edit/photo upload work while invite reset remains blocked.
5. As signed-out and signed-in non-member users, confirm private family/people/image reads are denied.
6. Confirm exact current invite code joins, old reset code fails, and guessed `familyId` alone cannot join.

## Prompt 9 Findings - May 27, 2026

Status: Done locally; CSP should stay report-only until live Firebase smoke is clean.

CSP decision:

- Enforcing CSP before the birthday demo is risky because the app depends on Firebase Auth/Firestore/Storage endpoints, Firebase SDK modules from `www.gstatic.com`, jsDelivr Family Chart/D3 assets, a same-origin chart iframe, Firebase Storage image URLs, and user-provided HTTPS profile image URLs.
- A report-only CSP is safe enough to ship because it should not block the demo while still surfacing console reports for missing sources.

Code change:

- `firebase.json` now adds a `Content-Security-Policy-Report-Only` header with a conservative allowlist for:
  - self-hosted app files and same-origin chart iframe
  - Firebase SDK modules from `https://www.gstatic.com`
  - Family Chart/D3 from `https://cdn.jsdelivr.net`
  - Firebase/Google API connections
  - Firebase Storage and general HTTPS profile images
  - `data:`/`blob:` image fallbacks

Deferred enforcement plan:

1. Keep report-only for the birthday demo.
2. Deploy and inspect CSP console reports on `/`, `/signin`, `/account`, `/tree`, `/tree?view=chart`, `/tree-spike?demo=large`, `/search`, and `/profile`.
3. Exercise real sign-in, Firestore reads/writes, Storage upload/read/delete, Chart view, Card view, and external profile images.
4. Tighten the allowlist after the live report-only pass.
5. Convert to enforced `Content-Security-Policy` only after the demo flows are proven quiet.

Local verification:

- `npm run check` passed.
- `git diff --check` passed with line-ending warnings only.
- `firebase emulators:exec --only hosting --project tree-72e80 --log-verbosity QUIET "node -p 1"` passed, confirming the Hosting config starts.
- Hosting emulator `curl -I` did not show custom headers locally, so final header presence must be verified on Firebase Hosting after deploy.

Remaining live checks:

1. After deploy, confirm `Content-Security-Policy-Report-Only` is present in Firebase Hosting response headers.
2. Watch browser console for CSP reports while running the birthday demo smoke.
3. Do not switch to enforced CSP until those reports are reviewed and any missing Firebase/CDN/image sources are accounted for.

## Prompt 10 Findings - May 27, 2026

Status: Done locally. The repo is ready for Spencer's live Firebase pass. It is not final birthday-release approved until live Firebase checks pass.

Local checks:

- `npm run check` passed.
- `git diff --check` passed with line-ending warnings only.
- `firebase emulators:exec --only firestore,storage --log-verbosity QUIET "node -p 1"` passed.
- Local static server returned 200 for the app shell.

Browser smoke:

- Desktop smoke passed for:
  - Home
  - Sign In
  - Account
  - Large Demo Tree default Chart path
  - Large Demo Tree Card fallback path
  - Family Chart spike
  - Search
  - Private-tree signed-out Search state
  - Private-tree signed-out Profile state
  - Branded 404 page
- Mobile-sized smoke passed for Home, Large Demo Tree, Search, and Account.
- No page exceptions were detected.
- No body-level horizontal overflow was detected.

Deploy readiness:

- Local/static readiness is good.
- Do not treat the app as fully release-approved until Spencer completes live Firebase checks on the deployed Firebase Hosting URL.
- Do not switch CSP from report-only to enforcing before the birthday demo.

Remaining live Firebase checks:

1. Owner sign-in with `smcolety@gmail.com`.
2. Account shows the Colety tree and owner-only invite-code/member controls.
3. Invite-code copy/reset works and the old reset code no longer joins.
4. Current exact invite code joins a second account; guessed `familyId` alone does not.
5. Viewer can read but cannot add/edit/remove/upload/reset invite codes.
6. Editor can add/edit/upload photos but cannot reset invite codes.
7. Signed-out and signed-in non-member users cannot read private family, people, or image data.
8. Valid photo upload/replace/remove works; HEIC, oversized, and unsupported files fail with friendly messages.
9. Chart view and Card fallback both work with real Colety data.
10. Live response headers include `Content-Security-Policy-Report-Only`, and console reports are reviewed without enforcing CSP yet.
