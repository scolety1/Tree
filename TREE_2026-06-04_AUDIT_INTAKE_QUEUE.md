# Tree Audit Intake Queue - June 4, 2026

Use this file to paste the external audit report and turn it into short prompts.

## Current Package

- Audit zip: `TREE_EXTERNAL_AUDIT_PACKAGE_2026-06-04.zip`
- Audit prompt: `TREE_EXTERNAL_AUDIT_PROMPT_2026-06-04.md`
- Package contents verified: 38 files.
- Note: the unpacked folder `TREE_EXTERNAL_AUDIT_PACKAGE_2026-06-04/` is generated only for packaging review. The zip is the handoff artifact.

## Waiting-Room Pass - June 4, 2026

Status: Done locally. No commit, push, or deploy.

Checks run:

- `npm.cmd run check` passed.
- `git diff --check` passed with Windows line-ending warnings only.
- Local HTML asset/link check passed for same-origin static files and known Firebase routes.
- Audit zip contents verified with `tar -tf`.
- Public Firebase routes returned HTTP 200 and include no-cache plus report-only CSP headers:
  - `/`
  - `/tree?demo=large`
  - `/tree?demo=large&view=cards`
  - `/search?demo=large`
  - `/account`
  - `/profile?person=colety_rose&familyId=colety-birthday-tree&from=tree`

Waiting-room findings:

- Live Firebase is behind the local package until the next deploy. Example: live `/search?demo=large` still reports title `People Directory | Family Tree`, while local `html/search_page.html` now says `Family Directory | Family Tree`.
- Intake prompts 1-6 are now complete locally. The remaining blocker is commit/deploy/live smoke, not more local triage for these prompts.
- Untracked generated audit artifacts are present. Before committing, decide whether to keep only `TREE_EXTERNAL_AUDIT_PROMPT_2026-06-04.md`, `TREE_EXTERNAL_AUDIT_PACKAGE_2026-06-04.zip`, and this intake doc, or leave old audit zips out of the commit.
- No app-owned `MutationObserver` usage was found by repo search; keep treating the recurring browser log as extension/browser noise unless a clean Chrome stack says otherwise.

## Paste External Audit Here

Source file: `C:\Users\codex-agent\Downloads\Family Tree Layout Strategy (6).docx`

Extracted text: `TREE_EXTERNAL_AUDIT_REPORT_2026-06-04_EXTRACTED.txt`

Verdict: Almost ready for the birthday demo.

Summary:

- Most major issues from earlier audits are addressed: mobile Add Person overlap, Find Person selected-person panel, explicit demo/private profile context, cleaner signed-in navigation, Recently Viewed, relative chips, owner Account checklist, and stronger Firebase rules.
- The main local blocker from the audit, public demo consistency, is now addressed locally in Prompt 1. It still needs live post-deploy verification.
- The second blocker is release mechanics: several fixes are local and need final commit/deploy/live smoke before the birthday demo.
- Owner-only live testing remains required for profile photo upload/replace/remove, Add Person, selected-person panel, invite code copy/reset, and the Account birthday checklist.

---

## Triage

### P0 Demo Blockers

- Public demo data consistency: done locally in Prompt 1; verify `/tree`, `/tree?demo=large`, and `/search?demo=large` after deploy.
- Deploy and live smoke: final local fixes are not necessarily deployed; live site must be updated and checked before family sees it.

### P1 Should Fix Before Birthday

- Selected-person panel and quick-action chip clarity: group or label parents/spouse/children/siblings, make wrapping graceful on mobile, and avoid empty relative/recent UI.
- Profile back-link context audit: verify all profile links set `from`, `demo`, `source`, `familyId`, `view`, and return context correctly.
- Invite-code card mobile polish: ensure code, Copy Code, Reset Code, and invite message controls are visually separated and accessible.

### P2 Nice Polish

- CSP: keep report-only for birthday demo, but document the enforcement plan.
- Memory Wall and hidden directory: hide unfinished sections or label them clearly as secondary/owner/admin surfaces.
- Console warning note: document that `MutationObserver.observe` has no app-owned source unless reproduced in a clean browser profile.

### Needs Live Owner Test

- Sign in as `smcolety@gmail.com`.
- Open Account and confirm owner checklist, invite code, Copy, Reset, and role controls.
- Open private tree and test selected-person panel, Recently Viewed, relative chips, Add Person, and mobile behavior.
- Upload, replace, remove, and reject invalid profile photos.
- Verify viewer/editor/non-member permissions.

## Prompt Queue

Use these prompts one at a time.

### Prompt 1 - Unify Public Demo Data

Scope:

- Finish the pending public-demo data work from the June 4 audit.
- Ensure `/tree`, `/tree?demo=large`, and `/search?demo=large` use the same polished made-up non-Colety family data.
- Remove stale Tim/Colety placeholder public-demo naming from signed-out/example flows unless it is private starter data.
- Keep private Colety starter tree data private and unchanged.
- Update public demo/search copy if needed so users understand they are viewing a read-only example family.

Acceptance:

- Signed-out `/tree` shows a polished non-Colety example.
- Signed-out `/tree?demo=large` and `/search?demo=large` agree on people, names, and count.
- No public example route suggests it is Spencer's real family.
- Local checks pass.

Status: Done June 4, 2026. See Prompt 1 Findings.

Prompt 1 Findings - June 4, 2026:

- Routed signed-out public tree views through the generated made-up demo dataset instead of the older Firestore `example` fallback.
- Routed `/search?demo=large` and signed-out public search through the same generated demo dataset, so tree/search people, names, and counts now match.
- Updated public search context copy to make it clear users are browsing a read-only made-up example family.
- Added public demo profile fallback so generated demo people can be opened from public search/tree links without loading stale Tim/Colety placeholder records.
- Kept private family data and the private Colety starter tree path unchanged.
- Verification: `npm.cmd run check` passed, generated demo sanity check returned 80 people with zero Tim/Colety matches, and `git diff --check` reported only existing CRLF normalization warnings.
- Local browser smoke passed for `/tree`, `/tree?demo=large`, `/search?demo=large`, and `/profile?person=demo-g1-01&demo=large&from=search`.
- Still needs live check after deploy for the same public routes.

### Prompt 2 - Selected-Person And Recently Viewed Polish

Scope:

- Polish the selected-person panel and quick actions without changing the tree architecture.
- Group or label relative quick chips by relationship: parents, spouse/partner, children, siblings.
- Make chips wrap gracefully on narrow screens.
- Ensure the Recently Viewed section is fully hidden when empty, including heading and Clear button.
- Limit long relative lists and show a compact overflow cue if needed.

Acceptance:

- Selecting a person in large demo and private tree shows clear relative actions.
- Empty Recently Viewed state does not show dead UI.
- Mobile-sized layout has no awkward chip overflow or large dead space.
- Local checks pass.

Status: Done June 4, 2026. See Prompt 2 Findings.

Prompt 2 Findings - June 4, 2026:

- Grouped selected-person quick actions into Parents, Spouse/partner, Children, and Siblings instead of one mixed chip pile.
- Added per-group caps with compact `+N more` overflow chips for long relative lists.
- Tightened chip wrapping and mobile sizing so long names do not force awkward horizontal overflow.
- Kept Recently Viewed fully hidden when empty and added an explicit hidden aria state when the panel has no people.
- Verification: `npm.cmd run check` passed, and `git diff --check` reported only existing CRLF normalization warnings.
- Local browser smoke passed for large demo selected-person panel on desktop and 390px mobile, including Clear Recently Viewed hiding the full section.
- Still needs live/private-tree check after deploy with a signed-in owner account.

### Prompt 3 - Profile Link And Return Path Audit

Scope:

- Audit profile link construction in `js/tree.js`, `js/search.js`, `js/familyChartSpike.js`, and `js/dashboard.js`.
- Confirm profile URLs preserve `person`, `familyId`, `demo`, `source`, `from`, `view`, `treeQuery`, `query`, and `sort` where appropriate.
- Add a defensive fallback in `js/profile.js` for ambiguous or mismatched `from` context.
- Prevent public demo profiles from using private stored family context.

Acceptance:

- Tree -> Profile -> Back returns to the same tree context.
- Directory -> Profile -> Back returns to the same query/sort context.
- Demo profile links never expose private tree context.
- Local checks pass.

Status: Done June 4, 2026. See Prompt 3 Findings.

Prompt 3 Findings - June 4, 2026:

- Audited profile link construction in `js/tree.js`, `js/search.js`, `js/familyChartSpike.js`, and `js/dashboard.js`.
- Made tree profile URLs carry explicit demo context for public generated demo people instead of relying on fallback behavior.
- Added a defensive profile resolver so generated `demo-*` profile IDs never fall through to stored private family context.
- Added support for legacy/ambiguous source parameters such as `source=demo`, `source=example`, `source=large`, `source=search`, and directory URLs that only include `query` or `sort`.
- Preserved `treeQuery` through the embedded Family Chart profile link path.
- Confirmed dashboard does not construct person profile URLs directly; its tree and directory links already preserve `familyId`.
- Verification: `npm.cmd run check` passed, and `git diff --check` reported only existing CRLF normalization warnings.
- Local browser smoke passed for Tree -> Profile -> Back, ambiguous generated demo profile fallback, and Directory -> Profile -> Back with `demo`, `query`, and `sort` preserved.
- Still needs live/private-tree check after deploy with a signed-in owner account.

### Prompt 4 - Account Invite-Code Card Polish

Scope:

- Review Account invite-code layout and mobile tap targets.
- Keep the code in its own visual block.
- Keep Copy Code, Reset Code, Copy Message, Friendly, and Short controls visually separate.
- Confirm accessible labels exist for copy/reset/message actions.
- Avoid broad Account redesign.

Acceptance:

- On desktop and phone widths, Copy and Reset cannot be mistaken as part of the code text.
- Owner checklist and invite controls coexist without crowding the Account card.
- Local checks pass.

Status: Done June 4, 2026. See Prompt 4 Findings.

Prompt 4 Findings - June 4, 2026:

- Split the Account invite card into separate code-display, code-action, and invite-message-action groups.
- Kept the invite code in its own visual block with monospace styling, stronger contrast, and a border distinct from buttons.
- Kept Copy Code and Reset Code in a separate action block so they cannot read as part of the invite code.
- Kept Copy Message, Friendly, and Short in their own invite-message action block.
- Added/confirmed accessible labels for the code, Copy Code, Reset Code, Copy Message, Friendly, and Short controls.
- Kept the owner birthday checklist separate from the invite panel without broad Account redesign.
- Verification: `npm.cmd run check` passed, and `git diff --check` reported only existing CRLF normalization warnings.
- Browser fixture smoke was not completed because the in-app browser blocked `data:` fixture pages by policy.
- Still needs live signed-in Account check after deploy on desktop and phone widths.

### Prompt 5 - Hide Or Clarify Unfinished Secondary Features

Scope:

- Review `/search` Family Directory and Memory Wall.
- Hide Memory Wall if it still has no real implementation, or replace loading copy with a clear future-feature/empty-state message.
- Keep the hidden directory useful for owner/admin testing but avoid making it look like the primary experience.
- Update docs/copy to match whatever is visible.

Acceptance:

- No route shows a permanently loading Memory Wall.
- Hidden Family Directory copy feels intentional and secondary.
- Public signed-out routes remain polished.
- Local checks pass.

Status: Done June 4, 2026. See Prompt 5 Findings.

Prompt 5 Findings:

- Family Directory copy now labels `/search` as a secondary owner/testing view and points birthday-demo users back to the Family Tree page.
- Memory Wall is hidden by default and only appears when profiles have real photo/story content to show.
- Removed the permanent "Loading family memories..." placeholder from the initial HTML.
- Verification: `/search?demo=large` local browser smoke passed, including filtered search for `graham`; no stale Memory Wall loading copy appeared.
- Verification: `npm.cmd run check` passed, and `git diff --check` reported only existing CRLF normalization warnings.
- Still needs a live post-deploy check for public signed-out `/search?demo=large` and any private tree that has real memory/photo content.

### Prompt 6 - Docs And Console Noise Cleanup

Scope:

- Update `README.md`, `DEPLOYMENT_CHECKLIST.md`, and `5-21_WORKSHEET.md` with the June 4 audit status.
- Document that CSP stays report-only for the birthday demo, with enforcement deferred until CDN/Firebase allowlists are verified.
- Document the `MutationObserver.observe` warning as non-app-owned unless reproduced in a clean browser profile.
- Cross off or mark complete the June 4 queue items that are actually done, while keeping Prompt 5 and live owner tests visible.

Acceptance:

- Docs clearly show the remaining birthday release gates.
- No stale instruction implies already-deployed local work is live.
- Local checks pass.

Status: Done June 4, 2026. See Prompt 6 Findings.

Prompt 6 Findings:

- Updated `README.md` so it reflects the current birthday-release app: signed-out demo, private owner/editor CRUD, large-tree chart, photo/profile support, Account readiness tools, and hidden secondary People Directory.
- Added June 4 audit-intake status to `DEPLOYMENT_CHECKLIST.md`, including local prompts 1-6 completion, the live owner/editor/viewer release gates, CSP report-only guidance, and the `MutationObserver.observe` console note.
- Added June 4 audit-intake status to `5-21_WORKSHEET.md` with the same live gates and security/console notes.
- Reconciled stale intake-summary language that still described public-demo consistency as unfinished; it is now marked done locally with live post-deploy verification still required.
- CSP remains report-only for the birthday demo. Enforcement stays deferred until Firebase Auth, Firestore, Storage, same-origin route loading, jsDelivr Family Chart assets, and allowed profile-photo URLs are verified from live browser reports.
- `MutationObserver.observe` remains documented as non-app-owned unless reproduced in a clean normal browser profile with an app stack trace.
- Verification: `npm.cmd run check` passed, and `git diff --check` reported only existing CRLF normalization warnings.

### Prompt 7 - Predeploy Release Cleanup

Scope:

- Review changed and untracked files.
- Decide what belongs in the next commit and what should stay untracked/generated.
- Remove or ignore only generated duplicate audit artifacts if safe; do not delete useful source/docs without explicit reason.
- Run `npm.cmd run check`, `git diff --check`, route/asset static checks, and summarize deploy readiness.
- Do not commit, push, or deploy unless explicitly asked.

Acceptance:

- Repo has a clean proposed commit scope.
- Generated artifacts are documented or cleaned.
- Checks pass.
- Remaining live-only tests are listed.

Status: Done June 4, 2026. See Prompt 7 Findings.

Prompt 7 Findings:

- Proposed next commit scope:
  - App/UI/code/rules: `.gitignore`, `css/family_tree.css`, `css/global.css`, `firebase.json`, `html/home_page.html`, `html/search_page.html`, `html/tree_page.html`, `js/dashboard.js`, `js/familyChartSpike.js`, `js/helpers.js`, `js/home.js`, `js/main.js`, `js/postPeople.js`, `js/profile.js`, `js/search.js`, `js/tree.js`, and `storage.rules`.
  - Docs/queues: `README.md`, `DEPLOYMENT_CHECKLIST.md`, `5-21_WORKSHEET.md`, `TREE_2026-06-04_EXTERNAL_AUDIT_QUEUE.md`, and `TREE_2026-06-04_AUDIT_INTAKE_QUEUE.md`.
- Generated artifacts to leave uncommitted:
  - `TREE_EXTERNAL_AUDIT_*.txt`
  - `TREE_EXTERNAL_AUDIT_*.md`
  - `TREE_EXTERNAL_AUDIT_*.zip`
  - `TREE_EXTERNAL_AUDIT_PACKAGE_*/`
  - `TREE_QA_REVIEW_*.zip`
  - `firestore-debug.log`
- Added `.gitignore` entries for those generated audit bundles/reports and Firebase debug logs so the release commit stays focused. No generated artifact was deleted.
- Current cleaned status after ignore rules: modified release files plus two useful untracked queue docs remain visible.
- Static route/asset check passed: 9 Firebase Hosting rewrites and 7 HTML files were checked for missing same-origin destinations/assets/imports. The intentional `about:blank` iframe was excluded as a non-file URL.
- Verification: `npm.cmd run check` passed, and `git diff --check` reported only existing CRLF normalization warnings.
- Deploy readiness: ready for Prompt 8 commit/deploy/public smoke, assuming the proposed commit scope looks right.
- Remaining live-only tests:
  - Public signed-out `/`, `/tree`, `/tree?demo=large`, `/tree?demo=large&view=cards`, `/search?demo=large`, `/account`, and signed-out private profile route.
  - Owner signed-in `/account`, `/tree?familyId=colety-birthday-tree`, profile edit, Add Person, selected-person panel, invite-code copy/reset, and photo upload/replace/remove.
  - Viewer/editor/non-member permissions and private-data blocking.
  - Live report-only CSP console reports and any clean-browser `MutationObserver.observe` reproduction.

### Prompt 8 - Deploy And Public Smoke

Scope:

- After approval, commit the release fixes and deploy hosting plus Firestore/Storage rules.
- Run Firebase deploy: `firebase deploy --only hosting,firestore:rules,storage --project tree-72e80`.
- Smoke public routes on desktop/mobile-sized viewports or HTTP/browser equivalent:
  - `/`
  - `/tree`
  - `/tree?demo=large`
  - `/tree?demo=large&view=cards`
  - `/search?demo=large`
  - `/account`
  - signed-out private profile route

Acceptance:

- GitHub Actions pass if pushed.
- Live public routes return 200 and show current local copy.
- No old public-demo naming mismatch remains.
- Add Person stays hidden for signed-out/read-only public routes.
- CSP report-only/no-cache headers remain present.

Status: Done June 4, 2026. See Prompt 8 Findings.

Prompt 8 Findings:

- Firebase deploy completed successfully with:
  - `firebase deploy --only hosting,firestore:rules,storage --project tree-72e80`
- Deployed targets:
  - Firebase Hosting
  - Firestore rules
  - Storage rules
- Live Hosting URL: `https://tree-72e80.web.app`
- Public browser smoke passed while signed out:
  - `/`
  - `/tree`
  - `/tree?demo=large`
  - `/tree?demo=large&view=cards`
  - `/search?demo=large`
  - `/account`
  - `/profile?person=colety_rose&familyId=colety-birthday-tree&from=tree`
- Public demo findings:
  - `/tree` and `/tree?demo=large` now show the made-up Johnson/example family, not old Tim/Colety placeholder data.
  - `/search?demo=large` now shows `Family Directory | Family Tree`, the secondary owner/testing copy, 80 example people, and no permanent Memory Wall loading state.
  - Signed-out public routes did not expose Add Person controls.
  - Signed-out private profile route blocked Colety private profile details and showed sign-in/private-tree copy.
  - Browser smoke found no page-level horizontal overflow at the available desktop viewport.
- HTTP/header smoke passed for every route above:
  - status 200
  - `Cache-Control: no-cache, no-store, must-revalidate`
  - `Content-Security-Policy-Report-Only` present
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
- Verification before/after deploy:
  - `npm.cmd run check` passed.
  - `git diff --check` reported only existing CRLF normalization warnings.
  - Static route/asset check passed for 9 Firebase rewrites and 7 HTML files.
- Git commit was prepared after deploy/smoke so the repo records exactly what was released.
- GitHub Actions were not checked in this prompt because the prompt did not push to GitHub.
- Remaining release gate: Prompt 9 owner/editor/viewer live testing with `smcolety@gmail.com`, including private tree load, Add Person, profile edit, invite-code controls, photo upload/replace/remove, and permissions.

### Prompt 9 - Spencer Owner Live Test

Scope:

- Use the live owner account `smcolety@gmail.com` manually.
- Test Account checklist, invite code copy/reset, role controls, private tree load, Add Person, selected-person panel, Recently Viewed, relative chips, profile edit, photo upload/replace/remove, invalid photo rejection, viewer/editor/non-member permissions, and mobile layout.
- Record every bug and separate birthday blockers from post-demo polish.

Acceptance:

- Owner can complete the birthday demo path end to end.
- Viewer/editor/non-member permissions behave correctly.
- Photo Storage works against live rules.
- Any remaining issue is documented with severity.

Status: Pending.
