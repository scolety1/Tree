# Tree Release Fix Queue - June 3, 2026

Use this queue by sending prompts like:

`find TREE_2026-06-03_RELEASE_FIX_QUEUE.md and do prompt 1`

Goal: finish the practical release cleanup before the next Firebase deploy. Keep the app simple for the birthday demo: the tree is the main experience, add/edit controls are obvious for owner/editor accounts, and deployment happens only after local checks pass.

## Guardrails

- Keep `/tree` as the primary signed-in experience.
- Do not delete `/search`; keep it available as a hidden People Directory utility unless explicitly asked to remove it.
- Simplify the visible top navigation so users are not distracted by redundant routes.
- Preserve auth, owner/editor/viewer permissions, invite-code flow, and profile edit rules.
- Run `npm run check` and `git diff --check` after code changes.
- Browser-smoke desktop and phone-width routes when visible UI changes.
- Do not commit, push, or deploy unless the prompt explicitly asks for that step.

## Prompt 1 - Simplify Main Navigation

Remove the visible `People`/`Search` tab from the main header navigation for the birthday demo while keeping the `/search` route available as a hidden utility page. Signed-out nav should stay focused on `Home` and `Example Tree`. Signed-in nav should stay focused on `Family Tree` plus the account icon. Make the logo/home path sensible, preserve account/profile/tree context, update copy that points users to the old Search/People tab, and run checks plus browser-smoke.

Status: Done June 3, 2026. See "Prompt 1 Findings" below.

## Prompt 2 - Add And Edit Entry Points

Make add/edit flows obvious and usable from the main tree experience. Confirm `Add Person` is visible in Chart view, Card list, and People Directory only for owner/editor accounts. Make the selected-person panel clearly offer `Edit person`, `More details`, and useful profile/navigation actions. Confirm profile `?edit=1` opens the edit modal when authorized. Keep permission checks intact; do not expose edit controls to viewers, signed-out users, or read-only demo data. Run checks and browser-smoke.

Status: Done June 3, 2026. See "Prompt 2 Findings" below.

## Prompt 3 - Local Release Acceptance

Run a final local acceptance pass after prompts 1-2. Use `/`, `/tree`, `/tree?demo=large`, `/tree?demo=large&view=cards`, `/search`, `/account`, and representative profile URLs. Confirm no broken nav links, no body-level horizontal overflow on desktop/phone widths, no page exceptions, Add/Edit visibility is correct where locally testable, and docs/checklists reflect any remaining live Firebase testing. Do not commit, push, or deploy.

Status: Done June 3, 2026. See "Prompt 3 Findings" below.

## Prompt 4 - Commit And Push

Prepare the repo for GitHub. Review `git status`, keep the commit scoped to the release-fix work, run checks, stage the relevant files, commit with a concise message, and push to `main`. Do not deploy. Leave the GitHub Actions URL or exact run/check instructions so Spencer can confirm CI.

Status: Done June 3, 2026. Committed and pushed to `main`; see "Prompt 4 Findings" below.

## Prompt 5 - Firebase Deploy

Deploy the approved release-fix work to Firebase. Prefer `firebase deploy --only hosting --project tree-72e80` for UI-only changes. If rules changed in the final diff, deploy hosting plus Firestore/Storage rules with the appropriate Firebase command. After deploy, provide the live URLs for Home, Large Demo Tree, Card list fallback, Account, and any hidden People Directory route that should be spot-checked.

Status: Done June 3, 2026. Deployed to Firebase Hosting plus Firestore and Storage rules; see "Prompt 5 Findings" below.

## Prompt 6 - Live Smoke And Owner Checklist

After deploy, guide and/or perform a live smoke test. Confirm the live site shows the simplified nav, `Add Person` appears for the owner/editor in the real Colety tree, selected-person Edit/Profile actions work, profile edit modal opens, photo upload still needs or passes live Storage testing, and signed-out/non-member private data stays blocked. Update `DEPLOYMENT_CHECKLIST.md`, `5-21_WORKSHEET.md`, and this queue with pass/fail results and remaining Spencer-only items.

Status: Done June 3, 2026 for live guest/header smoke. Owner/editor/viewer Firebase checks still require Spencer's signed-in accounts; see "Prompt 6 Findings" below.

## Suggested Order

1. Prompt 1: simplify nav first, because it changes the main mental model.
2. Prompt 2: make add/edit obvious after the nav is cleaner.
3. Prompt 3: local acceptance before touching GitHub or Firebase.
4. Prompt 4: commit/push once local checks are clean.
5. Prompt 5: deploy after GitHub Actions passes.
6. Prompt 6: live smoke on Firebase and then custom domain when ready.

## Prompt 1 Findings - June 3, 2026

Status: Done locally; not committed, pushed, or deployed.

What changed:

- Removed the visible `People`/`Search` nav item from all shared headers.
- Kept `/search` available as a direct hidden People Directory utility route.
- Signed-out nav now stays focused on `Home` and `Example Tree`.
- Signed-in nav now stays focused on `Family Tree` plus the account icon.
- Added a clickable brand/logo link:
  - Signed out: goes to `/`.
  - Signed in: goes to `/tree` while preserving the current `familyId`, focus, view, or tree search context when available.
- Removed the normal Account page `People Directory` action so the visible owner path points back to the tree.
- Updated home-page copy that pointed users to the People page; it now points to `Find person` on the Family Tree page.
- Updated generic profile fallback copy so it no longer sends users toward the hidden People route.

Files changed in this prompt:

- `404.html`
- `css/global.css`
- `html/dashboard.html`
- `html/family_chart_spike.html`
- `html/home_page.html`
- `html/profile.html`
- `html/search_page.html`
- `html/signin.html`
- `html/tree_page.html`
- `js/dashboard.js`
- `js/main.js`
- `js/profile.js`
- `TREE_2026-06-03_RELEASE_FIX_QUEUE.md`

Local verification:

- `npm run check` passed.
- `git diff --check` passed with Windows line-ending warnings only.
- Desktop browser smoke passed for `/`, `/tree?demo=large`, `/account`, representative `/profile`, and `/search?query=tim`.
- Phone-width smoke passed for `/`, `/tree?demo=large`, `/account`, and `/search?query=tim`.
- Smoke confirmed:
  - no `#searchNavLink` exists in the checked routes,
  - signed-out nav is `Home | Example Tree`,
  - simulated signed-in nav is `Family Tree`,
  - brand link returns to `/` when signed out,
  - brand link returns to contextual `/tree` when signed in,
  - no page exceptions,
  - no body-level horizontal overflow.

Remaining live check:

- After deploy, sign in on Firebase Hosting and confirm the real auth state shows only `Family Tree` plus the account icon, with no People/Search tab.

## Prompt 2 Findings - June 3, 2026

Status: Done locally; not committed, pushed, or deployed.

What changed:

- `Add Person` now starts `hidden disabled` in HTML on Tree and hidden People Directory routes.
- Existing permission code remains the gate: the Add button is revealed only after `canEditFamily(...)` confirms the signed-in user is the owner or an editor for the active private tree.
- The Add button remains a labeled `+ Add Person` control instead of a mystery plus.
- Chart view no longer has CSS that hides Add Person; owner/editor accounts can see the same Add entry point in Chart view, Card list, and hidden People Directory after access is confirmed.
- The Family Chart selected-person panel now checks the active family role before showing `Edit person`.
- Demo/read-only chart people hide both `Edit person` and `More details`.
- Viewer/private-tree users can still use `More details`, but `Edit person` is hidden unless `canEditFamily(...)` is true.
- Selected-person action order is clearer: `Edit person`, `More details`, then `Focus in chart`.
- Empty/cleared selected-person panels now also clear stale action links.
- Profile `?edit=1` behavior remains intact and guarded by the profile page's owner/editor permission check.

Files changed in this prompt:

- `css/family_chart_spike.css`
- `css/global.css`
- `html/family_chart_spike.html`
- `html/search_page.html`
- `html/tree_page.html`
- `js/familyChartSpike.js`
- `TREE_2026-06-03_RELEASE_FIX_QUEUE.md`

Local verification:

- `npm run check` passed.
- `git diff --check` passed with Windows line-ending warnings only.
- Desktop smoke passed for `/tree?demo=large`, `/tree?demo=large&view=cards`, `/search?query=tim`, and `/profile?person=colety_rose&familyId=colety-birthday-tree&from=tree&edit=1`.
- Phone-width smoke passed for `/tree?demo=large`, `/tree?demo=large&view=cards`, and `/search?query=tim`.
- Smoke confirmed:
  - Add Person exists but is hidden/disabled for signed-out/read-only demo routes,
  - selected-person `Edit person` is hidden for read-only demo chart data,
  - selected-person `More details` is hidden for read-only demo chart data,
  - signed-out profile `?edit=1` does not open the edit modal,
  - no page exceptions,
  - no body-level horizontal overflow.

Remaining live check:

- Sign in as `smcolety@gmail.com` and confirm Add Person appears on the real Colety tree in Chart view and Card list.
- Confirm Add Person appears on `/search?familyId=colety-birthday-tree` only for owner/editor accounts.
- Confirm a viewer account can open `More details` but does not see `Edit person` in the selected-person panel.
- Confirm owner/editor accounts see `Edit person`, and that it opens `/profile?...&edit=1` with the edit modal.

## Prompt 3 Findings - June 3, 2026

Status: Done locally; not committed, pushed, or deployed.

What changed:

- No product code changes were needed in this acceptance pass.
- Updated this queue, `DEPLOYMENT_CHECKLIST.md`, and `5-21_WORKSHEET.md` with the local release acceptance result and remaining live Firebase checks.
- Confirmed the served Add button text is `Add Person`; an earlier smoke-script text readout was only a local extraction/display artifact.

Local verification:

- `npm run check` passed.
- `git diff --check` passed with Windows line-ending warnings only.
- Local static server returned 200 for the app shell.
- Desktop smoke passed for `/`, `/tree`, `/tree?demo=large`, `/tree?demo=large&view=cards`, `/search`, `/search?query=tim`, `/account`, `/profile?person=colety_rose&familyId=colety-birthday-tree&from=tree`, and `/profile?person=colety_rose&familyId=colety-birthday-tree&from=tree&edit=1`.
- Phone-width smoke passed for `/`, `/tree`, `/tree?demo=large`, `/tree?demo=large&view=cards`, `/search`, `/account`, and `/profile?person=colety_rose&familyId=colety-birthday-tree&from=tree&edit=1`.
- Simulated signed-in smoke passed for `/`, representative profile URLs, and `/search?query=tim`.

Smoke confirmed:

- Signed-out nav shows `Home | Example Tree`.
- Simulated signed-in nav shows `Family Tree` plus the account icon.
- The visible `Search`/People tab is gone from the shared header, while `/search` still loads as a hidden utility route.
- Brand/tree links preserve useful tree context such as `familyId`, `focus`, and tree search state.
- Add Person exists in Tree/Card/Search shells but stays hidden/disabled for signed-out and read-only local states.
- Demo chart selected-person actions do not expose edit/private profile links.
- Signed-out profile `?edit=1` does not open the edit modal.
- No checked route produced page exceptions.
- No checked desktop or phone-width route had body-level horizontal overflow.

Remaining live Firebase check:

- Sign in as `smcolety@gmail.com` and confirm the real signed-in nav stays simplified.
- Confirm the real Colety tree loads for the owner account.
- Confirm Add Person appears for owner/editor accounts in Chart view, Card list, and hidden People Directory.
- Confirm selected-person `Edit person` and profile `?edit=1` work for owner/editor accounts.
- Confirm viewers can read member data but cannot add, edit, remove, reset invite codes, or upload photos.
- Confirm signed-out users and signed-in non-members cannot read private Colety data.
- Confirm profile photo upload/replace/remove works against deployed Storage rules.

## Prompt 4 Findings - June 3, 2026

Status: Commit/push in progress when this note was added. Final commit hash and GitHub Actions check are reported in the assistant summary after push.

Scope staged for GitHub:

- App code, HTML, CSS, Firebase config, Firestore rules, Storage rules, 404 route shell, chart files, demo/starter data, worksheet, deployment checklist, and queue docs.
- Generated audit ZIP bundles, the external audit text export, and `firestore-debug.log` were intentionally left out of the commit.

Checks before commit:

- `npm run check` passed.
- `git diff --check` passed with Windows line-ending warnings only.
- `git fetch origin main` completed before staging.

## Prompt 5 Findings - June 3, 2026

Status: Done. Deployed commit `7fd0629` to Firebase project `tree-72e80`.

Deploy command:

- `firebase deploy --only hosting,firestore:rules,storage --project tree-72e80`

Deploy result:

- Hosting deployed successfully.
- Firestore rules compiled and released.
- Storage rules compiled and released.
- Live Hosting URL: `https://tree-72e80.web.app`

Live spot-check URLs:

- Home: `https://tree-72e80.web.app/?fresh=release-fix-20260603`
- Large demo tree: `https://tree-72e80.web.app/tree?demo=large&fresh=release-fix-20260603`
- Card list fallback: `https://tree-72e80.web.app/tree?demo=large&view=cards&fresh=release-fix-20260603`
- Account: `https://tree-72e80.web.app/account?fresh=release-fix-20260603`
- Hidden People Directory: `https://tree-72e80.web.app/search?demo=large&fresh=release-fix-20260603`

Verification:

- `npm run check` passed before deploy.
- Live route HTTP spot checks returned 200 with `Cache-Control: no-cache, no-store, must-revalidate`.

## Prompt 6 Findings - June 3, 2026

Status: Live guest/header smoke passed. Owner/editor/viewer checks remain Spencer-only because the available browser session was signed out.

Live guest checks passed:

- Home, Large Demo Tree, Card list fallback, hidden People Directory, Account, and private Profile routes loaded from Firebase Hosting.
- Signed-out nav showed `Home | Example Tree` plus `Sign In`.
- The visible Search/People tab stayed removed from the shared signed-out header.
- Large demo tree and card fallback loaded with `Add Person` present in the DOM but hidden/disabled for signed-out/read-only access.
- Hidden People Directory loaded as a direct route and kept edit/add controls hidden for signed-out access.
- Account page showed a signed-out management state instead of exposing private data.
- Private Colety profile URL did not expose profile details while signed out.
- Desktop smoke found no body-level horizontal overflow.
- Phone-width smoke found no body-level horizontal overflow on Home, Large Demo Tree, Card list fallback, hidden People Directory, and Account.
- Live headers include `Content-Security-Policy-Report-Only`, `Cache-Control: no-cache, no-store, must-revalidate`, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: SAMEORIGIN`.

Console note:

- The browser log still shows the known `MutationObserver.observe` error.
- Repo search found no `MutationObserver` usage in app code; this still appears to be browser/extension environment noise unless Spencer sees the same error in a normal live browser console.

Spencer owner/editor/viewer checks still required:

- Sign in as `smcolety@gmail.com` and confirm the signed-in header shows only `Family Tree` plus the account icon.
- Confirm the real Colety tree loads from `/tree?familyId=colety-birthday-tree`.
- Confirm Add Person appears for owner/editor accounts in Chart view, Card list, and hidden People Directory.
- Confirm selected-person `Edit person` appears for owner/editor accounts and is hidden for viewers.
- Confirm profile `?edit=1` opens the edit modal for owner/editor accounts.
- Confirm viewers cannot add, edit, remove, reset invite codes, or upload photos.
- Confirm signed-out and signed-in non-members cannot read private Colety tree/profile/photo data.
- Upload, replace, and remove a valid profile photo against live Storage rules.
