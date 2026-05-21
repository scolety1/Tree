# Spencer Phase Checklist

This is the living checklist for the work Spencer needs to do or verify personally. Codex can handle most implementation work, but a few things require account access, real family knowledge, or a final human call.

Keep adding to this file as phases uncover new owner-only tasks.

## Purpose

The Spencer Phase happens after most code stabilization/polish work and before final birthday QA. It is the handoff window where Spencer checks account settings, supplies real family details, confirms the deployed app, and decides what is safe to show Dad.

## Current Spencer Tasks

### Firebase Console

- Confirm Firestore rules are deployed from `firestore.rules`.
- Confirm Storage rules are deployed from `storage.rules`.
- Confirm Email/password sign-in is enabled.
- Decide whether Google sign-in should be enabled for the birthday demo.
- If Google sign-in is shown, confirm Google provider setup is complete.
- Confirm `coletys.com`, `www.coletys.com`, and the Firebase Hosting domains are listed in Firebase Auth authorized domains.
- Confirm any preview/development domains you plan to use are authorized.
- Confirm the Firebase project is the intended project for the birthday release.
- Review Firebase API key restrictions in Google Cloud.
- Confirm access codes are acceptable as invite secrets for the birthday release.
- Confirm user profile reads being available to signed-in users is acceptable for the birthday release.

### Firebase Hosting / Deployment

- Confirm Firebase Hosting is enabled for the intended Firebase project.
- Confirm `firebase deploy --only hosting,firestore:rules --project tree-72e80` deploys the latest local build and rules.
- Confirm the production URL you want to send/open for Dad.
- Confirm the latest commit is deployed before final QA.
- Review `/account`, `/tree`, `/tree?demo=large`, `/search`, and at least one real profile after deploy.
- Treat `/api/funfact` as deferred unless it is moved from Vercel to a Firebase Function.

### GitHub

- Confirm the new `Checks` workflow runs after the next push.
- Confirm `npm run check` passes in GitHub Actions.
- Protect the `main` branch if you have repository admin access.
- Require the `Checks / Static checks` workflow before merging, if branch protection is enabled.
- Block force pushes to `main`, if branch protection is enabled.

### Accounts For Testing

- Create or identify the prepared demo account.
- Create or identify a second account for testing join-by-code.
- Decide whether Dad will use his own login or a prepared account.
- Save the demo login details somewhere private, not in the repo.

### Birthday Family Data

- Decide which family tree will be the birthday tree.
- Decide who must be included before the demo.
- Include at least three generations if possible so the tree view feels meaningful.
- Confirm spellings of important names.
- Confirm sensitive people/details that should not be included.
- Confirm whether birthdays should be added for fun facts.
- Decide whether profile photos are worth including for this release.
- Provide or approve any profile photos if photo upload is part of the demo.
- Check spouse/parent/child relationships in the prepared tree before the final demo.

### Demo Decisions

- Decide whether add-person will be shown live.
- Decide whether edit-person will be shown live.
- Decide whether delete-person will be shown live. Default recommendation: do not show delete.
- Decide whether Google sign-in will be shown. Default recommendation: avoid unless fully verified.
- Decide whether profile image upload will be shown. Default recommendation: avoid unless fully verified.
- Decide whether access-code reset/member removal/archive actions will be shown. Default recommendation: avoid.
- Review the home page and profile copy for dad/family tone.
- Check the app on a real phone after deployment and flag any obvious layout weirdness.

### Final Human QA

- Run the birthday demo path on desktop.
- Run the birthday demo path on phone.
- Confirm the tree looks good enough visually.
- Confirm profile back buttons return to the right tree or search page.
- Confirm tree scrolling feels okay on a phone.
- Confirm copy feels okay for Dad.
- Confirm no private or awkward data appears in the demo tree.
- Confirm the backup demo path still works.
- Confirm "View Example Tree" opens the example tree even after using a private family tree in the same browser.

### Spencer Wrap-Up: Domain And Launch

- Do this section last, after the Firebase Hosting URL has passed birthday-demo QA.
- Finish the GoDaddy to Porkbun transfer for `coletys.com`.
- Recreate the Firebase Hosting DNS records in Porkbun if needed.
- Connect `coletys.com` and `www.coletys.com` in Firebase Hosting.
- Confirm Firebase Hosting shows the custom domains as connected or pending SSL.
- Add `coletys.com` and `www.coletys.com` to Firebase Auth authorized domains.
- Confirm the final birthday URL opens the latest Firebase Hosting deploy.
- Do one last desktop and phone smoke test on the final birthday URL.

## Current Questions For Spencer

- What exact URL should be treated as the birthday production URL?
- Will Dad use a prepared account, or should he create/sign into his own?
- Should Google sign-in be part of the demo or hidden/ignored?
- What is the minimum set of people that need to be in the birthday tree?
- Are profile photos important for the birthday moment?

## Things Spencer Should Not Need To Do

- Debug JavaScript.
- Rewrite Firebase rules.
- Build UI components.
- Add automated checks.
- Refactor relationship logic.
- Manually inspect every code file.

## Update Rules

When later phases uncover a task that requires Spencer's access or judgment, add it here under the relevant section. If the task becomes unnecessary, mark it as deferred or remove it after noting the reason in the phase summary.
