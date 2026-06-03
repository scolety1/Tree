# Tree Live Audit Fixes - June 3, 2026

Goal: notes from a live Firebase guest/product audit after the release-fix deploy. Use this as the next practical queue before final family testing.

## Tested

- Home: `https://tree-72e80.web.app/`
- Large demo tree: `/tree?demo=large`
- Large demo card fallback: `/tree?demo=large&view=cards`
- Default example tree: `/tree`
- Hidden People Directory: `/search?demo=large`
- Account signed-out state: `/account`
- Private Colety profile signed-out state: `/profile?person=colety_rose&familyId=colety-birthday-tree&from=tree`
- Public example profile links from `/tree`
- Tree Find person and Relationship Finder on the large demo

## High Priority Fixes

1. Fix public example profile links after private-tree browsing.

   Finding: after visiting a private `familyId` URL, clicking a person from the public example tree can show `Sign in to view this profile` instead of the public example profile.

   Likely cause: `profile.js` falls back to stored `currentFamilyId` when the profile URL has no explicit `familyId`, so a public example profile can be interpreted as a private-tree profile.

   Suggested fix: profile links from public examples should carry an explicit demo/example source, or `profile.js` should avoid stored `familyId` fallback when `familyId` is absent and the route came from the public example tree. Keep stored-family fallback only for private-tree flows that intentionally need it.

2. Make `/search?demo=large` use the large generated demo data.

   Finding: the large demo tree uses the Johnson/Miller/Brooks generated data, but the hidden People Directory with `demo=large` still shows the old small Tim example data.

   Likely cause: `tree.js` imports `generateLargeDemoTree()`, but `search.js` does not; without a private `familyId`, `search.js` calls `getAllPeople(null)`, which reads the old Firestore `example` collection.

   Suggested fix: add a large-demo mode to `search.js` and load `generateLargeDemoTree()` when `demo=large`. Update the context copy to say `Searching the large example tree`.

3. Replace or retire the old Tim public example tree.

   Finding: `/tree` still shows the older Tim placeholder family, while `/tree?demo=large` shows the nicer made-up family data.

   Suggested fix: make the default public example tree use polished made-up demo data too. Keep Colety data only for the private starter tree. This removes the last "old project" feeling from the public demo.

4. Synchronize Find Person with the selected-person detail panel.

   Finding: on the large tree, Find Person updates the status and URL, but the selected-person detail panel below the chart can stay empty or keep a different person selected after Relationship Finder runs.

   Suggested fix: when `runTreeFocusSearch()` finds a person, post the focus message to the chart and also update the parent page's selected-person details. If the selected panel lives only inside the chart iframe, mirror the selected-person summary into the parent page when the chart posts selection messages.

## Medium Priority Polish

5. Clean up signed-out Home create/join form states.

   Finding: Home correctly sends guests to Sign In, but the lower create/join forms still show disabled `Create Private Tree` and `Join Tree` buttons. It works, but it can feel like a broken form.

   Suggested fix: for signed-out users, show a compact sign-in callout in place of disabled forms, or keep the forms hidden until sign-in.

6. Make the default demo profile experience intentional.

   Finding: large demo chart intentionally hides private profile actions, but the small/default example exposes profile links that can become confusing.

   Suggested fix: either make demo profiles fully public/read-only, or consistently keep demo profiles as selected-panel details only. The best birthday-demo version is probably public read-only demo profiles.

7. Rename hidden People Directory copy if it remains hidden.

   Finding: `/search` is hidden from nav, but page copy still says `People directory`. That is fine internally, but if a user lands there directly it can feel like a second product surface.

   Suggested fix: rename the page heading to `Family directory` or `Browse family members`, and make it clearly secondary to the tree page.

8. Investigate the recurring `MutationObserver.observe` console error in a normal browser.

   Finding: the app browser logs the known `MutationObserver.observe` error. Repo search finds no `MutationObserver` usage, so it still appears browser/extension-side.

   Suggested fix: have Spencer check Chrome DevTools on the live site. If the error appears with a source file from the app, fix it. If it appears only from an extension/runtime, ignore it.

## Useful Additions

9. Add a small "Demo data" badge or explanation.

   Useful because guests should know whether they are viewing a fake sample tree or their private family tree.

10. Add a "Recently viewed people" strip on the tree page.

   Useful for large trees because users bounce between people while exploring.

11. Add "Open relatives" buttons in selected-person details.

   Helpful buttons: Parents, Spouse/Partner, Children, Siblings. They should focus the chart without leaving the tree.

12. Add an owner-only "Demo readiness" checklist on Account.

   Helpful for Spencer before showing family: missing photos, missing birthdays, no bios, no relationships, invite code copied, etc.

13. Add "Print/export simple view" later.

   Not a pre-birthday blocker, but likely useful for Dad if he wants to show or keep a copy.

## Suggested Next Prompt

`Use TREE_2026-06-03_LIVE_AUDIT_FIXES.md. Start with high-priority fixes 1-4 only: public example profile/source handling, large-demo People Directory data, polished default example data, and Find Person selected-panel synchronization. Keep changes scoped, run checks, browser-smoke live/local routes, and do not commit/push/deploy until I review.`

## Live Test Account - Account/Invite QA

Tested with disposable owner account `codex.tree.test.1780513994154@example.com` and tree `bD0RHI0euhabv310nEZc`.

Passed:

- Sign-in session loaded the Account page.
- Account page loaded `Codex Experimental Family Tree`.
- Tree name and description persisted after reload.
- Owner role, member count, and person count displayed.
- Current invite code displayed.
- Invite message used the current tree name after reload.
- Reset Code changed the access code from `MQBFFCHTVQ` to `GKCJB354W5`.
- Reset success message displayed: `Access code reset.`
- Invite message updated to the new code and no longer contained the old code.
- Account reload preserved the new code and showed no visible error state.
- No page-level horizontal overflow on Account.

Notes and bugs:

- Copy Code could not access the clipboard in the app browser and correctly fell back to `Select the access code and copy it manually.` Verify normal Chrome clipboard behavior manually.
- Copy Message was awkward to activate through browser automation even though it appeared visible; check the hit target and spacing around the invite-message controls.
- Signed-in Account nav still shows `Home | Family Tree`; the intended simplified signed-in nav is `Family Tree` plus account icon.
- Reset Code relies on a native confirm, which is functional but awkward for automated tests and less polished than an in-app confirmation dialog.
- Browser logs still include earlier permission warnings from starter-tree fallback/account lookup; the visible Account state is healthy after reload, but this should be watched in a normal DevTools console.

## Live Test Account - Owner Family Tree QA

Tested with disposable owner account `codex.tree.test.1780513994154@example.com` and tree `bD0RHI0euhabv310nEZc`.

Passed:

- Owner tree loaded at `/tree?familyId=bD0RHI0euhabv310nEZc`.
- Header showed the test account as signed in.
- Tree title loaded as `Codex Experimental Family Tree`.
- Connected chart iframe loaded and reported `Connected chart ready`.
- Card fallback loaded with all 9 people, including `Codex Tester`.
- Add Person button was visible and enabled for the owner.
- Add Person modal opened, focused the first name field, and populated parent/spouse selectors with the current people.
- Birthdays panel opened and showed upcoming birthdays, month counts, and missing birthdays.
- Missing info panel opened and showed profile cleanup needs.
- Family stats panel opened and showed people, generations, photos, missing-info count, birthday range, month counts, and last-name counts.
- Full Screen button handled the app-browser block with a clear message: `Full screen was blocked by the browser.`
- Profile links opened owner-readable profiles with `Edit Profile` and `Remove This Person` visible.
- Card-view profile return preserved `view=cards`.
- Chart-view profile return preserved `view=chart`.
- Tree and profile pages had no page-level horizontal overflow in the checked desktop viewport.

Blocked or partially tested:

- Browser automation could not type into Find Person or Relationship Finder in this pass because the app browser reported `Browser Use virtual clipboard is not installed`. Earlier live testing confirmed Find Person can find `Codex Tester`, but the selected-person panel still stayed empty.
- Relationship Finder opened, but the current browser session could not type test names into the fields. It should be retested in normal Chrome.
- Full Screen should be clicked manually in normal Chrome; the app-browser denial path is graceful, but it does not prove normal fullscreen entry.

Bugs and suggested fixes:

- Signed-in Family Tree still shows `Home | Family Tree`; intended signed-in nav is only `Family Tree` plus account icon.
- Find Person/focus does not update the parent selected-person detail panel. This affects private owner trees too, not just demo data.
- Returning from a profile with `focus=personId` restores the right view mode, but the parent page does not visibly explain which person is focused.
- Card-view Back to Family Tree returned to cards correctly, but the Find Person status reset to the generic `Search 9 people in this tree.` despite a `focus` param in the URL.
- Chart-view Back to Family Tree returned to chart correctly, but the selected/focused person is not obvious in the parent page.
- Full Screen should offer a better fallback, such as `Open focused view` or `Expand map area`, when browser fullscreen is blocked.
- Relationship Finder inputs would be easier to test and use if they exposed strong autocomplete/list behavior and maybe quick-pick person buttons from selected/focused people.

## Live Test Account - Owner Profile Edit QA

Tested with disposable owner account `codex.tree.test.1780513994154@example.com`, tree `bD0RHI0euhabv310nEZc`, and disposable person `yDLUA1AvSfNrSnUlOGXx`.

Passed:

- Opened the disposable `Codex Tester` profile as the test-tree owner.
- Owner-only actions were visible on profile: `Edit Profile` and `Remove This Person`.
- `?edit=1` opened the edit modal directly.
- Edit modal preloaded the saved values for first name, last name, birthday, parent one, parent two, and bio.
- Controlled owner-auth edit updated the disposable person to `Codex Ui tester`.
- Profile reload showed birthday `June 4, 1999`.
- Profile reload showed parents `Tim Colety and Iris Marsh`.
- Profile reload showed the updated QA bio.
- Family Tree card view reflected the edited person as a grandchild under Tim/Iris.
- Family Tree card view reflected the edited birthday and no longer showed the older `Codex Tester` card.
- No real starter people were deleted or modified.

Blocked or partially tested:

- Real UI form typing could not be completed in this app-browser session. The edit modal opened, but `locator.fill` failed with `Browser Use virtual clipboard is not installed`.
- Because of that browser limitation, the save-submit path was not proven through a typed browser form in this pass.
- Persistence and permissions were verified with the same live Firebase project using the disposable owner account auth token and the same field shape the app writes from `profile.js`.

Bugs and suggested fixes:

- Retest a normal human edit/save in Chrome before calling the owner profile edit flow fully QA-complete.
- The display formatter renders `UI` as `Ui`; consider improving title casing for short acronyms or just avoid acronym-heavy names in demo/test data.
- Browser automation for this app would be more reliable if form controls supported deterministic test hooks and if clipboard-dependent typing was not required for every input interaction.

## Live Test Account - Profile Photo QA

Tested with disposable owner account `codex.tree.test.1780513994154@example.com`, tree `bD0RHI0euhabv310nEZc`, and disposable person `yDLUA1AvSfNrSnUlOGXx`.

Passed:

- Confirmed the test account is the family owner in Firestore:
  - `ownerId`: `Fsd2UTWPRveT8ySz3Lhn3cAzruI3`
  - `memberIds`: includes `Fsd2UTWPRveT8ySz3Lhn3cAzruI3`
  - `memberRoles.Fsd2UTWPRveT8ySz3Lhn3cAzruI3`: `owner`
- Profile photo display layer works when the person has a valid HTTPS `image` URL.
- External PNG placeholder rendered after reload with `naturalWidth=240` and `naturalHeight=240`.
- Replacing that URL with an external JPG placeholder rendered after reload with `naturalWidth=240` and `naturalHeight=240`.
- Clearing the `image` field returned the profile to the no-photo state: image `src` empty, `display: none`, and `profileCard.no-photo` present.

Blocked or partially tested:

- Valid Firebase Storage uploads failed for the owner account before image display could be tested from Storage.
- Valid PNG under 5 MB failed with `storage/unauthorized`.
- Valid JPG under 5 MB failed with `storage/unauthorized`.
- Valid WebP under 5 MB failed with `storage/unauthorized`.
- Invalid `.txt` upload also failed with `storage/unauthorized`, but this does not prove the file-type rule because the broader Storage authorization failed first.
- UI file-picker upload, replace, and remove could not be completed through the app browser because file input automation is not available here and earlier text-entry attempts hit the app-browser clipboard limitation.

Bugs and suggested fixes:

- High priority: Firebase Storage rules are not allowing the family owner to upload profile images. This reproduces the same visible app error seen earlier: `Firebase Storage: User does not have permission... (storage/unauthorized)`.
- Local `storage.rules` looks intended to allow owner/editor uploads under `families/{familyId}/people/{personId}/...`, so the likely next checks are:
  - Confirm Storage rules were deployed to the live project, not just Firestore/Hosting.
  - Confirm the live bucket is `tree-72e80.firebasestorage.app`.
  - In Firebase Console, compare live Storage rules against local `storage.rules`.
  - Deploy Storage rules with `firebase deploy --only storage --project tree-72e80`, then retest a normal browser upload.
- After Storage rules are fixed, retest the full UI path in normal Chrome: upload, reload, replace, reload, remove, reload, and invalid file selection.

## Live Test Account - Hidden People Directory/Search QA

Tested with disposable owner account `codex.tree.test.1780513994154@example.com` and tree `bD0RHI0euhabv310nEZc`.

Passed:

- Opened `/search?familyId=bD0RHI0euhabv310nEZc`.
- Search resolved to the signed-in account's `Codex Experimental Family Tree`.
- Directory loaded 9 people.
- Memory wall loaded and showed the disposable `Codex Ui tester` story entry.
- Owner-only `Add Person` button was visible and enabled.
- Filtering by URL query worked: `query=colety` returned 5 matching people.
- Birthday sort worked: `sort=birthday` ordered Colety results by birthday.
- Sort UI control worked: changing sort to `Needs info` updated the URL to include `sort=missing` and reordered results.
- Profile links from filtered/sorted results included `familyId`, `query`, `sort`, and `from=search`.
- Opening a profile from Search showed `Back to People`.
- `Back to People` preserved `query=colety` and `sort=birthday`.
- Returning to Search restored the same filtered/sorted result set.
- Add Person from Search was tested end-to-end in standalone Chromium:
  - Signed in as the live test owner.
  - Opened the Search route.
  - Opened the Add Person modal.
  - Form fields accepted typed first name, last name, birthday, and bio.
  - Submit closed the modal.
  - Search refreshed from 9 people to 10 people with message `Added Directory searchqa613567. Search 10 people in Codex Experimental Family Tree.`
  - The disposable test person appeared in the directory.
- Cleaned up the disposable `Directory searchqa613567` person after the test.
- Final readback confirmed the directory returned to 9 people and no longer contained `searchqa613567`.

Notes and bugs:

- The in-app browser still cannot type into fields because it reports `Browser Use virtual clipboard is not installed`; standalone Chromium was needed for the true Add Person submit test.
- The route accepts a `familyId` param in the URL, but `search.js` actually resolves the active signed-in family via `resolveCurrentUserFamilyId()`. This was fine for the test account because its active family is the requested test tree, but it may surprise future debugging.
- Search is hidden from signed-in nav right now, but the route is functional. Decide whether it should stay hidden, be linked from the tree tools, or be retired in favor of tree-page Find Person.

## Live Test Account - Mobile Width Smoke QA

Tested in standalone Chromium at `390x844` mobile viewport with disposable owner account `codex.tree.test.1780513994154@example.com` and tree `bD0RHI0euhabv310nEZc`.

Passed:

- Sign-in worked and redirected to Account.
- Account loaded the test account and `Codex Experimental Family Tree`.
- Account had no page-level horizontal overflow at 390px.
- Family Tree loaded with no page-level horizontal overflow at 390px.
- Family Tree controls stacked into a usable single-column mobile layout.
- Tree Add Person modal opened on mobile, focused `firstName`, fit within the viewport width, and loaded 10 relationship options.
- Profile page loaded `Codex Ui tester`, stayed readable, and had no page-level horizontal overflow.
- Hidden People Directory loaded 9 people, showed sort/filter controls, showed Add Person, and had no page-level horizontal overflow.
- People Directory Add Person modal opened on mobile, focused `firstName`, and fit within the viewport width.
- Tree Find Person accepted `codex`, updated URL with `focus=yDLUA1AvSfNrSnUlOGXx&treeQuery=codex`, and showed status `1 of 1: Codex Ui tester`.

Bugs and suggested fixes:

- High priority: the floating `Add Person` button overlaps mobile content on both Family Tree and People Directory. On Tree it crowds the `Full Screen` tool area; on Directory it overlaps result cards.
- High priority: the floating `Add Person` button remains visible above the Add Person modal on mobile, covering the lower-right part of the modal. Hide or lower the floating button while any modal is open.
- Mobile selected-person details are weak. Find Person confirms `1 of 1: Codex Ui tester`, but no selected-person detail panel appeared in the tested DOM/viewport. On mobile, focusing a person should reveal the same useful detail card or a clear `Open profile` action near the focus result.
- Account action buttons such as `Copy Code`, `Reset Code`, and invite-copy controls measured around 30px tall, below the comfortable mobile target size. Make them at least 40-44px tall.
- Account shows a skeleton-looking blank card before the tree settings in the captured mobile viewport. Verify whether that is intentional loading UI; if it persists after data loads, remove it or replace it with meaningful account content.
- Console logs repeatedly showed `upgrade-insecure-requests` being ignored in the report-only CSP. Not user-visible, but worth cleaning up later by removing that directive from the report-only policy or enforcing the policy intentionally.
