# Birthday Release Final Smoke - June 10, 2026

Recommendation: GREEN - freeze for the birthday demo.

Scope: local smoke test of the current working tree using Firebase-style hosting rewrites. No deploy was performed.

## Blockers

None found.

## Smoke Coverage

- `/` loaded, and the primary sign-in/start/example-tree CTAs were present.
- `/tree` loaded the signed-out example tree experience.
- `/tree?demo=large` loaded the large demo chart.
- `/tree?demo=large&view=cards` loaded the card fallback with 80 demo people.
- `/search?demo=large` loaded without public/private data leakage.
- `/signin` loaded sign-in, create-account, and reset-password states.
- `/account` loaded its signed-out-safe account page.
- A demo `/profile` route opened from the selected-person panel.

## Interaction Checks

- Find person worked for `Ivy Johnson` and opened the selected-person panel.
- Relationship Finder resolved `Alex Johnson` to `Ivy Johnson` with no black overlay artifact.
- Birthday entries are buttons; clicking `Avery Johnson` focused that person, updated the selected panel, and added them to recently viewed.
- Profile details showed the polished `No photo yet` placeholder, not the old unfinished copy.
- Back to Family Tree preserved demo mode, focus, and view state.
- Auth reset mode is separate from create-account mode and validates empty/invalid email locally.
- Mobile width around `390px` loaded all public smoke routes without page-level horizontal overflow.
- No obvious private real-family identifiers appeared in signed-out public/demo routes.
- No relevant console errors were captured.

## Local Checks

- `npm run check` passed.
- `git diff --check` passed with only existing CRLF normalization warnings from Git on Windows.

## Deferred

- Live signed-in owner/editor flows should get one quick spot-check after the next deploy.
- Firebase Storage photo upload still needs live Firebase Console/rules verification if photos are part of the birthday demo.
- GitHub Actions should be checked after the final commit/push.
- `tmp_prompt2_screenshots/` is still untracked from earlier mobile screenshot work; leave it out of the release commit unless those images are intentionally wanted.
