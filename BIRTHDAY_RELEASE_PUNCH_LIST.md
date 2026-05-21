# Birthday Release Punch List

This is the working checklist for the birthday release. `BIRTHDAY_RELEASE_ROADMAP.md` explains the phases; this file tracks the concrete scope, demo path, safe-to-show list, deferrals, and current release risks.

## Phase 0 Decisions

### Release Target

Ship a birthday-ready version of the existing Family Tree app. The release should feel stable, personal, and usable for a family demo. It does not need to become a complete public product.

### Primary User

Dad, plus close family members who may browse the tree after the birthday reveal.

### Product Posture

This release should feel like:

- A working family gift.
- A clean enough web app to browse without explanation.
- A private family tree that can grow later.

It should not try to feel like:

- A finished SaaS platform.
- A genealogy industry tool.
- A complete data import/export system.
- A perfect model of every complex relationship.

## Birthday Demo Path

This is the main path we should optimize and test first.

1. Open the deployed app home page.
2. Sign in with a prepared account or create a new account if that flow is verified.
3. Land on the dashboard.
4. Open the prepared family tree.
5. Browse the tree view.
6. Click a few person cards.
7. View profile pages.
8. Use search to find a known person.
9. Optionally add or edit one person if that flow is stable.
10. Return to the tree and confirm the update appears.

## Backup Demo Path

Use this if auth or private tree setup is not fully ready on demo day.

1. Open the deployed app home page.
2. Open the example tree.
3. Browse the tree view.
4. Click person cards.
5. View profiles.
6. Use search.

The backup path is less impressive, but it keeps the birthday moment from depending on a last-minute Firebase configuration issue.

## Safe To Show

These features should be safe to show once Phase 1 and Phase 3 are complete:

- Home page.
- Sign in status in the header.
- Dashboard tree list.
- Opening a family tree from the dashboard.
- Tree browsing.
- Person profile pages.
- Search by name.
- Access code display and copy behavior.
- Add person, only after live QA confirms Firestore writes.
- Edit person, only after live QA confirms Firestore writes and profile reload.

## Avoid Showing Unless Verified

These are useful features, but they should not be part of the birthday demo unless we explicitly verify them:

- Google sign-in.
- Password reset.
- Profile image upload.
- Removing people.
- Archiving trees.
- Removing members.
- Resetting access codes.
- Complex relationship cases with multiple spouses, divorces, step-parents, or adoption.
- Very large family trees.

## Hard Deferrals

These are out of scope for the birthday release:

- GEDCOM import/export.
- CSV import/export.
- PDF/image export.
- Billing or subscriptions.
- Public marketing site redesign.
- Custom domain purchase.
- Full account settings page.
- Account deletion flow.
- Audit history.
- Analytics.
- Error monitoring.
- Full data migration from legacy relationship fields.
- Full redesign in React, Vue, Svelte, or another framework.

## Current Blockers

### B1: Signed-out Create/Join UX May Conflict With Rules

The UI currently allows create/join actions from the home page even when the user may be signed out. The committed Firestore rules require signed-in users for family creation and membership writes. Phase 1 should make this flow explicit: sign in first, then create or join.

Status: Fixed locally in Phase 1. The home create/join forms now require sign-in, private-tree add-person forms are disabled when signed out or viewing the example tree, and example profiles hide edit/remove controls. Needs live Firebase QA after deploy.

### B2: Firebase Console State Needs Human Verification

The codebase includes Firebase rules and config, but the deployed state must be checked in Firebase Console.

Needed checks:

- Firestore rules deployed.
- Storage rules deployed.
- Email/password auth enabled.
- Google auth enabled only if we plan to show it.
- Firebase Hosting/custom production domain authorized.
- Firebase API key restrictions reviewed in Google Cloud.

Status: Needs Spencer or account owner.

## Important Issues

### I1: No Automated Check Before Deploy

There is no `package.json`, CI workflow, or repeatable check command. Phase 5 should add the lightest useful version.

Status: Fixed locally in Phase 5. Added `package.json`, `npm run check`, a dependency-free check script, and a GitHub Actions workflow.

### I2: User Data Appears In `innerHTML` In Some Places

Some rendering paths insert user-controlled or Firestore-controlled content with `innerHTML`. Phase 2 should replace the risky paths with DOM creation and `textContent`.

Status: Fixed locally in Phase 2. Search cards, tree cards, dashboard tree cards, relationship selects, and status messages now avoid dynamic `innerHTML`. The unsafe rendering scan currently finds no `innerHTML`, `insertAdjacentHTML`, `outerHTML`, `eval`, or `new Function` usage in `js/`, `api/`, or `html/`.

### I3: Browser Alerts And Confirms Still Appear In Main Flows

Several flows still use `alert()` and `confirm()`. Phase 3 should replace the most visible ones with page-level messages or simple modals.

Status: Partially fixed locally in Phase 3. Home create/join, profile edit/save failures, image-upload failures, sign-out failure, and copy-code fallback now use inline status or non-blocking feedback. Remaining `confirm()` calls are destructive/admin actions: reset access code, archive tree, leave tree, remove member, and delete person.

### I4: Fun-Fact API Needs Real Date Validation

The API checks month and day ranges but does not reject impossible dates like February 30.

Status: Fixed locally in Phase 2. The API now requires whole-number month/day values and rejects impossible dates like February 30 while allowing February 29.

## Nice-To-Haves

- More polished empty tree state.
- Friendlier dashboard no-tree state.
- Better mobile tree scrolling.
- Cleaner copy on the home page.
- A short birthday handoff note with the best URL and demo path.
- A tiny sample data checklist for the prepared family tree.

## Phase 1 Progress

### Completed Locally

- Home page copy now says users should sign in before creating or joining a tree.
- Home create/join forms are disabled while signed out.
- Create tree now always writes `ownerId`, `memberIds`, and owner role data expected by the Firestore rules.
- Create tree now checks for an unused access code before writing.
- Join tree now requires a signed-in user before reading/writing family membership.
- Add-person forms are disabled for the read-only example tree.
- Add-person forms are disabled for signed-out users on private trees.
- Profile edit/remove controls are hidden for the example tree and for signed-out users.
- JavaScript syntax check passes for all files in `js/` and `api/`.
- Deployed routes previously returned `200` on Vercel for `/`, `/home`, `/signin`, `/dashboard`, `/tree`, `/search`, `/profile`, and `/api/funfact`. Firebase Hosting is now the target for the birthday release.

### Still Needs Live QA

- Sign in with email/password.
- Create a tree as a signed-in user.
- Confirm the new tree appears on dashboard.
- Confirm access code document is created and displayed.
- Join the tree from a second signed-in account.
- Add a person to a private tree.
- Edit that person from the profile page.
- Search for that person.
- Remove a test person only if delete will be part of the demo.

## Phase 2 Progress

### Completed Locally

- Replaced dynamic `innerHTML` rendering in search results with explicit DOM nodes and `textContent`.
- Replaced dynamic `innerHTML` rendering in tree person cards with explicit DOM nodes and `textContent`.
- Replaced dashboard tree-card template rendering with explicit DOM construction.
- Replaced relationship select placeholder templates with explicit option nodes.
- Replaced tree/search status messages with `replaceChildren()` and `textContent`.
- Tightened `/api/funfact` input validation so invalid calendar dates return `400`.
- Confirmed February 30 returns `400` locally.
- Confirmed February 29 remains valid locally.
- Reviewed Firebase client config: no server secrets are present; Firebase client config is public-by-design, but it depends on deployed rules and Google Cloud/Firebase restrictions.
- Reviewed Firestore rules: private family data is member-scoped; example data is public read-only; joins are signed-in only; owner-only family deletes are enforced.
- Reviewed Storage rules: profile image reads/writes are family-member-scoped, signed-in, image-only, and under 5 MB.
- JavaScript syntax check passes for all files in `js/` and `api/`.
- `git diff --check` passes.

### Remaining Safety/Privacy Notes

- `/joinCodes/{joinCode}` allows reads by any signed-in user who knows a code. That is acceptable for the birthday release if access codes are treated as invite secrets, but stronger invite expiration or one-time join links should be deferred.
- `/users/{userId}` allows reads by any signed-in user. This supports member display, but a future hardening pass could restrict profile reads to shared family members.
- Firestore and Storage rules must be confirmed as deployed in Firebase Console.
- Firebase Auth authorized domains and API key restrictions must be confirmed outside the repo.

## Phase 3 Progress

### Completed Locally

- Replaced home create/join `alert()` flows with inline form status messages.
- Added busy/working feedback for creating and joining trees.
- Replaced profile edit/save/delete failure alerts with inline profile status messages.
- Replaced image-upload failure alert with inline profile status.
- Replaced sign-out failure alert with header status text.
- Replaced access-code copy fallback alert with non-blocking title feedback.
- Added a profile status region for save/error messages.
- Improved mobile navigation density.
- Improved mobile dashboard card/action layout.
- Improved mobile tree scroll/card spacing.
- Improved mobile profile spacing, image sizing, and stacked action buttons.
- Added clearer empty/error tree message styling.
- JavaScript syntax check passes for all files in `js/` and `api/`.
- `git diff --check` passes.

### Remaining UX Notes

- Destructive/admin actions still use browser `confirm()` dialogs. This is acceptable for the birthday release if those actions are not part of the demo.
- Home page still has page-specific inline CSS. This is okay for the birthday release but could be moved into `global.css` later.
- Mobile layout needs a real phone/browser check after deploy.

## Phase 4 Progress

### Completed Locally

- Tree profile links now include `from=tree`, so profiles know the user came from the tree.
- Search profile links now include `from=search`, so profiles can return to search.
- The profile back button now preserves the current `familyId` and switches between "Back to Family Tree" and "Back to Search".
- Tree cards now show a small profile photo when available.
- Tree cards show initials when no photo is available.
- Generation headings are visible again as compact labels.
- Tree card spacing, radius, and mobile media sizing were tightened.
- Profile edit now blocks selecting one of a person's descendants as their parent.
- JavaScript syntax check passes for all files in `js/` and `api/`.
- `git diff --check` passes.

### Remaining Tree/Data QA

- Test the prepared birthday tree with at least three generations.
- Confirm spouse pairs appear side by side for the real data.
- Confirm parent/child connector lines look acceptable on desktop.
- Confirm tree horizontal scrolling feels usable on phone.
- Confirm profile photos, if used, crop acceptably in the small tree cards.
- Confirm the back button returns from profile to tree/search with the right family context.
- Confirm the descendant-as-parent guard does not block any legitimate edits in the real data.

## Phase 5 Progress

### Completed Locally

- Added `package.json` with lightweight check scripts.
- Added `scripts/check.mjs`.
- `npm run check` now verifies JavaScript syntax in `js/` and `api/`.
- `npm run check` now parses JSON config files.
- `npm run check` now fails if unsafe rendering/API patterns like `innerHTML`, `insertAdjacentHTML`, `eval`, or `new Function` return.
- Added `.github/workflows/checks.yml` to run `npm run check` on push to `main` and pull requests.
- Added `DEPLOYMENT_CHECKLIST.md`.
- Added branch protection recommendations to the deployment checklist.
- `npm run check` passes locally.
- `git diff --check` passes.

### Remaining Release Engineering Tasks

- Push the workflow to GitHub and confirm the `Checks` workflow runs.
- In GitHub settings, protect `main` and require the static checks before merge.
- Confirm Firebase Hosting deploys the latest commit.
- Run the deployment checklist before the birthday release.

## Pre-Spencer Integration Pass

### Completed Locally

- Reviewed the Phase 1-5 changed-file set and repo status.
- Re-ran `npm run check`; it passes.
- Re-ran `git diff --check`; it passes.
- Started a local static server and browser-smoked `/`, `/signin`, `/dashboard`, `/tree`, `/search`, and `/profile`.
- Confirmed those local routes render expected headings/no-auth states without browser console errors.
- Updated `README.md` with the local check command and birthday release docs.
- Confirmed only intentional tooling files remain under `.github/` and `scripts/`.
- Hardened the backup demo link so "View Example Tree" always opens the example tree instead of reusing a previously selected private family tree.

### Ready For Spencer Phase

- Commit and push the current changes.
- Confirm GitHub Actions runs after push.
- Confirm Firebase Hosting deploys the pushed commit.
- Begin the owner/account/data checks in `SPENCER_PHASE_CHECKLIST.md`.

## Deep Pre-Push Hardening Pass

### Completed Locally

- Re-reviewed the changed-file set before commit/push.
- Fixed the backup demo link so it explicitly opens `/tree?familyId=` and clears private tree context.
- Re-ran `npm run check`; it passes.
- Re-ran `git diff --check`; it passes.
- Browser-smoked `/`, `/signin`, `/dashboard`, `/tree`, `/search`, `/profile`, and the example-tree backup path locally.
- Confirmed the local browser smoke showed no console errors.
- Confirmed no temporary smoke-test files remain in the worktree.

### Still Needs Owner/Live QA

- Commit and push.
- Confirm the GitHub Actions `Checks` workflow passes after push.
- Confirm Firebase Hosting deploys the pushed commit.
- Run Firebase Console checks and production/live-data QA from `SPENCER_PHASE_CHECKLIST.md`.

## Phase Execution Order

Use this order unless a later prompt says otherwise:

1. Phase 1: Core flow stability.
2. Phase 2: Safety and privacy.
3. Phase 3: UX polish.
4. Phase 4: Tree experience.
5. Phase 5: Release engineering.
6. Phase 6: Spencer Phase.
7. Phase 7: Birthday content and final QA.

If we need visible payoff sooner, run Phase 3 after the most urgent Phase 1 fixes, then return to Phase 2.

## Human Touch Points

Spencer should only need to help with:

- Firebase Console checks.
- Firebase Hosting deployment and custom-domain confirmation if not visible to Codex.
- Real family names/relationships for the birthday tree.
- Quick desktop/mobile demo run.
- Final vibe check on copy and what Dad will actually see.

Track Spencer-owned tasks in `SPENCER_PHASE_CHECKLIST.md`.

## Phase 0 Definition Of Done

Phase 0 is done when:

- The birthday demo path is written.
- The backup demo path is written.
- Safe-to-show features are listed.
- Avoid-showing features are listed.
- Hard deferrals are listed.
- Current blockers and important risks are captured.
- The roadmap points to this punch list as the working tracker.
