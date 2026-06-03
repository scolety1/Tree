# Tree Family Chart Improvements Queue - May 25, 2026

Use this queue by sending prompts like:

`find TREE_2026-05-25_IMPROVEMENTS_QUEUE.md and do prompt 1`

New active QA queue:

`find TREE_2026-05-26_QA_REPORT_QUEUE.md and do prompt 1`

Goal: move the app toward the Family Chart/D3 tree as the primary family-tree experience while preserving the birthday demo basics: readable 5-6 generation tree, visible relationship paths, search/focus, profile navigation, and safe editing.

## Prompt 1 - Family Chart Baseline QA And Plan

Review the live/local Family Chart beta at `/tree-spike?demo=large` and the current custom tree at `/tree?demo=large`. Decide what must be fixed before Family Chart can replace the main tree. Focus on relationship path readability, default zoom/centering, card legibility, search/focus, mobile behavior, and profile/edit integration. Do not implement broad changes yet unless a tiny obvious fix is needed. Update this queue or `5-21_WORKSHEET.md` with the findings and recommended order.

Status: Done May 26, 2026. See "Prompt 1 Findings" below.

## Prompt 2 - Family Chart Controls And Default View

Improve the Family Chart beta controls. Add clear `Fit tree`, `Reset view`, `Zoom in`, and `Zoom out` controls if the library supports them. Make the initial view easier to understand by centering and fitting the 5-6 generation demo tree instead of dropping the user into a confusing partial view. Keep the visible family relationship paths. Run browser smoke checks on desktop and mobile. Do not replace `/tree` yet.

Status: Done May 26, 2026. See "Prompt 2 Findings" below.

## Prompt 3 - Family Chart Card Styling

Restyle the Family Chart person cards so they match the app and are easier to read. Make cards larger and cleaner, with name, birth date or year, photo/initials where available, and stronger contrast. Preserve the connecting paths between family members. Avoid making the chart feel like unrelated floating cards. Run checks and browser smoke.

Status: Done May 26, 2026. See "Prompt 3 Findings" below.

## Prompt 4 - Selected Person Side Panel

Add a selected-person panel to the Family Chart beta. When a person is clicked or focused, show their name, birthday, parents, spouse/partner, children, and quick actions. Include `Open profile` when a real profile route is available. For demo data, show read-only details. Keep the chart visible and keep family paths intact. Run desktop/mobile smoke checks.

Status: Done May 26, 2026. See "Prompt 4 Findings" below.

## Prompt 5 - Search Focus And Path Highlighting

Improve Family Chart search/focus. Searching a person should center them, highlight their card, and visually emphasize their immediate family path: parents, spouse/partner, and children. Dim unrelated branches if feasible without harming readability. Keep all family connection paths visible enough to understand the overall tree. Run smoke checks with the large demo.

Status: Done May 26, 2026. See "Prompt 5 Findings" below.

## Prompt 6 - Real Data Mapping And Profile Links

Wire the Family Chart beta to real signed-in family data as the primary test path. Confirm it can load `colety-birthday-tree` and other private family trees using the existing compatibility helpers for `parentIds`, `spouseIds`, legacy parent names, and legacy spouse fields. Add profile links or click actions that preserve `familyId`. Keep demo mode working. Document any relationship data that fails to map cleanly.

Status: Done May 26, 2026. See "Prompt 6 Findings" below.

## Prompt 7 - Mobile Family Chart Pass

Do a mobile-specific Family Chart pass. Test narrow viewports, make controls tappable, keep the chart usable with pan/zoom, avoid page-level horizontal overflow, and make search/focus/selected-person details usable on phones. Preserve visible family paths. Run browser smoke checks at desktop, 390px, and 320px.

Status: Done May 26, 2026. See "Prompt 7 Findings" below.

## Prompt 8 - Replace Main Tree Behind A Safe Switch

If the Family Chart beta is stable enough, add a safe view switch on the real `/tree` page instead of immediately deleting the custom renderer. Let users choose `Chart view` or `Card view`, with Chart view preferred for large trees. Keep the custom renderer as fallback. Ensure profile links, search, add/edit paths, and private family loading still work. Run checks and browser smoke.

Status: Done May 26, 2026. See "Prompt 8 Findings" below.

## Prompt 9 - Main Tree Replacement Decision

Review the chart-view implementation against the birthday demo requirements. Decide whether Family Chart should become the default `/tree` experience for signed-in Colety data and the large demo. If yes, make the smallest safe default switch while keeping fallback access. If no, document blockers and leave the safer default in place. Run checks, browser smoke, and update deployment notes.

Status: Done May 26, 2026. See "Prompt 9 Findings" below.

## Prompt 10 - Final Pre-Demo Polish

Do a final birthday-demo polish pass after the Family Chart work. Focus on first impression, navigation clarity, copy, loading/empty/error states, profile return paths, and anything Spencer needs to review live. Do not add big new features. Run checks and browser smoke. Update `5-21_WORKSHEET.md` with deploy readiness and remaining live Firebase testing.

Status: Done May 26, 2026. See "Prompt 10 Findings" below.

## Notes

- Preserve relationship paths. The connecting lines are a core requirement, not decoration.
- Do not remove the custom renderer until Family Chart proves profile/edit/search/private-tree behavior.
- Do not deploy, commit, or push unless Spencer explicitly asks.
- Keep changes scoped per prompt.
- Use the large demo and `colety-birthday-tree` as acceptance tests.

## Prompt 1 Findings - May 26, 2026

Decision:

- Family Chart should be the direction for the real large-tree experience because its connected relationship paths are much closer to what Spencer wants.
- Do not replace `/tree` yet. The Family Chart beta still needs usability and app-integration work before it can become the main tree.
- Keep the current custom renderer as the fallback while improving `/tree-spike`.

Live QA checked:

- `/tree-spike?demo=large` on the live Firebase deploy.
- `/tree?demo=large` on the live Firebase deploy.
- Desktop viewport: 1280 x 720.
- Mobile viewport: 390 x 844.
- Both live pages served the current `20260522-11` assets.

What Family Chart does better:

- Relationship paths are visible and feel like a real family tree.
- Pan/zoom/fit/orientation behavior exists and is the right foundation for 5-6 generations.
- The 80-person demo maps successfully into Family Chart data with 33 SVG layers and no obvious page-level overflow.
- The chart can load from the same normalized relationship helpers already used by the app.

Current Family Chart blockers before replacing `/tree`:

- Default view is confusing. It opens focused around a mid-tree person and can look like a random cluster instead of a full-family map.
- Cards are too small and too generic. Names/dates are hard to read, the default icon/card style does not match the app, and photos/initials are not yet carrying enough visual identity.
- Search/focus is only a long select dropdown. It needs a real searchable input, clear selected state, and obvious recentering.
- Path emphasis is missing. Clicking/focusing someone should highlight that person plus parents, spouse/partner, and children while keeping broader paths visible.
- No selected-person details. There is no side panel or bottom sheet explaining who the person is and how they relate.
- No profile/edit integration. Nodes do not yet open the existing profile route or preserve `familyId`.
- Mobile starts too far from the chart. The hero, notes, and controls take enough space that the actual chart begins below the first screen.
- The prototype copy still says "Prototype" and describes the spike. That is fine for internal testing but not for Dad.
- CDN dependency risk remains. Family Chart and D3 are loaded from jsDelivr; production use should either accept that temporarily or vendor the files.

What the custom tree still does better:

- It has app-native UI, profile/back routing, birthday-demo copy, collapse behavior, and search/focus controls.
- It has stronger loading/empty/error states.
- It is safer for current add/edit/profile workflows.

What the custom tree cannot satisfy well:

- It does not preserve the clear visual family paths Spencer wants.
- Wrapped generation cards still feel like grouped cards, not a connected genealogy chart.

Recommended execution order:

1. Do Prompt 2 next: default view and chart controls. The chart must open in a comprehensible full-family position before card styling matters.
2. Do Prompt 3: card styling and legibility.
3. Do Prompt 4: selected-person side panel.
4. Do Prompt 5: search/focus and path highlighting.
5. Do Prompt 6: real data mapping and profile links.
6. Do Prompt 7: mobile chart pass.
7. Only then consider Prompt 8: safe switch on `/tree`.

Acceptance bar before Family Chart can become default:

- Opens to a readable, centered/fitted 5-6 generation view.
- Preserves visible connecting paths.
- Cards are readable without zooming way in.
- A clicked/searched person is obvious.
- Immediate family path is emphasized.
- Profile links work for private trees.
- Mobile can pan/zoom/focus without page overflow.
- Current custom card view remains available as a fallback.

## Prompt 2 Findings - May 26, 2026

Implemented on `/tree-spike` only:

- Added clearer Family Chart beta controls: `Fit tree`, `Reset view`, `Zoom in`, and `Zoom out`.
- Kept the existing vertical/horizontal direction controls and added pressed-state feedback.
- Changed the initial render from `main_to_middle` to Family Chart's `fit` position so the large demo opens as a full overview.
- Added a delayed second fit after render to reduce the chance of landing in a partial canvas before Family Chart finishes layout work.
- Reset view now returns to the initial demo focus person, restores vertical direction, and fits the full chart.
- Zoom controls use the Family Chart/D3 zoom listener when available, with a graceful status message if the zoom handler is not ready yet.
- Tightened the beta page copy and controls layout so the chart is easier to understand before replacing `/tree`.

Still true:

- Relationship paths remain handled by Family Chart and are preserved.
- `/tree` was not replaced.
- Card styling, path highlighting, selected-person details, and profile integration remain later prompts.

Verification:

- `npm run check` passed.
- `git diff --check` passed with only existing LF/CRLF warnings from the Windows checkout.
- Browser smoke passed on local desktop `1280 x 720`: all four controls present, 80 focus options, chart SVG rendered, control clicks updated status, no console errors, and no page-level horizontal overflow.
- Browser smoke passed on local mobile `390 x 844`: all four controls present, 80 focus options, chart SVG rendered, control clicks updated status, no console errors, and no page-level horizontal overflow.

## Prompt 3 Findings - May 26, 2026

Implemented on `/tree-spike` only:

- Replaced Family Chart's default tiny bubble cards with custom app-styled HTML cards.
- Cards now show a photo when `person.image` is available, otherwise a clear initials avatar.
- Cards show name plus birth year, with stronger contrast and app-matched green/gold accents.
- Increased Family Chart card dimensions and spacing so zoomed navigation is much easier to read.
- Strengthened family relationship path styling and hover path-to-main styling while preserving the library-rendered connectors.
- Kept `/tree` untouched.

Tradeoff:

- The fitted overview still scales cards down so the whole connected family can fit. That is expected for a 5-6 generation map. The improved cards become clearly readable after one or two `Zoom in` clicks, while `Fit tree` remains useful as the map view.

Verification:

- `npm run check` passed.
- `git diff --check` passed with only existing LF/CRLF warnings from the Windows checkout.
- Browser smoke passed on local desktop `1280 x 720`: styled cards rendered, initials rendered, links remained present, no console errors, and no page-level horizontal overflow.
- Browser smoke passed on local mobile `390 x 844`: styled cards rendered, initials rendered, links remained present, no console errors, and no page-level horizontal overflow.

## Prompt 4 Findings - May 26, 2026

Implemented on `/tree-spike` only:

- Added a selected-person details panel beside the Family Chart canvas on desktop.
- On mobile, the panel stacks above the canvas after the controls so the selected person's details are not buried below the large chart.
- The panel shows name, birthday, parents, spouse/partner, and children.
- Focus dropdown changes now update the selected panel, selected-card styling, and chart focus together.
- Card clicks now select the person, update the panel, and recenter the chart.
- Added a `Focus in chart` quick action.
- Added an `Open profile` quick action for private tree data when a `familyId` exists; demo mode hides it and stays read-only.
- Preserved Family Chart's relationship paths and the existing pan/zoom controls.

Verification:

- `npm run check` passed.
- `git diff --check` passed with only existing LF/CRLF warnings from the Windows checkout.
- Browser smoke passed on local desktop `1280 x 720`: selected panel initialized, dropdown selection updated details, card click updated details, one selected card remained highlighted, links remained present, no console errors, and no page-level horizontal overflow.
- Browser smoke passed on local mobile `390 x 844`: selected panel initialized, dropdown selection updated details, one selected card remained highlighted, links remained present, no console errors, and no page-level horizontal overflow.

## Prompt 5 Findings - May 26, 2026

Implemented on `/tree-spike` only:

- Added a `Search by name` control with datalist suggestions and a `Find` button.
- Search matches first name, last name, full name, and last-name-first ordering.
- Searching centers the matched person, updates the focus dropdown, updates the selected-person panel, and keeps the search input synced to the selected person.
- The selected card is highlighted.
- Visible cards for parents, spouse/partner, and children are highlighted as immediate family.
- Other visible cards are gently dimmed so the immediate branch is easier to understand without hiding the broader map.
- Family Chart relationship paths remain visible; the link DOM does not expose person IDs, so this pass highlights the relationship path through cards rather than trying to mutate specific SVG connectors.
- Missing searches show a clear status/help message and keep the current selection.

Verification:

- `npm run check` passed.
- `git diff --check` passed with only existing LF/CRLF warnings from the Windows checkout.
- Browser smoke passed on local desktop `1280 x 720`: searching `Tim` selected and centered Tim Colety, highlighted 1 selected card and 7 immediate-family cards, dimmed unrelated visible cards, preserved 38 relationship links, no console errors, and no page-level horizontal overflow.
- Browser smoke passed on local mobile `390 x 844`: searching `Tim` selected and centered Tim Colety, highlighted 1 selected card and 7 immediate-family cards, dimmed unrelated visible cards, preserved 38 relationship links, no console errors, and no page-level horizontal overflow.

## Prompt 6 Findings - May 26, 2026

Implemented on `/tree-spike` only:

- Kept demo mode working at `/tree-spike?demo=large`.
- Kept private-tree mode wired through `resolveCurrentUserFamilyId()` and `getAllPeople(familyId)`.
- Confirmed URL `familyId` support remains the primary private-data path for `/tree-spike?familyId=...` when the user is signed in and rules allow access.
- Added relationship mapping audit output for parent links, spouse links, child links, and warnings.
- The audit checks stable `parentIds`/`spouseIds`, legacy parent name fields, and legacy spouse name fields after compatibility mapping.
- Added visible relationship mapping status under the chart controls.
- Added a shared profile URL builder so the selected-person `Open profile` action preserves `person`, `familyId`, and `from=tree-spike` for private trees.
- Demo/fallback mode hides `Open profile` and stays read-only.
- When a private `familyId` URL is opened without an authenticated local session, the beta now clearly reports that it is showing a demo fallback and that sign-in is required to preview the requested private family tree.

Local verification:

- `npm run check` passed.
- `git diff --check` passed with only existing LF/CRLF warnings from the Windows checkout.
- Browser smoke passed on local desktop demo route: 80 focus options, mapping audit success, relationship links present, no console errors, and no page-level horizontal overflow.
- Browser smoke passed on local `/tree-spike?familyId=colety-birthday-tree` equivalent route while not signed in on localhost: safe demo fallback, clear sign-in-required status, mapping audit success for fallback data, no console errors, and no page-level horizontal overflow.
- Browser smoke passed on local mobile `390 x 844` for the same private-route fallback.

Still needs live Firebase testing:

- After deploy, test signed-in `/tree-spike?familyId=colety-birthday-tree` on the Firebase Hosting origin where auth is available.
- Confirm private `colety-birthday-tree` loads real people, shows `Open profile`, and profile links preserve `familyId`.
- Confirm any real legacy parent/spouse names resolve cleanly or appear in the relationship mapping notes.

## Prompt 7 Findings - May 26, 2026

Implemented on `/tree-spike` only:

- Tightened the Family Chart beta mobile layout so the hero, controls, selected-person details, and chart take less vertical space on phones.
- Made chart controls, search, focus dropdown, and selected-person actions at least 46px tall on mobile.
- Kept the Family Chart canvas contained with `touch-action: none` and contained overscroll so pan/zoom gestures belong to the chart instead of causing page-level sideways drift.
- Added mobile-aware scroll behavior: focus/search results bring the selected-person details into view, while chart view actions bring the chart canvas into view.
- Preserved visible Family Chart relationship paths.

Verification:

- `npm run check` passed.
- `git diff --check` passed with only existing LF/CRLF warnings from the Windows checkout.
- Local browser smoke passed on desktop `1280 x 720`: chart SVG rendered, relationship links remained visible, no console errors, and no page-level horizontal overflow.
- Local browser smoke passed at `390 x 844`: focus selected Tim Colety, selected/immediate-family highlighting worked, relationship links remained visible, controls and inputs were 46px tall, chart touch action was contained, and no page-level horizontal overflow appeared.
- Local browser smoke passed at `320 x 740`: focus selected Tim Colety, `Focus in chart` scrolled the chart into view, relationship links remained visible, controls and inputs stayed tappable, and no page-level horizontal overflow appeared.

Note:

- The browser automation harness could not type into the search input because its virtual clipboard was unavailable. The focus/select path and search-control sizing were verified locally, and the search code path remains unchanged except for the new mobile scroll target.

## Prompt 8 Findings - May 26, 2026

Implemented on real `/tree` behind a safe switch:

- Added a `Chart view` / `Card view` switch to the real tree page.
- Large/overview trees prefer Chart view when no explicit or stored preference exists; Card view remains available as the fallback.
- Embedded the existing `/tree-spike` Family Chart beta inside `/tree` using `embed=tree`, instead of replacing the custom renderer.
- The embedded chart hides the prototype header, hero, notes, and footer so it behaves like a tree view mode.
- Card view still renders the existing custom tree, search, density controls, collapse behavior, profile links, and add-person modal path.
- Chart view passes `familyId` for private trees and `demo=large` for the large demo.
- Embedded private chart profile links target the top window so `Open profile` does not trap the profile page inside the iframe.
- Firebase Hosting `X-Frame-Options` changed from `DENY` to `SAMEORIGIN` so the app can frame its own chart while still blocking third-party framing.

Verification:

- `npm run check` passed.
- `git diff --check` passed with only existing LF/CRLF warnings from the Windows checkout.
- Local desktop smoke at `1280 x 720`: `/tree?demo=large&view=chart` showed Chart view active, Card view hidden, embedded Family Chart SVG rendered, relationship links remained present, no console errors, and no page-level horizontal overflow.
- Local desktop smoke: switching to Card view showed 80 card-renderer people, restored card search/density controls, hid Chart view, and kept page width contained.
- Local mobile smoke at `390 x 844`: Chart view stayed inside the viewport, embedded Family Chart rendered, view switch buttons were 44px tall, card search/density controls were hidden in Chart view, and no page-level horizontal overflow appeared.
- Local mobile smoke at `390 x 844`: Card view fallback restored 80 cards, search/density controls, and no page-level horizontal overflow.

Still needs live Firebase testing:

- Deploy and verify same-origin iframe loading on Firebase Hosting after the `X-Frame-Options: SAMEORIGIN` header change.
- Test signed-in `/tree?familyId=colety-birthday-tree&view=chart` and confirm real people load in the embedded chart.
- Confirm `Open profile` from embedded Chart view navigates the top page with `familyId` preserved.
- Confirm add/edit from Card view refreshes the embedded chart after returning to Chart view.

## Prompt 9 Findings - May 26, 2026

Decision:

- Yes, Family Chart should become the default view for the large demo and the known Colety birthday starter tree.
- Keep Card view as the fallback and editing-safe path. It remains one click away and can still be forced with `?view=cards`.
- Do not remove the custom renderer before live signed-in Firebase testing.

Implemented:

- Fresh visits to `/tree?demo=large` now default to Chart view.
- Fresh signed-in visits to the known `colety-birthday-tree` default to Chart view.
- Explicit `?view=chart` and `?view=cards` still override the default.
- A saved user view preference still wins, so someone can choose Card view and stay there.
- Updated `DEPLOYMENT_CHECKLIST.md` with Chart view, Card view fallback, `/tree-spike`, same-origin iframe header, and birthday smoke-test checks.

Verification:

- `npm run check` passed.
- Local browser smoke passed on desktop `1280 x 720`: `/tree?demo=large` opened Chart view by default, rendered the embedded Family Chart SVG, preserved relationship links, and had no page-level horizontal overflow.
- Local browser smoke passed on desktop `1280 x 720`: `/tree?demo=large&view=cards` forced Card view and rendered all 80 fallback cards with search/density controls visible.
- Local browser smoke passed on mobile `390 x 844`: `/tree?demo=large` opened Chart view by default, rendered the embedded Family Chart SVG, preserved relationship links, kept the view switch tappable, and had no page-level horizontal overflow.

Still needs live Firebase testing:

- Deploy before considering this final for Dad.
- Confirm signed-in `/tree?familyId=colety-birthday-tree` opens Chart view by default and loads real Colety people, not the demo fallback.
- Confirm `?view=cards` remains a reliable escape hatch on the live private tree.
- Confirm Chart view profile links, Card view add/edit, and post-edit chart refresh on Firebase Hosting.

## Prompt 10 Findings - May 26, 2026

Implemented final pre-demo polish:

- Reworded the standalone connected chart page so it reads like a family-chart feature, not an internal spike.
- Changed Chart view helper copy on `/tree` to explain that Chart view is for browsing and Card view is the editing path.
- Hid the floating `+` add button while Chart view is active so it does not imply edits happen inside the embedded chart.
- Preserved `view=chart` / `view=cards` through profile back links, relationship profile links, and delete redirects.
- Hid the embedded chart's success-only relationship mapping note while keeping warning notes visible.

Verification:

- `npm run check` passed.
- `git diff --check` passed with only existing LF/CRLF warnings from the Windows checkout.
- Browser smoke passed locally on desktop and mobile for `/tree?demo=large`, `/tree?demo=large&view=cards`, and profile return-link behavior.

Still needs live Firebase testing:

- Deploy and confirm signed-in `/tree?familyId=colety-birthday-tree` opens Chart view by default and loads real Colety data.
- From Chart view, open a real profile and confirm the back button returns to `/tree?...&view=chart&focus=...`.
- Switch to Card view, add/edit a small test person or profile detail, then return to Chart view and confirm the chart refreshes.
- Review the final copy and chart behavior on Spencer's laptop and a phone before treating the birthday demo as ready.
