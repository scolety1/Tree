# Tree Work Shift Upgrades Queue - June 4, 2026

Goal: use Spencer's work shift for scoped polish that makes the birthday demo feel finished without risking a broad rewrite. Keep changes small, client-side where possible, and easy to audit later.

Guardrails:

- Do not commit, push, or deploy unless Spencer explicitly asks.
- Do not require the `smcolety@gmail.com` live owner session unless the prompt says it is a live-only check.
- Keep Firebase rules and private-data behavior conservative.
- Run `npm.cmd run check`, `git diff --check`, and browser smoke for affected public routes after each implementation prompt.
- Update this queue and `DEPLOYMENT_CHECKLIST.md` when release readiness changes.

Recommended order:

1. Finish local release hygiene and visible bugs.
2. Improve the most visible demo surfaces.
3. Add only small delight features that help people understand the family tree.
4. Save external audit packaging until Spencer returns.

## Phase 1 - Release Hygiene And Bug Sweep

Purpose: make sure the current large set of local changes is coherent before adding more polish.

### Prompt 1 - Changed File Review And Patch Sweep

Review all currently changed files as one release candidate. Look for obvious broken links, stale copy, dead controls, mismatched route names, debug leftovers, empty image states, weird signed-out/signed-in copy, and anything that would embarrass the birthday demo. Patch only low-risk issues. Run checks and browser-smoke the public routes. Do not commit, push, or deploy.

Acceptance:

- No obvious stale names, route mismatches, broken image placeholders, or dead public controls remain.
- Local checks pass.
- Any remaining risk is documented as live-only or post-demo.

Status: Completed.

Result:

- Reviewed the current changed-file release candidate for stale public copy, route mismatches, dead public controls, broken placeholders, and debug leftovers.
- Confirmed the Firebase-hosted app files do not call the deferred `/api/funfact` endpoint.
- Static route/asset check passed with 78 references checked.
- Browser smoke passed for Home, Sign In, Account, Large Demo Tree Chart, Large Demo Tree Card fallback, Example Tree, hidden Family Directory, valid large-demo Profile, and missing-profile state.
- URL-state smoke passed for Tree `treeQuery=graham` and hidden Family Directory `query=graham`.
- No new app-code patch was needed during this prompt beyond the already-local profile empty-image cleanup.
- Updated `DEPLOYMENT_CHECKLIST.md` with the Work Shift Prompt 1 release sweep.
- Remaining risk: owner/editor/viewer live Firebase permissions and Storage photo upload/replace/remove still require signed-in live testing.

### Prompt 2 - Confirm Commit Scope And External Audit Baseline

Prepare the repo for a later external audit without creating the zip yet. Summarize the current commit scope, list files that should be included in an audit package, identify generated files that should stay out of git, and update the deployment checklist with the latest local readiness. Do not commit, push, deploy, or package yet.

Acceptance:

- Commit scope is clear.
- Audit package contents are clear.
- Generated artifacts stay uncommitted.

Status: Completed.

Result:

- Added a `June 4 Work Shift Prompt 2 Audit Baseline` section to `DEPLOYMENT_CHECKLIST.md`.
- Documented the current proposed commit scope: public route polish, tree tools/readability, profile/photo polish, account readiness, and release/audit docs.
- Documented future external-audit package contents: app shell/routes, CSS/JS/assets, Firebase rules/config, package metadata, and current release docs/queues.
- Documented generated files that should stay out of git/audit commits: audit zips/reports/packages, Firebase debug/local artifacts, dependencies, temp files, and secrets.
- Added `.gitignore` entries for `node_modules/`, `.tmp_*`, and `firebase-debug.log` so local/generated files do not pollute release commits.
- Checks passed: `npm.cmd run check`, `git diff --check` with line-ending warnings only, and route-aware Firebase rewrite/asset check with 78 references checked.
- No zip/package was created, and no commit, push, or deploy was performed.

## Phase 2 - Tree Experience Polish

Purpose: make the family tree page easier to understand at first glance.

### Prompt 3 - Tree First-Impression Pass

Open the current local tree page in public demo mode and make the first viewport clearer. Focus on page title, toolbar labels, sidebar wording, legend/key clarity, selected-person panel entry point, and chart/card fallback copy. Keep the chart large and avoid clutter. Run desktop and mobile smoke.

Acceptance:

- A new visitor can tell what to do without reading a manual.
- Chart still gets most of the visual space.
- Mobile controls stay tappable.

Status: Completed.

Result:

- Added a dynamic tree subtitle so public demo, example, missing, archived, and private tree states explain what the visitor can do next.
- Reworked first-glance tree copy: "Start here" guidance, clearer tour wording, clearer C1/C2 key language, and a friendlier chart fallback button.
- Kept the chart as the primary visual surface on mobile by placing the canvas before the deeper tool stack at narrow widths.
- Tightened mobile title/header wrapping and print-control button wrapping so the first viewport does not clip or overflow.
- Checks passed: desktop public-demo smoke, card fallback smoke, real-tree shell smoke, phone-width CDP smoke with no horizontal overflow, `npm.cmd run check`, and `git diff --check` with Windows line-ending warnings only.
- Remaining live gate: signed-in private-tree copy should still be spot-checked after deploy with the owner account.

### Prompt 4 - Selected Person Action Polish

Improve the selected-person panel actions. Make the primary actions obvious: focus in chart, open profile/details, edit when allowed, and clear selection. If helpful, add a compact "close selection" control. Keep read-only demo and private owner/editor/viewer states distinct. Run local smoke.

Acceptance:

- Public demo has useful read-only actions.
- Owner/editor paths still expose edit affordances.
- Viewer/signed-out states do not imply editing is possible.

Status: Completed.

Result:

- Added a compact `Clear` control to the selected-person panel and wired it to hide the panel, clear the focused-card outline, and remove stale `focus` URL state.
- Made selected-person actions clearer: demo users see `View demo details`, private viewers see `Open profile`, and owner/editor-capable states keep `Edit profile`.
- Enabled read-only demo profile links from the selected-person panel using the existing `?demo=large` profile support.
- Updated selected-person copy so demo, owner/editor, and viewer states do not imply the wrong permissions.
- Improved mobile tap targets for selected-person buttons and confirmed no horizontal overflow at 390px.
- Checks passed: `npm.cmd run check`, `git diff --check` with Windows line-ending warnings only, desktop selected-person browser smoke, read-only demo profile smoke, and mobile selected-person tap-target smoke.
- Remaining live gate: verify owner/editor selected-person `Edit profile` appears after signed-in Firebase access is confirmed, and verify viewer accounts do not see edit controls.

### Prompt 5 - Tree Tools Drawer Cleanup

Review the tree sidebar/drawers: How to read this, Relationship Finder, Birthdays, Missing info, Family stats, Display options, and fallback tools. Rename, reorder, or collapse tools so the sidebar feels calm. Do not remove useful tools, but reduce cognitive overload. Run browser smoke.

Acceptance:

- Sidebar feels organized.
- Important tools are discoverable.
- Fun tools do not distract from finding/opening relatives.

Status: Completed.

Result:

- Reordered the sidebar into calmer groups: `Map basics`, `Explore`, and `Review`.
- Renamed drawers to clearer labels: `Map key`, `View settings`, `Relationship finder`, `Profiles to finish`, `Family snapshot`, and `Data checks`.
- Added short drawer descriptions so users can decide what to open without trial and error.
- Restyled drawer summaries as compact controls with clear plus/minus affordances and contained open-state panels.
- Moved map key and view settings closer to the primary map controls; moved review/audit tools lower so they do not distract from finding/opening relatives.
- Checks passed: `npm.cmd run check`, `git diff --check` with Windows line-ending warnings only, and browser smoke for large-demo Chart, Card fallback, and 390px mobile with no horizontal overflow.
- Remaining live gate: spot-check the sidebar with the real signed-in Colety tree after deploy, since live data affects tool panel content lengths.

## Phase 3 - Profile And Memory Polish

Purpose: make individual profile pages feel worth opening.

### Prompt 6 - Profile Page Story Pass

Improve profile page copy and layout around photo placeholder, bio, birthday note, parents, spouse/partner, children, and return buttons. Keep the edit modal stable. Add or refine local-only birthday/memory fallback copy if it makes profiles feel warmer. Run valid profile and missing-profile smoke.

Acceptance:

- Profiles feel intentional even without photos.
- Missing profile/private profile states do not look half-loaded.
- Return paths still preserve tree/search context.

Status: Completed.

Result:

- Reworked profile details into clearer fact rows for birthday, parents, spouse/partner, children, bio, and birthday note.
- Added a warm profile story lead that adapts for demo profiles, private profiles, missing profiles, and real profiles with or without relationship/photo/story data.
- Kept profiles intentional without photos by showing a styled initials/photo placeholder instead of collapsing the photo area.
- Improved missing-person, wrong-family, and signed-out private profile states so they read as complete states instead of half-loaded pages.
- Preserved tree and People Directory return context with clearer back-link titles and aria labels.
- Kept the edit modal stable while adding clearer modal intro/help wiring and edit-button dialog attributes.
- Checks passed: `npm.cmd run check`, `git diff --check` with Windows line-ending warnings only, valid demo profile smoke, search-return profile smoke, missing-profile smoke, signed-out private-profile smoke, and 390px mobile profile smoke.
- Remaining live gate: signed-in owner/editor profile edit, live Storage photo display/upload, and real Colety profile return paths still need Firebase/live testing.

### Prompt 7 - Photo UX Preflight Polish

Review add/edit photo UX without requiring live Storage. Make file type/size copy consistent, make photo URL/upload/remove options easy to understand, and ensure validation errors point to the field. Do not alter Storage rules unless a clear mismatch is found. Run local form smoke where possible.

Acceptance:

- Photo inputs explain JPG/PNG/WebP/GIF under 5 MB.
- HEIC/oversized/unsupported file expectations are clear.
- Live Storage testing remains listed as required.

Status: Pending.

## Phase 4 - Account And Invite Polish

Purpose: make the account page feel like the control center without exposing confusing admin clutter.

### Prompt 8 - Account Page Demo Readiness Polish

Review `/account` signed-out and simulated/shell states. Improve invite-code card copy, role/member section labels, birthday checklist hierarchy, and empty/loading/error states. Keep owner-only controls visually distinct. Run public account smoke.

Acceptance:

- Signed-out account page explains why sign-in is needed.
- Owner controls read as private/important.
- Checklist is useful but not overwhelming.

Status: Pending.

### Prompt 9 - Invite Sharing Helper

Add or polish a tiny invite helper that can generate copyable invite wording for relatives using the current access code, without sending anything automatically. Keep it owner-only where code is available and client-side. Run checks.

Acceptance:

- Invite copy is friendly and clear.
- No email/text is sent automatically.
- No invite code appears in public demo or signed-out states.

Status: Pending.

## Phase 5 - Mobile And Print Polish

Purpose: keep the demo usable on a phone and printable/screenshot-friendly for family.

### Prompt 10 - Mobile Regression Pass

Run a mobile-width pass for Home, Tree chart, Tree card fallback, hidden Family Directory, Sign In, Account, and Profile. Patch cramped controls, overflow, awkward modals, bad wrapping, and unreachable buttons. Keep changes scoped. Run checks and document what still needs live mobile testing.

Acceptance:

- No page-level horizontal overflow on checked routes.
- Tap targets and modals are usable.
- Any live-only owner/editor gaps are documented.

Status: Pending.

### Prompt 11 - Presentation And Print Polish

Review Presentation View and Print/PDF behavior for the tree page. Make the print/presentation copy clear, hide controls that should not print, and ensure the tree/profile surfaces look intentional when screenshot or printed. Do not add heavy dependencies. Run local smoke.

Acceptance:

- Print/presentation mode does not show awkward controls.
- Birthday-demo screenshot path is clear.
- Normal browsing is unaffected.

Status: Pending.

## Phase 6 - Final Audit Prep

Purpose: once the above is stable, prepare external audit materials.

### Prompt 12 - Prepare External Audit Package After Work Shift

Create a fresh external audit package and three agent prompts after the local upgrade queue is stable. Include the current app purpose, public/live URLs if deployed, test-account details if Spencer approves sharing them, routes to inspect, known live-only gaps, and the exact audit questions. Do not include secrets. Do not commit generated zip files unless explicitly asked.

Acceptance:

- Three clear audit prompts exist.
- Zip package contains only useful source/docs and excludes generated junk.
- Known owner/editor/viewer live gates are explicit.

Status: Pending.
