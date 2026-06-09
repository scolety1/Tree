# Tree While-Away Upgrades Queue - June 4, 2026

Use this queue while Spencer is away. Send prompts like:

`find TREE_2026-06-04_WHILE_AWAY_UPGRADES_QUEUE.md and do prompt 1`

Goal: keep improving the website without needing the `smcolety@gmail.com` owner session. Prioritize visible polish, small bug fixes, public/demo quality, non-destructive tooling, and anything that makes the app feel more complete for the birthday demo.

## Guardrails

- Do not require a signed-in owner session unless the prompt explicitly says it is optional.
- Do not edit or delete real Colety family data.
- Do not make broad architecture changes or replace the current chart renderer unless a prompt explicitly asks for a spike.
- Keep the plain HTML/CSS/JS/Firebase architecture.
- Keep private data private: public routes must use made-up example data only.
- Run `npm.cmd run check` and `git diff --check` after code changes.
- Browser-smoke changed public routes locally or live if the change is already deployed.
- Do not commit, push, or deploy unless Spencer explicitly asks.
- Update this queue with findings/status after each prompt.

## Prompt 1 - Public Landing Page Fun Polish

Make the signed-out landing page feel a little more delightful without adding a marketing-heavy redesign.

Scope:

- Review `/` signed out.
- Improve the hero action flow, section rhythm, and visible route into the example tree.
- Add one lightweight, family-themed interactive or visual touch using existing HTML/CSS/JS only.
- Keep the page fast, clean, and not cheesy.
- Make sure the signed-out nav remains `Home`, `Example Tree`, and `Sign In`.

Acceptance:

- Landing page feels more alive and still practical.
- No private Colety data appears.
- No page-level horizontal overflow on desktop or phone width.
- Local checks pass.

Status: Done locally June 4, 2026. See Prompt 1 Findings.

Prompt 1 Findings:

- Added a clearer signed-out hero action row with `Sign In to Start` and `View Example Tree`.
- Added a lightweight made-up example branch preview with Graham, Iris, Alex, and Casey. No private Colety data is used.
- Added a `Highlight a branch` interaction that cycles through example branch highlights and updates an aria-live status message.
- Kept signed-out navigation focused on `Home`, `Example Tree`, and `Sign In`.
- Improved responsive styling so the hero and preview stack cleanly and the mini tree becomes one column on small screens.
- Browser smoke passed locally at the available desktop viewport:
  - hero and preview render
  - Sign In/View Example Tree hero actions render
  - branch highlight interaction updates two highlighted cards and status copy
  - no private Colety names appear
  - no page-level horizontal overflow
- Static responsive assertions passed for mobile stacking/full-width actions/one-column mini tree.
- Limitation: the in-app browser did not expose a true viewport resize API in this session, so phone-width behavior was verified by CSS/static assertions rather than a resized browser viewport.
- Verification: `npm.cmd run check` passed, and `git diff --check` reported only existing CRLF normalization warnings.

## Prompt 2 - Tree Page Guided Tour Overlay

Add a lightweight guided help/tour for the Family Tree page so a first-time family member understands the chart.

Scope:

- Add a small `How to read this` or `Tour` control near the tree tools/sidebar.
- Explain pan/zoom, Find person, selected-person panel, relationship lines, C1/C2 branch markers, and profile links.
- Use a dismissible in-app panel/dialog, not `alert()`.
- Keep copy short and dad-friendly.
- Ensure it works on the public large demo and private tree without requiring auth.

Acceptance:

- User can open and close the tour.
- The tour does not cover critical controls on mobile.
- It clarifies the confusing chart concepts without cluttering the default view.
- Local checks pass.

Status: Done locally June 4, 2026. See Prompt 2 Findings.

Prompt 2 Findings:

- Added a `How to read this` control near the top of the Family Tree tool rail.
- Added an inline dismissible tour panel, not an alert or page-covering overlay.
- The tour explains pan/zoom, Find person, selected-person details, relationship lines, C1/C2 branch markers, and profile links.
- The panel opens/closes with correct `aria-expanded`, focuses the Close button when opened, restores focus to the toggle when closed, and closes with Escape.
- Kept the panel inline in the sidebar/tool rail so it does not cover chart controls on narrow screens.
- Browser smoke passed locally on `/tree?demo=large`:
  - tour starts hidden
  - opens from the button
  - shows the expected copy
  - closes and restores focus
  - no private Colety names appear
  - no page-level horizontal overflow at the available desktop viewport
- Browser smoke also passed on signed-out `/tree?familyId=colety-birthday-tree`:
  - private-tree blocking copy remains
  - no private Colety names or owner controls appear
  - tour still opens and reads correctly
- Static assertions passed for tour markup, styles, setup wiring, and Escape handling.
- Verification: `npm.cmd run check` passed, and `git diff --check` reported only existing CRLF normalization warnings.

## Prompt 3 - Relationship Path Story Mode

Turn Relationship Finder results into a clearer, more fun explanation.

Scope:

- Review existing relationship finder UI and output on `/tree?demo=large`.
- Improve result copy so it reads like: `Alex Johnson -> parent -> Graham Johnson -> spouse -> Iris Miller`.
- Add a concise plain-English sentence when a relationship is found.
- If no relationship is found, show a helpful next step instead of a dead/error-like state.
- Keep it compatible with existing private-tree data.

Acceptance:

- Relationship results are understandable without knowing the data model.
- No awkward empty or technical output.
- Browser smoke on public large demo passes.
- Local checks pass.

Status: Done locally June 4, 2026. See Prompt 3 Findings.

Prompt 3 Findings:

- Improved Relationship Finder output without changing the underlying relationship graph/model.
- Added a plain-English relationship sentence, for example: `Iris Miller is Alex Johnson's parent.`
- Added a literal readable path line, for example: `Alex Johnson -> parent -> Iris Miller`.
- Kept the visual chip chain and detailed ordered list for quick scanning.
- Replaced awkward string-only error states with small explanatory result cards:
  - no tree loaded
  - names not found
  - no path found yet
- Browser smoke passed locally on `/tree?demo=large`:
  - `Alex Johnson` to `Iris Miller` produced a readable sentence and arrow path
  - relationship result selected/focused the target person
  - bad input produced a helpful next-step message
  - no page-level horizontal overflow at the available desktop viewport
- Verification: `npm.cmd run check` passed, and `git diff --check` reported only existing CRLF normalization warnings.

## Prompt 4 - Birthday Timeline Panel

Add a fun birthday-oriented panel that helps Spencer quickly spot birthday facts and missing dates.

Scope:

- Improve or add to the existing Birthdays tool on the tree page.
- Show upcoming birthdays, missing birthdays, and a month-by-month mini summary.
- Keep it useful for both public demo and private tree.
- Do not call the deferred `/api/funfact` route.
- Use existing person birthdate data only.

Acceptance:

- Birthdays panel feels polished and useful.
- Missing birthdays are easy to identify.
- Public demo works with made-up data.
- Local checks pass.

Status: Done locally June 4, 2026. See Prompt 4 Findings.

Prompt 4 Findings:

- Upgraded the existing Birthdays tool without adding any API calls.
- Added a compact birthday summary:
  - next birthday/person
  - number of people with birthdays
  - number of missing birthday dates
- Added a `This month` section when the loaded tree has birthdays in the current month.
- Kept `Next birthdays` but made it sit under the new summary so it is easier to scan.
- Reworked the month summary into bar-style month rows instead of plain pills.
- Added clearer missing-birthday copy: `Start with these so reminders and birthday prep feel complete.`
- Public large demo browser smoke passed:
  - 3 summary cards rendered
  - `This month` rendered
  - `Next birthdays` rendered
  - 12 month rows and meters rendered
  - no private Colety names appeared
  - no `/api/funfact` usage
  - no page-level horizontal overflow at the available desktop viewport
- Static assertions passed for birthday summary helpers, month meter CSS, missing note CSS, and no funfact call in tree birthday code.
- Verification: `npm.cmd run check` passed, and `git diff --check` reported only existing CRLF normalization warnings.

## Prompt 5 - Profile Page Memory Polish

Make profile pages feel warmer and more complete without requiring real uploaded photos.

Scope:

- Review public demo profile and private blocked profile states.
- Improve profile layout for bio, birthday, parents, spouse/partner, children, photo placeholder, and return buttons.
- Add a tasteful empty-photo/empty-bio treatment that feels intentional.
- Keep owner edit controls unchanged unless a tiny clarity fix is obvious.
- Do not expose private data while signed out.

Acceptance:

- Public demo profiles feel like real readable pages.
- Private profile blocking remains strict.
- Mobile layout stays clean.
- Local checks pass.

Status: Done locally June 4, 2026. See Prompt 5 Findings.

Prompt 5 Findings:

- Warmed up the profile page without changing owner edit/delete permissions.
- Added an intentional empty-photo placeholder with initials for public/demo profiles and a generic `FT` private placeholder for blocked private profiles.
- Reworked profile facts into readable rows for birthday, parents, spouse/partner, children, bio, and birthday note.
- Added a warmer empty-bio message so public demo profiles do not feel unfinished when no real story has been added yet.
- Kept signed-out private profile blocking strict:
  - private person names did not render
  - private person IDs did not render
  - edit/delete controls stayed hidden
  - no profile image was requested or shown
- Browser smoke passed locally:
  - `/profile?person=demo-g2-11&demo=large&from=tree` rendered a made-up public profile with the placeholder, relationship links, bio treatment, and no page-level horizontal overflow
  - `/profile?person=colety_rose&familyId=colety-birthday-tree&from=tree` rendered only the private blocked state with no Colety data leak
- Static responsive assertions passed for one-column mobile profile layout and stacked fact rows.
- Verification: `npm.cmd run check` passed, and `git diff --check` reported only existing CRLF normalization warnings.
- Note: the in-app browser log still showed one stale `MutationObserver` error from an earlier failed local navigation; `rg` found no `MutationObserver` usage in the profile path, and the profile smoke data rendered correctly.

## Prompt 6 - Print And Screenshot-Friendly Tree View

Add a print/export-friendly mode for the family tree page.

Scope:

- Add a `Print view` or `Presentation view` control for the tree.
- Add CSS `@media print` rules for the tree/profile pages.
- Hide nav/tool chrome in print mode.
- Keep the chart/card content readable on paper or PDF.
- If true image export is too risky, document it as future work and make print excellent first.

Acceptance:

- Browser print preview would show a cleaner tree than the normal app chrome.
- The normal app view is unchanged unless the user toggles print/presentation view.
- Local checks pass.

Status: Done locally June 4, 2026. See Prompt 6 Findings.

Prompt 6 Findings:

- Added a top-level `Presentation View` control and `Print / PDF` control on the Family Tree page.
- Presentation View hides app chrome on screen:
  - header
  - footer
  - access-code banner
  - sidebar/tool rail
  - floating Add Person button
- Presentation View keeps the title/action strip visible so the user can exit or print.
- Escape exits Presentation View and restores the normal toolbar.
- Added tree `@media print` rules:
  - landscape page setup
  - hide nav/tool chrome, modals, add button, mobile cue, and print controls
  - keep chart/card canvas readable with print-friendly sizing, borders, and no shadows
  - avoid splitting cards/generation blocks where possible
- Added profile `@media print` rules:
  - hide nav/footer/edit controls/modals
  - print the profile as a clean memory sheet with photo/placeholder plus facts
- Browser smoke passed locally on `/tree?demo=large&view=cards`:
  - controls rendered
  - Presentation View entered
  - header/sidebar/footer hid
  - print controls stayed visible
  - Escape exited and restored the toolbar
- Static assertions passed for tree/profile print CSS and responsive stacking for the new title/action row.
- Verification: `npm.cmd run check` passed, and `git diff --check` reported only existing CRLF normalization warnings.
- Deferred: true image export/download is still future work. For this release, browser Print/PDF is the supported export path.

## Prompt 7 - Data Health Inspector

Create a non-destructive data-health tool for demo and signed-in data.

Scope:

- Add a hidden/dev-friendly data health panel or route, or add it under existing tree tools.
- Report duplicate names, missing birthdays, missing bios, missing photos, people with no parents/children/spouse, one-way spouse links, unresolved legacy name relationships, and disconnected people.
- For signed-out public demo, run against example data.
- For private trees, only run when authorized data is already loaded client-side.
- Do not write to Firestore.

Acceptance:

- The tool helps spot problems without changing data.
- Public demo health report works.
- Private behavior does not weaken permissions.
- Local checks pass.

Status: Done locally June 4, 2026. See Prompt 7 Findings.

Prompt 7 Findings:

- Added a read-only `Data health` tool to the Family Tree sidebar.
- The inspector runs only against the people already loaded into the current tree page.
- It does not write to Firestore, Storage, local data, or relationship records.
- Public demo report checks:
  - duplicate names
  - broken parent IDs
  - broken spouse/partner IDs
  - self parent/spouse links
  - unresolved legacy parent names
  - unresolved legacy spouse names
  - one-way spouse links
  - more-than-two-parent resolution
  - disconnected people
  - missing birthdays
  - missing bios
  - missing photos
  - no parents/spouse/children listed
- Private behavior stays behind the existing load/auth path:
  - signed-out private tree URL showed only `Sign in needed`
  - Data Health stayed in its empty loading state
  - no private names or private person IDs rendered
- Browser smoke passed locally:
  - `/tree?demo=large&view=cards&fresh=health-final` rendered 80 public demo people and a data-health report with `0 Errors`, `5 Warnings`, and no Colety/private data
  - `/tree?familyId=colety-birthday-tree&view=cards` stayed blocked while signed out and did not populate a report
  - no page-level horizontal overflow at the available desktop viewport
- Verification: `npm.cmd run check` passed, and `git diff --check` reported only existing CRLF normalization warnings.
- Note: browser logs still include the same stale `MutationObserver` error timestamp seen in earlier smoke runs; no `MutationObserver` code is on this new data-health path.

## Prompt 8 - Keyboard And Accessibility Pass

Improve keyboard navigation and screen-reader clarity across the main demo path.

Scope:

- Audit Home, Tree, Search/Directory, Account signed-out, and Profile public/private states.
- Add missing labels, `aria-expanded`, `aria-controls`, focus states, dialog focus handling, and button text where needed.
- Ensure icon/account buttons have useful accessible names.
- Avoid visual redesign unless needed for focus clarity.

Acceptance:

- Main controls are reachable and understandable by keyboard.
- Dialogs/panels expose useful names and state.
- No regression to visual layout.
- Local checks pass.

Status: Done locally June 4, 2026. See Prompt 8 Findings.

Prompt 8 Findings:

- Added shared `:focus-visible` styling for links, buttons, summaries, account links, action buttons, and form controls so keyboard focus is easier to see without changing the visual layout.
- Improved Home accessibility:
  - hero/create/join buttons now declare controlled regions
  - family form status is a polite status region
  - create/join forms describe themselves with the shared status message
- Improved Family Tree accessibility:
  - Find Person prev/next controls name the chart/selected-person regions they affect
  - recent people clear button has a clearer accessible name
  - relationship, birthday, missing info, stats, and data-health panels announce updates as status regions
  - Add Person dialog has a description, status role, and better form help
  - Add Person and Full Screen buttons now maintain useful accessible state/name in JS
  - selected-person profile/edit/focus controls get person-specific accessible labels
- Improved Directory/Search accessibility:
  - search context is a polite status region
  - directory form has `role="search"`
  - search results and memory cards are named regions
  - Add Person dialog matches the tree-page dialog accessibility pattern
- Improved Account and Sign In accessibility:
  - account status/list regions have useful roles/labels
  - sign-out button is tied to the current account email copy
  - sign-in status is a status region
  - auth mode toggle updates `aria-pressed`
  - missing email/password fields are marked `aria-invalid` and focused before submission
  - account icon link now announces the signed-in email when available
- Improved Profile accessibility:
  - profile status/edit state announce updates
  - Edit Profile button exposes dialog state with `aria-expanded`
  - edit/delete controls are tied to the current edit-permission message
  - edit dialog now has intro/help text and a fuller accessible description
- Browser smoke passed locally on:
  - `/`
  - `/tree?demo=large&view=cards`
  - `/search?demo=large`
  - `/signin`
  - `/account`
  - `/profile?person=demo-g2-11&demo=large&from=tree`
- Browser checks confirmed the new roles/labels/states and no page-level horizontal overflow at the available desktop viewport.
- Verification: `npm.cmd run check` passed, and `git diff --check` reported only existing CRLF normalization warnings.
- Note: browser logs still include the same stale `MutationObserver` error timestamp from an earlier shared browser session; the prompt 8 route assertions loaded correctly.

## Prompt 9 - Mobile Tree Comfort Pass

Do a focused mobile polish pass that does not require login.

Scope:

- Test public `/`, `/tree?demo=large`, `/tree?demo=large&view=cards`, `/search?demo=large`, and public demo profiles at phone width.
- Fix cramped controls, sticky/floating collisions, panel spacing, tool wrapping, and tap target size.
- Pay special attention to Find Person, selected-person details, Relationship Finder, and the sidebar/tool panel.
- Keep desktop layout intact.

Acceptance:

- Public demo path is comfortable on a phone-sized viewport.
- No page-level horizontal overflow.
- Buttons feel tappable.
- Local checks and browser smoke pass.

Status: Done locally June 4, 2026. See Prompt 9 Findings.

Prompt 9 Findings:

- Tightened mobile layout without changing the desktop structure.
- Improved mobile grids so Account/dashboard tree cards, birthday prep cards, search results, and profile memory cards collapse to one column instead of risking narrow overflow.
- Improved landing page mobile comfort:
  - nav remains single-column on very small screens
  - hero/action/account buttons keep larger tap targets
  - the preview `Highlight a branch` control now behaves like a tappable mobile button
- Improved Family Tree mobile comfort:
  - title/action controls wrap into practical grids
  - Find Person controls keep large tap targets
  - density/view controls stack on very small screens
  - selected-person, relationship, birthday, missing-info, stats, and data-health text wraps instead of pushing the page sideways
  - fullscreen chart/card mode has tighter phone padding
- Improved embedded chart mobile comfort:
  - controls stack at tablet/phone widths
  - embedded chart cards shrink slightly on narrow screens
  - selected-person details/actions stack cleanly
  - chart embed keeps a shorter phone viewport height so the page feels less trapped
- Improved public profile phone layout:
  - profile cards use tighter spacing
  - profile headings scale down on very small screens
  - profile action buttons stack full-width
- Phone-width smoke passed locally at `390x844` for:
  - `/`
  - `/tree?demo=large`
  - `/tree?demo=large&view=cards`
  - `/search?demo=large`
  - `/profile?person=demo-g2-11&demo=large&from=tree`
- The phone smoke confirmed no page-level horizontal overflow and no visible tappable controls under 40px on the tested public routes.
- In-app browser smoke passed locally on `/tree?demo=large&view=cards`: route loaded, toolbar/tree rendered, and no page-level horizontal overflow was detected.
- Verification: `npm.cmd run check` passed, and `git diff --check` reported only existing CRLF normalization warnings.
- Note: this was a no-login public demo pass. Owner-only mobile flows still need live testing when the release pass gets back to authenticated paths.

## Prompt 10 - Empty, Loading, And Error State Cleanup

Hunt down awkward blank/loading/error states and make them feel intentional.

Scope:

- Search for loading, error, empty, and permission copy across HTML/JS.
- Improve states for Account, Tree, Search/Directory, Profile, Add Person, Relationship Finder, Birthdays, Missing Info, and Family Stats.
- Replace technical wording with plain, calm copy.
- Add retry/action buttons only where they are genuinely useful.
- Do not hide real permission failures.

Acceptance:

- No obvious route shows a weird blank card or permanent spinner.
- Permission states are clear and reassuring.
- Local checks pass.

Status: Done locally June 4, 2026. See Prompt 10 Findings.

Prompt 10 Findings:

- Cleaned up awkward empty/loading/error states without changing data permissions or broad app behavior.
- Improved Family Tree state cards:
  - signed-out private tree now offers a `Sign In` action
  - signed-in account with no connected tree now offers `Open Account`
  - archived/unavailable trees point users back to Account or Refresh
  - tree load failures now offer `Refresh` plus `Open Account`
- Improved tree tool empty states:
  - Relationship Finder starts with clearer loaded-tree guidance
  - Birthdays explains that birthdays appear after opening a tree
  - Missing info explains it checks photos, birthdays, stories, and relationships
  - Family stats explains it covers stats, birthday coverage, and cleanup progress
  - Data health explains it checks broken links, duplicate names, and missing basics
- Improved Account states:
  - signed-out Account now explains that tree/access controls appear after sign-in
  - unavailable Account state now includes `Refresh` and `Go Home` actions
  - permission/load copy is clearer about owner/editor/viewer access
- Improved Directory/Search states:
  - no-people, private-tree, no-connected-tree, and unavailable states now include useful next-step actions
  - loading placeholder is now an intentional loading skeleton instead of plain `Loading people...`
- Improved Profile states:
  - profile page starts with a clear loading status
  - successful profile load now clears the loading state instead of leaving stale status text
  - profile status supports loading/success/error tones
  - missing birthday note now tells users to add a birthday instead of saying no fun fact is available
  - profile load failure copy now points to refresh/access confirmation
- Improved Add Person states:
  - add-person status supports loading/success/error tones
  - relationship-option failures and editor-access checks now explain what to try next
- Improved connected chart error states:
  - empty chart data explains to add people and refresh
  - render failures no longer expose raw technical errors to users; the console still keeps the details
- Browser smoke passed locally on:
  - `/`
  - `/tree?demo=large`
  - `/tree?demo=large&view=cards`
  - `/search?demo=large`
  - `/profile?person=demo-g2-11&demo=large&from=tree`
  - `/account`
- Smoke checks confirmed route titles rendered, new state text appeared where expected, and no page-level horizontal overflow appeared.
- In-app browser smoke passed locally on signed-out `/account`: status rendered, empty state rendered, and no page-level horizontal overflow was detected.
- Verification: `npm.cmd run check` passed, and `git diff --check` reported only existing CRLF normalization warnings.
- Note: owner-only error states still need live Firebase verification for actual account permissions, Storage upload failures, and Firestore rules behavior.

## Prompt 11 - Small Bug Sweep

Do a scoped bug hunt for low-risk fixes.

Scope:

- Review console-related notes, reset-password flow, double-click/nav issues, stale hidden buttons, dead controls, and old copy.
- Fix only obvious bugs that do not need owner login or real data mutation.
- Confirm `/api/funfact` is still deferred and not called from Firebase-hosted pages.
- Do not expand scope into new features.

Acceptance:

- Small obvious bugs are fixed or documented.
- No feature churn.
- Local checks pass.

Status: Done locally June 4, 2026. See Prompt 11 Findings.

Prompt 11 Findings:

- Completed a scoped bug sweep without adding new features.
- Fixed a small auth/reset-password bug risk:
  - Reset Password now shows a loading state while sending.
  - Reset Password disables itself while the request is in flight so repeated clicks cannot fire duplicate reset emails.
  - Google sign-in also disables itself while its popup flow is in flight.
  - Auth form status now uses the shared loading/success/error visual states.
  - Create Account mode now switches the password field to `autocomplete="new-password"`; Sign In mode switches it back to `current-password`.
- Rechecked known access-code reset behavior:
  - reset still requires confirmation
  - displayed access code updates after success
  - invite message refreshes after reset
  - success/error status is shown near the code
  - no code change was needed there during this sweep
- Confirmed `/api/funfact` remains deferred:
  - static scan found no `/api/funfact` or fun-fact API `fetch(...)` calls from hosted HTML/CSS/JS
  - profile birthday note remains local/static copy
- Browser smoke passed locally:
  - `/signin` Reset Password with a blank email showed `Enter your email first...`, marked the email field invalid, and did not send a reset request
  - mode toggle changed to Create Account, cleared stale status text, and switched password autocomplete to `new-password`
  - Home `View Example Tree` navigated to `/tree` on the first click
  - no page-level horizontal overflow was detected in the smoke route
- Verification: `npm.cmd run check` passed, and `git diff --check` reported only existing CRLF normalization warnings.
- Remaining live-only items: password reset email delivery, Google popup success/cancel behavior, invite-code reset on the real owner account, and private-tree permission failures still need Firebase/live testing.

## Prompt 12 - Nice-To-Have Fun Batch

Add one or two small fun tools only after higher-priority polish is stable.

Scope:

- Pick from:
  - `Family stats` visual cards with oldest/youngest/generation count.
  - `On this day` static/local birthday fact fallback.
  - `Random relative spotlight` for public demo and private loaded trees.
  - `Family name cloud` based on last names.
  - `Recent profile trail` improvements.
- Choose the lowest-risk options that add delight without confusing the main flow.
- Keep everything client-side.

Acceptance:

- The additions are genuinely fun and easy to understand.
- They do not clutter the main tree view.
- Public demo works without auth.
- Local checks pass.

Status: Completed.

Result:

- Added a tucked-away `Relative spotlight` inside Family stats for both public demo and private loaded trees.
- Added a client-side `Family name cloud` based on loaded last names.
- Kept both additions inside the existing Family stats drawer so the main tree view stays uncluttered.
- Checks passed: `npm.cmd run check`, `git diff --check` (line-ending warnings only), local Browser smoke on `/html/tree_page.html?demo=large&fresh=prompt12`.

## Prompt 13 - Post-Upgrade Release Readiness

After several prompts are completed, prepare the next release checkpoint.

Scope:

- Review changed files and summarize the proposed commit scope.
- Run `npm.cmd run check`, `git diff --check`, static route/asset checks, and browser smoke for the affected public routes.
- Update `DEPLOYMENT_CHECKLIST.md` and this queue with what is ready.
- Do not commit, push, or deploy unless Spencer explicitly asks.

Acceptance:

- Release state is clear.
- Remaining owner-live checks are still listed.
- Generated artifacts stay uncommitted.
- Checks pass.

Status: Completed.

Result:

- Reviewed the changed-file scope and summarized the proposed release commit in `DEPLOYMENT_CHECKLIST.md`.
- Added the `June 4 While-Away Upgrades Release Checkpoint` with ready state, local checks, and remaining live Firebase gates.
- Checks passed: `npm.cmd run check`, `git diff --check` with line-ending warnings only, route-aware Firebase rewrite/asset check, and local browser smoke for Home, Large Demo Tree Chart, Card fallback, hidden Family Directory, Sign In, Account, and a large-demo Profile.
- No commit, push, or deploy was performed.
