# Tree Boarding Upgrades Queue

Created: 2026-06-10

Goal: use the time while Spencer is away to make the birthday demo feel more complete, calmer, and more resilient without rewriting the app or adding a framework.

Rules for every prompt:

- Keep the plain HTML/CSS/JS Firebase architecture.
- Do not make destructive live-data changes.
- Do not alter Firebase rules unless the prompt explicitly says rules are in scope.
- Prefer small, shippable improvements over broad rewrites.
- Run `npm run check` and `git diff --check`.
- Browser-smoke the touched routes when practical.
- Update this queue with status, changed files, checks, remaining issues, and whether deploy is recommended.
- Do not push or deploy unless the prompt explicitly asks for it.

## Repeatable Work Loop

Use this loop after each implementation prompt:

1. Implement the prompt.
2. Run local checks.
3. Do a focused manual/browser smoke test.
4. Audit the change against the acceptance criteria.
5. Patch any issues found in that audit.
6. Re-run checks.
7. Do one final focused audit.
8. Mark the prompt status in this file.

## Prompt 1 - Private Colety Tree Readiness Pass

Status: Done

Focus: make the real `colety-birthday-tree` feel like the primary production tree.

Tasks:

- Verify `/tree?familyId=colety-birthday-tree`, `/account`, `/search?familyId=colety-birthday-tree`, and a few Colety profile pages load cleanly when signed in.
- Confirm the tree no longer shows unavailable due to legacy relationship data.
- Make small copy/state fixes where the Colety tree still sounds like a starter/demo/test tree.
- Ensure the Account page clearly opens the Colety tree and shows the invite code safely.
- Confirm the six test avatars render in tree cards, directory cards, and profile pages.
- Add a tiny owner-only note if needed: test avatars can be replaced later with real family photos.

Acceptance:

- Colety tree loads reliably.
- No internal/testing copy appears on private Colety routes.
- Test avatars display without console errors.
- `npm run check` and `git diff --check` pass.

Result:

- Updated app copy so generated Colety starter content sounds like a private family tree, not a test/starter build.
- Updated Account readiness copy to call current images "profile images" and remind the owner that temporary avatars can be replaced with real family photos.
- Tightened readiness detection so placeholder/testing bios are not counted as complete story notes.
- Cleaned live `colety-birthday-tree` family description.
- Cleaned live bios for 6 Colety profiles.
- Verified live Firestore readback:
  - family name: `Colety Family Tree`
  - people count: 6
  - profile image count: 6
  - invite code exists
  - placeholder/testing bios remaining: 0
  - relationship ID fields are array-shaped for the 6 current Colety people
- Browser smoke:
  - local `/account` loads with no starter/test copy while signed out
  - local `/tree?familyId=colety-birthday-tree` shows the correct signed-out gate, no unavailable state, and no starter/test copy
  - live `/tree?familyId=colety-birthday-tree` shows the correct signed-out gate in this browser session, no unavailable state, and no starter/test copy
- Limitation: this browser session was signed out, so signed-in private rendering was verified through live Firestore/API readback rather than a signed-in browser session.
- Changed files:
  - `js/dashboard.js`
  - `js/starterTree.js`
  - `TREE_2026-06-10_BOARDING_UPGRADES_QUEUE.md`
- Live data updated:
  - `families/colety-birthday-tree.description`
  - `people/colety_frank.bio`
  - `people/colety_rose.bio`
  - `people/colety_tim.bio`
  - `people/colety_sarah.bio`
  - `people/colety_spencer.bio`
  - `people/colety_jamie.bio`
- Checks:
  - `npm run check`: passed
  - `git diff --check`: passed
- Remaining issues:
  - The code copy changes need commit/deploy before the live UI gets them.
  - A signed-in browser smoke test should be done after deploy from Spencer's browser session.
- Deploy recommended: Yes, after review/commit, because app copy changed.

## Prompt 2 - Data Integrity and Relationship Repair Tools

Status: Done

Focus: reduce future weirdness from legacy relationship shapes.

Tasks:

- Add a non-destructive relationship integrity helper that detects:
  - string relationship IDs that should be arrays,
  - missing referenced people,
  - one-way spouse links,
  - child records where parents do not reciprocally show context,
  - duplicate or suspicious family docs when visible to the signed-in user.
- Surface this as owner-only diagnostics on Account or a tucked-away tree tool, not as scary public UI.
- If a safe one-click repair is obvious, implement only for the current family and only with clear confirmation.
- Do not auto-migrate live data without user action.

Acceptance:

- Owner can see useful data health info.
- Normal family members are not scared by diagnostics.
- No destructive writes happen without confirmation.
- Checks pass.

Result:

- Added an owner-only, collapsed `Tree data health` section to Account family tree cards.
- The account diagnostic is read-only and does not add repair/migration writes.
- Detects:
  - legacy string-shaped `parentIds`
  - legacy string-shaped `spouseIds`
  - missing parent IDs
  - missing spouse IDs
  - self parent/spouse links
  - one-way spouse links
  - parent pairs that are listed together on a child but not linked as spouses/partners
  - disconnected profiles
  - same-name duplicate accessible family trees
  - multiple accessible primary/birthday trees
- The section only renders for owners; signed-out users and non-owner states do not see it.
- Reused the existing Account page data load path and relationship normalization so legacy data is detected without breaking display.
- Added compact CSS for the owner-only diagnostics panel.
- Browser smoke:
  - local `/account` loads while signed out
  - signed-out account route does not show `Tree data health`
  - browser console error log: empty
- Data audit:
  - live `colety-birthday-tree` has 6 people and 6 images
  - no legacy relationship string fields found
  - no missing relationship references found
  - no one-way spouse links found
- Limitation:
  - signed-in owner visual smoke still needs Spencer's browser session after deploy.
- Changed files:
  - `js/dashboard.js`
  - `css/global.css`
  - `TREE_2026-06-10_BOARDING_UPGRADES_QUEUE.md`
- Checks:
  - `npm run check`: passed
  - `git diff --check`: passed
- Remaining issues:
  - No blockers found for this prompt.
  - Because the diagnostics are owner-only, full visual confirmation needs a signed-in browser session.
- Deploy recommended: Yes, after commit/review, because Account UI changed.

## Prompt 3 - Add/Edit Person Flow Hardening

Status: Done

Focus: make the core editing flow feel reliable for dad/family demo use.

Tasks:

- Test Add Person from the tree, directory, and profile flows.
- Improve labels, validation, and success/error states.
- Make parent/spouse selectors easier to understand.
- Ensure image URL/upload fields are clear and do not conflict.
- Confirm saved people appear in the tree and directory after reload.
- Patch any obvious modal focus/mobile overflow issues.

Acceptance:

- Owner can add a person with birthday, bio, parents/spouse, and optional photo.
- Saved data appears after reload.
- Modal is usable on desktop and mobile.
- Checks pass.

Result:

- Improved Add Person forms on the tree and directory routes:
  - clearer relationship guidance
  - grouped photo URL/upload controls
  - explicit "use either URL or upload" help text
  - validation now blocks choosing both a photo URL and uploaded file
  - upload status changes to "Uploading photo..." while the file is being saved
- Improved Edit Profile form:
  - clearer relationship guidance
  - grouped photo URL/upload controls
  - explicit HEIC/export note remains visible
  - validation now blocks conflicting photo URL/upload choices
  - validation now blocks trying to remove and replace a photo at the same time, while still allowing removal when the current image URL is prefilled
- Relationship selectors are easier to scan:
  - options are sorted by display name
  - labels include birth year when available, e.g. `Sarah Colety - born 1962`
  - stale selected relationship IDs are not blindly restored if the option no longer exists
- Add modal now refreshes parent/spouse choices each time it opens.
- Added small modal CSS guardrails:
  - photo choice panel styling
  - full-width submit button with a larger tap target inside modal forms
- Browser smoke:
  - local `/tree?demo=large` desktop/mobile loaded with the updated add modal copy present and no page-level horizontal overflow
  - local `/search?demo=large` desktop/mobile loaded with the updated add modal copy present and no page-level horizontal overflow
  - local demo profile loaded with updated edit modal copy present and no page-level horizontal overflow
  - Add button correctly remains hidden on read-only demo routes
- Audit note:
  - The app browser still reports the known `MutationObserver.observe` warning. Repo search finds no app-owned `MutationObserver` usage, and prior docs already mark this as likely browser/extension noise unless reproduced in a clean browser with an app stack.
- Limitation:
  - This local browser session was signed out, so the owner-only end-to-end save/reload path still needs a signed-in Spencer/live test after deploy.
- Changed files:
  - `html/tree_page.html`
  - `html/search_page.html`
  - `html/profile.html`
  - `js/postPeople.js`
  - `js/profile.js`
  - `js/tree.js`
  - `css/global.css`
  - `TREE_2026-06-10_BOARDING_UPGRADES_QUEUE.md`
- Checks:
  - `npm run check`: passed
  - `git diff --check`: passed
- Remaining issues:
  - No code blockers found for this prompt.
  - Signed-in owner add/edit with actual Firestore/Storage save should be tested from Spencer's browser session after deploy.
- Deploy recommended: Yes, after review/commit, because add/edit forms and modal behavior changed.

## Prompt 4 - Profile Detail and Memory Polish

Status: Done

Focus: make profile pages feel like the emotional payoff of the app.

Tasks:

- Improve profile story/bio presentation.
- Add better empty states for missing birthday, parents, spouse, children, photo, and bio.
- Make relatives on a profile clearly clickable.
- Preserve return path back to the same tree/search/focused person.
- Consider a small "family notes" or "memory prompt" section using existing bio/story fields only.
- Do not add a new database model unless absolutely necessary.

Acceptance:

- Profiles feel finished even with sparse data.
- Relative links and Back to Family Tree preserve context.
- No awkward "unknown" or internal copy remains.
- Checks pass.

Result:

- Added a lightweight `Family notes` section to profile pages using existing profile data only.
  - Loaded profiles summarize the story/photo/relationship context already present.
  - Sparse profiles show friendly prompts for memories, photos, birthdays, or relationships instead of feeling broken.
  - Missing/unavailable/private profile states also update the notes panel so stale details do not remain visible.
- Improved relationship links on profiles:
  - relatives now render as pill-style links instead of plain inline text
  - links include title and aria-label text like `Open Graham Johnson's profile`
  - legacy text-only relationship names remain readable without pretending to be links
- Preserved existing return-path behavior:
  - tree-origin profiles return to `/tree` with demo/family context, focus, tree query, and view mode
  - search-origin profiles return to `/search` with demo/family context, query, and sort
  - clicking relatives preserves the same source context
- Browser smoke:
  - local large-demo profile `demo-g2-11` loads with family notes, relationship links, no `unknown` text in facts, and no page-level overflow
  - clicking a relative preserves `demo=large`, `view=chart`, and back-link focus context
  - mobile width around 390px loads the same profile with no page-level overflow
  - search-origin profile preserves `query=graham` and `sort=name` in Back to People and relative profile links
  - missing-profile route shows friendly unavailable/notes copy
- Audit note:
  - The app browser still reports the known `MutationObserver.observe` warning. Repo search finds no app-owned `MutationObserver` usage, and previous release notes already treat this as browser/extension noise unless reproduced in a clean browser with an app stack.
- Changed files:
  - `html/profile.html`
  - `js/profile.js`
  - `css/profile.css`
  - `TREE_2026-06-10_BOARDING_UPGRADES_QUEUE.md`
- Checks:
  - `npm run check`: passed
  - `git diff --check`: passed
- Remaining issues:
  - No blockers found for this prompt.
  - Signed-in private Colety profile visual smoke should still be checked from Spencer's browser after deploy.
- Deploy recommended: Yes, after review/commit, because profile UI and copy changed.

## Prompt 5 - Large Tree Navigation Upgrade

Status: Done

Focus: make 5-6 generation trees easier to understand.

Tasks:

- Improve Find Person, selected-person highlight, and relationship path clarity.
- Add or polish small navigation aids: recenter, zoom reset, generation jump, selected branch explanation, or "show close family" mode if feasible.
- Keep the family chart as the main view.
- Remove or hide confusing fallback controls unless they are truly needed.
- Ensure the chart viewport uses available screen space well.

Acceptance:

- A new user can find one person, understand their branch, and return to the full tree.
- Large chart does not feel like a random pile of boxes.
- Desktop and mobile remain usable.
- Checks pass.

Result:

- Added parent-page quick map controls to the tree sidebar:
  - `Full overview`
  - `Zoom in`
  - `Zoom out`
- Wired those controls to the embedded Family Chart iframe through `postMessage`, so the sidebar can control the main chart without brittle iframe DOM access.
- Added safe fallback behavior for Card list view:
  - `Full overview` clears focus/collapsed-card context and returns to the card overview.
  - Zoom buttons explain that zoom is available in Family map view after the chart loads.
- Added a selected-branch explanation to the selected-person panel.
  - Example: `This branch highlights 2 parents, 1 partner, 4 children, 3 siblings. Use the close-relative chips to move around without losing your place.`
  - Sparse branches explain that close relatives are not linked yet.
- Increased the desktop chart viewport slightly so the family map gets more usable space.
- Fixed a mobile usability issue found during smoke testing:
  - the selected-person panel no longer stays fixed over Find Person controls at phone width
  - chart auto-selection no longer yanks the mobile page away from the top controls unless the user explicitly uses Find/Focus
- Bumped static asset query strings from `20260522-11` through to `20260610-03` so browsers actually load this batch of JS/CSS changes after deploy.
- Browser smoke:
  - local `/tree?demo=large` desktop loads chart view, chart state becomes ready, no page-level overflow
  - desktop Find Person for `graham` selects Graham Johnson, updates URL focus/treeQuery, and shows branch context
  - desktop `Full overview` reaches the chart and updates status
  - local `/tree?demo=large&view=cards` keeps Card list visible and `Full overview` returns to the card overview
  - mobile width around 390px shows Find Person near the top, no page-level overflow, selected panel is static instead of covering controls
  - mobile Find button for `iris` selects Iris Miller, updates URL focus/treeQuery, and shows branch context
- Audit note:
  - The app browser still reports the known `MutationObserver.observe` warning. Repo search finds no app-owned `MutationObserver` usage, and previous release notes already treat this as browser/extension noise unless reproduced in a clean browser with an app stack.
- Changed files:
  - `html/tree_page.html`
  - `js/tree.js`
  - `js/familyChartSpike.js`
  - `css/family_tree.css`
  - asset-version references across `html/*.html` and `js/*.js`
  - `TREE_2026-06-10_BOARDING_UPGRADES_QUEUE.md`
- Checks:
  - `npm run check`: passed
  - `git diff --check`: passed
- Remaining issues:
  - No blockers found for this prompt.
  - Live signed-in Colety tree should still be checked after deploy because owner/private data requires Spencer's browser session.
- Deploy recommended: Yes, after review/commit, because tree navigation JS/CSS and cache-busting references changed.

## Prompt 6 - Relationship Finder as a Fun Feature

Status: Done

Focus: turn Relationship Finder into a charming demo moment.

Tasks:

- Make the two-person picker reliable and clean.
- Improve relationship wording, including parent, child, spouse/partner, sibling, grandparent, grandchild, cousin-ish fallback, and no-path states.
- If highlighting a path is already supported, use it; otherwise focus both people and explain the relationship in text.
- Add friendly copy that makes it obvious this is useful at family gatherings.

Acceptance:

- Finder works on both Colety tree and large example tree.
- No autocomplete overlay artifacts.
- Result language is understandable to non-technical relatives.
- Checks pass.

Result:

- Improved Relationship Finder copy so the tool feels like a family-gathering feature instead of a technical utility.
- Kept the custom suggestion lists and tightened the inputs:
  - browser autocomplete remains disabled
  - suggestions stay white/contained inside the sidebar
  - exact-name submit hides suggestions after resolving people
  - selected people resolve by stable person ID when picked, with text fallback for exact typed names
- Improved relationship wording:
  - direct parent/child/spouse or partner
  - siblings
  - grandparent/grandchild
  - co-parent through a shared child
  - cousin-ish relationships
  - friendly no-path state that frames missing links as profile cleanup, not a broken tree
- Added result actions:
  - `Focus first person`
  - `Focus second person`
- Added Card list relationship path highlighting for supported fallback cards.
- Fixed a selector bug found during smoke testing where relationship input `data-person-id` attributes could prevent card highlights from being applied.
- Bumped static asset query strings through `20260610-06` so this JS/CSS batch loads after deploy.
- Browser smoke:
  - local `/tree?demo=large` loaded chart view with `main.js?v=20260610-06`, chart ready, and no page-level overflow
  - Relationship Finder with `Alex Johnson` and `Ivy Johnson` produced `Ivy Johnson is Alex Johnson's child.`
  - result updated the selected-person panel to Ivy Johnson and preserved focus/treeQuery URL state
  - suggestion lists were white/contained and hidden after submit
  - local `/tree?demo=large&view=cards` produced the same relationship result and highlighted both endpoint cards
  - local `/tree?familyId=colety-birthday-tree` while signed out still showed the private sign-in gate with no page-level overflow
- Audit note:
  - The app browser still reports the known `MutationObserver.observe` warning. Repo search finds no app-owned `MutationObserver` usage, and previous release notes already treat this as browser/extension noise unless reproduced in a clean browser with an app stack.
- Changed files:
  - `html/tree_page.html`
  - `js/tree.js`
  - `css/family_tree.css`
  - asset-version references across `html/*.html` and `js/*.js`
  - `TREE_2026-06-10_BOARDING_UPGRADES_QUEUE.md`
- Checks:
  - `npm run check`: passed
  - `git diff --check`: passed
- Remaining issues:
  - No blockers found for this prompt.
  - Signed-in Colety tree Relationship Finder still needs Spencer's browser session after deploy because this local session cannot access private Colety people while signed out.
- Deploy recommended: Yes, after review/commit, because Relationship Finder JS/CSS and cache-busting references changed.

## Prompt 7 - Birthday Demo Presentation Mode

Status: Done

Focus: create a polished way to show the tree in person.

Tasks:

- Review Presentation View and Full Screen behavior.
- Add a clean title, exit control, zoom reset, and "Find person" access if missing.
- Hide editing/tool clutter while preserving a way out.
- Ensure it does not trap users on mobile or desktop.
- Add a small "birthday demo" route/link only if it fits existing navigation.

Acceptance:

- Presentation mode is safe to enter and easy to exit.
- It looks intentional on a big screen.
- No private controls leak to signed-out users.
- Checks pass.

Result:

- Added a compact `Find person` control directly inside the fixed Presentation View escape bar.
  - Searching in presentation focuses the matching person, updates the selected-person panel, and preserves focus/treeQuery in the URL.
  - Empty/no-match searches show calm inline presentation status text.
- Presentation mode now prefers the connected Family map view.
  - If someone enters from Card list fallback, it switches to `view=chart` before presenting.
- Presentation controls now use the safer chart messaging path:
  - zoom in
  - zoom out
  - reset
- Cleaned the presentation chrome:
  - regular print/presentation buttons hide while presentation mode is active
  - toolbar, join code, add-person button, header, and footer remain hidden in presentation mode
  - fixed escape bar remains visible with `Exit presentation`, `Back to tree`, search, and zoom controls
- Added responsive presentation-control CSS so the escape/search controls fit on phone-width screens.
- Bumped static asset query strings through `20260610-07` so this batch loads after deploy.
- Browser smoke:
  - local `/tree?demo=large` desktop loaded with `main.js?v=20260610-07`, chart ready, and no page-level overflow
  - entering Presentation View showed the escape bar, hid normal toolbar/print controls, and kept the chart visible
  - presentation search for `Ivy Johnson` focused Ivy, updated selected-person state, and preserved URL focus/treeQuery
  - Reset control updated status through the chart-control path
  - Exit presentation returned to the same route and hid the escape bar
  - mobile width around 390px showed a tappable escape/search bar, no page-level overflow, working search, and working exit
  - entering presentation from `/tree?demo=large&view=cards` switched to `view=chart` and hid the card fallback
- Audit note:
  - The app browser still reports the known `MutationObserver.observe` warning. Repo search finds no app-owned `MutationObserver` usage, and previous release notes already treat this as browser/extension noise unless reproduced in a clean browser with an app stack.
- Changed files:
  - `html/tree_page.html`
  - `js/tree.js`
  - `css/family_tree.css`
  - asset-version references across `html/*.html` and `js/*.js`
  - `TREE_2026-06-10_BOARDING_UPGRADES_QUEUE.md`
- Checks:
  - `npm run check`: passed
  - `git diff --check`: passed
- Remaining issues:
  - No blockers found for this prompt.
  - Signed-in private Colety presentation should still be checked from Spencer's browser after deploy.
- Deploy recommended: Yes, after review/commit, because Presentation View JS/CSS and cache-busting references changed.

## Prompt 8 - Mobile Family Gathering Pass

Status: Done

Focus: make the app usable from a phone at the party.

Tasks:

- Test 390px and 430px widths for landing, sign-in, account, Colety tree, directory, profile, add/edit person, and selected-person panel.
- Patch only practical mobile issues:
  - clipped nav,
  - cramped controls,
  - hidden save buttons,
  - oversized panels,
  - accidental horizontal overflow outside the chart area.
- Keep desktop behavior stable.

Acceptance:

- Phone users can sign in, open the tree, find someone, open a profile, and return.
- Add/edit flows do not feel broken on phone.
- Checks pass.

Result:

- Audited phone-width behavior at 390px and 430px for:
  - `/`
  - `/signin`
  - `/account`
  - `/p/account`
  - `/tree?familyId=colety-birthday-tree`
  - `/p/tree?familyId=colety-birthday-tree`
  - `/search?familyId=colety-birthday-tree`
  - `/p/search?familyId=colety-birthday-tree`
  - `/tree?demo=large`
  - `/search?demo=large`
  - demo profile pages opened from the tree
- Confirmed mobile header/nav behavior:
  - top nav collapses into the mobile menu
  - header account area does not create horizontal overflow
  - landing, sign-in, account, tree, directory, and profile routes had no page-level horizontal overflow
- Patched the tree selected-person panel on phone widths:
  - no longer uses a fixed bottom overlay at 430px
  - renders as a normal stacked card in the page flow
  - caps itself at a readable scrollable height instead of becoming an enormous panel
  - keeps the clear/dismiss control visible
  - keeps selected actions full-width and tappable
- Patched close-relative chips in the selected-person panel:
  - changed mobile close-relative chips to a compact two-column grid
  - removed accidental sideways chip overflow from the selected panel itself
- Confirmed directory routes are one-column on mobile for large demo data.
- Confirmed profile return path:
  - mobile `Ivy Johnson` profile opens from the tree
  - `Back to Family Tree` returns to `/tree?demo=large` with `treeQuery`, `focus`, and `view=chart` preserved
  - selected person remains `Ivy Johnson` after return
- Confirmed mobile Find Person flow:
  - searching `Ivy Johnson` at 390px and 430px selects the person
  - selected-person panel opens, remains static, has no page-level overflow, and exposes profile/details actions
- Bumped static asset query strings from `20260610-07` to `20260610-08` so this CSS fix is not hidden by stale browser cache after deploy.
- Browser smoke:
  - local 390px and 430px route audit passed with no page-level overflow
  - local 390px and 430px find/profile/back flow passed
  - selected-person card caps at 560px and remains scrollable when the selected person has many relatives
- Changed files:
  - `css/family_tree.css`
  - asset-version references across `html/*.html` and `js/*.js`
  - `TREE_2026-06-10_BOARDING_UPGRADES_QUEUE.md`
- Checks:
  - `npm run check`: passed
  - `git diff --check`: passed
- Remaining issues:
  - Signed-in owner Add/Edit save flows still need Spencer's authenticated browser session after deploy; this local browser session could only verify the mobile modal CSS and signed-out/demo flow surfaces.
  - The route audit still sees some wide close-relative chips inside intentional horizontally scrollable recent-person areas, but page-level overflow is false and the selected panel itself no longer causes sideways overflow.
- Deploy recommended: Yes, after review/commit, because mobile tree CSS and cache-busting references changed.

## Prompt 9 - Public Signed-Out Trust Pass

Status: Done

Focus: make the public site clear, friendly, and privacy-safe.

Tasks:

- Review `/`, `/tree`, `/tree?demo=large`, `/search?demo=large`, `/signin`, and demo profiles.
- Make sure public demo data is clearly fictional/read-only.
- Make landing CTAs obvious: browse example, sign in, create private tree.
- Confirm no private Colety data appears while signed out.
- Patch awkward copy or broken links.

Acceptance:

- Signed-out users understand what is public example vs private family.
- No private data leak.
- Checks pass.

Result:

- Audited signed-out public/trust routes:
  - `/`
  - `/tree`
  - `/tree?demo=large`
  - `/search?demo=large`
  - `/signin`
  - a demo profile opened from the tree
  - `/tree?familyId=colety-birthday-tree`
  - `/search?familyId=colety-birthday-tree`
- Patched signed-out mobile/header directory routing:
  - `People Directory` now points to `/search?demo=large` for signed-out users.
  - signed-out users are no longer sent to `/search?familyId=colety-birthday-tree` from the public header/menu.
  - signed-in users with a real family context still keep private `familyId` directory links.
- Improved landing page trust copy:
  - hero now says the example tree is read-only and uses fictional sample people.
  - preview card copy now calls the example tree read-only and fictional before users add real family data.
  - added quiet styling for the landing page demo note.
- Confirmed public demo routes:
  - `/tree`, `/tree?demo=large`, `/search?demo=large`, and demo profile pages visibly show read-only/fictional/made-up sample copy.
  - no visible Colety/private family names appear in public demo routes.
- Confirmed private Colety routes while signed out:
  - `/tree?familyId=colety-birthday-tree` does not show visible Colety person data.
  - `/search?familyId=colety-birthday-tree` shows a private sign-in gate and no visible Colety person data.
- Confirmed `/signin` explains that the example tree can be browsed without signing in and private editing/sharing requires sign-in.
- Bumped static asset query strings from `20260610-08` to `20260610-09` so the public trust/menu changes are loaded after deploy.
- Browser smoke:
  - local signed-out desktop route audit passed
  - local signed-out mobile-width header/menu audit passed
  - public demo profile route retained demo/read-only context
  - private Colety familyId routes remained gated while signed out
- Changed files:
  - `html/home_page.html`
  - `css/global.css`
  - `js/main.js`
  - asset-version references across `html/*.html` and `js/*.js`
  - `TREE_2026-06-10_BOARDING_UPGRADES_QUEUE.md`
- Checks:
  - `npm run check`: passed
  - `git diff --check`: passed
- Remaining issues:
  - No blockers found for this prompt.
  - As before, the app browser reports the known `MutationObserver.observe` extension/browser noise; no app-owned `MutationObserver` usage has been found.
- Deploy recommended: Yes, after review/commit, because public routing/copy and cache-busting references changed.

## Prompt 10 - Final Audit, Patch, Audit, Release Summary

Status: Done

Focus: freeze the birthday-demo version.

Tasks:

- Run a full desktop and mobile smoke pass over:
  - `/`
  - `/signin`
  - `/account`
  - `/tree?familyId=colety-birthday-tree`
  - `/search?familyId=colety-birthday-tree`
  - at least three Colety profiles
  - `/tree?demo=large`
  - `/search?demo=large`
  - at least one public demo profile
- Audit everything touched by prompts 1-9.
- Patch true blockers only.
- Re-run checks.
- Produce final summary:
  - what changed,
  - what was tested,
  - what remains,
  - GREEN/YELLOW/RED readiness,
  - whether commit/push/deploy is recommended.

Acceptance:

- No known birthday-demo blockers.
- Checks pass.
- Final recommendation is explicit.

Result:

- Ran a final local Firebase Hosting emulator smoke pass at desktop width `1365px` and mobile width `390px`.
- Audited signed-out/public routes:
  - `/`
  - `/signin`
  - `/account`
  - `/tree?demo=large`
  - `/search?demo=large`
  - `/profile?person=demo-g2-11&demo=large&from=tree&view=chart&focus=demo-g2-11`
- Audited private Colety routes while signed out:
  - `/tree?familyId=colety-birthday-tree`
  - `/search?familyId=colety-birthday-tree`
  - `/profile?person=colety_frank&familyId=colety-birthday-tree&from=tree`
  - `/profile?person=colety_rose&familyId=colety-birthday-tree&from=tree`
  - `/profile?person=colety_tim&familyId=colety-birthday-tree&from=tree`
- Findings:
  - no page-level horizontal overflow found on the audited desktop or mobile routes.
  - public demo routes remain clearly read-only/fictional.
  - private Colety routes did not expose visible Colety person data while signed out.
  - large demo focus state works: `Ivy Johnson` can be focused from URL state, receives visible highlight, and opens the selected-person panel.
  - demo profile return path preserves `demo=large`, `treeQuery`, and `focus` after waiting for the profile page to finish loading.
  - the Browser plugin could not type into the Find Person input because its virtual clipboard is unavailable in this environment; the app state was still verified through URL-backed focus and profile return behavior.
  - app browser logs still include known non-app `MutationObserver.observe` noise.
- Patches made for this prompt:
  - none. No true blocker reproduced after the stable profile back-link check.
- Checks:
  - `npm run check`: passed.
  - `git diff --check`: passed with only expected Windows LF-to-CRLF warnings.
- Remaining issues:
  - final signed-in owner pass for the real Colety tree still needs live browser/Firebase testing from an authorized account after deploy.
  - no known birthday-demo blockers from the local signed-out/public smoke pass.
- Final readiness: GREEN.
- Deploy recommended: Yes, after commit/push, because prompts 1-9 contain release-ready birthday demo improvements.
