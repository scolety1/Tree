# Tree External Audit Queue - May 27, 2026

Use this queue by sending prompts like:

`find TREE_2026-05-27_EXTERNAL_AUDIT_QUEUE.md and do prompt 1`

Source report: `C:\Users\codex-agent\Downloads\Family Tree Layout Strategy (3).docx`

Goal: turn the external release audit into the smallest practical set of birthday-demo fixes. Several P0 notes in the report are already addressed locally; this queue focuses on the remaining work that can still improve the demo.

## Audit Triage

Already handled locally or covered by current queue findings:

- P0-1 main/module imports: covered by `TREE_2026-05-26_QA_REPORT_QUEUE.md` prompt 1.
- P0-2 sign-in wiring: covered by prompt 1 and prompt 5.
- P0-3 chart fallback: covered by prompt 3.
- P0-4 rules allow/block shape: covered by prompt 8, but live Firebase testing remains.
- P2-2 modal accessibility/focus: covered by prompt 7.

Still important:

- P1-1 navigation context edge cases.
- P1-2 tree search/focus persistence across view and density changes.
- P1-3 add-person modal should not close or feel reset after validation errors.
- P1-4 old Storage images are orphaned when photos are replaced/removed.
- P1-5 photo file type/size copy and input restrictions should match Storage rules.
- P2-1 mobile Card view horizontal scroll affordance.
- P2-3 search page add-person flow should preserve the current search.
- P2-4 profile back-link should use context-aware labels again.
- Live manual Firebase checks still matter more than local shims for invite codes, rules, roles, and Storage.

## Prompt 1 - Audit Cross-Check And Live-Test Checklist

Cross-check the external audit against the current repo state. Do not make broad code changes. Verify whether each P0/P1/P2 item is already fixed, still valid, or needs only live Firebase testing. Update this queue and `5-21_WORKSHEET.md` with a compact status table and an exact Spencer manual-test checklist for owner/editor/viewer accounts.

Status: Done May 27, 2026. See "Prompt 1 Findings" below.

## Prompt 2 - Navigation And Focus Persistence

Fix the remaining navigation context issues from the external audit. Preserve `familyId`, `view`, `focus`, and search `query` when moving between Tree, Chart/Card view, Search, Profile, and Account. Persist the current tree search/focus through density changes and Chart/Card toggles where feasible. Keep changes scoped to `js/main.js`, `js/tree.js`, `js/search.js`, `js/profile.js`, and helpers if needed. Run checks and browser smoke.

Status: Done May 27, 2026. See "Prompt 2 Findings" below.

## Prompt 3 - Add/Search Modal Validation And Query Preservation

Improve add-person flows without redesigning them. Validation errors inside the Add Person modal should keep the modal open and keep entered values. Adding a person from Search should preserve the current search query/results context and refresh gracefully after success. Confirm add-person behavior from both `/tree` Card view and `/search`. Run checks and browser smoke.

Status: Done May 27, 2026. See "Prompt 3 Findings" below.

## Prompt 4 - Profile Photo Upload, Replace, And Remove Polish

Align the photo UI with the tightened Storage rules. Restrict file inputs to JPG/PNG/WebP/GIF, show clear copy about the 5 MB limit, improve HEIC/oversized-file errors, and investigate safe cleanup for old Storage files when replacing or removing photos. If deleting old files is safe with current stored image URLs, implement it; otherwise document the blocker and live-test plan. Run checks and browser smoke of the edit-profile UI.

Status: Done May 27, 2026. See "Prompt 4 Findings" below.

## Prompt 5 - Mobile Card View And Back-Link Polish

Make the remaining visible polish fixes from the audit. Add a clearer mobile horizontal-scroll cue for Card view, make profile back-link labels context-aware (`Back to Family Tree` / `Back to Search`), and remove or quiet obvious debug/prototype language if it appears in production routes. Keep the layout restrained and birthday-demo focused. Run desktop/mobile smoke.

Status: Done May 27, 2026. See "Prompt 5 Findings" below.

## Prompt 6 - Final External-Audit Acceptance Pass

After prompts 1-5, run a final local acceptance pass using the audit's suggested routes and flows: `/`, `/signin`, `/account`, `/tree`, `/tree?demo=large`, `/tree?demo=large&view=cards`, `/tree-spike?demo=large`, `/search`, `/profile`, Chart fallback, Card add flow, Search profile return, and mobile viewports. Update `DEPLOYMENT_CHECKLIST.md`, `5-21_WORKSHEET.md`, and this queue with deploy readiness and remaining live Firebase tests. Do not deploy unless asked.

Status: Done May 27, 2026. See "Prompt 6 Findings" below.

## Prompt 1 Findings - May 27, 2026

### Audit Status Table

| Audit item | Current status | Evidence / next step |
| --- | --- | --- |
| P0-1 main/module imports | Fixed locally | Core routes include `/js/main.js?v=20260522-11`; prior QA queue prompt 1 verified import graph and rewrites. Reconfirm after deploy only. |
| P0-2 sign-in wiring | Fixed locally | `main.js` imports `auth.js`; `/signin` loads `main.js`; prior prompt 5 smoke covered signed-out/signed-in-equivalent flow. Needs live sign-in test. |
| P0-3 Chart fallback | Fixed locally | `tree_page.html` has `treeChartFallbackBtn`; `tree.js` has loading/error/timeout fallback and Card view switch. Needs live Firebase Hosting smoke after deploy. |
| P0-4 Firestore/Storage rules alignment | Locally hardened; live testing required | Prompt 8 tightened `joinCodes`, self-join, `/users`, and Storage image rules. Emulator rules-load passed, but owner/editor/viewer live tests are required. |
| P1-1 navigation context edge cases | Still valid | `main.js`, `profile.js`, and `search.js` preserve much of the context, but the audit's edge cases should be tested and tightened in prompt 2. |
| P1-2 view/density search/focus persistence | Still valid | `tree.js` has tree search/focus, but density/view changes can still clear visual focus or not carry URL focus as strongly as we want. Prompt 2. |
| P1-3 add-person modal validation state | Still valid | Add-person validation messages are inline, but modal-close/state behavior after validation and success should be verified and improved. Prompt 3. |
| P1-4 orphaned Storage images | Still valid | Current code can replace/remove image URLs without deleting prior Storage objects. Prompt 4 investigates safe cleanup. |
| P1-5 photo type/size UX | Still valid | Inputs still use `accept="image/*"` while rules allow only JPG/PNG/WebP/GIF under 5 MB. Prompt 4. |
| P2-1 mobile Card view scroll cue | Still valid | Card view has text hints but no stronger mobile swipe affordance. Prompt 5. |
| P2-2 modal accessibility/focus | Fixed locally | Prompt 7 added dialog semantics, Escape close, focus management, Tab loop, and mobile sizing. Live edit/add modal checks remain. |
| P2-3 Search add-person query preservation | Still valid | `search.js` handles query URLs/back-forward, but add-person refresh should preserve current query/results more deliberately. Prompt 3. |
| P2-4 profile back-link label | Still valid | `profile.js` has source-route labels, but current HTML starts generic and live behavior should return to context-aware labels. Prompt 5. |

### Spencer Manual-Test Checklist

Use two real Firebase accounts:

- Owner account: the account that owns the Colety birthday tree.
- Second account: first join as viewer, then have the owner promote it to editor.

Owner account tests:

1. Sign in at `/signin`; confirm the header switches to signed-in nav and Account opens.
2. Open `/account`; confirm the Colety family tree appears and the invite code is visible only to the owner.
3. Copy the invite code.
4. Reset the invite code; confirm the displayed code changes.
5. Open `/tree?familyId=colety-birthday-tree`; confirm Chart view loads or offers Card fallback.
6. Switch to Card view; search/focus a known person; open a profile; use Back and confirm it returns to the right tree/view.
7. Open `/search?familyId=colety-birthday-tree`; search `Colety`; open a profile; use Back and confirm the query is preserved.
8. In Card view, add a harmless test person; confirm the tree updates.
9. Edit that test person's profile; update name/bio/parents/spouse; confirm save persists after reload.
10. Upload a valid JPG/PNG/WebP/GIF under 5 MB; confirm it displays after reload.
11. Try a non-image or unsupported file type; confirm the app shows a friendly error and Storage blocks it if it reaches upload.

Viewer account tests:

1. Sign in as the second account.
2. Join with the current invite code from `/` using `Join with Code`.
3. Confirm the tree opens and profiles are visible.
4. Confirm `Edit Profile`, `Remove This Person`, and add-person editing controls are hidden or blocked.
5. Try opening `/tree?familyId=colety-birthday-tree` directly; confirm it works because this account is now a member.
6. Try using the old reset invite code; confirm it no longer joins.

Editor account tests:

1. Owner promotes the second account to editor from `/account`.
2. Second account reloads `/tree?familyId=colety-birthday-tree`.
3. Confirm add-person and edit-profile controls are available.
4. Add/edit a test person and upload a valid image.
5. Confirm deleting/removing a person is allowed only when expected.

Negative/privacy tests:

1. Signed-out user opens `/tree?familyId=colety-birthday-tree`; confirm private data is not shown.
2. Signed-in non-member opens `/tree?familyId=colety-birthday-tree`; confirm private data is not shown.
3. Signed-in non-member tries to join by URL/familyId only; confirm it fails without the exact invite code.
4. Confirm invite-code lookup works only with exact code entry; there should be no UI path that lists codes.
5. Confirm uploaded image URLs are visible to family members but not signed-out users.

## Prompt 2 Findings - May 27, 2026

Status: Done locally; needs one live signed-in Firebase smoke after deploy.

Code changes:

- `js/main.js`: signed-in header links now preserve tree context without blanking existing `focus`; profile pages use the current `person` as the tree return focus.
- `js/tree.js`: Card profile links now stay in sync with the current `view` and `treeQuery`; tree search restores the requested focused match when the URL includes both `treeQuery` and `focus`; the preferred view is applied before cards are rendered so profile return URLs are accurate.
- `js/profile.js`: profile Back links and relationship links now preserve tree search context with `treeQuery`; remove-person redirect also keeps the tree search context where possible.

Local verification:

- `npm run check` passed.
- `git diff --check` passed.
- Browser smoke passed on local static routes for `/tree?demo=large&view=cards&treeQuery=Rose&focus=colety_rose`, Card/Chart toggles, focused-card persistence, profile-link context, `/profile?...from=tree...`, and `/search?...query=Rose`.

Remaining live checks:

- After deploy, signed in as `smcolety@gmail.com`, search/focus a real Colety person in Card view, open their profile, use Back, and confirm the same tree, view, query, and focused person return.
- Open a relationship link from a real profile and confirm Back still returns to the original tree/search context.

## Prompt 3 Findings - May 27, 2026

Status: Done locally; add-person success needs live signed-in Firebase testing.

Code changes:

- `js/postPeople.js`: Add Person forms now use app-owned inline validation (`noValidate`) instead of browser popups, mark invalid fields with `aria-invalid`, keep the modal/form values intact on validation errors, and include source/search context in the `person-added` event.
- `js/search.js`: Search captures the current query before an add refresh, restores that query afterward, keeps the URL `query` parameter in sync, and shows a clear refresh/success/failure context message.
- `css/global.css`: Invalid add/edit fields now get a visible danger outline.

Local verification:

- `npm run check` passed.
- `git diff --check` passed.
- Browser smoke passed for Tree add-modal presence/read-only state, inline validation ownership, Search query restoration from URL, Search add-form inline validation, and Search URL query updates while typing.

Remaining live checks:

- Signed in as an owner/editor, open Card view, try submitting Add Person with missing first/last name, duplicate parents, and an invalid photo URL. Confirm the modal stays open and typed values remain.
- Add a real harmless test person from `/search?query=...`; confirm the modal closes only on success, the same search query remains, and results refresh gracefully.

## Prompt 4 Findings - May 27, 2026

Status: Done locally; live Storage upload/delete testing is still required.

Code changes:

- `html/tree_page.html` and `html/profile.html`: photo file inputs now accept only JPG/JPEG, PNG, WebP, or GIF and show clear under-5-MB copy. Profile edit copy explicitly calls out HEIC export.
- `js/helpers.js`: photo validation now rejects HEIC/HEIF, unsupported file types, and files over 5 MB before upload.
- `js/postPeople.js` and `js/profile.js`: removed the silent embedded-data-URL fallback when Storage upload fails; Storage errors now surface as explicit, user-facing upload errors.
- `js/profile.js`: replacing or removing a photo now attempts to delete the prior Storage object only when the old URL safely maps to `families/{familyId}/people/{personId}/...`. External URLs and data URLs are left alone.

Local verification:

- `npm run check` passed.
- `git diff --check` passed.
- Browser smoke passed for Tree add-photo accept/copy and Profile edit-photo accept/copy.

Remaining live checks:

- Signed in as owner/editor, upload a valid JPG/PNG/WebP/GIF under 5 MB and confirm it displays after reload.
- Try HEIC, an oversized image, and an unsupported file type; confirm friendly errors.
- Replace a Firebase-hosted profile image and confirm the old Storage object is deleted or that the delete warning is visible in console.
- Remove a Firebase-hosted profile image and confirm the profile field clears and old Storage object is deleted.
- Confirm external photo URLs are not deleted by cleanup logic.

## Prompt 5 Findings - May 27, 2026

Status: Done locally; mobile and signed-in live smoke still recommended after deploy.

Code changes:

- `html/tree_page.html` and `css/family_tree.css`: added a mobile-only Card view swipe cue. It is opt-in from `tree.js`, so it appears only after a normal Card layout has rendered and stays hidden for Chart view, overview mode, empty states, and private-tree messages.
- `html/profile.html` and `js/profile.js`: profile Back link now starts with `Back to Family Tree` in HTML and remains context-aware at runtime (`Back to Family Tree` or `Back to Search`).
- `js/tree.js`: large-tree overview heading now says `Family map` instead of birthday-demo-specific language.
- `js/starterTree.js`: starter profile copy no longer says `birthday-demo`.

Local verification:

- `npm run check` passed.
- `git diff --check` passed.
- Desktop/mobile browser smoke passed for scroll cue visibility rules, neutral large-tree heading, no body-level horizontal overflow on mobile, and context-aware profile Back links from Tree and Search.

Remaining live checks:

- On a phone-sized viewport after deploy, open a real non-overview Card view and confirm the swipe cue appears.
- Open a profile from Search and Tree while signed in and confirm the Back label and destination are correct.

## Prompt 6 Findings - May 27, 2026

Status: Done locally; do not treat as fully release-ready until the live Firebase checks below are completed.

Local checks:

- `npm run check` passed.
- `git diff --check` passed with line-ending warnings only.
- Local static browser smoke passed for `/`, `/signin`, `/account`, `/tree`, `/tree?demo=large`, `/tree?demo=large&view=cards`, `/tree-spike?demo=large`, `/search`, and `/profile?person=colety_rose&familyId=colety-birthday-tree&from=search&query=Rose`.

Flow checks:

- Chart fallback control exists on the real tree route.
- Card add flow shell exists and the Add Person form uses app-owned validation (`noValidate`) instead of browser-native popups.
- Search profile return shows `Back to Search` and preserves `familyId` plus `query`.
- Mobile viewport smoke passed at phone width with no body-level horizontal overflow.

Notes:

- The initial `/search` smoke had a false negative because the test looked for the old `#searchInput` selector. The app now correctly uses `#search-input`.
- Browser logs showed repeated `MutationObserver.observe` errors with no repo source match; local code search found no `MutationObserver` usage, so this appears browser/extension-side. Recheck after deploy if it appears in the real site console.

Remaining live Firebase tests:

1. Sign in with `smcolety@gmail.com` and confirm Account loads the Colety tree, current invite code, copy/reset actions, and member tools.
2. Open `/tree?familyId=colety-birthday-tree` and confirm Chart view loads or falls back cleanly to Card view.
3. Search/focus a real Colety person, open a profile, and confirm Back returns to the same family/view/query/focus.
4. Test owner/editor/viewer permissions against Firestore rules: add, edit, remove, invite-code join, and private tree blocking for signed-out/non-member users.
5. Test Firebase Storage upload/replace/remove for JPG/PNG/WebP/GIF under 5 MB, plus HEIC/oversized/unsupported-file failures.
6. After deploy, repeat the route smoke on Firebase Hosting and then on `coletys.com` once DNS/SSL is ready.
