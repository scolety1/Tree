# Tree Final Owner-Flow Queue - June 3, 2026

Goal: final prioritized fix queue from live owner-flow QA on the test account before the birthday demo.

Live test scope:

- Account: `/account`
- Owner tree: `/tree?familyId=bD0RHI0euhabv310nEZc`
- Owner profile: `/profile?person=yDLUA1AvSfNrSnUlOGXx&familyId=bD0RHI0euhabv310nEZc`
- Hidden directory: `/search?familyId=bD0RHI0euhabv310nEZc`
- Mobile smoke viewport: `390x844`

Known live test account:

- Email: `codex.tree.test.1780513994154@example.com`
- Tree: `bD0RHI0euhabv310nEZc`
- Disposable person: `yDLUA1AvSfNrSnUlOGXx`

## Current Owner-Flow Status

Ready enough:

- Sign-in works with the live test account.
- Account loads the private test tree, owner role, member count, people count, and invite code.
- Owner tree loads, chart view loads, card fallback loads, Add Person is owner-visible, and tree tools render.
- Profile page loads owner-readable person details and opens the edit modal.
- Hidden People Directory loads, filters, sorts, opens profiles, preserves query/sort on return, and can add a person in normal Chromium.
- Desktop and mobile checked pages do not have page-level horizontal overflow.

Not ready enough:

- Firebase Storage photo upload is blocked for the owner account.
- Find Person/focus does not surface a useful selected-person details panel.
- Mobile floating Add Person overlaps content and modals.
- Public/demo data and profile source handling still have confusing older flows.

## Must-Fix Before Birthday Demo

### 1. Fix Firebase Storage profile-photo uploads

Evidence:

- Valid owner uploads for PNG, JPG, and WebP under 5 MB all failed with `storage/unauthorized`.
- The test account is confirmed as owner/member/editor-equivalent for `bD0RHI0euhabv310nEZc`.
- Profile display works when an HTTPS image URL is already saved, so the blocker is Storage authorization, not rendering.

Fix:

- Compare Firebase Console Storage rules against local `storage.rules`.
- Deploy Storage rules if they are not live: `firebase deploy --only storage --project tree-72e80`.
- Confirm the live bucket is `tree-72e80.firebasestorage.app`.
- Retest upload, reload, replace, reload, remove, reload, and invalid file selection.

Acceptance:

- Owner can upload JPG/PNG/WebP/GIF under 5 MB from the profile edit modal.
- Uploaded image displays after reload.
- Replacing a photo displays the new photo and does not leave broken image UI.
- Removing a photo returns the profile to no-photo state.
- Invalid files show a friendly error.

### 2. Hide or reposition floating Add Person on mobile and while modals are open

Evidence:

- On mobile Tree, floating `Add Person` overlaps the `Full Screen` tool area.
- On mobile People Directory, floating `Add Person` overlaps result cards.
- On mobile Add Person modal, the floating button remains visible above the modal and covers the lower-right area.

Fix:

- Hide the floating Add Person button whenever `#addModal` is open.
- On mobile, move Add Person into the page tools area or pin it below content with safe spacing.
- If it remains floating, reduce collision by adding bottom padding and avoiding overlap with cards/tools.

Acceptance:

- No floating button appears above an open modal.
- Tree tools and Directory cards are not covered at 390px width.
- Add Person remains easy to find on desktop and mobile.

### 3. Make Find Person focus show a selected-person details panel or clear action

Evidence:

- Find Person updates status and URL: `1 of 1: Codex Ui tester`.
- After focus, no selected-person detail panel appeared in the tested DOM/viewport.
- This hurts large-tree navigation because users need a next action after finding someone.

Fix:

- When tree focus finds a person, update the parent selected-person panel with that person's summary.
- Include primary actions: `Open profile`, `Edit profile` for owner, `Show parents`, `Show children`, and `Focus in chart`.
- Make the panel visible on mobile directly below the Family Map controls.

Acceptance:

- Searching `codex` shows `Codex Ui tester` in a visible selected-person card.
- The card includes `Open profile`.
- On mobile, the card is visible without needing to hunt inside the chart.
- Profile return with `focus=...` restores the selected-person card.

### 4. Fix public example profile/source confusion after private-tree browsing

Evidence:

- Earlier audit found public example profile links can be interpreted as private-tree profiles after visiting private `familyId` URLs.
- Likely cause: profile fallback to stored `currentFamilyId` when profile URL has no explicit `familyId`.

Fix:

- Add explicit demo/example source params to public example profile links, or stop using stored private `familyId` fallback for profiles without `familyId`.
- Keep stored-family fallback only for intentional private-tree routes.

Acceptance:

- Visit private tree, then visit `/tree`, then open an example person.
- The profile is public/read-only example content, not a private sign-in/permission state.

### 5. Replace or retire the old Tim public example tree

Evidence:

- Public `/tree` can still expose older Tim placeholder data.
- The newer made-up demo family looks closer to the intended product.

Fix:

- Make the default public example tree use polished made-up demo data.
- Keep Colety data only in private/starter flows.
- Make demo labels clear: `Example Tree` or `Sample Family Tree`.

Acceptance:

- Signed-out visitor sees a polished non-Colety example.
- No old placeholder names or copy appear in the public first impression.

### 6. Make large-demo People Directory match large-demo tree data if Directory remains accessible

Evidence:

- `/tree?demo=large` uses the larger Johnson/Miller/Brooks style demo.
- `/search?demo=large` previously used the old small example data.

Fix:

- Add large-demo mode to `search.js`.
- Load `generateLargeDemoTree()` when `demo=large`.
- Update copy to `Searching the large example tree`.

Acceptance:

- `/search?demo=large` shows the same people as `/tree?demo=large`.

## Nice-To-Have After Birthday Demo

### 7. Increase mobile tap target height on Account action buttons

Evidence:

- Mobile smoke measured Account buttons around 30px tall: `Copy Code`, `Reset Code`, and invite-copy controls.

Fix:

- Raise key account buttons to at least 40-44px height.
- Keep spacing tight enough that Account stays scannable.

### 8. Replace native confirms with app dialogs for sensitive owner actions

Evidence:

- Reset Code uses native confirm.
- Native confirms work, but feel less polished and are awkward in automated QA.

Fix:

- Add small in-app confirmation dialog for Reset Code, Archive Tree, Remove Person, Leave Tree.

### 9. Improve copy and naming around hidden People Directory

Evidence:

- Search/Directory is functional, but hidden from signed-in nav.
- It can feel like a second product surface.

Fix:

- Decide whether it is a hidden support route, a linked tree tool, or a retired page.
- Rename to `Family directory` or `Browse family members` if it stays.

### 10. Add owner "demo readiness" checklist on Account

Useful checks:

- At least one photo added.
- Key birthdays filled.
- Invite code copied.
- Missing parents/partners/children reviewed.
- Public demo links checked.
- Domain transfer/DNS done.

### 11. Add recently viewed people on Tree

Why:

- Helpful for large trees where users bounce between relatives.

Acceptance:

- Recently opened profiles/focused people appear as quick links near tree tools.

### 12. Add open-relative quick actions

Actions:

- Parents
- Spouse/partner
- Children
- Siblings

Acceptance:

- Actions focus relatives in the chart without leaving the tree.

### 13. Clean up report-only CSP console warning

Evidence:

- Console repeatedly logs: `upgrade-insecure-requests` is ignored in report-only CSP.

Fix:

- Remove `upgrade-insecure-requests` from the report-only policy or move to an enforced CSP when ready.

### 14. Improve acronym title casing

Evidence:

- `UI` renders as `Ui`.

Fix:

- Preserve all-caps acronyms or avoid acronym-heavy display names in seed/test data.

### 15. Add print/export simple view

Why:

- Useful after the birthday demo if Dad wants a copy or shareable view.

## Suggested Prompt Order

Prompt 1:

`Use TREE_2026-06-03_FINAL_OWNER_FLOW_QUEUE.md. Do must-fix item 1 only: fix Firebase Storage profile-photo uploads. Compare local storage.rules with live behavior, deploy storage rules only if needed/asked, retest owner upload/reload/replace/remove/invalid file on the live test tree, and document results. Do not commit/push/deploy unless explicitly asked.`

Prompt 2:

`Use TREE_2026-06-03_FINAL_OWNER_FLOW_QUEUE.md. Do must-fix item 2 only: fix mobile floating Add Person overlap and hide it while modals are open. Keep changes scoped, run local checks, smoke mobile Tree and Directory, and do not commit/push/deploy.`

Prompt 3:

`Use TREE_2026-06-03_FINAL_OWNER_FLOW_QUEUE.md. Do must-fix item 3 only: make Find Person focus show a visible selected-person detail card with Open profile/Edit profile actions on desktop and mobile. Keep changes scoped, run local checks, smoke the live test flow locally, and do not commit/push/deploy.`

Prompt 4:

`Use TREE_2026-06-03_FINAL_OWNER_FLOW_QUEUE.md. Do must-fix items 4-6: clean public example profile/source handling, replace old public example data with polished made-up demo data, and align /search?demo=large with the large demo tree. Keep changes scoped, run checks and browser smoke, and do not commit/push/deploy.`

Prompt 5:

`Use TREE_2026-06-03_FINAL_OWNER_FLOW_QUEUE.md. Do a final pre-birthday owner-flow verification after the must-fix items: Account, Tree, Add Person, profile edit/photo, mobile Tree, hidden Directory, and public signed-out demo. Update the queue with remaining risks and do not commit/push/deploy.`
