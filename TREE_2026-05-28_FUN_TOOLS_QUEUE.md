# Tree Fun Tools Queue - May 28, 2026

Use this queue by sending prompts like:

`find TREE_2026-05-28_FUN_TOOLS_QUEUE.md and do prompt 1`

Goal: add useful, fun family-tree tools without bloating the birthday demo. Prioritize tools that make the tree easier to explore, easier to complete, and more delightful for relatives.

## Guardrails

- Keep the Family Chart tree as the primary experience.
- Preserve current auth, owner/editor/viewer permissions, invite-code flow, and profile edit flow.
- Keep features scoped per prompt.
- Run `npm run check` and `git diff --check` after code changes.
- Browser-smoke desktop and mobile when a prompt changes visible UI.
- Do not deploy, commit, or push unless Spencer explicitly asks.

## Prompt 1 - Fun Tools Architecture And Navigation Plan

Review the current app structure and design a lightweight way to add family tools without crowding the tree page. Decide which tools belong in the tree sidebar, selected-person panel, account page, profile page, or a new tools/dashboard area. Include Relationship Finder, Birthday Calendar, Missing Info Checklist, Family Stats, Invite Helper, and Memory Wall. Make only tiny code/doc fixes if needed. Update this queue with the recommended order and any data-model notes.

Status: Done May 28, 2026. See "Prompt 1 Findings" below.

## Prompt 2 - Relationship Finder

Implement a first-pass Relationship Finder. Let the user choose or search two people in the current family tree, then show the relationship path between them when possible. Use existing `parentIds`, `spouseIds`, and derived children helpers. Start with clear path output like `Person A -> Parent -> Grandparent -> Person B`; add friendly copy when a direct label is easy. Keep it scoped and usable from the tree page or a tools panel. Run checks and browser-smoke.

Status: Done May 28, 2026. See "Prompt 2 Findings" below.

## Prompt 3 - Birthday Calendar

Implement a Birthday Calendar or birthday list for the current family tree. Show upcoming birthdays, month groupings, and missing birthdays. Keep the first version simple and useful: name, date, age if birth year exists, and profile link. Decide whether it lives on the tree page, account/tools page, or a new route based on Prompt 1. Run checks and browser-smoke.

Status: Done May 28, 2026. See "Prompt 3 Findings" below.

## Prompt 4 - Missing Info Checklist

Implement a Missing Info Checklist to help Spencer fill out the tree quickly. Include people missing birthdays, photos, parents, spouse/partner, children, and bio/story notes. Each row should link to the person's profile, preserving family context. Keep it owner/editor-friendly but safe for viewers. Run checks and browser-smoke.

Status: Done May 28, 2026. See "Prompt 4 Findings" below.

## Prompt 5 - Family Stats

Implement a small Family Stats panel. Include useful/fun stats such as people count, generation count, photo count, missing-info count, birthday-month distribution, oldest listed birthday, youngest listed birthday, and most common last names. Keep copy warm and demo-friendly. Run checks and browser-smoke.

Status: Done May 28, 2026. See "Prompt 5 Findings" below.

## Prompt 6 - Invite Helper

Implement an Invite Helper for owners. It should generate a polished copyable invite message that includes the current access code only when the signed-in user is allowed to manage invites. Include short and friendly versions if easy. Keep existing access-code security behavior intact. Run checks and browser-smoke with owner/non-owner states where possible.

Status: Done May 28, 2026. See "Prompt 6 Findings" below.

## Prompt 7 - Memory Wall First Pass

Design and implement a first-pass Memory Wall. Keep it lightweight: use existing profile bio/photos if new data storage would be too much, or create a scoped plan before adding new Firestore collections. The first version should let relatives browse family memories/stories/photos and jump back to profiles. Do not add broad write features unless rules and UI are clear. Run checks and browser-smoke.

Status: Done May 28, 2026. See "Prompt 7 Findings" below.

## Prompt 8 - Search Tab Decision And People Directory

Now that tree-page Find is useful, review whether the Search tab should be removed, renamed, or converted into a People Directory. If converting, make it useful: sortable/scannable people list, quick profile links, missing-info badges, and search. Keep navigation simple: signed-in users should not see redundant tabs. Run checks and browser-smoke.

Status: Done May 28, 2026. See "Prompt 8 Findings" below.

## Prompt 9 - Fun Tools Integration Polish

Review prompts 2-8 together. Tighten navigation, empty/loading/error states, mobile behavior, profile return paths, and copy. Make sure the tools feel like one coherent family-tree app, not scattered experiments. Run checks and browser-smoke.

Status: Done May 28, 2026. See "Prompt 9 Findings" below.

## Prompt 10 - Fun Tools Release Readiness

Run a final local acceptance pass for the fun tools. Use the large demo and `colety-birthday-tree` as acceptance tests. Update `5-21_WORKSHEET.md`, this queue, and any release checklist notes with what is ready, what needs live Firebase testing, and what should be deferred until after the birthday demo. Do not deploy unless asked.

Status: Done May 28, 2026. See "Prompt 10 Findings" below.

## Prompt 1 Findings - May 28, 2026

Status: Done; documentation/planning only.

Recommended navigation shape:

- Keep `/tree` as the primary working surface. It should stay focused on the chart, Find person, fullscreen, selected-person actions, and one or two quick exploration tools.
- Convert `/search` into a richer People Directory later instead of keeping it as a redundant search-only page. Tree-page Find now covers quick lookup.
- Keep `/account` for account/admin work: invite helper, member access, owner/editor controls, tree metadata, and release-safe management tasks.
- Add a new lightweight `/tools` route only if the tree sidebar starts feeling crowded after Relationship Finder, Birthday Calendar, Missing Info, Stats, Invite Helper, and Memory Wall. For now, avoid a new route until at least two tools need a shared page.
- Keep selected-person card actions simple: Focus, More details, Edit person. Do not pack global tools into the selected-person card.

Recommended implementation order:

1. Relationship Finder first. It fits the tree page best, reuses relationship helpers, and makes the chart feel magical quickly.
2. Family Stats second. It is low-risk, read-only, and gives immediate demo polish.
3. Missing Info Checklist third. It is practical for Spencer data cleanup and can share stats logic.
4. Birthday Calendar fourth. It is read-only and delightful, but less core than relationship lookup/completion.
5. Invite Helper fifth. It belongs on `/account` and must preserve owner-only access-code visibility.
6. People Directory/Search decision sixth. Do this after Missing Info and Birthday Calendar because those features can provide useful badges and filters.
7. Memory Wall last. It is potentially the most delightful, but also has the most product/data-model ambiguity if it moves beyond existing bios/photos.

Recommended placement by tool:

- Relationship Finder: tree sidebar as a collapsed `Find relationship` panel. Use two searchable person inputs and show the path/result below the controls.
- Birthday Calendar: People Directory or `/tools` area. A small "Next birthdays" preview can appear on `/account` or tree sidebar later.
- Missing Info Checklist: account page for owner/editor data cleanup, with profile links. Viewers can see a read-only version only if it feels useful.
- Family Stats: small panel on tree sidebar or account page. The safest first version is a compact tree-sidebar panel with people/generations/photos/missing info.
- Invite Helper: account page, inside the existing owner-only invite-code card. It should generate copyable messages only when the code is visible to that user.
- Memory Wall: new route or People Directory section later. First pass should reuse existing `bio` and `image` fields instead of adding new writeable collections.

Data-model notes:

- Current relationship helpers are strong enough for Relationship Finder: `resolvePersonParentIds`, `resolvePersonSpouseIds`, `derivePersonChildren`, `getChildren`, `groupByGeneration`, and name/title helpers already exist.
- Relationship Finder should build a graph from parent, child, and spouse edges. Use stable person IDs first; legacy parent/spouse name fields should be resolved through existing helpers.
- Birthday Calendar can read `birthDate` from person docs. Some dates may be missing or Firestore Timestamp-like; preserve current formatting conventions.
- Missing Info can be derived from existing fields: `birthDate`, `image`, `bio`, resolved parents, resolved spouse IDs, and derived children.
- Family Stats can be fully derived from the loaded people array and helper functions. No schema change needed.
- Invite Helper needs family `joinCode`, role checks, and existing account-page tree data. No schema change needed.
- Memory Wall should avoid new Firestore collections for the birthday release unless rules/UI are designed first. Existing profile `bio` and `image` are enough for a read-only first pass.

Tiny doc-only decision:

- No code changes were needed for Prompt 1. The current `/tree`, `/account`, `/profile`, and `/search` structure can support the next prompts without a broad navigation rewrite.

## Prompt 2 Findings - May 28, 2026

Status: Done locally; not deployed.

What changed:

- Added a collapsed `Find relationship` tool to the `/tree` sidebar.
- Added two searchable person inputs backed by the existing tree person datalist.
- Added an in-memory relationship graph that uses existing helper compatibility:
  - `resolvePersonParentIds`
  - `resolvePersonSpouseIds`
  - `derivePersonChildren`
- Added shortest-path lookup across parent, child, and spouse/partner connections.
- Added readable path output with a brief friendly summary.
- When a relationship is found, the second person is focused in the chart when chart view is active.

Files changed:

- `html/tree_page.html`
- `css/family_tree.css`
- `js/tree.js`
- `TREE_2026-05-28_FUN_TOOLS_QUEUE.md`

Local verification:

- `npm run check` passed.
- `git diff --check` passed with Windows line-ending warnings only.
- Browser smoke on local `/tree?demo=large` passed:
  - Opened the `Find relationship` panel.
  - Entered `Graham Johnson` and `Iris Miller`.
  - Result showed `Iris Miller is their spouse or partner.`
  - Path rendered as `Graham Johnson -> spouse/partner -> Iris Miller`.

Remaining notes:

- Live Firebase testing is still needed after deploy, especially on the Colety starter tree.
- Mobile visual smoke was not completed in this pass because the available browser harness did not expose a reliable viewport resize control. The CSS uses the same sidebar/form patterns already used by the tree page and should be verified live on a phone-sized viewport before release.

## Prompt 3 Findings - May 28, 2026

Status: Done locally; not deployed.

What changed:

- Added a collapsed `Birthdays` panel to the `/tree` sidebar.
- The panel is read-only and derived from the currently loaded family tree.
- Added `Next birthdays` with:
  - person name
  - birthday month/day
  - age they are turning when a birth year exists
  - days until the birthday
  - profile links for real/private trees
- Added `By month` birthday counts so a family can quickly see busy months.
- Added a `Missing birthdays` list so Spencer can quickly spot incomplete profiles.
- Demo-mode people are shown without profile links because the generated large demo is not backed by Firestore profile docs.

Files changed:

- `html/tree_page.html`
- `css/family_tree.css`
- `js/tree.js`
- `TREE_2026-05-28_FUN_TOOLS_QUEUE.md`

Local verification:

- `npm run check` passed.
- `git diff --check` passed with Windows line-ending warnings only.
- Browser smoke on local `/tree?demo=large` passed:
  - Opened the `Birthdays` panel.
  - Confirmed `Next birthdays` rendered.
  - Confirmed `By month` rendered.
  - Confirmed future demo birthdays no longer show negative ages.

Remaining notes:

- Live Firebase testing is still needed after deploy to confirm private-tree profile links include the right `familyId` and permission context.

## Prompt 4 Findings - May 28, 2026

Status: Done locally; not deployed.

What changed:

- Added a collapsed `Missing info` checklist to the `/tree` sidebar.
- The checklist is read-only, so it is safe for viewers while still useful for owners/editors.
- It flags each profile for missing:
  - birthday
  - photo
  - parents
  - spouse/partner
  - children
  - bio/story notes
- Added category count pills so Spencer can quickly see which cleanup type is biggest.
- Added a priority list of profiles with the most missing fields first.
- Rows link to the person's profile for real/private trees and preserve `familyId`, `from=tree`, and current tree view context.
- Demo-mode rows are intentionally unlinked because generated demo people do not have Firestore profile docs.

Files changed:

- `html/tree_page.html`
- `css/family_tree.css`
- `js/tree.js`
- `TREE_2026-05-28_FUN_TOOLS_QUEUE.md`

Local verification:

- `npm run check` passed.
- `git diff --check` passed with Windows line-ending warnings only.
- Browser smoke on local `/tree?demo=large` passed:
  - Opened the `Missing info` panel.
  - Confirmed the attention summary rendered.
  - Confirmed category count pills rendered.
  - Confirmed profile rows rendered.

Remaining notes:

- Live Firebase testing is still needed after deploy to verify private-tree profile links and owner/editor edit access from the linked profiles.

## Prompt 5 Findings - May 28, 2026

Status: Done locally; not deployed.

What changed:

- Added a collapsed `Family stats` panel to the `/tree` sidebar.
- Added quick stat cards for:
  - people count
  - generation count
  - photo count
  - profiles needing info
- Added tree-health rows for oldest listed birthday, youngest listed birthday, and total missing fields.
- Added birthday-month distribution with the busiest months first.
- Added most common last names.
- Reused existing birthday and missing-info helpers so the stats stay consistent with the Birthday and Missing info panels.

Files changed:

- `html/tree_page.html`
- `css/family_tree.css`
- `js/tree.js`
- `TREE_2026-05-28_FUN_TOOLS_QUEUE.md`

Local verification:

- `npm run check` passed.
- `git diff --check` passed with Windows line-ending warnings only.
- Browser smoke on local `/tree?demo=large` passed:
  - Opened the `Family stats` panel.
  - Confirmed people, generations, birthday-month distribution, and common last names rendered.
  - Confirmed youngest-birthday display ignores future demo birth years.

Remaining notes:

- Live Firebase testing is still needed after deploy to confirm private-tree stats match real Colety data, especially photo counts after Storage permissions are fixed.

## Prompt 6 Findings - May 28, 2026

Status: Done locally; not deployed.

What changed:

- Added an owner-only `Invite message` helper inside the existing account-page invite-code panel.
- The helper creates a ready-to-send friendly message with:
  - tree name
  - join link
  - current access code
  - short context for relatives
- Added a short invite variant for quick texts.
- Added `Copy Message` behavior with clipboard fallback selection.
- Kept access-code visibility tied to the existing owner-only branch, so viewers/editors do not receive this helper.
- When an owner resets the access code, the generated invite message now refreshes to use the new code.

Files changed:

- `js/dashboard.js`
- `css/global.css`
- `TREE_2026-05-28_FUN_TOOLS_QUEUE.md`

Local verification:

- `npm run check` passed.
- `git diff --check` passed with Windows line-ending warnings only.
- Browser smoke on local `/account` passed for signed-out safety:
  - Confirmed the owner-only `Invite message` helper is not visible while signed out.
  - Confirmed the account page still shows sign-in messaging.

Remaining notes:

- Live Firebase testing is still needed after deploy with the real owner account to confirm:
  - the helper renders for owners
  - viewers/editors do not see it
  - Friendly/Short variants include the current live access code
  - `Copy Message` works in the deployed browser context

## Prompt 7 Findings - May 28, 2026

Status: Done locally; not deployed.

What changed:

- Added a first-pass read-only `Memory wall` section to the Search page.
- The wall reuses existing person `image` and `bio` fields only.
- No new Firestore collections, rules, or write features were added.
- Memory cards show:
  - profile photo when available
  - initials fallback
  - person name
  - story/bio excerpt when meaningful
  - `Photo` and `Story` tags
- Every memory card links back to that person's profile while preserving private-tree `familyId` context.
- Empty/loading/error states are handled when no memories are available or search data cannot load.

Files changed:

- `html/search_page.html`
- `css/global.css`
- `js/search.js`
- `TREE_2026-05-28_FUN_TOOLS_QUEUE.md`

Local verification:

- `npm run check` passed.
- `git diff --check` passed with Windows line-ending warnings only.
- Browser smoke on local `/search` passed:
  - Confirmed the `Memory wall` section rendered.
  - Confirmed a memory card rendered from existing example photo/story data.
  - Added wrapping for long bio/story text so cards do not visually break.

Remaining notes:

- Live Firebase testing is still needed after deploy with real Colety data, especially once profile photo uploads are working through Firebase Storage.
- A future, richer Memory Wall should get a scoped data model and Firebase rules before allowing relatives to add standalone memories/comments.

## Prompt 8 Findings - May 28, 2026

Status: Done locally; not deployed.

Decision:

- Converted `/search` into a People Directory instead of removing it.
- Tree-page Find remains the fast map-navigation tool.
- People Directory is now the broader browse/filter/sort/profile-opening surface.
- Nav label changed from `Search` to `People` so signed-in navigation feels less redundant.

What changed:

- Updated Search page title and copy to `People directory`.
- Empty filter now shows all people instead of waiting for a search query.
- Added a sort control:
  - Name
  - Generation
  - Birthday
  - Needs info
- Added scannable directory cards with:
  - name
  - photo/initials
  - birthday
  - generation
  - photo/story badges
  - missing-info badges
  - direct profile links
- Kept the Memory Wall on the same page as a browsing companion to the directory.

Files changed:

- `html/search_page.html`
- `css/global.css`
- `js/main.js`
- `js/search.js`
- `TREE_2026-05-28_FUN_TOOLS_QUEUE.md`

Local verification:

- `npm run check` passed.
- `git diff --check` passed with Windows line-ending warnings only.
- Browser smoke on local `/search` passed:
  - Confirmed the default directory shows all available example-tree people.
  - Confirmed URL query filtering with `query=tim`.
  - Confirmed `sort=missing` is accepted and the directory renders missing-info badges.
  - Confirmed the Memory Wall remains on the page.

Remaining notes:

- Live Firebase testing is still needed after deploy to confirm private-tree directory cards and profile links preserve the correct family context.

## Prompt 9 Findings - May 28, 2026

Status: Done locally; not deployed.

What changed:

- Tightened the cross-page nav language so the directory is consistently `People` instead of a leftover `Search` tab.
- Updated home-page task copy to point relatives toward the People Directory.
- Cleaned up prototype wording in tree controls:
  - `Fallback tools` is now `Display options`.
  - `Fallback cards` is now `Card list`.
  - Chart-load fallback messages now mention Card list view.
- Collapsed the tree Key by default so the sidebar starts calmer and the active tools feel less buried.
- Preserved People Directory sort context through profile links and related-profile navigation.
- Updated profile return copy so search-origin profiles say `Back to People` and keep `query`/`sort` context.
- Updated 404 navigation to use `People`.

Files changed:

- `404.html`
- `html/dashboard.html`
- `html/family_chart_spike.html`
- `html/home_page.html`
- `html/profile.html`
- `html/search_page.html`
- `html/signin.html`
- `html/tree_page.html`
- `js/dashboard.js`
- `js/profile.js`
- `js/search.js`
- `js/tree.js`
- `TREE_2026-05-28_FUN_TOOLS_QUEUE.md`

Local verification:

- `npm run check` passed.
- `git diff --check` passed with Windows line-ending warnings only.
- Browser smoke on a local static server passed for:
  - `/tree?demo=large`: People nav label, Display options label, Card list label, collapsed Key, and no body-level horizontal overflow.
  - `/search?query=tim&sort=missing`: People Directory title, People nav label, sort state preserved, signed-out/private-tree empty state, and no body-level horizontal overflow.
  - `/account`: Account route renders with People nav label and no body-level horizontal overflow.

Remaining notes:

- Live Firebase testing is still needed after deploy for signed-in private-tree People Directory cards and profile return paths, because local unsigned smoke correctly blocks private data.

## Prompt 10 Findings - May 28, 2026

Status: Done locally; not deployed.

Release-readiness call:

- The fun tools are a local deploy candidate for the next live Firebase pass.
- The birthday demo should keep `/tree` as the main experience, with the Family Chart map, Find person, Full Screen, selected-person details, Relationship Finder, Birthdays, Missing info, Family stats, and Display options working together.
- `/search` is now the People Directory companion page, not a redundant search-only route.
- `/account` remains the owner/admin surface for invite code, access, and account actions.

Ready locally:

- Large demo tree loads in Chart view with the fun-tool sidebar present.
- Card list fallback loads with 80 demo people and keeps Find person usable.
- People Directory uses `People` navigation, keeps sort state, and has signed-out/private-tree empty states.
- Profile return paths preserve People Directory context: `familyId`, `query`, and `sort`.
- Account route renders cleanly with the simplified navigation.
- Phone-width smoke showed no body-level horizontal overflow on Home, large demo Tree, Card list, People Directory, or Account.
- No page exceptions were detected in the desktop or phone-width smoke checks.

Checks:

- `npm run check` passed.
- `git diff --check` passed with Windows line-ending warnings only.
- `firebase emulators:exec --only firestore,storage --log-verbosity QUIET "node -p 1"` passed.
- In-app browser smoke passed for `/`, `/tree?demo=large`, `/tree?demo=large&view=cards`, `/search?query=tim&sort=missing`, `/search?demo=large&query=gra&sort=generation`, `/profile?person=colety_rose&familyId=colety-birthday-tree&from=search&query=Rose&sort=missing`, and `/account`.
- Headless Chrome phone-width smoke passed for `/`, `/tree?demo=large`, `/tree?demo=large&view=cards`, `/search?query=tim&sort=missing`, and `/account`.

Needs live Firebase testing:

- Signed in as `smcolety@gmail.com`, confirm `/account` loads the real `colety-birthday-tree` and shows owner tools.
- Confirm the private Colety tree opens in Chart view and the fun tools populate from real data.
- Confirm People Directory cards render for the private Colety tree and profile links preserve `familyId`, `query`, and `sort`.
- Confirm owner/editor/viewer rules for add, edit, remove, photo upload, invite reset, and invite join.
- Confirm Storage upload/replace/remove photo behavior on real Firebase Storage.
- Confirm signed-out and signed-in non-member users cannot read private family data or images.
- Confirm deployed Hosting headers, especially CSP report-only, and watch the browser console for reports.

Defer until after the birthday demo:

- Standalone Memory Wall write features/comments.
- More advanced relationship labels beyond the current path output.
- Rich birthday reminders/notifications.
- A dedicated Tools route unless the sidebar becomes too crowded.
- Enforced CSP; keep it report-only for the demo.
