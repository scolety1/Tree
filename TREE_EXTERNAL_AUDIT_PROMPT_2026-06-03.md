# External Audit Prompt - Tree Birthday Demo

You are auditing a plain HTML/CSS/JavaScript Firebase family-tree app for a near-term birthday demo. The project is intentionally lightweight and static-hosted on Firebase Hosting.

Live site:

- `https://tree-72e80.web.app`

Primary goal:

- Identify must-fix bugs before a family birthday demo.
- Prioritize practical fixes over architecture rewrites.
- Focus especially on owner flows, privacy, profile/photo editing, mobile usability, and the large-family tree experience.

Important context:

- The app uses Firebase Auth, Firestore, Storage, and Hosting.
- The owner flow has been live-tested with a disposable test account and tree.
- The newest internal queue is `TREE_2026-06-03_FINAL_OWNER_FLOW_QUEUE.md`.
- The detailed live findings are in `TREE_2026-06-03_LIVE_AUDIT_FIXES.md`.
- Do not assume all old audit docs are current; prefer the June 3 docs.

Please audit these areas:

1. Firebase security and data access
   - Firestore rules for families, people, join codes, users, and example data.
   - Storage rules for profile photos.
   - Whether private family data is protected from signed-out users and non-members.
   - Whether owner/editor/viewer roles make sense.

2. Owner birthday-demo flow
   - Sign in.
   - Open Account.
   - Open private Family Tree.
   - Add person.
   - Edit profile.
   - Upload/replace/remove profile photo.
   - Use invite/access code.
   - Return paths between tree, directory, and profile.

3. Family tree experience
   - Large-tree readability.
   - Find Person behavior.
   - Selected-person panel behavior.
   - Profile links and return paths.
   - Mobile behavior.

4. Public/signed-out experience
   - Landing page clarity.
   - Public example tree quality.
   - Demo vs private tree distinction.
   - Public profile behavior after private-tree browsing.

5. Mobile UX
   - Header/nav.
   - Account page.
   - Tree tools.
   - Add Person modal.
   - Profile page.
   - Hidden People Directory.
   - Floating Add Person button.

6. Code quality and release readiness
   - Unsafe rendering/XSS risks.
   - Fragile state handling.
   - Broken or confusing route/query behavior.
   - Missing checks/tests.
   - Deployment and rollback clarity.

Please return:

- A concise executive summary.
- A prioritized table with:
  - Priority: Must-fix before birthday demo / Should-fix if time / Nice-to-have later
  - Area
  - Finding
  - Evidence from files or live behavior
  - Suggested fix
  - Risk if ignored
- Any files/functions that look most likely to contain the root causes.
- A recommended first 5 implementation prompts for Codex to execute.

Constraints:

- Do not suggest a rewrite unless a specific bug truly requires it.
- Do not suggest adding a build system unless necessary.
- Keep fixes compatible with the current plain HTML/CSS/JS architecture.
- Prioritize making the birthday demo reliable, understandable, and pleasant.
