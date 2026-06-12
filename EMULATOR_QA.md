# Local Emulator QA

Use emulators only from a local host. Production hosts ignore emulator flags.

1. Start local emulators:
   `firebase emulators:start --only hosting,auth,firestore,storage --project tree-72e80`
2. Open the app with explicit opt-in:
   `http://127.0.0.1:5000/?emulators=1`
3. To turn the local opt-in off:
   `http://127.0.0.1:5000/?emulators=0`

The app connects to emulators only when the host is `localhost`, `127.0.0.1`, or `::1` and the opt-in flag is present or stored locally.

Configured local ports: Hosting `5000`, Auth `19099`, Firestore `18080`, Storage `19199`.

The relationship migration tool at `/admin/migrate-relationships` is hard-blocked unless this local emulator mode is active.
