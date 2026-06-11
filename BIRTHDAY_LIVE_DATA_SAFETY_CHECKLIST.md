# Birthday Live Data Safety Checklist

Use this before final live audits, deployment checks, and the birthday demo. The goal is to protect the real family data while keeping the demo path easy to verify.

## Known Live Targets

- Firebase Hosting: `https://tree-72e80.web.app`
- Firebase project: `tree-72e80`
- Birthday family tree ID: `colety-birthday-tree`
- Birthday owner account: `smcolety@gmail.com`
- External audit large private tree ID: `audit-large-demo-mq7h5jg7-54488d`
- Disposable test account used earlier: `codex.tree.test.1780513994154@example.com`
- Disposable test tree used earlier: `bD0RHI0euhabv310nEZc`

Keep passwords, current invite/access codes, and personal family details out of repo docs and audit zip files.

## Final Audit URLs

Public and signed-out:

- `https://tree-72e80.web.app/`
- `https://tree-72e80.web.app/signin`
- `https://tree-72e80.web.app/account`
- `https://tree-72e80.web.app/tree?demo=large`
- `https://tree-72e80.web.app/search?demo=large`
- `https://tree-72e80.web.app/profile?person=demo-g4-12&demo=large&from=tree`

Private owner/member:

- `https://tree-72e80.web.app/account`
- `https://tree-72e80.web.app/tree?familyId=colety-birthday-tree`
- `https://tree-72e80.web.app/search?familyId=colety-birthday-tree`
- `https://tree-72e80.web.app/profile?person=colety_rose&familyId=colety-birthday-tree&from=tree`
- `https://tree-72e80.web.app/profile?person=colety_frank&familyId=colety-birthday-tree&from=tree`
- `https://tree-72e80.web.app/profile?person=colety_tim&familyId=colety-birthday-tree&from=tree`

Signed-out private-data probes:

- `/tree?familyId=colety-birthday-tree`
- `/search?familyId=colety-birthday-tree`
- `/p/search?familyId=colety-birthday-tree`
- `/profile?person=colety_rose&familyId=colety-birthday-tree`

These private probes should block safely and should not show family names, photos, invite codes, profile details, or edit controls.

## Manual Backup Checklist

Do this before any risky live edit session, invite-code reset, profile cleanup, or final birthday data changes.

1. Open Firebase Console for project `tree-72e80`.
2. Confirm the current Firestore rules and Storage rules are deployed.
3. In Firestore, inspect `families/colety-birthday-tree` and confirm the tree name, owner, member list, and invite/access-code state look correct.
4. Capture a quick manual backup of the birthday tree:
   - Save screenshots of `families/colety-birthday-tree`.
   - Save screenshots or exported views of the `people` records for `familyId == colety-birthday-tree`.
   - Save screenshots of member/role records needed to recover owner/editor/viewer access.
   - If Google Cloud export tooling is already configured, run a Firestore export before the demo. Do not set this up last minute if it risks the demo.
5. Save the current deployed commit hash and Firebase deploy timestamp in a private note.
6. Keep a private copy of the current invite/access code only if Spencer needs it for family setup.

## Do Not Edit Before The Demo

Avoid these unless there is a confirmed blocker and a backup exists:

- Do not archive or delete `colety-birthday-tree`.
- Do not bulk delete people or relationships.
- Do not reset the birthday tree invite/access code right before the demo unless the current code is compromised.
- Do not change owner/member roles except for a planned viewer/editor test.
- Do not change Firestore or Storage rules without rerunning the full privacy smoke test.
- Do not change Firebase Auth providers or authorized domains unless needed for the final domain setup.
- Do not replace many profile photos in one sitting without testing one upload/replace/remove first.
- Do not edit DNS/custom-domain settings until the Firebase Hosting URL is approved.

## Safe Rollback Notes

Code rollback:

1. Use GitHub to identify the last known-good commit.
2. Redeploy that commit to Firebase Hosting.
3. Re-run signed-out public routes, signed-out private probes, and the owner Colety tree route.

Data rollback:

1. Use the manual backup screenshots/export to identify the changed family, people, and member records.
2. Restore only the specific damaged records.
3. Avoid broad live data restoration during the birthday demo window unless the tree is unusable.

Demo fallback:

1. If private auth or data breaks, use the public example tree:
   - `https://tree-72e80.web.app/tree?demo=large`
2. If the custom domain is not ready, use Firebase Hosting directly:
   - `https://tree-72e80.web.app`

## Final Spencer Live Audit

1. Sign in as `smcolety@gmail.com`.
2. Open `/account`; confirm the Colety tree appears and owner controls are visible.
3. Open `/tree?familyId=colety-birthday-tree`; confirm the real tree loads.
4. Search/focus at least three people, open profiles, and return to the tree.
5. Open `/search?familyId=colety-birthday-tree`; filter, sort, open a profile, and return.
6. Confirm add/edit controls appear only for owner/editor access.
7. Confirm signed-out private URLs block safely.
8. Check the app on a phone-width viewport or real phone.
9. Only after the Firebase Hosting URL passes, finish custom-domain checks for `coletys.com`.
