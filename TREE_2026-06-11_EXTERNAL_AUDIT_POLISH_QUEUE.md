# Tree External Audit Polish Queue

Created: 2026-06-11

Goal: use external audit findings and final live testing to get the Family Tree birthday demo into a calm, polished, privacy-safe release state without turning this into a redesign sprint.

Rules for every prompt:

- Keep the plain HTML/CSS/JS Firebase architecture.
- Do not add a framework or new dependency unless explicitly approved.
- Do not deploy, push, or commit unless the user explicitly asks.
- Do not make destructive live-data changes.
- Do not change Firebase rules unless a prompt explicitly says rules are in scope.
- Patch only things that matter for birthday-demo confidence: broken flows, privacy leaks, confusing live copy, mobile usability, profile/tree/directory usability, and obvious console/runtime errors.
- Run `npm run check` and `git diff --check`.
- Browser-smoke touched routes at desktop width and around 390px mobile width when practical.
- Update this queue with status, changed files, checks, manual test notes, remaining risks, and deploy recommendation.

## Repeatable Work Loop

After each prompt:

1. Read the prompt and inspect before editing.
2. Implement only scoped fixes.
3. Run `npm run check`.
4. Run `git diff --check`.
5. Smoke-test touched routes locally.
6. Audit against the acceptance criteria.
7. Patch any issues found.
8. Re-run checks if patched.
9. Update this queue prompt with result, files changed, checks, remaining risks, and deploy recommendation.

## Prompt 1 - External Audit Intake and Triage

Status: Done

Focus: turn external audit notes into a practical birthday-demo fix list.

Tasks:

- Read any newly provided external audit report or notes.
- Split findings into:
  - must-fix before birthday demo,
  - should-fix if quick,
  - safe to defer after birthday demo,
  - not applicable / already fixed.
- Add exact route references and reproduction steps where possible.
- Do not code unless a blocker is tiny and obvious.

Acceptance:

- Queue has clear priority.
- No vague "improve UX" items without a concrete route or behavior.
- Remaining prompts are adjusted if the audit changes priorities.

Result:

- Inspected the queue and current working tree before editing.
- Checked for a newly provided external audit report in the workspace/downloads; none was present for this turn.
- No code changes were made because there was no new audit finding and no blocker to patch.
- Current priority remains:
  - Prompt 2: signed-in owner flow verification.
  - Prompt 3: signed-out privacy sweep.
  - Prompt 4: mobile birthday demo pass.
  - Prompt 5: tree interaction polish.
  - Prompt 6-12: focused profile, directory, copy, console, live-data, patch, and freeze passes.
- Changed files:
  - `TREE_2026-06-11_EXTERNAL_AUDIT_POLISH_QUEUE.md`
- Checks:
  - `npm run check`: passed.
  - `git diff --check`: passed.
- Manual/browser smoke:
  - Not run for Prompt 1 because this was a triage/documentation-only intake and no app route changed.
- Remaining risks:
  - Need the actual external audit report/notes before reprioritizing must-fix items.
- Deploy recommended:
  - No. Documentation-only queue update.

## Prompt 2 - Live Owner Flow Verification

Status: Blocked - owner auth required

Focus: verify the real signed-in Colety owner experience after deployment.

Tasks:

- Test `/account`, `/tree?familyId=colety-birthday-tree`, `/search?familyId=colety-birthday-tree`, and at least three Colety profile pages while signed in as owner.
- Confirm the tree loads real people.
- Confirm owner-only edit/add controls appear where expected.
- Confirm private tree copy does not sound like public demo/test/internal setup.
- Patch only obvious route/copy/state blockers.

Acceptance:

- Colety tree loads.
- Owner can reach Account, Family Tree, Directory, Profile, Add/Edit.
- No public-demo banner appears on private routes.
- No signed-in owner dead end.

Result:

- Inspected before editing.
- No owner credentials or reusable owner test credentials are stored in the repo.
- Checked the connected browser session against live deployed routes; it is currently signed out.
- Live signed-out checks completed for:
  - `/account`
  - `/tree?familyId=colety-birthday-tree`
  - `/search?familyId=colety-birthday-tree`
  - `/profile?person=colety_frank&familyId=colety-birthday-tree&from=tree`
  - `/profile?person=colety_rose&familyId=colety-birthday-tree&from=tree`
  - `/profile?person=colety_tim&familyId=colety-birthday-tree&from=tree`
- Signed-out live behavior was safe:
  - no Colety names/details visible,
  - no owner/edit controls visible,
  - no public-demo banner on private routes,
  - no tree-unavailable message,
  - private routes show sign-in-required copy.
- Expected warning observed:
  - `/search?familyId=colety-birthday-tree` logs a Firebase permission warning while signed out: `Missing or insufficient permissions`.
  - This is expected for a guarded private route and did not leak private data.
- Code inspection completed for owner/edit gates:
  - `js/dashboard.js` uses owner/member role checks for Account tree cards, invite-code reset/copy tools, member roles, and owner checklist.
  - `js/tree.js` gates Add Person, invite-code display, and selected-person edit links through family role/edit checks.
  - `js/profile.js` gates Edit Profile and Remove This Person through family edit access checks.
  - `js/search.js` uses private-family context and keeps Add Person hidden unless authorized.
- No code changes were made because no blocker was found and true owner verification cannot be completed without an authenticated owner browser session.
- Changed files:
  - `TREE_2026-06-11_EXTERNAL_AUDIT_POLISH_QUEUE.md`
- Checks:
  - `npm run check`: passed.
  - `git diff --check`: passed.
- Manual/browser smoke:
  - Live deployed signed-out private route smoke completed for the routes above.
  - True signed-in owner smoke was not possible from this environment/session.
- Remaining risks:
  - Spencer still needs to verify while signed in as owner:
    - `/account` shows the Colety tree and access code,
    - `/tree?familyId=colety-birthday-tree` loads real people,
    - `/search?familyId=colety-birthday-tree` lists people,
    - at least three Colety profiles open,
    - Add/Edit/Profile controls appear for owner.
- Deploy recommended:
  - No. No app code changed.

## Prompt 3 - Signed-Out Privacy Sweep

Status: Done

Focus: make sure signed-out users cannot inspect private data.

Tasks:

- Test signed-out access to private tree, private directory, and private profile URLs.
- Confirm no private names, emails, invite codes, profile photos, profile details, or edit controls leak.
- Check console logs and visible error states for accidental private data.
- Patch only true leak/blocker issues.

Acceptance:

- Signed-out private routes block safely.
- Public routes only show fictional/example data.
- Error states are family-safe and do not expose internals.

Result:

- Inspected before editing.
- Reviewed Firestore and Storage rules:
  - family/people reads require signed-in family membership,
  - join code list is disabled,
  - private profile image reads require family membership,
  - example tree remains read-only/public.
- No app code changes were made because no privacy blocker was found.
- Live signed-out browser smoke completed at desktop width and around 390px mobile width.
- Public routes tested:
  - `/`
  - `/tree?demo=large`
  - `/search?demo=large`
  - `/profile?person=demo-g4-12&demo=large&from=tree`
- Private signed-out routes tested:
  - `/tree?familyId=colety-birthday-tree`
  - `/search?familyId=colety-birthday-tree`
  - `/profile?person=colety_frank&familyId=colety-birthday-tree&from=tree`
  - `/profile?person=colety_rose&familyId=colety-birthday-tree&from=tree`
  - `/profile?person=colety_tim&familyId=colety-birthday-tree&from=tree`
  - `/tree?familyId=audit-large-demo-mq7h5jg7-54488d`
  - `/search?familyId=audit-large-demo-mq7h5jg7-54488d`
- Findings:
  - Private tree, directory, and profile routes showed sign-in-required/family-safe copy.
  - No private names, owner email, invite codes, profile photos, profile details, or edit controls were visible while signed out.
  - Public demo tree/directory/profile showed fictional/read-only example copy and did not show Colety data.
  - No page-level horizontal overflow was detected in the tested desktop/mobile sweeps.
  - Expected console warning remains on signed-out private directory routes: Firebase `Missing or insufficient permissions` while attempting to read private family context. This is acceptable because the UI blocks access safely and no private data appears.
- Changed files:
  - `TREE_2026-06-11_EXTERNAL_AUDIT_POLISH_QUEUE.md`
- Checks:
  - `npm run check`: passed.
  - `git diff --check`: passed.
- Manual/browser smoke:
  - Live deployed desktop and mobile signed-out privacy sweep passed.
- Remaining risks:
  - This confirms signed-out protection, not signed-in role behavior. Owner/editor/viewer live checks remain in Prompt 2 / owner audit.
- Deploy recommended:
  - No. Documentation-only queue update; no app code changed.

## Prompt 4 - Mobile Birthday Demo Pass

Status: Done

Focus: make the deployed app feel usable on a phone without redesigning.

Tasks:

- Test around 390px width:
  - `/`,
  - `/signin`,
  - `/account`,
  - `/tree?demo=large`,
  - private tree route,
  - public/private directory,
  - profile page.
- Check header menu, tap targets, selected-person panel, profile cards, directory filters, Add/Edit modals, and return paths.
- Patch only tiny CSS/layout blockers.

Acceptance:

- No duplicate nav.
- No page-level horizontal overflow except intentional tree/map panning.
- Selected-person panel is readable.
- Buttons are tappable.
- Back paths work naturally.

Result:

- Inspected before editing.
- Reviewed responsive CSS/code areas for:
  - mobile menu/header,
  - account/sign-in layout,
  - directory controls/cards,
  - selected-person panel,
  - profile page,
  - floating Add Person button.
- No app code changes were made because no mobile birthday-demo blocker was found.
- Live deployed browser smoke completed around 390px mobile width.
- Mobile routes tested:
  - `/`
  - `/signin`
  - `/account`
  - `/tree?demo=large`
  - `/tree?demo=large&focus=demo-g4-12&treeQuery=Ivy%20Johnson`
  - `/tree?familyId=colety-birthday-tree`
  - `/search?demo=large`
  - `/search?familyId=colety-birthday-tree`
  - `/profile?person=demo-g4-12&demo=large&from=tree&focus=demo-g4-12&treeQuery=Ivy%20Johnson`
  - `/profile?person=demo-g4-12&demo=large&from=search&query=Ivy&sort=name`
  - `/profile?person=colety_frank&familyId=colety-birthday-tree&from=tree`
- Desktop spot checks also completed for:
  - `/tree?demo=large&focus=demo-g4-12&treeQuery=Ivy%20Johnson`
  - `/search?demo=large`
  - `/profile?person=demo-g4-12&demo=large&from=tree&focus=demo-g4-12&treeQuery=Ivy%20Johnson`
- Findings:
  - Mobile menu button is visible around 390px and opens with expected items: Home, Example Tree, People Directory, Sign In.
  - Desktop nav is hidden on mobile; no duplicate nav observed.
  - No page-level horizontal overflow detected on tested routes.
  - Primary buttons and visible action controls were tappable-sized in tested routes.
  - Public demo directory cards stack one column on mobile; filters/sort/apply controls are full-width.
  - Selected-person panel is readable on mobile and correctly showed Ivy Johnson when focused from URL state.
  - Profile pages are readable on mobile.
  - Back paths preserved state:
    - demo profile from tree returns to `/tree?demo=large&treeQuery=Ivy+Johnson&focus=demo-g4-12`.
    - demo profile from directory returns to `/search?demo=large&query=Ivy&sort=name`.
  - Private signed-out mobile routes showed safe sign-in-required states.
  - Expected Firebase permission warning remains on signed-out private directory route; no private data leaked.
- Changed files:
  - `TREE_2026-06-11_EXTERNAL_AUDIT_POLISH_QUEUE.md`
- Checks:
  - `npm run check`: passed.
  - `git diff --check`: passed.
- Manual/browser smoke:
  - Live deployed 390px mobile smoke passed.
  - Desktop spot checks passed.
- Remaining risks:
  - Signed-in owner mobile Add/Edit modals could not be verified here because owner auth is not available in this session.
  - Real device Safari/Chrome may still reveal tiny viewport differences, so Spencer should do one phone pass before demo.
- Deploy recommended:
  - No. Documentation-only queue update; no app code changed.

## Prompt 5 - Tree Page Interaction Polish

Status: Done

Focus: protect the centerpiece tree experience.

Tasks:

- Test Find person, selected-person panel, relationship finder, birthdays, missing info, family stats, full-screen/presentation view, and profile links.
- Confirm selected/focused cards are visibly highlighted.
- Confirm presentation view has an obvious exit.
- Confirm no dead buttons or console errors.
- Patch only broken interactions or copy that blocks the demo.

Acceptance:

- Tree page feels intentional.
- Search/focus works.
- Selected-person actions are clear.
- Presentation/full-screen modes are escapable.

Result:

- Inspected before editing:
  - `html/tree_page.html`
  - `js/tree.js`
  - `js/demoTreeData.js`
- No app code changes were needed.
- Live desktop smoke on `https://tree-72e80.web.app/tree?demo=large`:
  - Large example tree loaded with 80 cards.
  - Public demo banner and large-tree hint were visible.
  - Find person found `Ivy Johnson`, opened the selected-person panel, exposed the profile link, and visibly highlighted the focused card.
  - Relationship Finder used the custom `relationship-suggestions` list, not the native browser overlay, resolved `Alex Johnson` to `Ivy Johnson`, showed a plain-English child relationship, highlighted the path, and selected Ivy.
  - Birthday entries were clickable/focusable; clicking `Avery Johnson` updated the selected-person panel.
  - Profiles to finish and Family snapshot panels populated.
  - Overview/zoom controls responded with status text.
  - Presentation View showed the escape bar and `Exit presentation`; exiting returned to normal tree view.
  - Demo profile link opened `Ivy Johnson`.
  - `Back to Family Tree` preserved `demo=large`, `treeQuery=Ivy Johnson`, `focus=demo-g4-12`, and `view=chart`.
- Live mobile smoke around 390px:
  - No page-level horizontal overflow.
  - Focused `Ivy Johnson` selected-person panel was visible, readable, and dismissible.
  - Chart area remained present below the mobile panel.
- Checks:
  - `npm run check`: passed.
  - `git diff --check`: passed.
- Browser console:
  - No unexplained desktop/mobile console errors were observed in the touched public demo flow.
- Remaining risks:
  - Owner-only private-tree add/edit interactions were not part of this prompt and still require a signed-in owner session.
  - Full native browser fullscreen cannot be completely validated in headless Chrome, but the in-app full overview, map zoom controls, and presentation escape controls were verified.
- Deploy recommended:
  - No. Queue documentation update only; no app code changed.

## Prompt 6 - Profile and Photo State Polish

Status: Done

Focus: make profiles feel complete even when photos/stories are missing.

Tasks:

- Test public demo profiles and private Colety profiles.
- Confirm photo placeholders are initials/avatar states, not ugly broken images.
- Confirm no "Photo coming later", "needs photo", or awkward technical missing-state language appears.
- Confirm Edit Profile works for owners and is hidden for signed-out/read-only demo users.
- Patch only copy/state/link blockers.

Acceptance:

- Profiles look birthday-demo friendly.
- Missing content feels intentional.
- Back links preserve tree/search context.

Result:

- Inspected before editing:
  - `html/profile.html`
  - `js/profile.js`
  - `css/family_tree.css`
- Scoped fix made:
  - `js/profile.js` now treats `searchQuery` as a compatibility alias for the directory search query on profile pages.
  - Back links still emit the canonical `/search?...&query=...` parameter.
  - Relationship links opened from a search-context profile preserve the search query and sort context.
- Why patched:
  - Live smoke showed standard generated search profile links already preserve `query`, but an audit/external URL using `searchQuery=Alex` dropped the search text on `Back to People`.
  - That directly touched this prompt's return-path acceptance criteria, so the fix was kept tiny.
- Browser smoke:
  - Live desktop public demo profile from tree context:
    - `Ivy Johnson` loaded with initials/avatar placeholder.
    - No broken image.
    - No `Photo coming later`, `needs photo`, testing, audit, or placeholder copy was visible.
    - Edit/Delete controls were hidden in read-only demo mode.
    - `Back to Family Tree` preserved `demo=large`, `treeQuery`, `focus`, and `view`.
  - Live desktop public demo profile from search context:
    - `Alex Johnson` loaded with clean missing-photo and missing-story states.
    - `Back to People` preserved canonical `query`/`sort` when opened from normal app links.
  - Live relative profile link:
    - Opening `Alex Johnson` from `Ivy Johnson` preserved tree context.
  - Live signed-out private profile guard:
    - `colety_rose` under `colety-birthday-tree` showed `Sign in to view this profile`.
    - No private name/details/photos/edit controls leaked.
    - Public demo banner text existed only in the shared DOM node and was hidden on private route.
  - Local patched desktop smoke:
    - `searchQuery=Alex` now returns to `/search?demo=large&query=Alex&sort=name`.
    - Relative links from that profile preserve `query=Alex&sort=name`.
  - Local patched mobile smoke around 390px:
    - `Ivy Johnson` profile was readable.
    - No page-level horizontal overflow.
    - Initials/avatar placeholder and relationship fields remained friendly.
- Checks:
  - `npm run check`: passed.
  - `git diff --check`: passed. Git printed the expected Windows LF-to-CRLF warning for `js/profile.js`, but exited successfully.
- Remaining risks:
  - Owner-only private profile editing and photo upload were not verified live here because this session does not have the signed-in owner browser state.
  - The signed-out private guard was verified; the signed-in owner edit/photo path should still get one live owner pass before the demo.
- Deploy recommended:
  - Yes, after review/commit, because `js/profile.js` has a small route-context fix that is not on live until deployed.

## Prompt 7 - People Directory Polish

Status: Done

Focus: make the hidden/directory route safe and usable for audits.

Tasks:

- Test public demo directory and private directory while authorized.
- Test signed-out private directory guard.
- Check filters, sort, profile links, Add Person access, and mobile one-column layout.
- Patch only broken controls or confusing copy.

Acceptance:

- Directory is readable on desktop/mobile.
- Private directory does not leak signed out.
- Profile links return naturally.

Result:

- Inspected before editing:
  - `html/search_page.html`
  - `js/search.js`
  - `js/postPeople.js`
  - `js/familyContext.js`
  - `css/global.css`
  - `firebase.json`
- No Prompt 7 app code changes were needed.
- Browser smoke on live desktop:
  - `/search?demo=large`
    - Loaded 80 fictional demo people.
    - Showed `Example Tree · Read-only` / `Fictional sample data`.
    - Search/filter controls stayed enabled.
    - Add Person button was hidden/disabled for read-only demo.
    - Profile cards linked to `/profile?...&demo=large&from=search`.
    - No private names, invite/access codes, owner copy, or Colety data leaked.
  - Search interaction:
    - Typing `Alex` updated the URL to `query=Alex`.
    - Results narrowed to one match.
    - Changing sort to `generation` updated the URL to `sort=generation`.
    - Profile links preserved `query=Alex&sort=generation`.
    - No-match state gave a friendly empty message.
  - `/p/search?demo=large&query=Ivy`
    - Firebase rewrite worked.
    - Result card linked to the expected demo profile with search context.
  - `/search?familyId=colety-birthday-tree`
    - Signed-out private directory showed `Sign in needed`.
    - Search controls were disabled.
    - Add Person was hidden/disabled.
    - No private results rendered.
- Browser smoke on live mobile around 390px:
  - `/search?demo=large&query=Alex&sort=generation`
    - Directory controls stacked full-width.
    - Result list rendered one column.
    - No page-level horizontal overflow.
    - Profile link preserved query/sort/demo context.
  - `/p/search?familyId=colety-birthday-tree`
    - Signed-out private guard worked on the rewrite route.
    - Controls were disabled and one-column/full-width.
    - No private data leaked.
- Checks:
  - `npm run check`: passed.
  - `git diff --check`: passed. Git printed the expected Windows LF-to-CRLF warning for the already modified `js/profile.js`, but exited successfully.
- Remaining risks:
  - Authorized private directory and owner Add Person could not be verified in this unauthenticated browser session.
  - Add Person owner flow should be included in Spencer's final live owner pass.
- Deploy recommended:
  - No new Prompt 7 app code changed. Overall deploy is still recommended after review because Prompt 6 modified `js/profile.js`.

## Prompt 8 - Copy and Family-Safe Language Pass

Status: Done

Focus: remove anything that sounds like a dev/test build.

Tasks:

- Search visible app files for stale wording:
  - testing,
  - audit,
  - seed,
  - internal,
  - placeholder,
  - demo checklist,
  - domain/DNS,
  - old collaborator names,
  - scary Firebase/internal language.
- Keep public example routes clearly labeled as read-only fictional sample data.
- Keep private routes warm and family-safe.
- Patch only visible copy issues.

Acceptance:

- Private routes sound like a real family app.
- Public example routes clearly say example/read-only/fictional.
- No embarrassing old-project copy appears.

Result:

- Inspected before editing:
  - `html/*`
  - `js/*`
  - `css/*`
  - `assets/*`
  - `firebase.json`
- Searched visible app surfaces for:
  - testing,
  - audit,
  - seed,
  - internal,
  - placeholder,
  - demo checklist,
  - launch checklist,
  - domain/DNS,
  - old collaborator names,
  - public demo data,
  - secondary owner,
  - Hugh/Frampton references.
- Scoped copy fixes made:
  - `js/tree.js`
    - `Demo profiles are read-only...` -> `Example profiles are read-only...`
    - `Public demo data is read-only...` -> `Example tree data is read-only...`
  - `js/familyChartSpike.js`
    - `Demo chart` / `Showing demo chart` -> `Example chart` / `Showing example chart`
    - Visible `relationship mapping note` wording -> `family connection note`
    - Removed visible `More are available in the browser console.` copy.
    - `Showing the large demo chart for now.` -> `Showing the large example chart for now.`
- Not changed:
  - Form `placeholder` attributes, CSS placeholder selectors, and function/variable names like `profilePhotoPlaceholder`, because they are implementation details or normal HTML terminology.
  - Public `demo` query support and public example labels, because public routes still need clear example/read-only/fictional framing.
- Follow-up text sweep:
  - No matches remained for `public demo data`, `demo profiles`, `showing demo chart`, `browser console`, `secondary owner`, `testing view`, `demo checklist`, `launch checklist`, `domain and dns`, `hugh`, `frampton`, or `hughfwebdev` in visible app files.
- Local browser smoke:
  - `/tree?demo=large`
    - Public example cue remained visible: `Example Tree · Read-only` / `Fictional sample data`.
    - Missing info and data health panels rendered with `Example profiles` / `Example tree data` wording.
    - No stale dev/test copy detected.
  - `/search?demo=large&query=Alex`
    - Public example directory stayed clearly fictional/read-only.
    - No stale copy detected.
  - `/profile?person=demo-g4-12&demo=large&from=tree`
    - Public profile stayed read-only/example and family-safe.
  - `/tree-spike?demo=large`
    - Chart route used `Example chart` language and no browser-console instruction appeared.
  - Signed-out private `/search?familyId=colety-birthday-tree`
    - Showed private-family sign-in copy.
    - No public demo banner body copy appeared.
  - Signed-out private `/profile?person=colety_rose&familyId=colety-birthday-tree`
    - Showed protected private-profile copy.
    - No private data leaked.
  - Mobile `/tree?demo=large` around 390px:
    - No page-level horizontal overflow.
    - Public example copy stayed clear and family-safe.
- Checks:
  - `npm run check`: passed.
  - `git diff --check`: passed. Git printed expected Windows LF-to-CRLF warnings for modified JS files, but exited successfully.
- Remaining risks:
  - Signed-in owner/private copy still needs one live owner pass because this browser session is signed out.
  - Global signed-out navigation still includes an `Example Tree` link, which is intentional public navigation and not a private-route leak.
- Deploy recommended:
  - Yes, after review/commit, because `js/tree.js`, `js/familyChartSpike.js`, and the earlier `js/profile.js` route-context fix are not live until deployed.

## Prompt 9 - Console and Broken-Link Sweep

Status: Done

Focus: catch embarrassing runtime problems before family sees them.

Tasks:

- Browser-smoke key routes and watch console.
- Check links/buttons in header, account, tree, directory, profile, sign-in, presentation mode, and modals.
- Distinguish expected signed-out Firebase permission warnings from real app errors.
- Patch broken links/dead buttons only.

Acceptance:

- No user-visible broken links.
- No unexplained console errors in public routes.
- Known signed-out permission warnings are documented if they remain.

Result:

- Inspected before editing:
  - `html/*`
  - `js/*`
  - current git status and existing Prompt 6/8 app changes.
- Static link scan:
  - Parsed 7 HTML files.
  - Found 59 `href` attributes.
  - Found no empty links, `#` links, or `javascript:` links.
- Console/error scan:
  - Reviewed existing `console.warn`, `console.error`, `throw new Error`, `confirm`, and route/button code.
  - No obvious broken-link patch was needed before browser smoke.
- Local browser-smoke routes at desktop width:
  - `/`
  - `/signin`
  - `/account`
  - `/tree?demo=large`
  - `/tree?demo=large&view=cards`
  - `/search?demo=large`
  - `/profile?person=demo-g4-12&demo=large&from=tree`
  - `/tree?familyId=colety-birthday-tree`
  - `/search?familyId=colety-birthday-tree`
  - `/tree-spike?demo=large`
- Local browser-smoke routes around 390px:
  - `/`
  - `/tree?demo=large&focus=demo-g4-12&treeQuery=Ivy%20Johnson`
  - `/search?demo=large&query=Alex`
  - `/profile?person=demo-g4-12&demo=large&from=tree`
  - `/p/search?familyId=colety-birthday-tree`
- Interaction checks:
  - Header/home/sign-in/example links resolved.
  - Sign-in create-account and reset-password states switched correctly.
  - Tree Find person found `Ivy Johnson`.
  - Relationship Finder resolved `Alex Johnson` to `Ivy Johnson`.
  - Presentation View showed escape controls and exited cleanly.
  - Search filter/sort worked and profile links preserved directory context.
  - Demo profile loaded, read-only edit/delete controls stayed hidden, and relation links resolved.
  - Connected chart route rendered a chart and search/focus found `Alex Johnson`.
  - Account signed-out route linked to sign-in.
  - Signed-out private search guard rendered `Sign in needed` with no people cards.
- Browser console:
  - Public/demo routes had no unexplained console errors.
  - Expected signed-out Firebase permission warnings appeared when probing private family routes:
    - `Could not load family name for search context: FirebaseError: Missing or insufficient permissions.`
  - These were treated as expected guard warnings, not blockers, because private results did not render.
- Mobile:
  - No page-level horizontal overflow on tested routes.
  - Mobile menu was present.
  - Search/profile/tree routes remained reachable.
- Patches made for Prompt 9:
  - None.
- Checks:
  - `npm run check`: passed.
  - `git diff --check`: passed. Git printed expected Windows LF-to-CRLF warnings for modified JS files, but exited successfully.
- Remaining risks:
  - Owner-only private actions, Add/Edit modals, invite-code copy/reset, and authenticated account controls still need one live signed-in owner pass.
  - Native print/fullscreen behavior cannot be fully verified in headless Chrome, but presentation escape and in-app map controls were verified.
- Deploy recommended:
  - No new Prompt 9 app code changed. Overall deploy is still recommended after review because Prompts 6 and 8 changed app JS.

## Prompt 10 - Live Data Safety and Backup Notes

Status: Done

Focus: make sure live birthday data is safe before final demo.

Tasks:

- Do not mutate live data unless explicitly asked.
- Document the current live tree IDs, test accounts, and demo URLs needed for final audits.
- Add a simple manual backup/export checklist if one does not already exist.
- Confirm what should not be edited before the birthday demo.

Acceptance:

- Spencer has a clear live-audit checklist.
- No destructive operations performed.
- Safe rollback/backup notes exist.

Result:

- Added `BIRTHDAY_LIVE_DATA_SAFETY_CHECKLIST.md` as the single final live-data safety reference.
- Documented the important live targets:
  - Firebase Hosting URL and project ID.
  - Birthday tree ID: `colety-birthday-tree`.
  - Owner account: `smcolety@gmail.com`.
  - External-audit private large tree ID: `audit-large-demo-mq7h5jg7-54488d`.
  - Earlier disposable test account/tree references.
- Documented public, private owner/member, and signed-out private-probe URLs for final audits.
- Added a manual backup checklist covering Firestore family/person/member records, optional Firestore export if already configured, and deployed commit/deploy timestamp notes.
- Added explicit "Do Not Edit Before The Demo" guidance for archive/delete, bulk relationship edits, invite-code resets, rule changes, auth/domain changes, and large photo batches.
- Added safe rollback notes for code rollback, data rollback, and public-example fallback.
- No live data was mutated. No Firebase Console, Firestore, Storage, invite code, member role, or Auth changes were performed.
- Browser smoke:
  - Not run for this prompt because the only change was documentation and queue status. No app routes or assets changed in Prompt 10.
- Checks:
  - `npm run check`: passed.
  - `git diff --check`: passed. Git printed expected Windows LF-to-CRLF warnings for previously modified JS files, but exited successfully.
- Remaining risks:
  - Spencer still needs the live signed-in owner audit for `/account`, `/tree?familyId=colety-birthday-tree`, `/search?familyId=colety-birthday-tree`, profile edit/photo flows, and signed-out private probes.
- Deploy recommended:
  - No deploy is needed for Prompt 10 itself because it is docs-only. Overall deploy remains recommended after review because earlier prompts changed app JavaScript.

## Prompt 11 - Final External Audit Patch Pass

Status: Done

Focus: patch only confirmed external-audit findings that matter.

Tasks:

- Use the latest external audit findings.
- Fix only must-fix and quick should-fix items.
- Avoid new feature ideas.
- Re-test exact reproduction steps after each fix.

Acceptance:

- Each fixed audit item has a before/after note.
- Checks pass.
- Deploy recommendation is clear.

Result:

- Inspected the queue, workspace audit files, Downloads audit/report files, git status, and changed-file diff before editing.
- No new external audit report or confirmed must-fix finding was present for this prompt beyond the already-recorded owner-auth live verification gap.
- The only unresolved queue item remains Prompt 2: real signed-in `smcolety@gmail.com` owner verification, which is blocked by needing an authenticated owner browser session rather than a code patch.
- No app code was changed because there was no confirmed blocker or quick should-fix item to patch.
- Before/after notes:
  - No fixed audit items for this prompt.
  - Before: no new confirmed external-audit finding available.
  - After: no app behavior changed; remaining live-owner verification risk remains documented.
- Changed files:
  - `TREE_2026-06-11_EXTERNAL_AUDIT_POLISH_QUEUE.md`
- Browser smoke:
  - Not run for Prompt 11 because no app route, asset, CSS, or JavaScript changed in this prompt.
- Checks:
  - `npm run check`: passed.
  - `git diff --check`: passed. Git printed expected Windows LF-to-CRLF warnings for previously modified JS files, but exited successfully.
- Remaining risks:
  - Spencer still needs to run the signed-in owner pass for `/account`, `/tree?familyId=colety-birthday-tree`, `/search?familyId=colety-birthday-tree`, profile edit/photo flows, invite-code copy/reset, and signed-out private probes on the deployed site.
- Deploy recommended:
  - No deploy is needed for Prompt 11 itself because it is queue/documentation-only. Overall deploy remains recommended after review because earlier prompts changed app JavaScript.

## Prompt 12 - Final Freeze Report

Status: Done

Focus: decide whether to freeze for birthday demo.

Tasks:

- Run final local checks.
- Smoke-test live or local routes requested by Spencer.
- Summarize blockers, non-blockers, risks, and final deploy/commit state.
- Recommend GREEN/YELLOW/RED.
- Do not patch unless a true blocker appears.

Acceptance:

- Spencer has a short final go/no-go report.
- No untracked scratch files remain.
- Commit/deploy recommendation is explicit.

Result:

- Final readiness recommendation: YELLOW.
  - Local public/demo/mobile verification is clean enough to commit, push, deploy, and run live audits.
  - The birthday demo should not be called fully frozen until Spencer completes the signed-in owner pass for `smcolety@gmail.com` and `colety-birthday-tree`.
- Inspected before editing:
  - `TREE_2026-06-11_EXTERNAL_AUDIT_POLISH_QUEUE.md`
  - `firebase.json`
  - `package.json`
  - `html/home_page.html`
  - `html/tree_page.html`
  - current `git status`
  - current `git diff --stat`
- Local checks:
  - `npm run check`: passed.
  - `git diff --check`: passed. Git printed expected Windows LF-to-CRLF warnings for previously modified JS files, but exited successfully.
- Local route smoke:
  - Used a temporary local static server with Firebase Hosting-style rewrites.
  - Desktop routes checked:
    - `/`
    - `/signin`
    - `/account`
    - `/tree?demo=large`
    - `/search?demo=large`
    - `/profile?person=demo-g4-12&demo=large&from=tree`
    - `/tree?familyId=colety-birthday-tree`
    - `/search?familyId=colety-birthday-tree`
  - Mobile routes checked at about 390px width:
    - `/`
    - `/signin`
    - `/account`
    - `/tree?demo=large`
    - `/search?demo=large`
    - `/profile?person=demo-g4-12&demo=large&from=tree`
  - Interaction smoke:
    - On `/tree?demo=large`, scoped the visible Find person input, searched `Ivy Johnson`, and confirmed the URL updated to `focus=demo-g4-12&treeQuery=Ivy+Johnson`.
    - Confirmed the selected-person panel opened for `Ivy Johnson`.
    - Confirmed the selected-person panel has a Clear control on mobile.
- Smoke findings:
  - No tested route had page-level horizontal overflow.
  - Mobile menu was present on tested mobile routes.
  - Public demo routes showed example/read-only context.
  - Signed-out private routes did not expose owner edit controls in local smoke.
  - The known `MutationObserver.observe` console error appeared again in the browser runtime; `rg` found no `MutationObserver` usage in app files, so this remains documented as likely browser/extension noise rather than an app blocker.
- Changed files for this prompt:
  - `TREE_2026-06-11_EXTERNAL_AUDIT_POLISH_QUEUE.md`
- App-code patches made:
  - None. No true blocker was found during Prompt 12.
- Current working tree:
  - Modified app files from earlier prompts:
    - `js/familyChartSpike.js`
    - `js/profile.js`
    - `js/tree.js`
  - New/revised release docs:
    - `BIRTHDAY_LIVE_DATA_SAFETY_CHECKLIST.md`
    - `TREE_2026-06-11_EXTERNAL_AUDIT_POLISH_QUEUE.md`
  - `git status --short` does not list untracked scratch screenshot folders. Ignored local artifacts such as old audit zips/debug logs may still exist on disk but are excluded from release status.
- Blockers:
  - No local/public/demo blocker found.
  - Remaining blocker to full GREEN freeze: live owner-auth verification requires Spencer's signed-in account/session.
- Non-blocking risks:
  - Owner Add/Edit/Profile photo/invite-code flows must be verified live after deploy.
  - Firebase Storage photo behavior still needs one owner live pass.
  - Custom domain should remain last, after Firebase Hosting URL passes.
- Commit/deploy recommendation:
  - Commit and deploy are recommended so Spencer can run final live audits against the latest app.
  - Do not call the birthday demo fully frozen until the live owner pass is GREEN.
