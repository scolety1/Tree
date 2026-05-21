# Birthday Release Roadmap

This roadmap is for getting the Family Tree app to a birthday-ready final version with minimal hands-on time from Spencer. The goal is not to turn the project into a perfect commercial product before the deadline. The goal is to make the app stable, polished, and meaningful enough that Dad can use it, enjoy it, and not have easy material for teasing.

Use `BIRTHDAY_RELEASE_PUNCH_LIST.md` as the living execution tracker. This roadmap explains the phases; the punch list tracks the current demo path, safe-to-show features, deferrals, blockers, and release risks.

## Release Goal

The final birthday release should let a family member:

- Open the deployed website.
- Understand what the app is for.
- Sign in or use the intended access path.
- Create, join, or open a family tree.
- Add and edit family members.
- Browse the tree without obvious layout breakage.
- Search for people.
- Open profile pages.
- Trust that private family data is not casually exposed.

## Working Agreement

Spencer's hands-on work should stay light. He can send prompts, answer occasional product questions, and do a few live checks that require real Firebase or Vercel access.

Codex should handle the ongoing implementation work:

- Inspect the codebase.
- Make scoped changes.
- Run local checks.
- Keep this roadmap current.
- Report what changed and what still needs human verification.
- Avoid asking for decisions unless the choice affects the release outcome.

## Success Criteria

The project is birthday-ready when:

- The deployed app loads successfully.
- The core user flow works from start to finish.
- The most visible errors and rough browser dialogs are cleaned up.
- User-entered names and search terms are rendered safely.
- Firebase rules and deployment assumptions are documented.
- There is a basic automated check before deploy.
- A final manual QA pass has been completed on desktop and phone.

## Non-Goals For This Release

These are intentionally out of scope unless everything else is already done:

- GEDCOM import or export.
- Full public SaaS onboarding.
- Billing, subscriptions, or account deletion flows.
- Perfect support for every complex family structure.
- Advanced tree zoom/pan/print tooling.
- Analytics and error monitoring.
- Large redesign of every page.
- Custom domain purchase and branding work.

## Phase 0: Scope And Release Control

### Goal

Define what "finished" means for the birthday release and keep the work from expanding into a full product rewrite.

### Subphase 0.1: Define The Demo Path

Decide the exact path Dad is expected to take through the app. This path should become the primary QA route.

Expected demo path:

- Open the home page.
- Sign in or use the prepared access route.
- Open the family tree.
- Click a few person cards.
- View profile details.
- Search for someone.
- Add or edit one person only if that flow is stable.

Deliverables:

- A written birthday demo path.
- A short list of features that are safe to show.
- A short list of features to avoid showing if they remain rough.
- A backup demo path that avoids auth/private-tree setup if Firebase configuration becomes a last-minute blocker.

### Subphase 0.2: Freeze Major Feature Scope

Lock the release around stabilizing the existing app. New features should only be added if they directly improve the birthday demo path.

Allowed changes:

- Bug fixes.
- Safety fixes.
- Small UX polish.
- Clearer messages.
- Release checks.
- Documentation.

Avoided changes:

- Rebuilding the app in a framework.
- Reworking the entire data model.
- Adding large new visualization behavior.
- Adding new third-party services unless required.

### Subphase 0.3: Create A Running Punch List

Maintain a simple list of blockers, visible papercuts, and deferred work.

Categories:

- Blocker: breaks the main demo path.
- Important: embarrassing or risky, but not fatal.
- Nice-to-have: polish if time permits.
- Deferred: intentionally post-birthday.

The running punch list lives in `BIRTHDAY_RELEASE_PUNCH_LIST.md`.

## Phase 1: Core Flow Stability

### Goal

Make the main app journey reliable enough that a family member can use it without a developer sitting beside them.

### Subphase 1.1: Route And Navigation Check

Verify each public route loads correctly on Vercel and locally.

Routes to check:

- `/`
- `/home`
- `/signin`
- `/dashboard`
- `/tree`
- `/search`
- `/profile`
- `/api/funfact`

Work items:

- Confirm Vercel rewrites point to the right HTML files.
- Confirm direct browser refresh works on each route.
- Confirm nav links are consistent.
- Confirm missing query parameters show helpful states instead of broken pages.

Acceptance criteria:

- No route produces a 404 during normal use.
- Refreshing app pages does not strand the user.
- Navigation labels match the actual destination.

### Subphase 1.2: Authentication Flow

Make sign-in and sign-out behave predictably.

Work items:

- Verify email/password sign-up.
- Verify email/password sign-in.
- Verify sign-out.
- Verify password reset message.
- Verify Google sign-in if enabled in Firebase.
- Improve visible error messages for failed auth.

Acceptance criteria:

- A user can sign in and reach the correct next page.
- A user can sign out and see a signed-out state.
- Auth failures are understandable without opening DevTools.

Human verification needed:

- Firebase Auth provider settings may need to be checked in the Firebase Console.
- Authorized domains may need to be confirmed for the Vercel production URL.

### Subphase 1.3: Tree Creation And Joining

Make the create/join flow reliable.

Work items:

- Verify creating a family tree creates the required Firestore documents.
- Verify the owner is included as a member.
- Verify access codes are generated and displayed.
- Verify joining a family tree by code works.
- Verify invalid codes show a friendly message.
- Verify the current family ID persists only as intended.

Acceptance criteria:

- A new user can create a tree and immediately open it.
- A second user can join with a valid code.
- Invalid or missing codes do not produce raw errors.

### Subphase 1.4: People CRUD

Make adding, editing, and removing people dependable.

Work items:

- Verify required field validation.
- Verify add person saves to the correct family.
- Verify edit person updates the correct document.
- Verify delete person does not leave the UI in a broken state.
- Prevent obvious invalid relationships, such as a person being their own parent.
- Confirm old name-based relationship fields still work while ID-backed relationships are improved.

Acceptance criteria:

- A person can be added, edited, viewed, searched, and removed.
- Relationship fields do not create obvious corrupt data.
- Failures show useful page-level feedback.

### Subphase 1.5: Profile And Search Flow

Make profile and search pages reliable because they are likely to be clicked during the birthday demo.

Work items:

- Verify search loads people for the current family.
- Verify empty search state.
- Verify no-result state.
- Verify profile page loads from a person card.
- Verify missing person ID state.
- Verify profile edit mode does not lose existing data.

Acceptance criteria:

- Search results link to valid profile pages.
- Profile pages show useful information or a clear fallback.
- Empty and failed states look intentional.

## Phase 2: Safety And Privacy

### Goal

Reduce the risk of exposing family data or rendering unsafe user-entered content.

### Subphase 2.1: Unsafe Rendering Cleanup

Replace risky `innerHTML` usage where user-controlled data appears.

Priority areas:

- Search result cards.
- Tree person cards.
- Dashboard tree names and descriptions.
- No-result messages containing search text.
- Profile fields rendered from Firestore data.

Work items:

- Prefer `textContent` and DOM element creation.
- Use escaping only where HTML templates are truly needed.
- Avoid inserting raw names, descriptions, or search terms into HTML strings.

Acceptance criteria:

- User-entered names and search text cannot become executable HTML.
- Important UI rendering still looks the same after cleanup.

### Subphase 2.2: Firebase Rule Review

Review Firestore and Storage rules against the intended privacy model.

Work items:

- Confirm only family members can read private family data.
- Confirm only owners can manage family-level settings where intended.
- Confirm join code read behavior is acceptable.
- Confirm profile photos are family-scoped.
- Confirm writes require authentication.
- Document any known rule tradeoffs.

Acceptance criteria:

- Rules match the birthday release privacy expectations.
- Any remaining risks are documented clearly.

Human verification needed:

- Confirm deployed Firebase rules match the repository files.
- Confirm Firebase projects and environments are not mixed up.

### Subphase 2.3: Firebase Client Config Sanity

Firebase client config can be public, but the surrounding controls must be correct.

Work items:

- Document that Firebase client config is not a server secret.
- Confirm Firebase API key restrictions are reasonable if possible.
- Confirm production domains are authorized in Firebase Auth.
- Confirm Firestore and Storage rules are deployed.

Acceptance criteria:

- The README or release notes explain the Firebase setup clearly.
- There are no actual server secrets committed to the repo.

### Subphase 2.4: API Input Validation

Tighten the birthday fun-fact API and any other input handling that is easy to abuse or embarrass during demo.

Work items:

- Validate real calendar dates, not just day `1..31`.
- Return clear errors for invalid input.
- Keep a graceful fallback for upstream API failure.
- Avoid leaking stack traces or internal details.

Acceptance criteria:

- `/api/funfact?month=2&day=30` returns an invalid-date response.
- Valid dates still return a fact or friendly fallback.

## Phase 3: UX Polish

### Goal

Make the app feel like a thoughtful finished gift rather than a rough class project.

### Subphase 3.1: Replace Harsh Browser Dialogs

Replace the most visible `alert()` and `confirm()` flows with in-page messages or simple modals.

Priority flows:

- Create tree success/failure.
- Join tree failure.
- Add person failure.
- Edit person success/failure.
- Delete person confirmation.
- Reset access code confirmation.
- Archive or leave tree confirmation.

Acceptance criteria:

- The main demo path does not rely on jarring browser alerts.
- Destructive actions still require confirmation.
- Messages are visible, plain, and recoverable.

### Subphase 3.2: Loading, Empty, And Error States

Make every important page show intentional states.

Pages:

- Home.
- Dashboard.
- Tree.
- Search.
- Profile.
- Sign in.

Work items:

- Add loading text where data is being fetched.
- Add empty states when there is no data yet.
- Add friendly error states for failed Firebase loads.
- Avoid leaving blank white sections.

Acceptance criteria:

- A slow network or empty database still produces understandable UI.
- Users know what action to take next.

### Subphase 3.3: Dad-Friendly Copy

Improve wording so the app feels personal, warm, and clear.

Work items:

- Review home page copy.
- Review button labels.
- Review error messages.
- Avoid developer-ish phrases.
- Add a small personal touch if appropriate.

Acceptance criteria:

- The app sounds like a family tool, not a debugging screen.
- Important actions are self-explanatory.

### Subphase 3.4: Mobile Polish

Check the main pages on phone-sized screens.

Pages:

- Home.
- Dashboard.
- Tree.
- Search.
- Profile.

Work items:

- Fix text overflow.
- Fix cramped buttons.
- Confirm tree can scroll horizontally or vertically as needed.
- Confirm forms are usable on mobile.

Acceptance criteria:

- A phone user can complete the demo path.
- No obvious overlapping text or broken layout appears on common mobile widths.

## Phase 4: Tree Experience

### Goal

Make the tree view strong enough to be the centerpiece of the release.

### Subphase 4.1: Tree Layout QA

Check realistic family structures.

Test data should include:

- One root generation.
- Parents.
- Children.
- Siblings.
- Spouses.
- At least three generations.
- One missing or partial relationship case.

Work items:

- Verify people appear in expected generations.
- Verify spouse and child relationships are readable.
- Verify duplicate people do not appear in obvious places.
- Verify the tree remains usable when wider than the viewport.

Acceptance criteria:

- The prepared birthday family data looks good enough to show.
- Known limitations are documented rather than hidden.

### Subphase 4.2: Profile Links And Return Paths

Make movement between tree, search, and profile feel natural.

Work items:

- Verify each tree card opens the correct profile.
- Verify each search card opens the correct profile.
- Add or verify a path back to tree/search/dashboard.
- Preserve the current family ID across navigation.

Acceptance criteria:

- Clicking around does not lose the current family context.
- Users can recover if they land on a profile first.

### Subphase 4.3: Relationship Model Stabilization

Keep legacy data working while nudging the app toward ID-backed relationships.

Work items:

- Prefer `parentIds` and `spouseIds` where available.
- Keep old `parent1`, `parent2`, and spouse name fields working.
- Avoid large migration unless it is necessary for the birthday data.
- Add validation helpers for obvious invalid relationships.

Acceptance criteria:

- Existing data still renders.
- New or edited data is less likely to become inconsistent.

### Subphase 4.4: Visual Tree Polish

Improve the most visible tree styling issues.

Work items:

- Card spacing.
- Card sizing.
- Font sizes.
- Connector line stability if quick.
- Scroll behavior.
- Empty tree state.

Acceptance criteria:

- The tree is readable on desktop.
- The tree is at least navigable on mobile.
- It looks intentional in screenshots.

## Phase 5: Release Engineering

### Goal

Add enough automation and documentation that the project can be deployed with confidence.

### Subphase 5.1: Basic Project Scripts

Add a small `package.json` if appropriate.

Work items:

- Add a syntax check script for JavaScript files.
- Add a smoke-check script if useful.
- Avoid introducing heavy tooling that causes churn.

Acceptance criteria:

- One command can catch basic JavaScript syntax errors.
- The command is documented.

### Subphase 5.2: GitHub Actions

Add a minimal CI workflow.

Work items:

- Run checks on push and pull request.
- Use a stable Node version.
- Keep the workflow simple and fast.

Acceptance criteria:

- GitHub shows a passing or failing check for new commits.
- Broken JavaScript syntax would fail CI.

### Subphase 5.3: Deployment Checklist

Create a short checklist for the final release.

Checklist should include:

- Vercel deployment status.
- Home page loads.
- Core routes load.
- Fun-fact API route works.
- Firebase rules deployed.
- Auth providers enabled.
- Authorized domains configured.
- Final manual QA completed.

Acceptance criteria:

- Anyone can follow the checklist without guessing the deployment steps.

### Subphase 5.4: Branch Protection Recommendation

Document branch protection settings.

Recommended settings:

- Protect `main`.
- Require PR before merge if multiple people are contributing.
- Require status checks once GitHub Actions exists.
- Avoid force pushes to `main`.

Acceptance criteria:

- The recommendation is documented.
- Actual setup can happen in GitHub when the owner has time.

## Phase 6: Spencer Phase

### Goal

Prepare the real birthday content, account setup, and owner-only configuration before the final QA pass.

This is the Spencer Phase. Use `SPENCER_PHASE_CHECKLIST.md` as the living checklist for account access, Firebase/Vercel setup, family data decisions, and final demo choices.

### Subphase 6.1: Firebase And Auth Console Checks

Confirm production Firebase settings that cannot be fully verified from code alone.

Work items:

- Confirm Firestore rules are deployed.
- Confirm Storage rules are deployed.
- Confirm Email/password auth is enabled.
- Decide whether Google sign-in is included in the demo.
- Confirm authorized domains include the production Vercel URL.
- Confirm the Firebase project is the intended birthday-release project.

Acceptance criteria:

- The app can sign in on production.
- Firestore and Storage behavior match the committed rules.
- No demo path depends on an unverified auth provider.

### Subphase 6.2: Production Deployment Check

Confirm the deployed app is the one Dad will see.

Work items:

- Confirm the production URL.
- Confirm the latest intended commit is deployed.
- Confirm Vercel rewrites work on production.
- Confirm the serverless API route works.

Acceptance criteria:

- Spencer has one known-good URL to open for the birthday demo.

### Subphase 6.3: Birthday Family Data

Prepare the actual family tree content.

Work items:

- Decide the minimum set of people to include.
- Confirm names and relationships.
- Decide whether birthdays are included.
- Decide whether photos are included.
- Remove or avoid sensitive details that should not be shown.

Acceptance criteria:

- The birthday tree feels personal and safe to show.
- Missing data does not make the app feel broken.

### Subphase 6.4: Demo Feature Decisions

Decide what will actually be shown during the birthday moment.

Work items:

- Decide whether add-person is shown.
- Decide whether edit-person is shown.
- Decide whether delete-person is avoided.
- Decide whether Google sign-in is avoided or shown.
- Decide whether photo upload is avoided or shown.
- Decide whether admin actions like archive, reset code, and remove member are avoided.

Acceptance criteria:

- Spencer knows the happy path and the avoid-clicking-that path.

## Phase 7: Birthday Content And Final QA

### Goal

Prepare the app for the real birthday moment.

### Subphase 7.1: Prepare Birthday Tree Data

Create or verify the actual family data that will be shown.

Work items:

- Add the people Dad is most likely to care about.
- Prioritize accuracy over completeness.
- Include birthdays if fun facts are part of the demo.
- Add profile photos only if the upload flow is stable.

Acceptance criteria:

- The prepared tree feels personal and meaningful.
- Missing data does not make the app feel broken.

Human work likely needed:

- Confirm names and relationships.
- Provide or approve any family photos.
- Decide whether sensitive people/details should be included.

### Subphase 7.2: Full Manual QA Pass

Run the exact demo path before calling the release done.

Desktop checks:

- Open home page.
- Sign in.
- Open dashboard.
- Open tree.
- Search for a person.
- Open a profile.
- Add or edit a test person if that feature will be shown.
- Sign out.

Mobile checks:

- Open home page.
- Open tree.
- Scroll the tree.
- Search.
- Open a profile.

Acceptance criteria:

- No blocker appears during the demo path.
- Any visible papercuts are either fixed or consciously accepted.

### Subphase 7.3: Final Bug Sweep

Fix only issues that threaten the birthday release.

Fix:

- Broken routes.
- Broken sign-in.
- Broken tree rendering.
- Unsafe rendering bugs.
- Confusing showstopper messages.
- Mobile layout disasters.

Do not fix:

- Major redesign desires.
- Deep data migrations.
- Rare edge cases not present in birthday data.
- New feature ideas.

### Subphase 7.4: Birthday Handoff Notes

Write short notes for Spencer before the demo.

Notes should include:

- The best URL to open.
- The best path to click through.
- Any login/access info needed.
- Features that are safe to show.
- Features to avoid if still rough.
- Known limitations.

Acceptance criteria:

- Spencer can run the demo confidently without remembering every implementation detail.

## Priority Order

If time gets tight, complete work in this order:

1. Core routes and navigation.
2. Auth and tree access.
3. Add/edit/search/profile flow.
4. Unsafe rendering cleanup.
5. Tree view polish.
6. Loading, empty, and error states.
7. Basic CI and deploy checklist.
8. README and handoff notes.
9. Nice visual polish.

## Suggested Timeline

This timeline assumes Codex can keep working between Spencer's check-ins.

### Pass 1: Stabilize

- Route checks.
- Auth checks.
- Create/join checks.
- People CRUD checks.
- Profile/search checks.
- Critical bug fixes.

### Pass 2: Safety

- Clean unsafe rendering.
- Tighten date validation.
- Review Firebase rules.
- Document Firebase setup.

### Pass 3: Polish

- Replace the worst alerts and confirms.
- Improve loading, empty, and error states.
- Mobile pass.
- Tree visual pass.

### Pass 4: Release

- Add project scripts.
- Add GitHub Action.
- Write deployment checklist.
- Verify Vercel.

### Pass 5: Birthday QA

- Prepare real data.
- Run full demo path.
- Fix blockers only.
- Write handoff notes.

## Current Known Risks

- No automated CI currently exists.
- `main` is not protected.
- Some user-facing rendering uses `innerHTML`.
- Some browser `alert()` and `confirm()` flows remain.
- Firebase provider/domain/rule deployment state must be verified outside the codebase.
- The tree layout may have limitations for complex family structures.
- The API route currently needs stronger real-date validation.

## Definition Of Done

The birthday release is done when:

- The final deployed URL works.
- The prepared family tree opens and renders correctly.
- Search and profiles work for the prepared data.
- Add/edit flows work or are intentionally not shown.
- Critical unsafe rendering has been cleaned up.
- Firebase rules and auth setup have been checked.
- Basic automated checks pass.
- Manual desktop and mobile QA pass.
- Spencer has a short demo script and known limitations list.
