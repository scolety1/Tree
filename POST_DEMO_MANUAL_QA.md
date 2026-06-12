# Post-Demo Manual QA

Use this checklist for authenticated browser QA in a normal local browser. Do not test write flows on live Colety data.

## Start Local Emulator QA

Start the emulators:

```powershell
firebase emulators:start --only hosting,auth,firestore,storage --project tree-72e80
```

Open local emulator mode:

```text
http://127.0.0.1:5000/?emulators=1
```

Disable emulator mode:

```text
http://127.0.0.1:5000/?emulators=0
```

Production hosts must never connect to emulators, even with `?emulators=1`.

## Manual QA Checklist

### Owner

- Create/sign in to disposable owner account in emulator.
- Create/open disposable tree.
- Add disposable person.
- Edit disposable person.
- Remove disposable person.
- Confirm removal is soft-delete, person disappears from active tree/search.
- Confirm direct profile URL shows removed/unavailable.
- Restore removed person from owner dashboard.
- Confirm person returns to tree/search/profile.
- Archive disposable tree if supported.
- Restore archived tree from owner dashboard.

### Editor

- Assign editor to disposable tree.
- Confirm editor can open tree/search/profile.
- Confirm editor can add/edit if intended.
- Confirm editor cannot see Remove This Person.
- Confirm editor cannot see removed people restore.
- Confirm editor cannot see archived tree restore.
- Confirm editor cannot manage invite/member/archive/delete owner controls.

### Viewer

- Assign viewer to disposable tree.
- Confirm viewer can browse tree/search/profile.
- Confirm viewer cannot add/edit/remove/restore/upload/manage.

### Outsider/Signed-Out

- Signed-out private routes gate safely.
- Outsider cannot open private disposable tree unless added.
- Outsider does not receive seeded private-like tree.

### Migration Route

- Open `/admin/migrate-relationships?familyId=<disposableTreeId>`.
- Confirm the route is blocked outside local emulator mode.
- Signed-out blocked.
- Viewer/editor/non-owner blocked.
- Owner can preview manually.
- Apply requires confirmation.
- No auto-writes on page load.
- Do not run apply except on disposable emulator data.

### Regression

- `/p/account`, `/p/tree`, `/p/search`, `/p/profile` do not duplicate into `/p/p`.
- Public demo remains read-only/fictitious.
- Production hosts cannot enable emulator mode.
