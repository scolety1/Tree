# Deployment Checklist

Use this before the birthday release and before any last-minute deploy.

## Local Checks

1. Run `npm run check`.
2. Confirm JavaScript syntax passes.
3. Confirm JSON config parsing passes.
4. Confirm unsafe rendering scan passes.
5. Review `git status --short` so only intentional files are changed.

## GitHub Checks

1. Push changes to GitHub.
2. Confirm the `Checks` GitHub Actions workflow runs.
3. Confirm the workflow passes before treating the branch as release-ready.

## Firebase Hosting Checks

1. Confirm Firebase Hosting is enabled for the intended Firebase project.
2. Deploy the latest commit with `firebase deploy --only hosting`.
3. Open the Firebase Hosting URL first, then the custom domain after DNS connects.
4. Confirm these routes load:
   - `/`
   - `/home`
   - `/signin`
   - `/dashboard`
   - `/tree`
   - `/search`
   - `/profile`
5. Confirm `coletys.com` and `www.coletys.com` are connected or pending SSL in Firebase Hosting.
6. Confirm `/api/funfact` is treated as deferred unless it has been moved to a Firebase Function.

## Firebase Checks

1. Confirm the app is pointed at the intended Firebase project.
2. Confirm Firestore rules are deployed from `firestore.rules`.
3. Confirm Storage rules are deployed from `storage.rules`.
4. Confirm Email/password auth is enabled.
5. Confirm Google sign-in only if it will be shown.
6. Confirm `coletys.com`, `www.coletys.com`, and the Firebase Hosting preview/live domains are authorized in Firebase Auth.
7. Review Firebase API key restrictions in Google Cloud.

## Birthday Demo Smoke Test

1. Sign in with the prepared demo account.
2. Open the dashboard.
3. Open the birthday family tree.
4. Click at least three person cards.
5. Confirm profile back buttons return to the right place.
6. Search for a known person.
7. Add or edit a test person only if those flows are part of the demo.
8. Check the tree on a phone.

## Branch Protection Recommendation

In GitHub repository settings, protect `main`:

- Require status checks to pass before merging.
- Require the `Checks / Static checks` workflow.
- Block force pushes.
- Require pull requests if more than one person is actively editing the repo.
